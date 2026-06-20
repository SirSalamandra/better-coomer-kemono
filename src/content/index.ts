import { EventTypes } from "../shared/constants/eventTypes";
import { AddAudioElementsForAudioLinks } from "../features/audioPlayer/dom";
import { AddViewedTagsOnAllPosts } from "../features/viewTracking/dom";
import { ContentMessage } from "../shared/types/ContentMessage";

if (typeof browser === "undefined") {
  //@ts-ignore
  globalThis.browser = chrome;
}

// Inject the interception script into the page context
try {
  const script = document.createElement('script');
  script.src = browser.runtime.getURL('inject.js');
  (document.head || document.documentElement).appendChild(script);
  script.onload = () => script.remove();
} catch (e) {
  console.error('Failed to inject Better Coomer/Kemono interception script:', e);
}

/**
 * Checks if the extension context is still valid.
 * Content scripts can be "invalidated" when the extension is reloaded or updated.
 */
function isContextValid(): boolean {
  try {
    return !!(browser && browser.runtime && browser.runtime.id);
  } catch (e) {
    return false;
  }
}

// Listen for data from the injected script
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data && event.data.type === "BETTER_CK_API_RESPONSE") {
    if (!isContextValid()) return;

    browser.runtime.sendMessage({
      type: EventTypes.UpdateData,
      data: {
        url: event.data.url,
        payload: event.data.payload
      }
    }).catch(() => {
      // Silently ignore "Could not establish connection" errors which are common
      // when the background script is not ready or has been reloaded.
    });
  }
});

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
    if (postId && isContextValid()) {
      browser.runtime.sendMessage({
        type: EventTypes.RemoveViewTag,
        data: { postId }
      }).catch(() => {
        // Silently ignore connection errors
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
