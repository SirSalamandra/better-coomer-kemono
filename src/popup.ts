import { IndexedDbManager } from "./database/indexedDbManager";

if (typeof browser === "undefined") {
  //@ts-ignore
  (globalThis as any).browser = chrome;
}

const db = IndexedDbManager.getInstance();

db.init().then(async () => {
  const [artists, posts] = await Promise.all([db.getAllArtists(), db.getAllPosts()]);
  document.getElementById('artist-count')!.textContent = String(artists.length);
  document.getElementById('post-count')!.textContent = String(posts.length);
});

document.getElementById('open-management')?.addEventListener('click', () => {
  browser.tabs.create({ url: browser.runtime.getURL('management.html') });
  window.close();
});
