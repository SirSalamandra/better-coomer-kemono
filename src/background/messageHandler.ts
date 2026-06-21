import { DatabaseLifecycle, ArtistStore, PostStore } from "../core/database/contracts";
import { EventTypes } from "../shared/constants/eventTypes";
import { ContentMessage } from "../shared/types/ContentMessage";
import { GetDate } from "../shared/utils/date";
import { transformArtistProfile, transformPostProfile } from "../core/utils/enrichment";
import { PostResponseDTO } from "../shared/types/PostDTO";

type MessageHandlerServices = {
  lifecycle: DatabaseLifecycle;
  artists: Pick<ArtistStore, "get" | "update">;
  posts: Pick<PostStore, "get" | "update" | "delete">;
};

export function setupMessageHandler({ lifecycle, artists, posts }: MessageHandlerServices): void {
  browser.runtime.onMessage.addListener(async (message: ContentMessage, sender) => {
    await lifecycle.init(); // lazy guard for service-worker restarts that bypass onInstalled

    if (message.type === EventTypes.RemoveViewTag) {
      const { postId } = message.data;
      if (postId) {
        await posts.delete(postId);
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

        const storedArtist = await artists.get(artistId);
        if (storedArtist) {
          const enrichedArtist = transformArtistProfile(storedArtist, data, urlObj.host);
          await artists.update(enrichedArtist);
          console.log(`Updated artist ${artistId} from intercepted request`);
        }
      }

      // Post response
      else if (url.includes('/post/')) {
        const data = payload as PostResponseDTO;
        const p = data.post;
        if (!p || !p.id) return;

        const storedPost = await posts.get(p.id);
        if (storedPost) {
          const enrichedPost = transformPostProfile(storedPost, p, data.attachments);
          await posts.update(enrichedPost);
          console.log(`Updated post ${p.id} from intercepted request`);
        }
      }
    }
  });
}
