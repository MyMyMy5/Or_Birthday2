import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import fc from 'fast-check';

/**
 * Property 6: YouTube URL Parsing for Songs Section
 *
 * For any string that is a valid YouTube video ID (11 characters from [a-zA-Z0-9_-]),
 * constructing a URL in any supported format (youtube.com/watch?v=, youtu.be/,
 * youtube.com/shorts/) and parsing it with `_parseYouTubeUrl` SHALL extract the
 * correct video ID.
 *
 * **Validates: Requirements 6.1**
 * Feature: media-and-editor-upgrades, Property 6: YouTube URL Parsing for Songs Section
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

// --- FileReader mock ---

class MockFileReader {
  constructor() {
    this.onload = null;
    this.onerror = null;
  }
  readAsDataURL(_file) {
    const self = this;
    Promise.resolve().then(() => {
      if (self.onload) {
        self.onload({ target: { result: 'data:application/octet-stream;base64,AAAA' } });
      }
    });
  }
}

// --- Set up globals before loading the IIFE ---

beforeAll(async () => {
  mockLocalStorage = createMockLocalStorage();

  globalThis.window = globalThis;
  globalThis.localStorage = mockLocalStorage;
  globalThis.FileReader = MockFileReader;
  globalThis.photos = [];
  globalThis.songs = [];
  globalThis.thingsYouLike = [];
  globalThis.funnyMoments = [];

  await import('../media-manager.js');
});

// --- Arbitraries ---

/** Characters valid in a YouTube video ID: [a-zA-Z0-9_-] */
const youtubeIdChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'.split('');

/** Generate a valid YouTube video ID (exactly 11 characters from the allowed set) */
const youtubeVideoIdArb = fc
  .array(fc.constantFrom(...youtubeIdChars), { minLength: 11, maxLength: 11 })
  .map((chars) => chars.join(''));

/** Generate a URL format type */
const urlFormatArb = fc.constantFrom('watch', 'shorts', 'youtu.be');

/**
 * Construct a YouTube URL from a video ID and format type.
 */
function buildYouTubeUrl(videoId, format) {
  switch (format) {
    case 'watch':
      return 'https://www.youtube.com/watch?v=' + videoId;
    case 'shorts':
      return 'https://www.youtube.com/shorts/' + videoId;
    case 'youtu.be':
      return 'https://youtu.be/' + videoId;
    default:
      return 'https://www.youtube.com/watch?v=' + videoId;
  }
}

// --- Property Tests ---

describe('Feature: media-and-editor-upgrades, Property 6: YouTube URL Parsing for Songs Section', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it('correctly extracts video ID from any supported YouTube URL format', () => {
    /**
     * Validates: Requirements 6.1
     *
     * For any valid YouTube video ID (11 chars from [a-zA-Z0-9_-]) and any
     * supported URL format, _parseYouTubeUrl SHALL extract the correct video ID.
     */
    fc.assert(
      fc.property(
        youtubeVideoIdArb,
        urlFormatArb,
        (videoId, format) => {
          const url = buildYouTubeUrl(videoId, format);
          const result = globalThis.MediaManager._parseYouTubeUrl(url);

          expect(result).not.toBeNull();
          expect(result.videoId).toBe(videoId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('correctly extracts video ID from watch URLs with additional query parameters', () => {
    /**
     * Validates: Requirements 6.1
     *
     * For any valid YouTube video ID, a watch URL with extra query params
     * (e.g., &t=120&list=PLxyz) SHALL still correctly extract the video ID.
     */
    const queryParamArb = fc
      .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 1, maxLength: 10 })
      .map((chars) => chars.join(''));

    fc.assert(
      fc.property(
        youtubeVideoIdArb,
        queryParamArb,
        queryParamArb,
        (videoId, paramKey, paramValue) => {
          const url = 'https://www.youtube.com/watch?v=' + videoId + '&' + paramKey + '=' + paramValue;
          const result = globalThis.MediaManager._parseYouTubeUrl(url);

          expect(result).not.toBeNull();
          expect(result.videoId).toBe(videoId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns null for strings that are not valid YouTube URLs', () => {
    /**
     * Validates: Requirements 6.1
     *
     * For strings that do not match any supported YouTube URL format,
     * _parseYouTubeUrl SHALL return null.
     */
    const invalidUrlArb = fc.oneof(
      fc.constant('https://www.example.com/watch?v=abc'),
      fc.constant('https://vimeo.com/12345678901'),
      fc.constant('not-a-url'),
      fc.constant(''),
      fc.constant('https://youtube.com/'),
      fc.constant('https://youtube.com/watch'),
      fc.constant('https://youtube.com/watch?v=short'),  // too short (5 chars)
      fc.constant('https://youtu.be/'),
      fc.constant('https://youtu.be/tooshort'),  // too short
      // Random strings unlikely to match the pattern
      fc.array(
        fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz ./:?=&'.split('')),
        { minLength: 0, maxLength: 50 }
      ).map((chars) => chars.join('')).filter((s) => {
        // Filter out strings that accidentally match the YouTube pattern
        const match = s.match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/)|youtu\.be\/)([\w-]{11})/);
        return !match;
      })
    );

    fc.assert(
      fc.property(
        invalidUrlArb,
        (url) => {
          const result = globalThis.MediaManager._parseYouTubeUrl(url);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
