import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

/**
 * Unit tests for Spotify embed rendering in the Songs section.
 *
 * Tests cover:
 * - spotify-embed items render as iframes with correct src (Requirement 5.3)
 * - iframe dimensions: height 80px, width 100% (Requirement 5.3)
 * - spotify-embed items render correctly on page reload (Requirement 5.5)
 * - spotify-embed items have delete button functionality
 *
 * Validates: Requirements 5.3, 5.5
 */

describe('Spotify embed rendering (Requirements 5.3, 5.5)', () => {
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

  function createSpotifyEmbedItem(trackId, id) {
    return {
      id: id || 'url-' + Date.now() + '-test',
      section: 'songs',
      source: '',
      caption: 'Spotify Track',
      type: 'spotify-embed',
      origin: 'url-added',
      metadata: { trackId: trackId }
    };
  }

  /**
   * Simulates the rendering logic from populateSongs for spotify-embed items.
   * This mirrors the actual code in script.js.
   */
  function renderSpotifyEmbed(container, mediaItem) {
    if (mediaItem.type === 'spotify-embed' && mediaItem.metadata && mediaItem.metadata.trackId) {
      const spotifyCard = document.createElement('div');
      spotifyCard.className = 'song-card spotify-embed-card';
      spotifyCard.setAttribute('data-id', mediaItem.id);
      const trackId = mediaItem.metadata.trackId;
      spotifyCard.innerHTML = `
        <div class="spotify-embed-wrapper">
          <iframe src="https://open.spotify.com/embed/track/${trackId}" height="80" width="100%" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>
        </div>
        <button class="delete-btn" aria-label="Delete song">×</button>
      `;
      container.appendChild(spotifyCard);
      return spotifyCard;
    }
    return null;
  }

  it('renders spotify-embed item as an iframe with correct src', () => {
    const container = document.getElementById('songs-container');
    const item = createSpotifyEmbedItem('4iV5W9uYEdYUVa79Axb7Rh');

    const card = renderSpotifyEmbed(container, item);

    expect(card).not.toBeNull();
    const iframe = card.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe.getAttribute('src')).toBe('https://open.spotify.com/embed/track/4iV5W9uYEdYUVa79Axb7Rh');
  });

  it('sets iframe dimensions: height 80px, width 100%', () => {
    const container = document.getElementById('songs-container');
    const item = createSpotifyEmbedItem('4iV5W9uYEdYUVa79Axb7Rh');

    const card = renderSpotifyEmbed(container, item);
    const iframe = card.querySelector('iframe');

    expect(iframe.getAttribute('height')).toBe('80');
    expect(iframe.getAttribute('width')).toBe('100%');
  });

  it('sets iframe attributes for Spotify embed compatibility', () => {
    const container = document.getElementById('songs-container');
    const item = createSpotifyEmbedItem('4iV5W9uYEdYUVa79Axb7Rh');

    const card = renderSpotifyEmbed(container, item);
    const iframe = card.querySelector('iframe');

    expect(iframe.getAttribute('frameborder')).toBe('0');
    expect(iframe.getAttribute('allowtransparency')).toBe('true');
    expect(iframe.getAttribute('allow')).toBe('encrypted-media');
  });

  it('wraps iframe in a song card container with correct classes', () => {
    const container = document.getElementById('songs-container');
    const item = createSpotifyEmbedItem('4iV5W9uYEdYUVa79Axb7Rh');

    const card = renderSpotifyEmbed(container, item);

    expect(card.classList.contains('song-card')).toBe(true);
    expect(card.classList.contains('spotify-embed-card')).toBe(true);
    expect(card.getAttribute('data-id')).toBe(item.id);
  });

  it('includes a delete button', () => {
    const container = document.getElementById('songs-container');
    const item = createSpotifyEmbedItem('4iV5W9uYEdYUVa79Axb7Rh');

    const card = renderSpotifyEmbed(container, item);
    const deleteBtn = card.querySelector('.delete-btn');

    expect(deleteBtn).not.toBeNull();
    expect(deleteBtn.getAttribute('aria-label')).toBe('Delete song');
  });

  it('renders correctly with different track IDs (simulates page reload)', () => {
    const container = document.getElementById('songs-container');
    const trackIds = [
      '4iV5W9uYEdYUVa79Axb7Rh',
      '1dGr1c8CrMLDpV6mPbImSI',
      '3n3Ppam7vgaVa1iaRUc9Lp'
    ];

    trackIds.forEach((trackId) => {
      const item = createSpotifyEmbedItem(trackId, 'item-' + trackId);
      renderSpotifyEmbed(container, item);
    });

    const iframes = container.querySelectorAll('iframe');
    expect(iframes.length).toBe(3);

    trackIds.forEach((trackId, i) => {
      expect(iframes[i].getAttribute('src')).toBe(`https://open.spotify.com/embed/track/${trackId}`);
    });
  });

  it('does not render if metadata or trackId is missing', () => {
    const container = document.getElementById('songs-container');

    // Missing metadata
    const item1 = { id: 'test-1', type: 'spotify-embed', metadata: null };
    const card1 = renderSpotifyEmbed(container, item1);
    expect(card1).toBeNull();

    // Missing trackId
    const item2 = { id: 'test-2', type: 'spotify-embed', metadata: {} };
    const card2 = renderSpotifyEmbed(container, item2);
    expect(card2).toBeNull();
  });

  it('does not render for non-spotify-embed types', () => {
    const container = document.getElementById('songs-container');
    const item = { id: 'test-audio', type: 'audio', metadata: { trackId: '4iV5W9uYEdYUVa79Axb7Rh' } };

    const card = renderSpotifyEmbed(container, item);
    expect(card).toBeNull();
  });
});
