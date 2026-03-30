import { ExtractDataFromUrl } from '../features/urlParser/parser';
import { GetDate } from '../shared/utils/date';
import { AddAudioElementsForAudioLinks } from '../features/audioPlayer/dom';
import { AddViewedTagsOnAllPosts } from '../features/viewTracking/dom';
import { Pages } from '../shared/constants/pages';
import { Post } from '../shared/types/Post';

// ---------------------------------------------------------------------------
// ExtractDataFromUrl
// ---------------------------------------------------------------------------

describe('ExtractDataFromUrl', () => {
  const url = (path: string) => new URL(`https://kemono.cr${path}`);

  test('/posts → PostListPage', () => {
    const result = ExtractDataFromUrl(url('/posts'));
    expect(result.page_type).toBe(Pages.PostListPage);
    expect(result.artist_id).toBeNull();
    expect(result.post_id).toBeNull();
    expect(result.content_origin).toBeNull();
  });

  test('/artists → ArtistListPage', () => {
    expect(ExtractDataFromUrl(url('/artists')).page_type).toBe(Pages.ArtistListPage);
  });

  test('/artists/anything → ArtistListPage', () => {
    expect(ExtractDataFromUrl(url('/artists/foo')).page_type).toBe(Pages.ArtistListPage);
  });

  test('/patreon/user/12345 → ArtistPage with correct fields', () => {
    const result = ExtractDataFromUrl(url('/patreon/user/12345'));
    expect(result.page_type).toBe(Pages.ArtistPage);
    expect(result.content_origin).toBe('patreon');
    expect(result.artist_id).toBe('12345');
    expect(result.post_id).toBeNull();
  });

  test('/fanbox/user/artist99/post/post123 → PostPage with correct fields', () => {
    const result = ExtractDataFromUrl(url('/fanbox/user/artist99/post/post123'));
    expect(result.page_type).toBe(Pages.PostPage);
    expect(result.content_origin).toBe('fanbox');
    expect(result.artist_id).toBe('artist99');
    expect(result.post_id).toBe('post123');
  });

  test('/patreon/user/12345/post/67890 → PostPage with correct fields', () => {
    const result = ExtractDataFromUrl(url('/patreon/user/12345/post/67890'));
    expect(result.page_type).toBe(Pages.PostPage);
    expect(result.content_origin).toBe('patreon');
    expect(result.artist_id).toBe('12345');
    expect(result.post_id).toBe('67890');
  });

  test('/ (root) → Unknown', () => {
    const result = ExtractDataFromUrl(url('/'));
    expect(result.page_type).toBe(Pages.Unknown);
    expect(result.artist_id).toBeNull();
    expect(result.post_id).toBeNull();
    expect(result.content_origin).toBeNull();
  });

  test('/random/path → Unknown', () => {
    expect(ExtractDataFromUrl(url('/random/path')).page_type).toBe(Pages.Unknown);
  });

  // Ensure PostPage pattern doesn't match ArtistPage pattern
  test('ArtistPage pattern does NOT match /patreon/user/12345/post/67890', () => {
    const result = ExtractDataFromUrl(url('/patreon/user/12345/post/67890'));
    expect(result.page_type).not.toBe(Pages.ArtistPage);
  });
});

// ---------------------------------------------------------------------------
// GetDate
// ---------------------------------------------------------------------------

describe('GetDate', () => {
  test('returns a valid ISO 8601 date string', () => {
    const date = GetDate();
    // toJSON() / ISO format — should round-trip cleanly
    expect(new Date(date).toJSON()).toBe(date);
  });

  test('is close to current time', () => {
    const before = Date.now();
    const date = GetDate();
    const after = Date.now();
    const ms = new Date(date).getTime();
    expect(ms).toBeGreaterThanOrEqual(before);
    expect(ms).toBeLessThanOrEqual(after);
  });
});

// ---------------------------------------------------------------------------
// AddAudioElementsForAudioLinks
// ---------------------------------------------------------------------------

