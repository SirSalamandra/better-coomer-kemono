import { IndexedDbManager } from "../../core/database/indexedDbManager";
import { Artist } from "../../shared/types/Artist";
import { Post } from "../../shared/types/Post";
import { renderHome } from "./pages/home";
import { renderSettings } from "./pages/settings";
import { renderArtists, resetArtistsPage } from "./pages/artists";
import { renderPosts } from "./pages/posts";
import { renderArtistDetail } from "./pages/artistDetail";

// Re-export for backwards compatibility with tests
export { formatDate, lastViewedFromPosts } from "./utils/format";
export { hostForArtist } from "./utils/enrich";

const db = IndexedDbManager.getInstance();

// ── State ─────────────────────────────────────────────────────────────────────

let artists: Artist[] = [];
let posts: Post[] = [];
let filterArtistId: string | null = null;
let selectedArtistId: string | null = null;

async function loadData(): Promise<void> {
  [artists, posts] = await Promise.all([db.getAllArtists(), db.getAllPosts()]);
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function deleteArtist(id: string, name: string): Promise<void> {
  if (!confirm(`Delete "${name}" and all their tracked posts?`)) return;
  await db.deleteArtist(id);
  await loadData();
  render();
}

async function deletePost(id: string, title: string): Promise<void> {
  if (!confirm(`Remove "${title}" from your history?`)) return;
  await db.deletePost(id);
  await loadData();
  render();
}

// ── Routing ───────────────────────────────────────────────────────────────────

function currentPage(): string {
  const hash = window.location.hash.replace('#', '');
  return ['home', 'artists', 'posts', 'artist', 'settings'].includes(hash) ? hash : 'home';
}

function navigate(page: string, id?: string): void {
  filterArtistId   = page === 'posts'  ? (id ?? null) : null;
  selectedArtistId = page === 'artist' ? (id ?? null) : null;
  if (page === 'artists') resetArtistsPage();
  window.location.hash = page;
}

function render(): void {
  const page = currentPage();
  const navPage = page === 'artist' ? 'artists' : page;

  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', (a as HTMLElement).dataset.page === navPage);
  });

  const content = document.getElementById('content')!;
  if (content == null || content.innerHTML == null) return;

  if (page === 'home')     content.innerHTML = '', content.appendChild(renderHome(artists, posts));
  if (page === 'settings') content.innerHTML = '', content.appendChild(renderSettings(db, loadData, render));
  if (page === 'artists') content.innerHTML = '', content.appendChild(renderArtists(artists, posts, navigate, render, loadData, deleteArtist));
  if (page === 'posts')   content.innerHTML = '', content.appendChild(renderPosts(artists, posts, filterArtistId, navigate, loadData, render, deletePost));
  if (page === 'artist')  content.innerHTML = '', content.appendChild(renderArtistDetail(selectedArtistId, artists, posts, navigate, loadData, render, deleteArtist, deletePost));
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  await db.init();
  await loadData();

  document.querySelectorAll('.nav-link').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      navigate((a as HTMLElement).dataset.page!);
    });
  });

  window.addEventListener('hashchange', render);

  if (!window.location.hash || !['#home', '#artists', '#posts', '#artist', '#settings'].includes(window.location.hash)) {
    window.location.hash = '#home';
  }

  render();
}

init().catch(console.error);
