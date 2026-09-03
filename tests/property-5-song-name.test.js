import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import fc from 'fast-check';

/**
 * Property 5: Song name derived from filename
 *
 * For any audio file added as a song, the resulting song entry's name
 * SHALL equal the original filename with its extension removed, and
 * the artist SHALL be "User Added".
 *
 * Validates: Requirements 5.5
 * Feature: media-management, Property 5: Song name derived from filename
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
    // Simulate async FileReader by resolving on next microtask
    const self = this;
    Promise.resolve().then(() => {
      if (self.onload) {
        self.onload({ target: { result: 'data:audio/mpeg;base64,AAAA' } });
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

  // Load the IIFE module once — it attaches MediaManager to window/globalThis
  await import('../media-manager.js');
});

// --- Arbitraries ---

/** Audio extensions commonly used */
const audioExtensionArb = fc.constantFrom('.mp3', '.wav', '.ogg', '.m4a', '.mp4');

/** Audio MIME types that are allowed */
const audioMimeArb = fc.constantFrom(
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a'
);

/**
 * Generate a filename base (the part before the extension).
 * Allows letters, digits, spaces, hyphens, underscores, and parentheses
 * to mimic real song filenames like "My Song (feat. Artist)".
 */
const filenameBaseArb = fc
  .stringMatching(/^[a-zA-Z0-9 _\-()]+$/, { minLength: 1, maxLength: 40 });

/**
 * Generate a complete filename with extension and a matching MIME type.
 */
const songFileArb = fc.tuple(filenameBaseArb, audioExtensionArb, audioMimeArb).map(
  ([base, ext, mime]) => ({
    baseName: base,
    fullName: base + ext,
    mimeType: mime,
  })
);

/**
 * Create a mock File object with the given name and MIME type.
 */
function createMockFile(name, mimeType) {
  return {
    name: name,
    type: mimeType,
    size: 1024,
    slice: () => new Blob(),
  };
}

// --- Property Test ---

describe('Feature: media-management, Property 5: Song name derived from filename', () => {
  beforeEach(() => {
    // Reset localStorage and globals before each test iteration
    mockLocalStorage.clear();
    globalThis.photos = [];
    globalThis.songs = [];
    globalThis.thingsYouLike = [];
    globalThis.funnyMoments = [];
  });

  it('song caption equals filename without extension and artist is "User Added"', async () => {
    /**
     * Validates: Requirements 5.5
     */
    await fc.assert(
      fc.asyncProperty(songFileArb, async ({ baseName, fullName, mimeType }) => {
        // Reset state for this iteration
        mockLocalStorage.clear();

        // Create a mock file with the generated name and MIME type
        const mockFile = createMockFile(fullName, mimeType);

        // Add the file as a song in local mode
        await globalThis.MediaManager.addMedia('songs', [mockFile]);

        // Read the added items from localStorage
        const addedRaw = mockLocalStorage.getItem('media_manager_added');
        expect(addedRaw).not.toBeNull();

        const addedItems = JSON.parse(addedRaw);
        expect(Array.isArray(addedItems)).toBe(true);
        expect(addedItems.length).toBe(1);

        const songItem = addedItems[0];

        // Verify caption equals filename without extension
        expect(songItem.caption).toBe(baseName);

        // Verify artist is "User Added"
        expect(songItem.metadata.artist).toBe('User Added');

        // Verify section is songs
        expect(songItem.section).toBe('songs');

        // Verify type is audio
        expect(songItem.type).toBe('audio');

        // Verify origin is user-added
        expect(songItem.origin).toBe('user-added');
      }),
      { numRuns: 100 }
    );
  });
});
