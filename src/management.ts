import { IndexedDbManager } from "./database/indexedDbManager";
import { Artist } from "./types/Artist";
import { Post } from "./types/Post";

const db = IndexedDbManager.getInstance();

// ── Avatar helpers ────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#7c6af7', '#e05c5c', '#4caf7d', '#f0a500',
  '#2196f3', '#e91e8c', '#00bcd4', '#ff6b35',
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initialsAvatar(name: string, size: number): HTMLElement {
  const el = document.createElement('div');
  el.className = size >= 40 ? 'artist-avatar-fallback' : 'post-artist-avatar-fallback';
  el.style.background = avatarColor(name);
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.textContent = (name || '?').charAt(0);
  return el;
}

function avatarImg(url: string, name: string, size: number): HTMLElement {
  const img = document.createElement('img');
  img.className = size >= 40 ? 'artist-avatar' : 'post-artist-avatar';
  img.src = url;
  img.alt = name;
  img.width = size;
  img.height = size;
  img.onerror = () => img.replaceWith(initialsAvatar(name, size));
  return img;
}

function buildAvatar(artist: Artist, size: number): HTMLElement {
  const name = artist.name || artist.id;
  return artist.thumbnail_url
    ? avatarImg(artist.thumbnail_url, name, size)
    : initialsAvatar(name, size);
}

// ── Date formatting ───────────────────────────────────────────────────────────

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function lastViewedFromPosts(posts: Post[]): string {
  if (!posts.length) return '—';
  const latest = posts.reduce((a, b) => (a.viewed_at > b.viewed_at ? a : b));
  return formatDate(latest.viewed_at);
}

// ── Routing ───────────────────────────────────────────────────────────────────

let artists: Artist[] = [];
let posts: Post[] = [];

async function loadData() {
  [artists, posts] = await Promise.all([db.getAllArtists(), db.getAllPosts()]);
}

function currentPage(): string {
  const hash = window.location.hash.replace('#', '');
  return ['home', 'artists', 'posts'].includes(hash) ? hash : 'home';
}

function render() {
  const page = currentPage();

  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', (a as HTMLElement).dataset.page === page);
  });

  const content = document.getElementById('content')!;

  if (page === 'home')    content.innerHTML = '', content.appendChild(renderHome());
  if (page === 'artists') content.innerHTML = '', content.appendChild(renderArtists());
  if (page === 'posts')   content.innerHTML = '', content.appendChild(renderPosts());
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function deleteArtist(id: string, name: string) {
  if (!confirm(`Delete "${name}" and all their tracked posts?`)) return;
  await db.deleteArtist(id);
  await loadData();
  render();
}

async function deletePost(id: string, title: string) {
  if (!confirm(`Remove "${title}" from your history?`)) return;
  await db.deletePost(id);
  await loadData();
  render();
}

// ── Home page ─────────────────────────────────────────────────────────────────

