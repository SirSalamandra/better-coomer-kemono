import { Artist } from "../../../shared/types/Artist";
import { Post } from "../../../shared/types/Post";
import { buildAvatar } from "../utils/avatar";
import { emptyState, escapeHtml, formatDate, lastViewedFromPosts } from "../utils/format";
import { enrichArtists } from "../utils/enrich";

let artistsPage = 1;
const ARTISTS_PER_PAGE = 12;

export function resetArtistsPage(): void {
  artistsPage = 1;
}

export function renderArtists(
  artists: Artist[],
  posts: Post[],
  navigate: (page: string, id?: string) => void,
  render: () => void,
  loadData: () => Promise<void>,
  deleteArtist: (id: string, name: string) => void,
): HTMLElement {
  const wrap = document.createElement('div');

  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `<h1>Artists</h1><p>${artists.length} artist${artists.length !== 1 ? 's' : ''} tracked</p>`;
  wrap.appendChild(header);

  if (!artists.length) {
    wrap.appendChild(emptyState('👤', 'No artists tracked yet.\nVisit an artist page on kemono.cr or coomer.st to get started.'));
    return wrap;
  }

  const totalPages = Math.ceil(artists.length / ARTISTS_PER_PAGE);
  artistsPage = Math.max(1, Math.min(artistsPage, totalPages));

  const start = (artistsPage - 1) * ARTISTS_PER_PAGE;
  const pageArtists = artists.slice(start, start + ARTISTS_PER_PAGE);

  const grid = document.createElement('div');
  grid.className = 'card-grid';

  for (const artist of pageArtists) {
    const artistPosts = posts.filter(p => p.artist_id === artist.id);
    grid.appendChild(renderArtistCard(artist, artistPosts, navigate, deleteArtist));
  }

  wrap.appendChild(grid);

  if (totalPages > 1) {
    const pager = document.createElement('div');
    pager.className = 'pagination';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn-page';
    prevBtn.textContent = '←';
    prevBtn.disabled = artistsPage === 1;
    prevBtn.addEventListener('click', () => { artistsPage--; render(); });

    const pageInfo = document.createElement('span');
    pageInfo.className = 'page-info';
    pageInfo.textContent = `${artistsPage} / ${totalPages}`;

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn-page';
    nextBtn.textContent = '→';
    nextBtn.disabled = artistsPage === totalPages;
    nextBtn.addEventListener('click', () => { artistsPage++; render(); });

    pager.appendChild(prevBtn);
    pager.appendChild(pageInfo);
    pager.appendChild(nextBtn);
    wrap.appendChild(pager);
  }

  enrichArtists(pageArtists, loadData, render).catch(console.error);

  return wrap;
}

function renderArtistCard(
  artist: Artist,
  artistPosts: Post[],
  navigate: (page: string, id?: string) => void,
  deleteArtist: (id: string, name: string) => void,
): HTMLElement {
  const card = document.createElement('div');
  card.className = 'artist-card';

  const name = artist.name || artist.id;

  const clickable = document.createElement('div');
  clickable.className = 'artist-card-clickable';
  clickable.addEventListener('click', () => navigate('artist', artist.id));

  const header = document.createElement('div');
  header.className = 'artist-card-header';
  header.appendChild(buildAvatar(artist, 48));

  const nameRow = document.createElement('div');
  nameRow.className = 'artist-card-name-row';

  const nameEl = document.createElement('div');
  nameEl.className = 'artist-card-name';
  nameEl.title = name;
  nameEl.textContent = name;
  nameRow.appendChild(nameEl);

  const badges = document.createElement('div');
  badges.className = 'artist-card-badges';
  if (artist.content_origin) {
    const b = document.createElement('span');
    b.className = 'badge badge-service';
    b.textContent = artist.content_origin;
    badges.appendChild(b);
  }
  if (artist.hostname) {
    const b = document.createElement('span');
    b.className = 'badge badge-host';
    b.textContent = artist.hostname;
    badges.appendChild(b);
  }
  nameRow.appendChild(badges);
  header.appendChild(nameRow);
  clickable.appendChild(header);

  const body = document.createElement('div');
  body.className = 'artist-card-body';

  const postsLabel = artist.post_count != null
    ? `${artistPosts.length} viewed / ${artist.post_count} total`
    : `${artistPosts.length} viewed`;

  const stats: [string, string][] = [
    ['Posts', postsLabel],
    ['Last Viewed', lastViewedFromPosts(artistPosts)],
    ['Updated', formatDate(artist.updated_at)],
  ];

  for (const [label, value] of stats) {
    const row = document.createElement('div');
    row.className = 'artist-card-stat';
    row.innerHTML = `<span class="label">${escapeHtml(label)}</span><span class="value">${escapeHtml(value)}</span>`;
    body.appendChild(row);
  }

  clickable.appendChild(body);
  card.appendChild(clickable);

  const footer = document.createElement('div');
  footer.className = 'artist-card-footer';
  const delBtn = document.createElement('button');
  delBtn.className = 'btn-delete';
  delBtn.textContent = 'Delete';
  delBtn.addEventListener('click', () => deleteArtist(artist.id, name));
  footer.appendChild(delBtn);
  card.appendChild(footer);

  return card;
}
