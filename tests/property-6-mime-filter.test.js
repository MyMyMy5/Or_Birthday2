import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import fc from 'fast-check';

/**
 * Property 6: MIME type filtering rejects disallowed types
 *
 * For any file with a MIME type not in the allowed set for the target section
 * (image types for image sections, audio types for songs), the system SHALL
 * reject the file without adding it to the section and without throwing an error.
 *
 * Validates: Requirements 6.4, 7.4, 8.8
 * Feature: media-management, Property 6: MIME type filtering rejects disallowed types
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

  // Load the IIFE module once — it attaches MediaManager to window/globalThis
  await import('../media-manager.js');
});

// --- Constants ---

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
];

const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
];

const IMAGE_SECTIONS = ['photos', 'thingsYouLike', 'funnyMoments'];

// --- Arbitraries ---

/**
 * Generate a disallowed MIME type — one that is NOT in any allowed list.
 * Uses common MIME types that should be rejected.
 */
const disallowedMimeArb = fc.constantFrom(
  'application/pdf',
  'text/plain',
  'text/html',
  'application/json',
  'application/zip',
  'application/octet-stream',
  'image/svg+xml',
  'image/bmp',
  'audio/flac',
  'audio/aac',
  'text/css',
  'application/javascript',
);

/** Generate an allowed image MIME type */
const allowedImageMimeArb = fc.constantFrom(...ALLOWED_IMAGE_TYPES);

/** Generate an allowed audio MIME type */
const allowedAudioMimeArb = fc.constantFrom(...ALLOWED_AUDIO_TYPES);

/** Generate a section for image uploads */
const imageSectionArb = fc.constantFrom(...IMAGE_SECTIONS);

/** Generate a simple filename */
const filenameArb = fc
  .stringMatching(/^[a-zA-Z0-9_]+$/, { minLength: 1, maxLength: 20 })
  .map((s) => s + '.dat');

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

// --- Property Tests ---

describe('Feature: media-management, Property 6: MIME type filtering rejects disallowed types', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    globalThis.photos = [];
    globalThis.songs = [];
    globalThis.thingsYouLike = [];
    globalThis.funnyMoments = [];
  });

  it('disallowed MIME types are rejected from image sections without error', async () => {
    /**
     * Validates: Requirements 6.4, 7.4, 8.8
     */
    await fc.assert(
      fc.asyncProperty(
        imageSectionArb,
        disallowedMimeArb,
        filenameArb,
        async (section, mimeType, filename) => {
          // Reset state
          mockLocalStorage.clear();

          const mockFile = createMockFile(filename, mimeType);

          // addMedia should not throw
          await globalThis.MediaManager.addMedia(section, [mockFile]);

          // Nothing should be added to localStorage
          const addedRaw = mockLocalStorage.getItem('media_manager_added');
          if (addedRaw !== null) {
            const addedItems = JSON.parse(addedRaw);
            const sectionItems = addedItems.filter((item) => item.section === section);
            expect(sectionItems.length).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('disallowed MIME types are rejected from songs section without error', async () => {
    /**
     * Validates: Requirements 6.4, 7.4, 8.8
     */
    await fc.assert(
      fc.asyncProperty(
        disallowedMimeArb,
        filenameArb,
        async (mimeType, filename) => {
          // Reset state
          mockLocalStorage.clear();

          const mockFile = createMockFile(filename, mimeType);

          // addMedia should not throw
          await globalThis.MediaManager.addMedia('songs', [mockFile]);

          // Nothing should be added to localStorage
          const addedRaw = mockLocalStorage.getItem('media_manager_added');
          if (addedRaw !== null) {
            const addedItems = JSON.parse(addedRaw);
            const songItems = addedItems.filter((item) => item.section === 'songs');
            expect(songItems.length).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('allowed image MIME types are accepted in image sections', async () => {
    /**
     * Validates: Requirements 6.4, 7.4, 8.8
     */
    await fc.assert(
      fc.asyncProperty(
        imageSectionArb,
        allowedImageMimeArb,
        filenameArb,
        async (section, mimeType, filename) => {
          // Reset state
          mockLocalStorage.clear();

          const mockFile = createMockFile(filename, mimeType);

          // addMedia should not throw
          await globalThis.MediaManager.addMedia(section, [mockFile]);

          // The item should be added to localStorage
          const addedRaw = mockLocalStorage.getItem('media_manager_added');
          expect(addedRaw).not.toBeNull();

          const addedItems = JSON.parse(addedRaw);
          const sectionItems = addedItems.filter((item) => item.section === section);
          expect(sectionItems.length).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('allowed audio MIME types are accepted in songs section', async () => {
    /**
     * Validates: Requirements 6.4, 7.4, 8.8
     */
    await fc.assert(
      fc.asyncProperty(
        allowedAudioMimeArb,
        filenameArb,
        async (mimeType, filename) => {
          // Reset state
          mockLocalStorage.clear();

          const mockFile = createMockFile(filename, mimeType);

          // addMedia should not throw
          await globalThis.MediaManager.addMedia('songs', [mockFile]);

          // The item should be added to localStorage
          const addedRaw = mockLocalStorage.getItem('media_manager_added');
          expect(addedRaw).not.toBeNull();

          const addedItems = JSON.parse(addedRaw);
          const songItems = addedItems.filter((item) => item.section === 'songs');
          expect(songItems.length).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
