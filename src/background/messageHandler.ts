import { IndexedDbManager } from "../core/database/indexedDbManager";
import { EventTypes } from "../shared/constants/eventTypes";
import { ContentMessage } from "../shared/types/ContentMessage";
import { GetDate } from "../shared/utils/date";

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
          });
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
          await db.updateArtist({
            ...storedArtist,
            name: data.name || storedArtist.name,
            hostname: urlObj.host,
            thumbnail_url: (data.service && data.id) ? `https://img.${urlObj.host}/icons/${data.service}/${data.id}` : storedArtist.thumbnail_url,
            banner_url: (data.service && data.id) ? `https://img.${urlObj.host}/banners/${data.service}/${data.id}` : storedArtist.banner_url,
            post_count: data.post_count ?? storedArtist.post_count,
            updated_at: data.updated || storedArtist.updated_at,
            last_enriched_at: GetDate(),
          });
          console.log(`Updated artist ${artistId} from intercepted request`);
        }
      }

      // Post response
      else if (url.includes('/post/')) {
        const data = payload;
        const p = data.post;
        if (!p || !p.id) return;

        const storedPost = await db.getPost(p.id);
        if (storedPost) {
          await db.updatePost({
            ...storedPost,
            name: p.title || storedPost.name,
            posted_at: p.published || storedPost.posted_at,
            attachment_count: (data.attachments as any[])?.length ?? storedPost.attachment_count ?? 0,
            last_enriched_at: GetDate(),
          });
          console.log(`Updated post ${p.id} from intercepted request`);
        }
      }
    }
  });
}
