import { Configurations } from "./configurations";
import { IndexedDbManager } from "./database/indexedDbManager";
import { EventTypes } from "./enums/eventTypes";
import { Pages } from "./enums/pages";
import { ExtractDataFromUrl, GetDate } from "./helpers/helpers";
import { Artist } from "./types/Artist";
import { Post } from "./types/Post";
import { ContentMessage } from "./types/ContentMessage";

const db = IndexedDbManager.getInstance();

db.init().then(() => {
  console.log("Database initialized in background script.");
}).catch((error) => {
  console.error("Failed to initialize database in background script:", error);
});

if (typeof browser === "undefined") {
  //@ts-ignore
  globalThis.browser = chrome;
}

browser.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});

browser.runtime.onMessage.addListener(async (message: ContentMessage, sender) => {
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
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
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

    if (!artistWithPosts) {
      const newArtist: Artist = {
        id: urlData.artist_id,
        content_origin: urlData.content_origin,
        hostname: url.hostname,
      }

      await db.addArtist(newArtist);
    }

    const posts = artistWithPosts ? artistWithPosts.posts : [];
    const currentArtist = artistWithPosts
      ? artistWithPosts.artist
      : { id: urlData.artist_id, content_origin: urlData.content_origin, hostname: url.hostname };

    // Fire-and-forget API enrichment
    fetchArtistProfile(url.hostname, urlData.content_origin!, urlData.artist_id!)
      .then(data => db.updateArtist({ ...currentArtist, ...data }))
      .catch(() => {});

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
    const post = await db.getPost(urlData.post_id);

    if (post === undefined) {
      const newPost: Post = {
        id: urlData.post_id,
        artist_id: urlData.artist_id,
        viewed_at: GetDate()
      }

      await db.addPost(newPost);

      // Fire-and-forget API enrichment for new posts
      fetchPostData(url.hostname, urlData.content_origin!, urlData.artist_id!, urlData.post_id!)
        .then(data => db.updatePost({ ...newPost, ...data }))
        .catch(() => {});
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

async function fetchArtistProfile(hostname: string, service: string, artistId: string): Promise<Partial<Artist>> {
  const res = await fetch(
    `https://${hostname}/api/v1/${service}/user/${artistId}/profile`,
    { credentials: 'include' }
  );
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const json = await res.json();
  return {
    name: json.name,
    thumbnail_url: json.avatar ? `https://${hostname}${json.avatar}` : undefined,
    updated_at: new Date().toISOString(),
    hostname,
  };
}

async function fetchPostData(hostname: string, service: string, artistId: string, postId: string): Promise<Partial<Post>> {
  const res = await fetch(
    `https://${hostname}/api/v1/${service}/user/${artistId}/post/${postId}`,
    { credentials: 'include' }
  );
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const json = await res.json();
  return {
    name: json.title,
    posted_at: json.published,
    attachment_count: Array.isArray(json.attachments) ? json.attachments.length : 0,
  };
}
