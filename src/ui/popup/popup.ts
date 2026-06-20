import { IndexedDbManager } from "../../core/database/indexedDbManager";

if (typeof browser === "undefined") {
  //@ts-ignore
  (globalThis as any).browser = chrome;
}

// ── Composition root ──────────────────────────────────────────────────────────

/**
 * Wires and bootstraps the popup page.
 * Accepts `db` explicitly so the page is testable without touching the singleton.
 */
export async function createPopupApp(db: IndexedDbManager): Promise<void> {
  await db.init();
  const [artists, posts] = await Promise.all([db.getAllArtists(), db.getAllPosts()]);
  document.getElementById('artist-count')!.textContent = String(artists.length);
  document.getElementById('post-count')!.textContent = String(posts.length);

  document.getElementById('open-management')?.addEventListener('click', () => {
    browser.tabs.create({ url: browser.runtime.getURL('management.html') });
    window.close();
  });
}

// ── Entrypoint ────────────────────────────────────────────────────────────────

createPopupApp(IndexedDbManager.getInstance()).catch(console.error);
