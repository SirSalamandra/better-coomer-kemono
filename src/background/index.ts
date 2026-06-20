import { Configurations } from "../core/config";
import { IndexedDbManager } from "../core/database/indexedDbManager";
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

const db = IndexedDbManager.getInstance();

if (typeof browser === "undefined") {
  //@ts-ignore
  globalThis.browser = chrome;
}

setupMessageHandler(db);

/**
 * If BetterSU_DB (the old database name) exists, migrates all data from it into
 * BetterCK_DB and then deletes the old database.
 * Safe to call on every onInstalled event — no-ops when the legacy DB is absent.
 */
async function migrateLegacyDbIfNeeded(): Promise<void> {
  const legacyData = await db.exportFromLegacyDb();
  if (!legacyData) return;

  console.log(`Found legacy BetterSU_DB with ${legacyData.artists.length} artists and ${legacyData.posts.length} posts. Migrating to BetterCK_DB...`);

  try {
    await db.init();
    await db.importData(legacyData);
    await db.deleteLegacyDb();
    console.log('Legacy DB migration complete. BetterSU_DB deleted.');
  } catch (err) {
    console.error('Legacy DB migration failed. BetterSU_DB preserved.', err);
  }
}

browser.runtime.onInstalled.addListener(async (details) => {
  await migrateLegacyDbIfNeeded();

  if (details.reason === 'install') {
    console.log("Extension installed. Initializing database...");
    await db.init();
    return;
  }

  if (details.reason === 'update') {
    const storedVersion = await db.getStoredVersion();
    const targetVersion = db.getTargetVersion();

    if (storedVersion >= targetVersion) {
      console.log(`DB already at version ${storedVersion}, no migration needed.`);
      await db.init();
      return;
    }

    console.log(`Migrating DB from version ${storedVersion} to ${targetVersion}...`);

    // 1. Export all data at the old schema before any migration runs
    let backup: { artists: Artist[]; posts: Post[] };
    try {
      backup = await db.exportAllData();
      console.log(`Exported ${backup.artists.length} artists and ${backup.posts.length} posts.`);
    } catch (err) {
      console.error("Export failed — aborting migration flow.", err);
      await db.init();
      return;
    }

    // 2. Persist backup to storage.local as a safety net
    try {
      await browser.storage.local.set({ db_migration_backup: backup });
      console.log("Backup written to storage.local.");
    } catch (err) {
      console.error("Backup write failed — aborting migration flow.", err);
      await db.init();
      return;
    }

    // 3. Open DB at the new version — triggers onupgradeneeded → MigrationRunner
    try {
      await db.init();
      console.log(`DB migrated to version ${targetVersion}.`);
    } catch (err) {
      console.error("Migration failed. Backup preserved in storage.local.", err);
      return;
    }

    // 4. Restore all data into the new schema
    try {
      await db.importData(backup);
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
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;

  const url = tryParseUrl(tab.url);
  if (!url) return;

  await db.init(); // lazy guard for service-worker restarts that bypass onInstalled

  // only proceed for hosts we care about – the helper handles
  // wildcard/TLD‑changes so we don't need to keep the list up to date.
  if (!Configurations.isHostAllowed(url.host)) {
    return;
  }

  const urlData = ExtractDataFromUrl(url);

  if (urlData.page_type === Pages.ArtistPage) {
    const artistWithPosts = await db.getArtistWithPosts(urlData.artist_id);

    let storedArtist: Artist;
    if (!artistWithPosts) {
      storedArtist = {
        id: urlData.artist_id,
        content_origin: urlData.content_origin
      };
      await db.addArtist(storedArtist);
    } else {
      storedArtist = artistWithPosts.artist;
    }

    // Refresh artist details if more than 24h passed or data is missing
    const now = new Date();
    const lastEnriched = storedArtist.last_enriched_at ? new Date(storedArtist.last_enriched_at) : null;
    const shouldEnrich = !lastEnriched || (now.getTime() - lastEnriched.getTime() > 24 * 60 * 60 * 1000) || !storedArtist.name;

    if (shouldEnrich) {
      try {
        const data = await fetchArtistProfile(url.host, urlData.content_origin, urlData.artist_id);
        if (data) {
          const enrichedArtist = transformArtistProfile(storedArtist, data, url.host);
          await db.updateArtist(enrichedArtist);
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
        posts: posts
      }
    }).catch(() => {});

    return;
  }

  else if (urlData.page_type === Pages.PostPage) {
    let post = await db.getPost(urlData.post_id);

    if (post === undefined) {
      const newPost: Post = {
        id: urlData.post_id,
        artist_id: urlData.artist_id,
        viewed_at: GetDate()
      };
      await db.addPost(newPost);
      post = newPost;
    }

    // Enrich post details once and store forever
    const shouldEnrich = !post.last_enriched_at;

    if (shouldEnrich) {
      try {
        const data = await fetchPostDetails(url.host, urlData.content_origin, urlData.artist_id, urlData.post_id);
        if (data) {
          const enrichedPost = transformPostProfile(post, data.post, data.attachments, url.host);
          await db.updatePost(enrichedPost);
        }
      } catch (err) {
        console.warn('Failed to enrich post details:', err);
      }
    }

    browser.tabs.sendMessage(tabId, {
      type: EventTypes.AddPlayerElement,
      data: {}
    }).catch(() => {});

    return;
  }
});
