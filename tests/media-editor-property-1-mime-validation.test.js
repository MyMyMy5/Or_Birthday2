import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import fc from 'fast-check';

/**
 * Property 1: MIME Type Validation
 *
 * For any MIME type string and any section, the MediaManager validation function
 * SHALL accept the file if and only if the MIME type is in the allowed list for
 * that section (image types + video/mp4 + video/webm for image sections, audio
 * types for songs section), and SHALL reject all other MIME types.
 *
 * **Validates: Requirements 1.1, 1.2, 1.9**
 * Feature: media-and-editor-upgrades, Property 1: MIME Type Validation
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

// --- Constants ---

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
];

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
];

const IMAGE_SECTIONS = ['photos', 'thingsYouLike', 'funnyMoments'];

// Combined allowed types for image sections
const ALLOWED_IMAGE_SECTION_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

// --- Arbitraries ---

/** Generate an allowed MIME type for image sections (images + videos) */
const allowedImageSectionMimeArb = fc.constantFrom(...ALLOWED_IMAGE_SECTION_TYPES);

/** Generate an allowed audio MIME type for songs section */
const allowedAudioMimeArb = fc.constantFrom(...ALLOWED_AUDIO_TYPES);

/** Generate an image section */
const imageSectionArb = fc.constantFrom(...IMAGE_SECTIONS);

/** Generate any section */
const anySectionArb = fc.constantFrom('photos', 'thingsYouLike', 'funnyMoments', 'songs');

/**
 * Generate a MIME type that is NOT allowed for image sections.
 * Mix of known disallowed types and random strings.
 */
const disallowedForImageSectionArb = fc.oneof(
  fc.constantFrom(
    'application/pdf',
    'text/plain',
    'text/html',
    'application/json',
    'application/zip',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/mp4',
    'audio/x-m4a',
    'video/avi',
    'video/mkv',
    'image/svg+xml',
    'image/bmp',
    'application/octet-stream',
  ),
  // Random strings that are unlikely to match allowed types
  fc.string({ minLength: 1, maxLength: 30 }).filter(
    (s) => !ALLOWED_IMAGE_SECTION_TYPES.includes(s)
  ),
);

/**
 * Generate a MIME type that is NOT allowed for songs section.
 */
const disallowedForSongsArb = fc.oneof(
  fc.constantFrom(
    'application/pdf',
    'text/plain',
    'text/html',
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/webm',
    'application/zip',
    'application/octet-stream',
    'image/svg+xml',
    'audio/flac',
    'audio/aac',
  ),
  fc.string({ minLength: 1, maxLength: 30 }).filter(
    (s) => !ALLOWED_AUDIO_TYPES.includes(s)
  ),
);

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

describe('Feature: media-and-editor-upgrades, Property 1: MIME Type Validation', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    globalThis.photos = [];
    globalThis.songs = [];
    globalThis.thingsYouLike = [];
    globalThis.funnyMoments = [];
  });

  it('accepts allowed MIME types (image + video) for image sections', async () => {
    /**
     * Validates: Requirements 1.1, 1.2
     *
     * For any image section and any allowed MIME type (image types + video/mp4 + video/webm),
     * addMedia SHALL accept the file and store it.
     */
    await fc.assert(
      fc.asyncProperty(
        imageSectionArb,
        allowedImageSectionMimeArb,
        filenameArb,
        async (section, mimeType, filename) => {
          mockLocalStorage.clear();

          const mockFile = createMockFile(filename, mimeType);
          await globalThis.MediaManager.addMedia(section, [mockFile]);

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

  it('accepts allowed audio MIME types for songs section', async () => {
    /**
     * Validates: Requirements 1.1, 1.2
     *
     * For the songs section and any allowed audio MIME type,
     * addMedia SHALL accept the file and store it.
     */
    await fc.assert(
      fc.asyncProperty(
        allowedAudioMimeArb,
        filenameArb,
        async (mimeType, filename) => {
          mockLocalStorage.clear();

          const mockFile = createMockFile(filename, mimeType);
          await globalThis.MediaManager.addMedia('songs', [mockFile]);

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

  it('rejects disallowed MIME types for image sections', async () => {
    /**
     * Validates: Requirements 1.9
     *
     * For any image section and any MIME type NOT in the allowed list,
     * addMedia SHALL reject the file silently (no item stored, no error thrown).
     */
    await fc.assert(
      fc.asyncProperty(
        imageSectionArb,
        disallowedForImageSectionArb,
        filenameArb,
        async (section, mimeType, filename) => {
          mockLocalStorage.clear();

          const mockFile = createMockFile(filename, mimeType);
          await globalThis.MediaManager.addMedia(section, [mockFile]);

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

  it('rejects disallowed MIME types for songs section', async () => {
    /**
     * Validates: Requirements 1.9
     *
     * For the songs section and any MIME type NOT in the allowed audio list,
     * addMedia SHALL reject the file silently (no item stored, no error thrown).
     */
    await fc.assert(
      fc.asyncProperty(
        disallowedForSongsArb,
        filenameArb,
        async (mimeType, filename) => {
          mockLocalStorage.clear();

          const mockFile = createMockFile(filename, mimeType);
          await globalThis.MediaManager.addMedia('songs', [mockFile]);

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

  it('acceptance is if-and-only-if: a MIME type is accepted iff it is in the allowed list for the section', async () => {
    /**
     * Validates: Requirements 1.1, 1.2, 1.9
     *
     * For any section and any MIME type string, the file is accepted if and only if
     * the MIME type is in the allowed list for that section.
     */
    const allMimeArb = fc.oneof(
      fc.constantFrom(
        ...ALLOWED_IMAGE_TYPES,
        ...ALLOWED_VIDEO_TYPES,
        ...ALLOWED_AUDIO_TYPES,
        'application/pdf',
        'text/plain',
        'video/avi',
        'image/bmp',
        'audio/flac',
      ),
      fc.string({ minLength: 0, maxLength: 40 }),
    );

    await fc.assert(
      fc.asyncProperty(
        anySectionArb,
        allMimeArb,
        filenameArb,
        async (section, mimeType, filename) => {
          mockLocalStorage.clear();

          // Determine expected acceptance
          const isSongs = section === 'songs';
          const allowedForSection = isSongs
            ? ALLOWED_AUDIO_TYPES
            : ALLOWED_IMAGE_SECTION_TYPES;
          const shouldAccept = allowedForSection.includes(mimeType);

          const mockFile = createMockFile(filename, mimeType);
          await globalThis.MediaManager.addMedia(section, [mockFile]);

          const addedRaw = mockLocalStorage.getItem('media_manager_added');
          const addedItems = addedRaw ? JSON.parse(addedRaw) : [];
          const sectionItems = addedItems.filter((item) => item.section === section);

          if (shouldAccept) {
            expect(sectionItems.length).toBe(1);
          } else {
            expect(sectionItems.length).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
