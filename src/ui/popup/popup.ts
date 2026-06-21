import { DatabaseLifecycle, ArtistStore, PostStore } from "../../core/database/contracts";
import { createDatabaseServices } from "../../core/database/createDatabaseServices";

if (typeof browser === "undefined") {
  //@ts-ignore
  (globalThis as any).browser = chrome;
}

// ── Composition root ──────────────────────────────────────────────────────────

/**
 * Wires and bootstraps the popup page.
 * Accepts `db` explicitly so the page is testable without touching the singleton.
 */
type PopupServices = {
  lifecycle: DatabaseLifecycle;
  artists: Pick<ArtistStore, "getAll">;
  posts: Pick<PostStore, "getAll">;
};

export async function createPopupApp({ lifecycle, artists, posts }: PopupServices): Promise<void> {
  await lifecycle.init();
  const [allArtists, allPosts] = await Promise.all([artists.getAll(), posts.getAll()]);
  document.getElementById('artist-count')!.textContent = String(allArtists.length);
  document.getElementById('post-count')!.textContent = String(allPosts.length);

  document.getElementById('open-management')?.addEventListener('click', () => {
    browser.tabs.create({ url: browser.runtime.getURL('management.html') });
    window.close();
  });
}

// ── Entrypoint ────────────────────────────────────────────────────────────────

createPopupApp(createDatabaseServices()).catch(console.error);