function renderHome(): HTMLElement {
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
  const latestArtist = latestPost
    ? artists.find(a => a.id === latestPost.artist_id)
    : null;

  const mostActiveArtist = artists.length
    ? artists.map(a => ({ artist: a, count: posts.filter(p => p.artist_id === a.id).length }))
        .reduce((a, b) => (a.count >= b.count ? a : b)).artist
    : null;

  const statDefs = [
    { value: String(artists.length), label: 'Artists Tracked', sub: '' },
    { value: String(posts.length), label: 'Posts Viewed', sub: '' },
    {
      value: mostActiveArtist ? (mostActiveArtist.name || mostActiveArtist.id) : '—',
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
  return wrap;
}

// ── Artists page ──────────────────────────────────────────────────────────────

function renderArtists(): HTMLElement {
  const wrap = document.createElement('div');

  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `<h1>Artists</h1><p>${artists.length} artist${artists.length !== 1 ? 's' : ''} tracked</p>`;
  wrap.appendChild(header);

  if (!artists.length) {
    wrap.appendChild(emptyState('👤', 'No artists tracked yet.\nVisit an artist page on kemono.cr or coomer.st to get started.'));
    return wrap;
  }

  const grid = document.createElement('div');
  grid.className = 'card-grid';

  for (const artist of artists) {
    const artistPosts = posts.filter(p => p.artist_id === artist.id);
    grid.appendChild(renderArtistCard(artist, artistPosts));
  }

  wrap.appendChild(grid);
  return wrap;
}

function renderArtistCard(artist: Artist, artistPosts: Post[]): HTMLElement {
  const card = document.createElement('div');
  card.className = 'artist-card';

  const name = artist.name || artist.id;

  // Header
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
  card.appendChild(header);

  // Body
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

  card.appendChild(body);

  // Footer
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

// ── Posts page ────────────────────────────────────────────────────────────────

function renderPosts(): HTMLElement {
  const wrap = document.createElement('div');

  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `<h1>Posts</h1><p>${posts.length} post${posts.length !== 1 ? 's' : ''} viewed</p>`;
  wrap.appendChild(header);

  if (!posts.length) {
    wrap.appendChild(emptyState('📄', 'No posts tracked yet.\nVisit a post page on kemono.cr or coomer.st to get started.'));
    return wrap;
  }

  // Sort newest first
  const sorted = [...posts].sort((a, b) => (b.viewed_at > a.viewed_at ? 1 : -1));

  const grid = document.createElement('div');
  grid.className = 'card-grid';

  for (const post of sorted) {
    const artist = artists.find(a => a.id === post.artist_id);
    grid.appendChild(renderPostCard(post, artist));
  }

  wrap.appendChild(grid);
  return wrap;
}

function renderPostCard(post: Post, artist: Artist | undefined): HTMLElement {
  const card = document.createElement('div');
  card.className = 'post-card';

  const artistName = artist?.name || post.artist_id || 'Unknown';

  // Header
  const header = document.createElement('div');
  header.className = 'post-card-header';

  if (artist) {
    header.appendChild(buildAvatar(artist, 32));
  } else {
    header.appendChild(initialsAvatar(artistName, 32));
  }

  const artistNameEl = document.createElement('div');
  artistNameEl.className = 'post-card-artist-name';
  artistNameEl.title = artistName;
  artistNameEl.textContent = artistName;
  header.appendChild(artistNameEl);

  card.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = 'post-card-body';

  const title = document.createElement('div');
  title.className = 'post-card-title';
  title.title = post.name || 'Untitled';
  title.textContent = post.name || 'Untitled';
  body.appendChild(title);

  if (post.attachment_count != null && post.attachment_count > 0) {
    const chip = document.createElement('div');
    chip.className = 'attachment-chip';
    chip.textContent = `📎 ${post.attachment_count} attachment${post.attachment_count !== 1 ? 's' : ''}`;
    body.appendChild(chip);
  }

  const meta = document.createElement('div');
  meta.className = 'post-card-meta';

  const metaRows: [string, string][] = [
    ['Viewed', formatDate(post.viewed_at)],
    ['Posted', formatDate(post.posted_at)],
  ];

  for (const [label, value] of metaRows) {
    const row = document.createElement('div');
    row.className = 'post-card-meta-row';
    row.innerHTML = `<span class="label">${escapeHtml(label)}</span><span class="value">${escapeHtml(value)}</span>`;
    meta.appendChild(row);
  }

  body.appendChild(meta);
  card.appendChild(body);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'post-card-footer';
  const delBtn = document.createElement('button');
  delBtn.className = 'btn-delete';
  delBtn.textContent = 'Remove';
  delBtn.addEventListener('click', () => deletePost(post.id, post.name || 'Untitled'));
  footer.appendChild(delBtn);
  card.appendChild(footer);

  return card;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function emptyState(icon: string, text: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'empty-state';
  el.innerHTML = `<div class="empty-icon">${icon}</div><p>${escapeHtml(text).replace('\n', '<br>')}</p>`;
  return el;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function init() {
  await db.init();
  await loadData();

  window.addEventListener('hashchange', render);

  // Set initial hash
  if (!window.location.hash || !['#home', '#artists', '#posts'].includes(window.location.hash)) {
    window.location.hash = '#home';
  }

  render();
}

init().catch(console.error);
