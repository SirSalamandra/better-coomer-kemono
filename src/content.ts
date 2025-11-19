import { EventTypes } from "./enums/eventTypes";
import { AddAudioElementsForAudioLinks, AddViewedTagsOnAllPosts } from "./helpers/helpers";
import { ContentMessage } from "./types/ContentMessage";

if (typeof browser === "undefined") {
  //@ts-ignore
  globalThis.browser = chrome;
}

browser.runtime.onMessage.addListener((message: ContentMessage, sender) => {
  switch (message.type) {
    case EventTypes.AddViewTag:
      const posts = message.data.posts;
      AddViewedTagsOnAllPosts(document, posts);
      break;

    case EventTypes.AddPlayerElement:
      AddAudioElementsForAudioLinks(document);
      break;

    case EventTypes.ExtractArtistInfo:
      // Handle ExtractArtistInfo event if needed
      console.log("ExtractArtistInfo event received");
      break;

    case EventTypes.ExtractPostInfo:
      // Handle ExtractPostInfo event if needed
      console.log("ExtractPostInfo event received");
      break;

    default:
      break;
  }

  return;
});