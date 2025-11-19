import { EventTypes } from "./enums/eventTypes";
import { AddAudioElementsForAudioLinks } from "./helpers/helpers";
import { ContentMessage } from "./types/ContentMessage";

if (typeof browser === "undefined") {
  //@ts-ignore
  globalThis.browser = chrome;
}

browser.runtime.onMessage.addListener((message: ContentMessage, sender) => {
  switch (message.type) {
    case EventTypes.AddViewTag:
      // Handle AddViewTag event if needed
      console.log("AddViewTag event received");
      break;

    case EventTypes.AddPlayerElement:
      console.log("AddPlayerElement event received");
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