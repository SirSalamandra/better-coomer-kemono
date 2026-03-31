import { Artist } from "../../../shared/types/Artist";
import { Post } from "../../../shared/types/Post";
import { emptyState, escapeHtml } from "../utils/format";
import { enrichPostsForArtists } from "../utils/enrich";
import { renderPostCard } from "../components/postCard";
import { createMasonry } from "../utils/masonry";

export function renderPosts(
  artists: Artist[],
  posts: Post[],
  filterArtistId: string | null,
  navigate: (page: string, id?: string) => void,
  loadData: () => Promise<void>,
  render: () => void,
  deletePost: (id: string, title: string) => void,
): HTMLElement {
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

  const sorted = [...visiblePosts].sort((a, b) => (b.viewed_at > a.viewed_at ? 1 : -1));

  const cards: HTMLElement[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const post = sorted[i];
    const artist = artists.find(a => a.id === post.artist_id);
    cards.push(renderPostCard(post, artist, deletePost, true, sorted.length - i));
  }

  wrap.appendChild(createMasonry(cards));

  enrichPostsForArtists(sorted, artists, loadData, render).catch(console.error);

  return wrap;
}
