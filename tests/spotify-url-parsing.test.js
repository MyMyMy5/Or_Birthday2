import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

/**
 * Unit tests for Spotify URL parsing and item creation.
 *
 * Tests cover:
 * - parseSpotifyUrl extracts track ID from valid URLs (Requirement 5.1)
 * - parseSpotifyUrl handles query parameters (Requirement 5.1)
 * - parseSpotifyUrl returns null for invalid URLs (Requirement 5.6)
 * - addMediaByUrl creates spotify-embed items for valid Spotify URLs (Requirement 5.2, 5.4)
 * - addMediaByUrl rejects invalid Spotify URLs with error message (Requirement 5.6)
 *
 * Validates: Requirements 5.1, 5.2, 5.4, 5.6
 */

// --- localStorage mock ---

function createMockLocalStorage() {
  const store = {};
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      for (const k of Object.keys(store)) {
        delete store[k];
      }
    },
  };
}

let mockLocalStorage;

beforeAll(async () => {
  mockLocalStorage = createMockLocalStorage();

  globalThis.window = globalThis;
  globalThis.localStorage = mockLocalStorage;
  globalThis.photos = [];
  globalThis.songs = [];
  globalThis.thingsYouLike = [];
  globalThis.funnyMoments = [];

  await import('../media-manager.js');
});

// ==================== parseSpotifyUrl Tests ====================

describe('parseSpotifyUrl (Requirement 5.1)', () => {
  it('extracts track ID from a valid Spotify track URL', () => {
    const result = globalThis.MediaManager.parseSpotifyUrl(
      'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh'
    );
    expect(result).toEqual({ trackId: '4iV5W9uYEdYUVa79Axb7Rh' });
  });

  it('extracts track ID from URL with query parameters', () => {
    const result = globalThis.MediaManager.parseSpotifyUrl(
      'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh?si=abc123def456'
    );
    expect(result).toEqual({ trackId: '4iV5W9uYEdYUVa79Axb7Rh' });
  });

  it('returns null for non-string input', () => {
    expect(globalThis.MediaManager.parseSpotifyUrl(null)).toBeNull();
    expect(globalThis.MediaManager.parseSpotifyUrl(undefined)).toBeNull();
    expect(globalThis.MediaManager.parseSpotifyUrl(123)).toBeNull();
  });

  it('returns null for non-Spotify URLs', () => {
    expect(globalThis.MediaManager.parseSpotifyUrl('https://example.com/track/abc')).toBeNull();
    expect(globalThis.MediaManager.parseSpotifyUrl('https://youtube.com/watch?v=abc')).toBeNull();
  });

  it('returns null for Spotify URLs without a valid track path', () => {
    // Album URL
    expect(globalThis.MediaManager.parseSpotifyUrl(
      'https://open.spotify.com/album/4iV5W9uYEdYUVa79Axb7Rh'
    )).toBeNull();
    // Playlist URL
    expect(globalThis.MediaManager.parseSpotifyUrl(
      'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'
    )).toBeNull();
  });

  it('returns null for track ID with wrong length (not 22 chars)', () => {
    // Too short
    expect(globalThis.MediaManager.parseSpotifyUrl(
      'https://open.spotify.com/track/4iV5W9uYEd'
    )).toBeNull();
    // Too long
    expect(globalThis.MediaManager.parseSpotifyUrl(
      'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7RhX'
    )).toBeNull();
  });

  it('returns null for track ID with non-alphanumeric characters', () => {
    expect(globalThis.MediaManager.parseSpotifyUrl(
      'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7R!'
    )).toBeNull();
  });
});

// ==================== addMediaByUrl Spotify Integration Tests ====================

describe('addMediaByUrl with Spotify URLs (Requirements 5.2, 5.4, 5.6)', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    globalThis.songs = [];
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
  });

  it('creates a spotify-embed item for a valid Spotify track URL in songs section', async () => {
    await globalThis.MediaManager.init();

    const item = await globalThis.MediaManager.addMediaByUrl(
      'songs',
      'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh'
    );

    expect(item.type).toBe('spotify-embed');
    expect(item.origin).toBe('url-added');
    expect(item.section).toBe('songs');
    expect(item.source).toBe('');
    expect(item.caption).toBe('Spotify Track');
    expect(item.metadata).toEqual({ trackId: '4iV5W9uYEdYUVa79Axb7Rh' });
  });

  it('persists the spotify-embed item in localStorage', async () => {
    await globalThis.MediaManager.init();

    await globalThis.MediaManager.addMediaByUrl(
      'songs',
      'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh'
    );

    const raw = mockLocalStorage.getItem('media_manager_added');
    expect(raw).not.toBeNull();
    const added = JSON.parse(raw);
    expect(added).toHaveLength(1);
    expect(added[0].type).toBe('spotify-embed');
    expect(added[0].metadata.trackId).toBe('4iV5W9uYEdYUVa79Axb7Rh');
  });

  it('rejects with error message for invalid Spotify URL format', async () => {
    await globalThis.MediaManager.init();

    await expect(
      globalThis.MediaManager.addMediaByUrl(
        'songs',
        'https://open.spotify.com/album/4iV5W9uYEdYUVa79Axb7Rh'
      )
    ).rejects.toBe('Invalid Spotify URL format. Expected: https://open.spotify.com/track/{TRACK_ID}');
  });

  it('rejects with error for Spotify playlist URL', async () => {
    await globalThis.MediaManager.init();

    await expect(
      globalThis.MediaManager.addMediaByUrl(
        'songs',
        'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'
      )
    ).rejects.toBe('Invalid Spotify URL format. Expected: https://open.spotify.com/track/{TRACK_ID}');
  });

  it('uses custom caption when provided', async () => {
    await globalThis.MediaManager.init();

    const item = await globalThis.MediaManager.addMediaByUrl(
      'songs',
      'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh',
      'My Favorite Song'
    );

    expect(item.caption).toBe('My Favorite Song');
  });

  it('does not treat Spotify URLs as spotify-embed in non-songs sections', async () => {
    await globalThis.MediaManager.init();

    const item = await globalThis.MediaManager.addMediaByUrl(
      'photos',
      'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh'
    );

    // In non-songs sections, it should be treated as a regular image URL
    expect(item.type).toBe('image');
  });
});
