import { IndexedDbManager } from "./database/indexedDbManager";
import { Artist } from "./types/Artist";
import { Post } from "./types/Post";
import { ArtistProfileDTO } from "./types/ArtistProfileDTO";
import { GetDate } from "./helpers/helpers";

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

export function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function lastViewedFromPosts(posts: Post[]): string {
  if (!posts.length) return '—';
  const latest = posts.reduce((a, b) => (a.viewed_at > b.viewed_at ? a : b));
  return formatDate(latest.viewed_at);
}

// ── Post enrichment (text fields → DB, thumbnail → in-memory only) ───────────

/** Thumbnail URL cache only — name/posted_at/attachment_count go to IndexedDB */
const postCache = new Map<string, string | null>(); // postId → thumbnail_url | null

async function enrichPostsForArtists(visiblePosts: Post[]): Promise<void> {
  // Collect artist IDs that have at least one post needing enrichment
  const artistIds = new Set<string>();
  for (const post of visiblePosts) {
    if (!post.artist_id) continue;
    if (!postCache.has(post.id) || !post.name) artistIds.add(post.artist_id);
  }
  if (!artistIds.size) return;

  let dbUpdated = false;

  await Promise.allSettled([...artistIds].map(async (artistId) => {
    const artist = artists.find(a => a.id === artistId);
    if (!artist) return;

    const host = hostForArtist(artist);
    // Map of tracked post IDs → stored Post (only those in current view)
    const remaining = new Map(
      visiblePosts.filter(p => p.artist_id === artistId).map(p => [p.id, p])
    );

    let offset = 0;
    while (remaining.size > 0) {
      const res = await fetch(
        `https://${host}/api/v1/${artist.content_origin}/user/${artist.id}/posts?limit=50&o=${offset}`,
        { headers: { 'Accept': 'text/css' } }
      );
      if (!res.ok) break;

      const page: any[] = await res.json();
      if (!page.length) break;

      for (const apiPost of page) {
        const stored = remaining.get(apiPost.id);
        if (!stored) continue;

        remaining.delete(apiPost.id);

        // Cache thumbnail in-memory
        postCache.set(
          apiPost.id,
          apiPost.file?.path
            ? `https://img.${host}/thumbnail/data${apiPost.file.path}`
            : null
        );

        // Persist text fields to DB only if missing
        if (!stored.name) {
          await db.updatePost({
            ...stored,
            name: apiPost.title,
            posted_at: apiPost.published,
            attachment_count: (apiPost.attachments as any[])?.length ?? 0,
            last_enriched_at: GetDate(),
          });
          dbUpdated = true;
        }
      }

      if (page.length < 50 || remaining.size === 0) break;
      offset += 50;
    }
  }));

  if (dbUpdated) await loadData();
  render();
}

// ── API enrichment ────────────────────────────────────────────────────────────

const COOMER_SERVICES = new Set(['onlyfans', 'fansly', 'candfans', 'ppv.land', 'manyvids']);

export function hostForArtist(artist: Artist): string {
  if (artist.hostname) {
    if (artist.hostname.includes('coomer')) return 'coomer.st';
    if (artist.hostname.includes('kemono')) return 'kemono.cr';
  }
  return COOMER_SERVICES.has(artist.content_origin.toLowerCase()) ? 'coomer.st' : 'kemono.cr';
}

async function enrichArtists(subset: Artist[]): Promise<void> {
  const toEnrich = subset.filter(a => !a.name || !a.banner_url);
  if (!toEnrich.length) return;

  await Promise.allSettled(toEnrich.map(async (artist) => {
    const host = hostForArtist(artist);
    const url = `https://${host}/api/v1/${artist.content_origin}/user/${artist.id}/profile`;

    const res = await fetch(url, { headers: { 'Accept': 'text/css' } });
    if (!res.ok) return;

    const data: ArtistProfileDTO = await res.json();

    await db.updateArtist({
      ...artist,
      name: data.name,
      hostname: host,
      thumbnail_url: `https://img.${host}/icons/${data.service}/${data.id}`,
      banner_url: `https://img.${host}/banners/${data.service}/${data.id}`,
      post_count: data.post_count,
      updated_at: data.updated,
      last_enriched_at: GetDate(),
    });
  }));

  await loadData();
  render();
}

