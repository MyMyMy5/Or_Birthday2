import { describe, it, expect, beforeAll } from 'vitest';
import fc from 'fast-check';

/**
 * Property 5: Spotify URL Parsing
 *
 * For any string that is a valid Spotify track ID (22 alphanumeric characters),
 * constructing a URL of the form `https://open.spotify.com/track/{TRACK_ID}`
 * (with optional query parameters) and parsing it with `parseSpotifyUrl`
 * SHALL extract the correct track ID.
 *
 * **Validates: Requirements 5.1**
 * Feature: media-and-editor-upgrades, Property 5: Spotify URL Parsing
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

// --- Arbitraries ---

/** Characters valid in a Spotify track ID: [a-zA-Z0-9] */
const alphanumericChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');

/** Generate a valid Spotify track ID: exactly 22 alphanumeric characters */
const trackIdArb = fc
  .array(fc.constantFrom(...alphanumericChars), { minLength: 22, maxLength: 22 })
  .map((chars) => chars.join(''));

/** Generate optional query parameters (e.g., ?si=abc123) */
const queryParamArb = fc.option(
  fc.array(fc.constantFrom(...alphanumericChars), { minLength: 1, maxLength: 30 })
    .map((chars) => '?si=' + chars.join('')),
  { nil: '' }
);

// --- Property Tests ---

describe('Feature: media-and-editor-upgrades, Property 5: Spotify URL Parsing', () => {
  it('valid Spotify track URLs are correctly parsed to extract track IDs', () => {
    /**
     * Validates: Requirements 5.1
     *
     * For any valid Spotify track ID (22 alphanumeric characters), constructing
     * a URL of the form https://open.spotify.com/track/{TRACK_ID} and parsing it
     * with parseSpotifyUrl SHALL extract the correct track ID.
     */
    fc.assert(
      fc.property(
        trackIdArb,
        (trackId) => {
          const url = `https://open.spotify.com/track/${trackId}`;
          const result = globalThis.MediaManager.parseSpotifyUrl(url);

          expect(result).not.toBeNull();
          expect(result.trackId).toBe(trackId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('valid Spotify track URLs with query parameters are correctly parsed', () => {
    /**
     * Validates: Requirements 5.1
     *
     * For any valid Spotify track ID and any query parameter string,
     * constructing a URL with optional query params and parsing it
     * SHALL still extract the correct track ID.
     */
    fc.assert(
      fc.property(
        trackIdArb,
        queryParamArb,
        (trackId, queryParam) => {
          const url = `https://open.spotify.com/track/${trackId}${queryParam}`;
          const result = globalThis.MediaManager.parseSpotifyUrl(url);

          expect(result).not.toBeNull();
          expect(result.trackId).toBe(trackId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('non-Spotify URLs or invalid track IDs return null', () => {
    /**
     * Validates: Requirements 5.1
     *
     * For strings that are NOT valid Spotify track URLs (wrong domain,
     * wrong path, or track ID not exactly 22 alphanumeric chars),
     * parseSpotifyUrl SHALL return null.
     */
    const invalidUrlArb = fc.oneof(
      // Wrong domain
      fc.constant('https://example.com/track/4iV5W9uYEdYUVa79Axb7Rh'),
      // Wrong path (album instead of track)
      trackIdArb.map((id) => `https://open.spotify.com/album/${id}`),
      // Wrong path (playlist instead of track)
      trackIdArb.map((id) => `https://open.spotify.com/playlist/${id}`),
      // Track ID too short (1-21 chars)
      fc.array(fc.constantFrom(...alphanumericChars), { minLength: 1, maxLength: 21 })
        .map((chars) => `https://open.spotify.com/track/${chars.join('')}`),
      // Track ID too long (23+ chars)
      fc.array(fc.constantFrom(...alphanumericChars), { minLength: 23, maxLength: 30 })
        .map((chars) => `https://open.spotify.com/track/${chars.join('')}`)
    );

    fc.assert(
      fc.property(
        invalidUrlArb,
        (url) => {
          const result = globalThis.MediaManager.parseSpotifyUrl(url);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
