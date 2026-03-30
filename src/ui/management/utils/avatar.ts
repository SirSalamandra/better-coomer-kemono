import { Artist } from "../../../shared/types/Artist";

const AVATAR_COLORS = [
  '#7c6af7', '#e05c5c', '#4caf7d', '#f0a500',
  '#2196f3', '#e91e8c', '#00bcd4', '#ff6b35',
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function initialsAvatar(name: string, size: number): HTMLElement {
  const el = document.createElement('div');
  el.className = size >= 40 ? 'artist-avatar-fallback' : 'post-artist-avatar-fallback';
  el.style.background = avatarColor(name);
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.textContent = (name || '?').charAt(0);
  return el;
}

function avatarImg(url: string, name: string, size: number): HTMLElement {
  const img = document.createElement('img') as HTMLImageElement;
  img.className = size >= 40 ? 'artist-avatar' : 'post-artist-avatar';
  img.src = url;
  img.alt = name;
  img.width = size;
  img.height = size;
  img.onerror = () => img.replaceWith(initialsAvatar(name, size));
  return img;
}

export function buildAvatar(artist: Artist, size: number): HTMLElement {
  const name = artist.name || artist.id;
  return artist.thumbnail_url
    ? avatarImg(artist.thumbnail_url, name, size)
    : initialsAvatar(name, size);
}