// ── Routing ───────────────────────────────────────────────────────────────────

let artists: Artist[] = [];
let posts: Post[] = [];
let filterArtistId: string | null = null;
let selectedArtistId: string | null = null;
let artistsPage = 1;
const ARTISTS_PER_PAGE = 12;

async function loadData() {
  [artists, posts] = await Promise.all([db.getAllArtists(), db.getAllPosts()]);
}

function currentPage(): string {
  const hash = window.location.hash.replace('#', '');
  return ['home', 'artists', 'posts', 'artist'].includes(hash) ? hash : 'home';
}

function navigate(page: string, id?: string) {
  filterArtistId   = page === 'posts'   ? (id ?? null) : null;
  selectedArtistId = page === 'artist'  ? (id ?? null) : null;
  if (page === 'artists') artistsPage = 1;
  window.location.hash = page;
}

function render() {
  const page = currentPage();
  const navPage = page === 'artist' ? 'artists' : page;

  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', (a as HTMLElement).dataset.page === navPage);
  });

  const content = document.getElementById('content')!;

  if (page === 'home')    content.innerHTML = '', content.appendChild(renderHome());
  if (page === 'artists') content.innerHTML = '', content.appendChild(renderArtists());
  if (page === 'posts')   content.innerHTML = '', content.appendChild(renderPosts());
  if (page === 'artist')  content.innerHTML = '', content.appendChild(renderArtistDetail());
}

// ── Artist detail page ────────────────────────────────────────────────────────

