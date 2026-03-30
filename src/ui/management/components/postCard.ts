import { Artist } from "../../../shared/types/Artist";
import { Post } from "../../../shared/types/Post";
import { buildAvatar, initialsAvatar } from "../utils/avatar";
import { escapeHtml, formatDate } from "../utils/format";
import { hostForArtist } from "../utils/enrich";

export function renderPostCard(
  post: Post,
  artist: Artist | undefined,
  deletePost: (id: string, title: string) => void,
  showArtist = true,
): HTMLElement {
  const thumbnailUrl = post.thumbnail_url;
  const { name, posted_at, attachment_count } = post;

  const card = document.createElement('div');
  card.className = 'post-card';

  const artistName = artist?.name || post.artist_id || 'Unknown';

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
    header.appendChild(artist ? buildAvatar(artist, 32) : initialsAvatar(artistName, 32));

    const artistNameEl = document.createElement('div');
    artistNameEl.className = 'post-card-artist-name';
    artistNameEl.title = artistName;
    artistNameEl.textContent = artistName;
    header.appendChild(artistNameEl);

    clickable.appendChild(header);
  }

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
