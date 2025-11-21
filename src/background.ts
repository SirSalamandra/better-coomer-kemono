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

  if (
    !Configurations.hostsAllowed.includes(url.host) ||
    changeInfo.status !== 'complete') {
    return;
  }

  const urlData = ExtractDataFromUrl(url);

  if (urlData.page_type === Pages.ArtistPage) {
    const artist = await db.getArtistWithPosts(urlData.artist_id);

    if (!artist) {
      const newArtist: Artist = {
        id: urlData.artist_id,
        content_origin: urlData.content_origin
      }

      await db.addArtist(newArtist);
    }

    const posts = artist ? artist.posts : [];

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