describe('AddAudioElementsForAudioLinks', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const makeLink = (href: string): HTMLAnchorElement => {
    const a = document.createElement('a');
    a.href = href;
    return a;
  };

  test('adds an <audio> element for an mp3 link', () => {
    const container = document.createElement('div');
    container.appendChild(makeLink('https://example.com/track.mp3'));
    document.body.appendChild(container);

    AddAudioElementsForAudioLinks(document);

    expect(container.querySelector('audio')).not.toBeNull();
  });

  test('sets MIME type audio/mpeg for mp3', () => {
    const container = document.createElement('div');
    container.appendChild(makeLink('https://example.com/track.mp3'));
    document.body.appendChild(container);

    AddAudioElementsForAudioLinks(document);

    const source = container.querySelector('audio source') as HTMLSourceElement;
    expect(source.type).toBe('audio/mpeg');
  });

  test('adds an <audio> element for a wav link', () => {
    const container = document.createElement('div');
    container.appendChild(makeLink('https://example.com/audio.wav'));
    document.body.appendChild(container);

    AddAudioElementsForAudioLinks(document);

    const source = container.querySelector('audio source') as HTMLSourceElement;
    expect(source.type).toBe('audio/wav');
  });

  test('sets flex layout on the parent element', () => {
    const container = document.createElement('div');
    container.appendChild(makeLink('https://example.com/track.mp3'));
    document.body.appendChild(container);

    AddAudioElementsForAudioLinks(document);

    expect(container.style.display).toBe('flex');
    expect(container.style.flexDirection).toBe('column');
  });

  test('does not add a duplicate audio element on second call', () => {
    const container = document.createElement('div');
    container.appendChild(makeLink('https://example.com/track.mp3'));
    document.body.appendChild(container);

    AddAudioElementsForAudioLinks(document);
    AddAudioElementsForAudioLinks(document);

    expect(container.querySelectorAll('audio').length).toBe(1);
  });

  test('deduplicates links sharing the same href', () => {
    const container = document.createElement('div');
    container.appendChild(makeLink('https://example.com/track.mp3'));
    container.appendChild(makeLink('https://example.com/track.mp3'));
    document.body.appendChild(container);

    AddAudioElementsForAudioLinks(document);

    // Only one audio element — the duplicate href is skipped
    expect(container.querySelectorAll('audio').length).toBe(1);
  });

  test('does nothing when there are no audio links', () => {
    const container = document.createElement('div');
    container.appendChild(makeLink('https://example.com/image.png'));
    document.body.appendChild(container);

    AddAudioElementsForAudioLinks(document);

    expect(document.querySelector('audio')).toBeNull();
  });

  test('handles multiple distinct audio links', () => {
    const containerA = document.createElement('div');
    const containerB = document.createElement('div');
    containerA.appendChild(makeLink('https://example.com/a.mp3'));
    containerB.appendChild(makeLink('https://example.com/b.wav'));
    document.body.append(containerA, containerB);

    AddAudioElementsForAudioLinks(document);

    expect(containerA.querySelector('audio')).not.toBeNull();
    expect(containerB.querySelector('audio')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AddViewedTagsOnAllPosts
// ---------------------------------------------------------------------------

describe('AddViewedTagsOnAllPosts', () => {
  /** Builds a minimal post card matching the selector the helper expects. */
  const makeCard = (id: string): HTMLElement => {
    const card = document.createElement('article');
    card.setAttribute('data-id', id);
    card.innerHTML = `<footer><div><div class="card-content"></div></div></footer>`;
    return card;
  };

  const makePosts = (ids: string[]): Post[] =>
    ids.map(id => ({ id, viewed_at: new Date().toJSON(), artist_id: 'artist1' }));

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('adds .viewed-tag to a viewed post card', async () => {
    const card = makeCard('post1');
    document.body.appendChild(card);

    await AddViewedTagsOnAllPosts(document, makePosts(['post1']));

    expect(card.querySelector('.viewed-tag')).not.toBeNull();
  });

  test('adds .mark-as-unread-button to a viewed post card', async () => {
    const card = makeCard('post1');
    document.body.appendChild(card);

    await AddViewedTagsOnAllPosts(document, makePosts(['post1']));

    expect(card.querySelector('.mark-as-unread-button')).not.toBeNull();
  });

  test('mark-as-unread-button carries the correct data-post-id', async () => {
    const card = makeCard('post42');
    document.body.appendChild(card);

    await AddViewedTagsOnAllPosts(document, makePosts(['post42']));

    const btn = card.querySelector('.mark-as-unread-button') as HTMLElement;
    expect(btn.getAttribute('data-post-id')).toBe('post42');
  });

  test('does NOT add a tag to an unviewed post card', async () => {
    const card = makeCard('post2');
    document.body.appendChild(card);

    await AddViewedTagsOnAllPosts(document, makePosts(['post1']));

    expect(card.querySelector('.viewed-tag')).toBeNull();
  });

  test('tags only viewed cards when the page has a mix', async () => {
    const card1 = makeCard('post1');
    const card2 = makeCard('post2');
    const card3 = makeCard('post3');
    document.body.append(card1, card2, card3);

    await AddViewedTagsOnAllPosts(document, makePosts(['post1', 'post3']));

    expect(card1.querySelector('.viewed-tag')).not.toBeNull();
    expect(card2.querySelector('.viewed-tag')).toBeNull();
    expect(card3.querySelector('.viewed-tag')).not.toBeNull();
  });

  test('does not add duplicate tags on repeated calls', async () => {
    const card = makeCard('post1');
    document.body.appendChild(card);
    const posts = makePosts(['post1']);

    await AddViewedTagsOnAllPosts(document, posts);
    await AddViewedTagsOnAllPosts(document, posts);

    expect(card.querySelectorAll('.viewed-tag').length).toBe(1);
  });

  test('does nothing when posts array is empty', async () => {
    const card = makeCard('post1');
    document.body.appendChild(card);

    await AddViewedTagsOnAllPosts(document, []);

    expect(card.querySelector('.viewed-tag')).toBeNull();
  });

  test('skips cards that lack the footer > div > div structure', async () => {
    const card = document.createElement('article');
    card.setAttribute('data-id', 'post1');
    // No inner footer structure
    document.body.appendChild(card);

    await AddViewedTagsOnAllPosts(document, makePosts(['post1']));

    expect(card.querySelector('.viewed-tag')).toBeNull();
  });
});
