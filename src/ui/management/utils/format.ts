import { Post } from "../../../shared/types/Post";

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

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function emptyState(icon: string, text: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'empty-state';
  el.innerHTML = `<div class="empty-icon">${icon}</div><p>${escapeHtml(text).replace('\n', '<br>')}</p>`;
  return el;
}
