import { Post } from "../../shared/types/Post";

export const AddViewedTagsOnAllPosts = async (document: Document, posts: Post[]) => {
  const processViewedTags = () => {
    // Get all viewed posts for this specific artist from the database
    const viewedPostIds = new Set(posts.map(post => post.id));

    // Find all post cards on the page
    const postCards = document.querySelectorAll<HTMLElement>('[data-id]');

    if (postCards.length === 0) return false;

    postCards.forEach((postCardElement) => {
      const postId = postCardElement.getAttribute('data-id');

      if (!postId || !viewedPostIds.has(postId)) {
        return;
      }

      // Check if the viewed label already exists
      const cardFooterContent = postCardElement.querySelector('footer > div > div');
      if (!cardFooterContent) return;

      // Check if label already exists
      if (cardFooterContent.querySelector('label.viewed-tag')) return;

      // Create a container for the viewed label and unread button
      const viewedTagContainer = document.createElement("span");
      viewedTagContainer.className = "viewed-tag-container";
      viewedTagContainer.style.display = "inline-flex";
      viewedTagContainer.style.alignItems = "center";
      viewedTagContainer.style.gap = "5px";

      // Create and add the viewed label
      const viewedLabel = document.createElement("label");
      viewedLabel.className = "viewed-tag";
      viewedLabel.innerHTML = "viewed";
      viewedLabel.style.color = "#b4ffb4";

      // Create and add the "Mark as Unread" button
      const markAsUnreadButton = document.createElement("button");
      markAsUnreadButton.className = "mark-as-unread-button";
      markAsUnreadButton.innerHTML = "x"; // A simple 'x' or 'Unread'
      markAsUnreadButton.style.cssText = `
        background: none;
        border: 1px solid #b4ffb4;
        color: #b4ffb4;
        font-size: 0.7em;
        line-height: 1;
        cursor: pointer;
        border-radius: 3px;
        padding: 2px 5px;
        margin-left: 5px;
      `;
      markAsUnreadButton.title = "Mark as Unread";
      markAsUnreadButton.setAttribute('data-post-id', postId);

      viewedTagContainer.append(viewedLabel);
      viewedTagContainer.append(markAsUnreadButton);
      cardFooterContent.append(viewedTagContainer);
    });

    return true;
  };

  try {
    // Try processing immediately and retry if needed
    const tryProcess = () => {
      const success = processViewedTags();

      if (!success) {
        setTimeout(() => {
          processViewedTags();
        }, 500);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryProcess);
    } else {
      tryProcess();
    }
  } catch (error) {
    console.error("Error adding viewed tags:", error);
  }
}
