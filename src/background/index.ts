import { Configurations } from "../core/config";
import { DatabaseServices } from "../core/database/contracts";
import { createDatabaseServices } from "../core/database/createDatabaseServices";
import { EventTypes } from "../shared/constants/eventTypes";
import { Pages } from "../shared/constants/pages";
import { ExtractDataFromUrl } from "../features/urlParser/parser";
import { GetDate } from "../shared/utils/date";
import { Artist } from "../shared/types/Artist";
import { Post } from "../shared/types/Post";
import { setupMessageHandler } from "./messageHandler";
import { transformArtistProfile, transformPostProfile } from "../core/utils/enrichment";
import { fetchArtistProfile, fetchPostDetails } from "../core/services/apiClient";
import { tryParseUrl } from "../shared/utils/url";

if (typeof browser === "undefined") {
  //@ts-ignore
  globalThis.browser = chrome;
}

// ── Composition root ──────────────────────────────────────────────────────────

/**
 * Wires all background-script dependencies and registers browser event
 * listeners. Returns a cleanup handle (for testing) that removes the listeners.
 *
 * Keeping wiring explicit here means the singleton is only touched in this one
 * place instead of being scattered across every callback.
 */
export function createBackgroundApp({
  lifecycle,
  version,
  artists,
  posts,
  tracking,
  backup,
  legacy,
}: DatabaseServices): { dispose: () => void } {
  setupMessageHandler({ lifecycle, artists, posts });

  // ── onInstalled ─────────────────────────────────────────────────────────────

  async function migrateLegacyDbIfNeeded(): Promise<void> {
    const legacyData = await legacy.exportFromLegacyDb();
    if (!legacyData) return;

    console.log(`Found legacy BetterSU_DB with ${legacyData.artists.length} artists and ${legacyData.posts.length} posts. Migrating to BetterCK_DB...`);

    try {
      await lifecycle.init();
      await backup.importData(legacyData);
      await legacy.deleteLegacyDb();
      console.log('Legacy DB migration complete. BetterSU_DB deleted.');
    } catch (err) {
      console.error('Legacy DB migration failed. BetterSU_DB preserved.', err);
    }
  }

  async function onInstalled(details: browser.runtime._OnInstalledDetails): Promise<void> {
    await migrateLegacyDbIfNeeded();

    if (details.reason === 'install') {
      console.log("Extension installed. Initializing database...");
      await lifecycle.init();
      return;
    }

    if (details.reason === 'update') {
      const storedVersion = await version.getStoredVersion();
      const targetVersion = version.getTargetVersion();

      if (storedVersion >= targetVersion) {
        console.log(`DB already at version ${storedVersion}, no migration needed.`);
        await lifecycle.init();
        return;
      }

      console.log(`Migrating DB from version ${storedVersion} to ${targetVersion}...`);

      // 1. Export all data at the old schema before any migration runs
      let backupData: { artists: Artist[]; posts: Post[] };
      try {
        backupData = await backup.exportAllData();
        console.log(`Exported ${backupData.artists.length} artists and ${backupData.posts.length} posts.`);
      } catch (err) {
        console.error("Export failed — aborting migration flow.", err);
        await lifecycle.init();
        return;
      }

      // 2. Persist backup to storage.local as a safety net
      try {
        await browser.storage.local.set({ db_migration_backup: backupData });
        console.log("Backup written to storage.local.");
      } catch (err) {
        console.error("Backup write failed — aborting migration flow.", err);
        await lifecycle.init();
        return;
      }

      // 3. Open DB at the new version — triggers onupgradeneeded → MigrationRunner
      try {
        await lifecycle.init();
        console.log(`DB migrated to version ${targetVersion}.`);
      } catch (err) {
        console.error("Migration failed. Backup preserved in storage.local.", err);
        return;
      }

      // 4. Restore all data into the new schema
      try {
        await backup.importData(backupData!);
        console.log("Data restored from backup.");
      } catch (err) {
        console.error("Restore failed. Backup preserved in storage.local.", err);
        return;
      }

      // 5. Clear the backup now that everything succeeded
      try {
        await browser.storage.local.remove('db_migration_backup');
        console.log("Backup cleared. Migration complete.");
      } catch (err) {
        console.warn("Migration succeeded but could not clear backup from storage.local.", err);
      }
    }
  }

  // ── onUpdated ───────────────────────────────────────────────────────────────

  async function onTabUpdated(
    tabId: number,
    changeInfo: browser.tabs._OnUpdatedChangeInfo,
    tab: browser.tabs.Tab,
  ): Promise<void> {
    if (changeInfo.status !== 'complete') return;

    const url = tryParseUrl(tab.url);
    if (!url) return;

    await lifecycle.init(); // lazy guard for service-worker restarts that bypass onInstalled

    if (!Configurations.isHostAllowed(url.host)) return;

    const urlData = ExtractDataFromUrl(url);

    if (urlData.page_type === Pages.PostListPage) {
      const allPosts = await posts.getAll();

      browser.tabs.sendMessage(tabId, {
        type: EventTypes.AddViewTag,
        data: {
          artist_id: null,
          posts: allPosts,
        },
      }).catch(() => {});

      return;
    }

    if (urlData.page_type === Pages.ArtistPage) {
      const artistWithPosts = await tracking.getArtistWithPosts(urlData.artist_id);

      let storedArtist: Artist;
      if (!artistWithPosts) {
        storedArtist = {
          id: urlData.artist_id,
          content_origin: urlData.content_origin,
        };
        await artists.add(storedArtist);
      } else {
        storedArtist = artistWithPosts.artist;
      }

      const now = new Date();
      const lastEnriched = storedArtist.last_enriched_at ? new Date(storedArtist.last_enriched_at) : null;
      const shouldEnrich = !lastEnriched || (now.getTime() - lastEnriched.getTime() > 24 * 60 * 60 * 1000) || !storedArtist.name;

      if (shouldEnrich) {
        try {
          const data = await fetchArtistProfile(url.host, urlData.content_origin, urlData.artist_id);
          if (data) {
            const enrichedArtist = transformArtistProfile(storedArtist, data, url.host);
            await artists.update(enrichedArtist);
          }
        } catch (err) {
          console.warn('Failed to enrich artist details:', err);
        }
      }

      const posts = artistWithPosts ? artistWithPosts.posts : [];

      browser.tabs.sendMessage(tabId, {
        type: EventTypes.AddViewTag,
        data: {
          artist_id: urlData.artist_id,
          posts,
        },
      }).catch(() => {});

      return;
    }

    if (urlData.page_type === Pages.PostPage) {
      let post = await posts.get(urlData.post_id);

      if (post === undefined) {
        const newPost: Post = {
          id: urlData.post_id,
          artist_id: urlData.artist_id,
          viewed_at: GetDate(),
        };
        await posts.add(newPost);
        post = newPost;

        const artist = await artists.get(urlData.artist_id);
        if (!artist) {
          await artists.add({
            id: urlData.artist_id,
            content_origin: urlData.content_origin,
          });
        }
      }

      const shouldEnrich = !post.last_enriched_at;

      if (shouldEnrich) {
        try {
          const data = await fetchPostDetails(url.host, urlData.content_origin, urlData.artist_id, urlData.post_id);
          if (data) {
            const enrichedPost = transformPostProfile(post, data.post, data.attachments, url.host);
            await posts.update(enrichedPost);
          }
        } catch (err) {
          console.warn('Failed to enrich post details:', err);
        }
      }

      browser.tabs.sendMessage(tabId, {
        type: EventTypes.AddPlayerElement,
        data: {},
      }).catch(() => {});
    }
  }

  browser.runtime.onInstalled.addListener(onInstalled);
  browser.tabs.onUpdated.addListener(onTabUpdated);

  return {
    dispose() {
      browser.runtime.onInstalled.removeListener(onInstalled);
      browser.tabs.onUpdated.removeListener(onTabUpdated);
    },
  };
}

// ── Entrypoint ────────────────────────────────────────────────────────────────
createBackgroundApp(createDatabaseServices());
