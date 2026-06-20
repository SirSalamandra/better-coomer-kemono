import { IndexedDbManager } from "../../core/database/indexedDbManager";
import { Artist } from "../../shared/types/Artist";
import { Post } from "../../shared/types/Post";
import { renderHome } from "./pages/home";
import { renderSettings } from "./pages/settings";
import { renderArtists, resetArtistsPage, getPageArtists } from "./pages/artists";
import { renderPosts } from "./pages/posts";
import { renderArtistDetail } from "./pages/artistDetail";
import { enrichArtistSubset, enrichPosts } from "../../core/services/enrichmentService";

// Re-export for backwards compatibility with tests
export { formatDate, lastViewedFromPosts } from "./utils/format";
export { hostForArtist } from "./utils/enrich";

// ── Composition root ──────────────────────────────────────────────────────────

/**
 * Wires and bootstraps the management page with an explicitly-injected `db`.
 * All state and callbacks are local to this call, so the page can be
 * instantiated in isolation (e.g., in tests) without touching the singleton.
 */
export function createManagementApp(db: IndexedDbManager): { init: () => Promise<void> } {
  // ── State ───────────────────────────────────────────────────────────────────

  let artists: Artist[] = [];
  let posts: Post[] = [];
  let filterArtistId: string | null = null;
  let selectedArtistId: string | null = null;

  async function loadData(): Promise<void> {
    [artists, posts] = await Promise.all([db.getAllArtists(), db.getAllPosts()]);
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

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

  // ── Routing ─────────────────────────────────────────────────────────────────

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

  // ── Enrichment orchestration ─────────────────────────────────────────────────

  /**
   * Enriches the data visible on the current page.
   * If the DB was updated, reloads data and re-renders once (no infinite loop).
   */
  async function maybeEnrichCurrentPage(): Promise<void> {
    const page = currentPage();
    let updated = false;

    if (page === 'artists') {
      const pageArtists = getPageArtists(artists);
      updated = await enrichArtistSubset(db, pageArtists);
    } else if (page === 'posts') {
      const visiblePosts = filterArtistId
        ? posts.filter(p => p.artist_id === filterArtistId)
        : posts;
      updated = await enrichPosts(db, visiblePosts, artists);
    } else if (page === 'artist') {
      const artistPosts = selectedArtistId
        ? posts.filter(p => p.artist_id === selectedArtistId)
        : [];
      updated = await enrichPosts(db, artistPosts, artists);
    }

    if (updated) {
      await loadData();
      render();
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

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
    if (page === 'artists')  content.innerHTML = '', content.appendChild(renderArtists(artists, posts, navigate, render, deleteArtist));
    if (page === 'posts')    content.innerHTML = '', content.appendChild(renderPosts(artists, posts, filterArtistId, navigate, deletePost));
    if (page === 'artist')   content.innerHTML = '', content.appendChild(renderArtistDetail(selectedArtistId, artists, posts, navigate, deleteArtist, deletePost));

    // Kick off enrichment after DOM is built — no await, updates reload+rerender on their own
    maybeEnrichCurrentPage().catch(console.error);
  }

  // ── Bootstrap ────────────────────────────────────────────────────────────────

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

  return { init };
}

// ── Entrypoint ────────────────────────────────────────────────────────────────
// Singleton usage is confined to this one line. All downstream logic receives
// an explicit db reference through createManagementApp().

createManagementApp(IndexedDbManager.getInstance()).init().catch(console.error);
