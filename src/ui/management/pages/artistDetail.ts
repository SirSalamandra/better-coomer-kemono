import { Artist } from "../../../shared/types/Artist";
import { Post } from "../../../shared/types/Post";
import { buildAvatar } from "../utils/avatar";
import { emptyState, escapeHtml, formatDate, lastViewedFromPosts } from "../utils/format";
import { hostForArtist } from "../../../shared/utils/host";
import { renderPostCard } from "../components/postCard";
import { createMasonry } from "../utils/masonry";

export function renderArtistDetail(
  selectedArtistId: string | null,
  artists: Artist[],
  posts: Post[],
  navigate: (page: string, id?: string) => void,
  deleteArtist: (id: string, name: string) => void,
  deletePost: (id: string, title: string) => void,
): HTMLElement {
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
  if (heroBg) hero.style.setProperty('--hero-bg', `url('${heroBg}')`);

  const heroOverlay = document.createElement('div');
  heroOverlay.className = 'artist-detail-hero-overlay';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn-back';
  backBtn.textContent = '← Artists';
  backBtn.addEventListener('click', () => navigate('artists'));
  heroOverlay.appendChild(backBtn);

  const heroContent = document.createElement('div');
  heroContent.className = 'artist-detail-hero-content';

  const avatarWrap = document.createElement('div');
  avatarWrap.className = 'artist-detail-avatar-wrap';
  avatarWrap.appendChild(buildAvatar(artist, 80));
  heroContent.appendChild(avatarWrap);

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
  const openLink = document.createElement('a');
  openLink.className = 'btn-detail-action';
  openLink.href = `https://${host}/${artist.content_origin}/user/${artist.id}`;
  openLink.target = '_blank';
  openLink.rel = 'noopener noreferrer';
  openLink.textContent = 'Open profile';
  actions.appendChild(openLink);

  const delBtn = document.createElement('button');
  delBtn.className = 'btn-detail-danger';
  delBtn.textContent = 'Delete artist';
  delBtn.addEventListener('click', () => deleteArtist(artist.id, name));
  actions.appendChild(delBtn);

  heroInfo.appendChild(actions);
  heroContent.appendChild(heroInfo);

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
    const cards: HTMLElement[] = [];
    for (const post of sorted) {
      cards.push(renderPostCard(post, artist, deletePost, false));
    }
    postsSection.appendChild(createMasonry(cards));
  }

  wrap.appendChild(postsSection);
  return wrap;
}
