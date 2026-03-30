import { IndexedDbManager } from "../core/database/indexedDbManager";
import { EventTypes } from "../shared/constants/eventTypes";
import { ContentMessage } from "../shared/types/ContentMessage";
import { GetDate } from "../shared/utils/date";
import { transformArtistProfile, transformPostProfile } from "../core/utils/enrichment";
import { PostResponseDTO } from "../shared/types/PostDTO";

export function setupMessageHandler(db: IndexedDbManager): void {
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
          }).catch(() => {});
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
          const enrichedArtist = transformArtistProfile(storedArtist, data, urlObj.host);
          await db.updateArtist(enrichedArtist);
          console.log(`Updated artist ${artistId} from intercepted request`);
        }
      }

      // Post response
      else if (url.includes('/post/')) {
        const data = payload as PostResponseDTO;
        const p = data.post;
        if (!p || !p.id) return;

        const storedPost = await db.getPost(p.id);
        if (storedPost) {
          const enrichedPost = transformPostProfile(storedPost, p, data.attachments);
          await db.updatePost(enrichedPost);
          console.log(`Updated post ${p.id} from intercepted request`);
        }
      }
    }
  });
}
