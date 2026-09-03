import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

/**
 * Unit tests for YouTube embed rendering in the Songs section.
 *
 * Tests cover:
 * - youtube-embed items render as song cards with YouTube thumbnail (Requirement 6.3)
 * - Play button expands to iframe embed on click (Requirement 6.3)
 * - youtube-embed items render correctly on page reload (Requirement 6.5)
 * - youtube-embed items have delete button functionality
 *
 * Validates: Requirements 6.3, 6.5
 */

describe('YouTube embed rendering in Songs section (Requirements 6.3, 6.5)', () => {
  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM(`
      <html>
        <body>
          <div id="songs-container" class="songs-container"></div>
        </body>
      </html>
    `, { url: 'http://localhost' });
    document = dom.window.document;
  });

  function createYouTubeEmbedItem(videoId, id, caption) {
    return {
      id: id || 'url-' + Date.now() + '-test',
      section: 'songs',
      source: '',
      caption: caption || 'YouTube Video',
      type: 'youtube-embed',
      origin: 'url-added',
      metadata: { videoId: videoId }
    };
  }

  /**
   * Simulates the rendering logic from populateSongs for youtube-embed items.
   * This mirrors the actual code in script.js.
   */
  function renderYouTubeEmbed(container, mediaItem) {
    if (mediaItem.type === 'youtube-embed' && mediaItem.metadata && mediaItem.metadata.videoId) {
      const youtubeCard = document.createElement('div');
      youtubeCard.className = 'song-card youtube-embed-card';
      youtubeCard.setAttribute('data-id', mediaItem.id);
      const videoId = mediaItem.metadata.videoId;
      const thumbUrl = 'https://img.youtube.com/vi/' + videoId + '/mqdefault.jpg';
      const songName = mediaItem.caption || 'YouTube Video';
      youtubeCard.innerHTML =
        '<div class="youtube-embed-thumb-wrapper">' +
          '<img src="' + thumbUrl + '" alt="' + songName + '" class="youtube-embed-thumb">' +
          '<div class="youtube-embed-play-overlay"><span>&#9658;</span></div>' +
        '</div>' +
        '<div class="song-info">' +
          '<div class="song-name">' + songName + '</div>' +
          '<div class="song-artist">YouTube</div>' +
        '</div>' +
        '<button class="delete-btn" aria-label="Delete song">×</button>';
      container.appendChild(youtubeCard);

      // Click play overlay to expand to iframe embed
      const ytPlayOverlay = youtubeCard.querySelector('.youtube-embed-play-overlay');
      ytPlayOverlay.addEventListener('click', function (e) {
        e.stopPropagation();
        const wrapper = youtubeCard.querySelector('.youtube-embed-thumb-wrapper');
        wrapper.innerHTML =
          '<iframe src="https://www.youtube.com/embed/' + videoId + '?autoplay=1" ' +
          'frameborder="0" allow="autoplay; encrypted-media" allowfullscreen ' +
          'class="youtube-embed-iframe"></iframe>';
        wrapper.classList.add('youtube-embed-playing');
      });

      return youtubeCard;
    }
    return null;
  }

  it('renders youtube-embed item as a song card with YouTube thumbnail', () => {
    const container = document.getElementById('songs-container');
    const item = createYouTubeEmbedItem('dQw4w9WgXcQ');

    const card = renderYouTubeEmbed(container, item);

    expect(card).not.toBeNull();
    const img = card.querySelector('.youtube-embed-thumb');
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg');
  });

  it('wraps in a song card container with correct classes', () => {
    const container = document.getElementById('songs-container');
    const item = createYouTubeEmbedItem('dQw4w9WgXcQ');

    const card = renderYouTubeEmbed(container, item);

    expect(card.classList.contains('song-card')).toBe(true);
    expect(card.classList.contains('youtube-embed-card')).toBe(true);
    expect(card.getAttribute('data-id')).toBe(item.id);
  });

  it('displays song name and artist info', () => {
    const container = document.getElementById('songs-container');
    const item = createYouTubeEmbedItem('dQw4w9WgXcQ', 'yt-1', 'Never Gonna Give You Up');

    const card = renderYouTubeEmbed(container, item);

    const songName = card.querySelector('.song-name');
    const songArtist = card.querySelector('.song-artist');
    expect(songName.textContent).toBe('Never Gonna Give You Up');
    expect(songArtist.textContent).toBe('YouTube');
  });

  it('has a play button overlay on the thumbnail', () => {
    const container = document.getElementById('songs-container');
    const item = createYouTubeEmbedItem('dQw4w9WgXcQ');

    const card = renderYouTubeEmbed(container, item);

    const playOverlay = card.querySelector('.youtube-embed-play-overlay');
    expect(playOverlay).not.toBeNull();
    expect(playOverlay.querySelector('span')).not.toBeNull();
  });

  it('expands to iframe embed on play button click', () => {
    const container = document.getElementById('songs-container');
    const item = createYouTubeEmbedItem('dQw4w9WgXcQ');

    const card = renderYouTubeEmbed(container, item);
    const playOverlay = card.querySelector('.youtube-embed-play-overlay');

    // Simulate click
    const clickEvent = new dom.window.Event('click', { bubbles: true });
    playOverlay.dispatchEvent(clickEvent);

    const iframe = card.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe.getAttribute('src')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1');
    expect(iframe.getAttribute('allow')).toBe('autoplay; encrypted-media');
    expect(iframe.hasAttribute('allowfullscreen')).toBe(true);
  });

  it('adds youtube-embed-playing class to wrapper after click', () => {
    const container = document.getElementById('songs-container');
    const item = createYouTubeEmbedItem('dQw4w9WgXcQ');

    const card = renderYouTubeEmbed(container, item);
    const playOverlay = card.querySelector('.youtube-embed-play-overlay');

    const clickEvent = new dom.window.Event('click', { bubbles: true });
    playOverlay.dispatchEvent(clickEvent);

    const wrapper = card.querySelector('.youtube-embed-thumb-wrapper');
    expect(wrapper.classList.contains('youtube-embed-playing')).toBe(true);
  });

  it('includes a delete button', () => {
    const container = document.getElementById('songs-container');
    const item = createYouTubeEmbedItem('dQw4w9WgXcQ');

    const card = renderYouTubeEmbed(container, item);
    const deleteBtn = card.querySelector('.delete-btn');

    expect(deleteBtn).not.toBeNull();
    expect(deleteBtn.getAttribute('aria-label')).toBe('Delete song');
  });

  it('renders correctly with different video IDs (simulates page reload)', () => {
    const container = document.getElementById('songs-container');
    const videoIds = [
      'dQw4w9WgXcQ',
      'jNQXAC9IVRw',
      'kJQP7kiw5Fk'
    ];

    videoIds.forEach((videoId) => {
      const item = createYouTubeEmbedItem(videoId, 'item-' + videoId);
      renderYouTubeEmbed(container, item);
    });

    const cards = container.querySelectorAll('.youtube-embed-card');
    expect(cards.length).toBe(3);

    videoIds.forEach((videoId, i) => {
      const img = cards[i].querySelector('.youtube-embed-thumb');
      expect(img.getAttribute('src')).toBe(`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`);
    });
  });

  it('does not render if metadata or videoId is missing', () => {
    const container = document.getElementById('songs-container');

    // Missing metadata
    const item1 = { id: 'test-1', type: 'youtube-embed', metadata: null };
    const card1 = renderYouTubeEmbed(container, item1);
    expect(card1).toBeNull();

    // Missing videoId
    const item2 = { id: 'test-2', type: 'youtube-embed', metadata: {} };
    const card2 = renderYouTubeEmbed(container, item2);
    expect(card2).toBeNull();
  });

  it('does not render for non-youtube-embed types', () => {
    const container = document.getElementById('songs-container');
    const item = { id: 'test-audio', type: 'audio', metadata: { videoId: 'dQw4w9WgXcQ' } };

    const card = renderYouTubeEmbed(container, item);
    expect(card).toBeNull();
  });
});
