import { Configurations } from "./configurations";
import { IndexedDbManager } from "./database/indexedDbManager";
import { EventTypes } from "./enums/eventTypes";
import { Pages } from "./enums/pages";
import { ExtractDataFromUrl, GetDate } from "./helpers/helpers";
import { Artist } from "./types/Artist";
import { Post } from "./types/Post";

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

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const url = new URL(tab.url);

  if (
    !Configurations.hostsAllowed.includes(url.host) ||
    changeInfo.status !== 'complete') {
    return;
  }

  const urlData = ExtractDataFromUrl(url);

  if (urlData.page_type === Pages.ArtistPage) {
    console.log("Artist page detected");

    const artist = await db.getArtist(urlData.artist_id);

    if (artist === undefined) {
      const newArtist: Artist = {
        id: urlData.artist_id,
        content_origin: urlData.content_origin
      }

      await db.addArtist(newArtist);

      console.log("Artist not found in the database, saving...");
    }

    browser.tabs.sendMessage(tabId, {
      type: EventTypes.AddViewTag,
      data: {}
    });

    browser.tabs.sendMessage(tabId, {
      type: EventTypes.ExtractArtistInfo,
      data: {}
    });

    return;
  }

  else if (urlData.page_type === Pages.PostPage) {
    console.log("Post page detected");

    const post = await db.getPost(urlData.post_id);

    if (post === undefined) {
      const newPost: Post = {
        id: urlData.post_id,
        artist_id: urlData.artist_id,
        viewed_at: GetDate()
      }

      await db.addPost(newPost);

      console.log("Post not found in the database, saving...");
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