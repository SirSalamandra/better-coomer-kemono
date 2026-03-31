import { Artist } from "../../../shared/types/Artist";
import { Post } from "../../../shared/types/Post";
import { escapeHtml } from "../utils/format";

export function renderHome(
  artists: Artist[],
  posts: Post[],
): HTMLElement {
  const wrap = document.createElement('div');

  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `<h1>Overview</h1><p>Summary of your tracked data</p>`;
  wrap.appendChild(header);

  const statsGrid = document.createElement('div');
  statsGrid.className = 'stats-grid';

  const statDefs = [
    { value: String(artists.length), label: 'Artists Tracked', sub: '' },
    { value: String(posts.length), label: 'Posts Viewed', sub: '' },
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

  return wrap;
}
