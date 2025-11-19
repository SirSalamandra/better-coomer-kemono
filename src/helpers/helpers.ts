import { Pages } from "../enums/pages";
import { Post } from "../types/Post";
import { URLDataType } from "../types/URLDataType";

export const ExtractDataFromUrl = (url: URL): URLDataType => {
  const pathname = url.pathname;

  const extractedData: URLDataType = {
    artist_id: null,
    content_origin: null,
    page_type: Pages.Unknown,
    post_id: null
  };

  if (pathname === '/posts') {
    extractedData.page_type = Pages.PostListPage;
  }
  else if (pathname.startsWith('/artists')) {
    extractedData.page_type = Pages.ArtistListPage;
  }
  else if (pathname.match(/^\/[^/]+\/user\/[^/]+$/)) {
    // Matches /original_source/user/user_id
    extractedData.page_type = Pages.ArtistPage;

    const parts = pathname.split('/');
    extractedData.content_origin = parts[1];
    extractedData.artist_id = parts[3];
  }

  else if (pathname.match(/^\/[^/]+\/user\/[^/]+\/post\/[^/]+$/)) {
    // Matches /original_source/user/user_id/post/post_id
    extractedData.page_type = Pages.PostPage;

    const parts = pathname.split('/');
    extractedData.content_origin = parts[1];
    extractedData.artist_id = parts[3];
    extractedData.post_id = parts[5];
  }

  return extractedData;
}

export const GetDate = () => {
  return (new Date()).toJSON();
}

export const AddAudioElementsForAudioLinks = (document: Document) => {
  const processAudioLinks = () => {
    // Try multiple selector variations to find the audio links
    let audioLinks = document.querySelectorAll<HTMLAnchorElement>('a[href*=".mp3"], a[href*=".wav"]');

    if (audioLinks.length === 0) return false;

    // Remove duplicates based on href
    const uniqueLinks = new Map<string, HTMLAnchorElement>();
    audioLinks.forEach((link) => {
      if (!uniqueLinks.has(link.href)) {
        uniqueLinks.set(link.href, link);
      }
    });

    // Add audio elements for each unique link
    uniqueLinks.forEach((audioLink) => {
      const parentElement = audioLink.parentElement;
      if (!parentElement) return;

      // Check if audio element already exists
      if (parentElement.querySelector('audio')) return;

      parentElement.style.display = "flex";
      parentElement.style.flexDirection = "column";

      const audioElement = document.createElement("audio");
      audioElement.controls = true;

      const sourceElement = document.createElement("source");
      sourceElement.src = audioLink.href;

      // Set the correct MIME type based on file extension
      if (audioLink.href.toLowerCase().includes('.wav')) {
        sourceElement.type = "audio/wav";
      } else {
        sourceElement.type = "audio/mpeg";
      }

      audioElement.appendChild(sourceElement);
      parentElement.appendChild(audioElement);
    });

    return true;
  };

  // Try processing immediately and retry if needed
  const tryProcess = () => {
    const success = processAudioLinks();

    if (!success) {
      setTimeout(() => {
        processAudioLinks();
      }, 500);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryProcess);
  } else {
    tryProcess();
  }
}

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

      // Create and add the viewed label
      const viewedLabel = document.createElement("label");
      viewedLabel.className = "viewed-tag";
      viewedLabel.innerHTML = "viewed";
      viewedLabel.style.color = "#b4ffb4";

      cardFooterContent.append(viewedLabel);
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