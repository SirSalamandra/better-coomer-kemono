import { EventTypes } from "./enums/eventTypes";
import { AddAudioElementsForAudioLinks, AddViewedTagsOnAllPosts } from "./helpers/helpers";
import { ContentMessage } from "./types/ContentMessage";

if (typeof browser === "undefined") {
  //@ts-ignore
  globalThis.browser = chrome;
}

// Use a delegated event listener with capturing to ensure it fires before the website's own handlers
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;

  // Check if the clicked element or its parent is the unread button
  const unreadButton = target.closest('.mark-as-unread-button');
  if (unreadButton) {
    // Stop the event from reaching the post card's navigation handler
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation(); // Be extra sure no other listeners on this element fire

    const postId = unreadButton.getAttribute('data-post-id');
    if (postId) {
      browser.runtime.sendMessage({
        type: EventTypes.RemoveViewTag,
        data: { postId }
      });
    }
  }
}, true); // Use event capturing

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

    case EventTypes.RemoveViewTagFromUI:
      const postIdToRemove = message.data.postId;
      const postCard = document.querySelector(`[data-id="${postIdToRemove}"]`);
      if (postCard) {
        const viewedTagContainer = postCard.querySelector('.viewed-tag-container');
        if (viewedTagContainer) {
          viewedTagContainer.remove();
        }
      }
      break;

    default:
      break;
  }

  return;
});