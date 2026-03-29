import { Configurations } from "./configurations";
import { IndexedDbManager } from "./database/indexedDbManager";
import { EventTypes } from "./enums/eventTypes";
import { Pages } from "./enums/pages";
import { ExtractDataFromUrl, GetDate } from "./helpers/helpers";
import { Artist } from "./types/Artist";
import { Post } from "./types/Post";
import { ContentMessage } from "./types/ContentMessage";

const db = IndexedDbManager.getInstance();

if (typeof browser === "undefined") {
  //@ts-ignore
  globalThis.browser = chrome;
}

browser.runtime.onInstalled.addListener(async (details) => {
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

browser.runtime.onMessage.addListener(async (message: ContentMessage, sender) => {
  await db.init(); // lazy guard for service-worker restarts that bypass onInstalled

  if (message.type === EventTypes.RemoveViewTag) {
    const { postId } = message.data;
    if (postId) {
      await db.deletePost(postId);
      if (sender.tab && sender.tab.id) {
        browser.tabs.sendMessage(sender.tab.id, {
          type: EventTypes.RemoveViewTagFromUI,
          data: { postId }
        });
      }
    }
  }

  if (message.type === EventTypes.UpdateData) {
    const { url, payload } = message.data;
    if (!url || !payload) return;

    const urlObj = new URL(url);

    // Profile response
    if (url.includes('/profile')) {
      const data = payload;
      const artistId = data.id;
      if (!artistId) return;

      const storedArtist = await db.getArtist(artistId);
      if (storedArtist) {
        await db.updateArtist({
          ...storedArtist,
          name: data.name || storedArtist.name,
          hostname: urlObj.host,
          thumbnail_url: (data.service && data.id) ? `https://img.${urlObj.host}/icons/${data.service}/${data.id}` : storedArtist.thumbnail_url,
          banner_url: (data.service && data.id) ? `https://img.${urlObj.host}/banners/${data.service}/${data.id}` : storedArtist.banner_url,
          post_count: data.post_count ?? storedArtist.post_count,
          updated_at: data.updated || storedArtist.updated_at,
          last_enriched_at: GetDate(),
        });
        console.log(`Updated artist ${artistId} from intercepted request`);
      }
    }

    // Post response
    else if (url.includes('/post/')) {
      const data = payload;
      const p = data.post;
      if (!p || !p.id) return;

      const storedPost = await db.getPost(p.id);
      if (storedPost) {
        await db.updatePost({
          ...storedPost,
          name: p.title || storedPost.name,
          posted_at: p.published || storedPost.posted_at,
          attachment_count: (data.attachments as any[])?.length ?? storedPost.attachment_count ?? 0,
          last_enriched_at: GetDate(),
        });
        console.log(`Updated post ${p.id} from intercepted request`);
      }
    }
  }
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  await db.init(); // lazy guard for service-worker restarts that bypass onInstalled

  const url = new URL(tab.url);

  // only proceed for hosts we care about – the helper handles
  // wildcard/TLD‑changes so we don't need to keep the list up to date.
  if (
    !Configurations.isHostAllowed(url.host) ||
    changeInfo.status !== 'complete') {
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
        const apiUrl = `https://${url.host}/api/v1/${urlData.content_origin}/user/${urlData.artist_id}/profile`;
        const res = await fetch(apiUrl, { headers: { 'Accept': 'text/css' } });
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) {
            await db.updateArtist({
              ...storedArtist,
              name: data.name || storedArtist.name,
              hostname: url.host,
              thumbnail_url: (data.service && data.id) ? `https://img.${url.host}/icons/${data.service}/${data.id}` : storedArtist.thumbnail_url,
              banner_url: (data.service && data.id) ? `https://img.${url.host}/banners/${data.service}/${data.id}` : storedArtist.banner_url,
              post_count: data.post_count ?? storedArtist.post_count,
              updated_at: data.updated || storedArtist.updated_at,
              last_enriched_at: GetDate(),
            });
          }
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
    });

    browser.tabs.sendMessage(tabId, {
      type: EventTypes.ExtractArtistInfo,
      data: {}
    });

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

    // Refresh post details if more than 24h passed or data is missing
    const now = new Date();
    const lastEnriched = post.last_enriched_at ? new Date(post.last_enriched_at) : null;
    const shouldEnrich = !lastEnriched || (now.getTime() - lastEnriched.getTime() > 24 * 60 * 60 * 1000) || !post.name;

    if (shouldEnrich) {
      try {
        const apiUrl = `https://${url.host}/api/v1/${urlData.content_origin}/user/${urlData.artist_id}/post/${urlData.post_id}`;
        const res = await fetch(apiUrl, { headers: { 'Accept': 'text/css' } });
        if (res.ok) {
          const data = await res.json();
          if (data && data.post) {
            const p = data.post;
            await db.updatePost({
              ...post,
              name: p.title || post.name,
              posted_at: p.published || post.posted_at,
              attachment_count: (data.attachments as any[])?.length ?? post.attachment_count ?? 0,
              last_enriched_at: GetDate(),
            });
          }
        }
      } catch (err) {
        console.warn('Failed to enrich post details:', err);
      }
    }

    browser.tabs.sendMessage(tabId, {
      type: EventTypes.AddPlayerElement,
      data: {}
    });

    browser.tabs.sendMessage(tabId, {
      type: EventTypes.ExtractPostInfo,
      data: {}
    });

    return;
  }
});