function renderArtistDetail(): HTMLElement {
  const artist = selectedArtistId ? artists.find(a => a.id === selectedArtistId) : null;
  if (!artist) {
    navigate('artists');
    return document.createElement('div');
  }

  const artistPosts = posts.filter(p => p.artist_id === artist.id);
  const name = artist.name || artist.id;
  const wrap = document.createElement('div');
  wrap.className = 'artist-detail-wrap';

  // ── Hero banner ──
  const hero = document.createElement('div');
  hero.className = 'artist-detail-hero';

  const heroBg = artist.banner_url || artist.thumbnail_url;
  if (heroBg) {
    hero.style.setProperty('--hero-bg', `url('${heroBg}')`);
  }

  const heroOverlay = document.createElement('div');
  heroOverlay.className = 'artist-detail-hero-overlay';

  // Back button
  const backBtn = document.createElement('button');
  backBtn.className = 'btn-back';
  backBtn.textContent = '← Artists';
  backBtn.addEventListener('click', () => navigate('artists'));
  heroOverlay.appendChild(backBtn);

  // Main hero content row
  const heroContent = document.createElement('div');
  heroContent.className = 'artist-detail-hero-content';

  // Large avatar
  const avatarWrap = document.createElement('div');
  avatarWrap.className = 'artist-detail-avatar-wrap';
  avatarWrap.appendChild(buildAvatar(artist, 80));
  heroContent.appendChild(avatarWrap);

  // Name + badges + actions
  const heroInfo = document.createElement('div');
  heroInfo.className = 'artist-detail-hero-info';

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
  heroInfo.appendChild(badges);

  const nameEl = document.createElement('h1');
  nameEl.className = 'artist-detail-name';
  nameEl.textContent = name;
  heroInfo.appendChild(nameEl);

  const actions = document.createElement('div');
  actions.className = 'artist-detail-actions';

  const host = hostForArtist(artist);
  const profileUrl = `https://${host}/${artist.content_origin}/user/${artist.id}`;
  const openLink = document.createElement('a');
  openLink.className = 'btn-detail-action';
  openLink.href = profileUrl;
  openLink.target = '_blank';
  openLink.rel = 'noopener noreferrer';
  openLink.textContent = 'Open profile';
  actions.appendChild(openLink);

  const delBtn = document.createElement('button');
  delBtn.className = 'btn-detail-danger';
  delBtn.textContent = 'Delete artist';
  delBtn.addEventListener('click', async () => {
    if (!confirm(`Delete "${name}" and all their tracked posts?`)) return;
    await db.deleteArtist(artist.id);
    await loadData();
    navigate('artists');
  });
  actions.appendChild(delBtn);

  heroInfo.appendChild(actions);
  heroContent.appendChild(heroInfo);

  // Stat strip (right side)
  const statsStrip = document.createElement('div');
  statsStrip.className = 'artist-detail-stats-strip';

  const postsLabel = artist.post_count != null
    ? `${artistPosts.length} / ${artist.post_count}`
    : `${artistPosts.length}`;

  const statItems: [string, string][] = [
    ['Posts viewed', postsLabel],
    ['Last viewed', lastViewedFromPosts(artistPosts)],
    ['Updated', formatDate(artist.updated_at)],
  ];

  for (const [label, value] of statItems) {
    const item = document.createElement('div');
    item.className = 'artist-detail-stat-item';
    item.innerHTML = `<div class="detail-stat-value">${escapeHtml(value)}</div><div class="detail-stat-label">${escapeHtml(label)}</div>`;
    statsStrip.appendChild(item);
  }

  heroContent.appendChild(statsStrip);
  heroOverlay.appendChild(heroContent);
  hero.appendChild(heroOverlay);
  wrap.appendChild(hero);

  // ── Posts section ──
  const postsSection = document.createElement('div');
  postsSection.className = 'artist-detail-posts';

  const sectionHeader = document.createElement('div');
  sectionHeader.className = 'section-title';
  sectionHeader.textContent = `${artistPosts.length} post${artistPosts.length !== 1 ? 's' : ''} viewed`;
  postsSection.appendChild(sectionHeader);

  if (!artistPosts.length) {
    postsSection.appendChild(emptyState('📄', 'No posts tracked for this artist yet.'));
  } else {
    const sorted = [...artistPosts].sort((a, b) => (b.viewed_at > a.viewed_at ? 1 : -1));
    const grid = document.createElement('div');
    grid.className = 'card-grid';
    for (const post of sorted) {
      grid.appendChild(renderPostCard(post, artist, false));
    }
    postsSection.appendChild(grid);
    enrichPostsForArtists(sorted).catch(console.error);
  }

  wrap.appendChild(postsSection);
  return wrap;
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

  // Danger zone
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

  const totalPages = Math.ceil(artists.length / ARTISTS_PER_PAGE);
  artistsPage = Math.max(1, Math.min(artistsPage, totalPages));

  const start = (artistsPage - 1) * ARTISTS_PER_PAGE;
  const pageArtists = artists.slice(start, start + ARTISTS_PER_PAGE);

  const grid = document.createElement('div');
  grid.className = 'card-grid';

  for (const artist of pageArtists) {
    const artistPosts = posts.filter(p => p.artist_id === artist.id);
    grid.appendChild(renderArtistCard(artist, artistPosts));
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

  // Enrich only the artists currently visible
  enrichArtists(pageArtists).catch(console.error);

  return wrap;
}

function renderArtistCard(artist: Artist, artistPosts: Post[]): HTMLElement {
  const card = document.createElement('div');
  card.className = 'artist-card';

  const name = artist.name || artist.id;

  // Clickable area (header + body)
  const clickable = document.createElement('div');
  clickable.className = 'artist-card-clickable';
  clickable.addEventListener('click', () => navigate('artist', artist.id));

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
  clickable.appendChild(header);

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

  clickable.appendChild(body);
  card.appendChild(clickable);

  // Footer (outside clickable area)
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

  const filteredArtist = filterArtistId
    ? artists.find(a => a.id === filterArtistId) ?? null
    : null;

  const visiblePosts = filterArtistId
    ? posts.filter(p => p.artist_id === filterArtistId)
    : posts;

  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `<h1>Posts</h1><p>${visiblePosts.length} post${visiblePosts.length !== 1 ? 's' : ''} viewed</p>`;
  wrap.appendChild(header);

  if (filteredArtist) {
    const bar = document.createElement('div');
    bar.className = 'filter-bar';

    const label = document.createElement('span');
    label.className = 'filter-bar-label';
    label.innerHTML = `Showing posts for <strong>${escapeHtml(filteredArtist.name || filteredArtist.id)}</strong>`;
    bar.appendChild(label);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn-clear-filter';
    clearBtn.textContent = 'View all posts';
    clearBtn.addEventListener('click', () => navigate('posts'));
    bar.appendChild(clearBtn);

    wrap.appendChild(bar);
  }

  if (!visiblePosts.length) {
    wrap.appendChild(emptyState('📄', filterArtistId
      ? 'No posts tracked for this artist yet.'
      : 'No posts tracked yet.\nVisit a post page on kemono.cr or coomer.st to get started.'
    ));
    return wrap;
  }

  // Sort newest first
  const sorted = [...visiblePosts].sort((a, b) => (b.viewed_at > a.viewed_at ? 1 : -1));

  const grid = document.createElement('div');
  grid.className = 'card-grid';

  for (const post of sorted) {
    const artist = artists.find(a => a.id === post.artist_id);
    grid.appendChild(renderPostCard(post, artist));
  }

  wrap.appendChild(grid);

  enrichPostsForArtists(sorted).catch(console.error);

  return wrap;
}

function renderPostCard(post: Post, artist: Artist | undefined, showArtist = true): HTMLElement {
  const thumbnailUrl = postCache.get(post.id) ?? undefined;
  const name = post.name;
  const posted_at = post.posted_at;
  const attachment_count = post.attachment_count;

  const card = document.createElement('div');
  card.className = 'post-card';

  const artistName = artist?.name || post.artist_id || 'Unknown';

  // Clickable area (cover + header + body) → opens post on original site
  const postUrl = artist
    ? `https://${hostForArtist(artist)}/${artist.content_origin}/user/${artist.id}/post/${post.id}`
    : null;

  const clickable = document.createElement('a');
  clickable.className = 'post-card-clickable';
  if (postUrl) {
    clickable.href = postUrl;
    clickable.target = '_blank';
    clickable.rel = 'noopener noreferrer';
  }

  // Thumbnail cover
  if (thumbnailUrl) {
    const cover = document.createElement('div');
    cover.className = 'post-card-cover';
    const img = document.createElement('img');
    img.src = thumbnailUrl;
    img.alt = name || '';
    img.loading = 'lazy';
    img.onerror = () => cover.remove();
    cover.appendChild(img);
    clickable.appendChild(cover);
  }

  if (showArtist) {
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

    clickable.appendChild(header);
  }

  // Body
  const body = document.createElement('div');
  body.className = 'post-card-body';

  const title = document.createElement('div');
  title.className = 'post-card-title';
  title.title = name || 'Untitled';
  title.textContent = name || 'Untitled';
  body.appendChild(title);

  if (attachment_count != null && attachment_count > 0) {
    const chip = document.createElement('div');
    chip.className = 'attachment-chip';
    chip.textContent = `📎 ${attachment_count} attachment${attachment_count !== 1 ? 's' : ''}`;
    body.appendChild(chip);
  }

  const meta = document.createElement('div');
  meta.className = 'post-card-meta';

  const metaRows: [string, string][] = [
    ['Viewed', formatDate(post.viewed_at)],
    ['Posted', formatDate(posted_at)],
  ];

  for (const [label, value] of metaRows) {
    const row = document.createElement('div');
    row.className = 'post-card-meta-row';
    row.innerHTML = `<span class="label">${escapeHtml(label)}</span><span class="value">${escapeHtml(value)}</span>`;
    meta.appendChild(row);
  }

  body.appendChild(meta);
  clickable.appendChild(body);
  card.appendChild(clickable);

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

  // Nav links: clear artist filter when navigating via sidebar
  document.querySelectorAll('.nav-link').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      navigate((a as HTMLElement).dataset.page!);
    });
  });

  window.addEventListener('hashchange', render);

  // Set initial hash
  if (!window.location.hash || !['#home', '#artists', '#posts', '#artist'].includes(window.location.hash)) {
    window.location.hash = '#home';
  }

  render();
}

init().catch(console.error);
