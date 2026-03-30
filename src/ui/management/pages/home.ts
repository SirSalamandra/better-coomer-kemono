import { IndexedDbManager } from "../../../core/database/indexedDbManager";
import { Artist } from "../../../shared/types/Artist";
import { Post } from "../../../shared/types/Post";
import { escapeHtml, formatDate } from "../utils/format";

export function renderHome(
  artists: Artist[],
  posts: Post[],
  db: IndexedDbManager,
  loadData: () => Promise<void>,
  render: () => void,
): HTMLElement {
  const wrap = document.createElement('div');

  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `<h1>Overview</h1><p>Summary of your tracked data</p>`;
  wrap.appendChild(header);

  const statsGrid = document.createElement('div');
  statsGrid.className = 'stats-grid';

  const latestPost = posts.length
    ? posts.reduce((a, b) => (a.viewed_at > b.viewed_at ? a : b))
    : null;

  const mostActiveArtist = artists.length
    ? artists.map(a => ({ artist: a, count: posts.filter(p => p.artist_id === a.id).length }))
        .reduce((a, b) => (a.count >= b.count ? a : b)).artist
    : null;

  const statDefs = [
    { value: String(artists.length), label: 'Artists Tracked', sub: '' },
    { value: String(posts.length), label: 'Posts Viewed', sub: '' },
    {
      value: mostActiveArtist ? (mostActiveArtist.name || 'Unknown') : '—',
      label: 'Most Tracked Artist',
      sub: mostActiveArtist ? `${posts.filter(p => p.artist_id === mostActiveArtist.id).length} posts` : '',
    },
    {
      value: latestPost ? (latestPost.name || 'Untitled') : '—',
      label: 'Last Viewed Post',
      sub: latestPost ? formatDate(latestPost.viewed_at) : '',
    },
  ];

  for (const def of statDefs) {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `
      <div class="stat-value">${escapeHtml(def.value)}</div>
      <div class="stat-label">${escapeHtml(def.label)}</div>
      ${def.sub ? `<div class="stat-sub">${escapeHtml(def.sub)}</div>` : ''}
    `;
    statsGrid.appendChild(card);
  }

  wrap.appendChild(statsGrid);

  const danger = document.createElement('div');
  danger.className = 'danger-zone';
  danger.innerHTML = `<div class="section-title">Danger Zone</div>`;

  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn-danger-action';
  resetBtn.textContent = 'Reset Database';
  resetBtn.addEventListener('click', async () => {
    if (!confirm('This will permanently delete all tracked artists and posts. Continue?')) return;
    await db.reset();
    await loadData();
    render();
  });

  danger.appendChild(resetBtn);
  wrap.appendChild(danger);

  return wrap;
}
