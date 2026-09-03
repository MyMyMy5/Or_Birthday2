import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import fc from 'fast-check';

/**
 * Property 1: Delete removes item from section
 *
 * For any media item in any section, calling deleteMedia(section, item)
 * SHALL result in that item no longer appearing in the list returned
 * by getMediaItems(section).
 *
 * Validates: Requirements 1.5, 2.3
 * Feature: media-management, Property 1: Delete removes item from section
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

// --- Set up globals before loading the IIFE ---

beforeAll(async () => {
  mockLocalStorage = createMockLocalStorage();

  globalThis.window = globalThis;
  globalThis.localStorage = mockLocalStorage;
  globalThis.photos = [];
  globalThis.songs = [];
  globalThis.thingsYouLike = [];
  globalThis.funnyMoments = [];

  // Load the IIFE module once — it attaches MediaManager to window/globalThis
  await import('../media-manager.js');
});

// --- Arbitraries ---

/** Generate a unique photo-style URL string */
const photoUrlArb = fc
  .stringMatching(/^[a-zA-Z0-9_]+$/, { minLength: 1, maxLength: 30 })
  .map((s) => 'img/' + s + '.jpg');

/** Generate a hardcoded photo object (as it appears in the global `photos` array) */
const hardcodedPhotoArb = fc.record({
  url: photoUrlArb,
  caption: fc.string({ maxLength: 20 }),
});

// --- Property Test ---

describe('Feature: media-management, Property 1: Delete removes item from section', () => {
  beforeEach(() => {
    // Reset localStorage and globals before each test iteration
    mockLocalStorage.clear();
    globalThis.photos = [];
    globalThis.songs = [];
    globalThis.thingsYouLike = [];
    globalThis.funnyMoments = [];
  });

  it('deleteMedia removes the item so it no longer appears in getMediaItems', async () => {
    /**
     * Validates: Requirements 1.5, 2.3
     */
    await fc.assert(
      fc.asyncProperty(
        // Generate at least 1 hardcoded photo (so we always have something to delete)
        fc.array(hardcodedPhotoArb, { minLength: 1, maxLength: 10 }),
        // Index to pick which item to delete
        fc.nat(),
        async (hardcodedPhotos, deleteIndexRaw) => {
          // Deduplicate hardcoded photos by url (the IIFE uses url as id)
          const seenUrls = new Set();
          const uniquePhotos = hardcodedPhotos.filter((p) => {
            if (seenUrls.has(p.url)) return false;
            seenUrls.add(p.url);
            return true;
          });

          // Need at least 1 unique photo
          if (uniquePhotos.length === 0) return;

          // Reset state for this iteration
          mockLocalStorage.clear();
          globalThis.photos = uniquePhotos;

          // Pick a valid index to delete
          const deleteIndex = deleteIndexRaw % uniquePhotos.length;

          // Verify items are present before deletion
          const beforeItems = await globalThis.MediaManager.getMediaItems('photos');
          const targetId = uniquePhotos[deleteIndex].url;
          const foundBefore = beforeItems.some((item) => item.id === targetId);
          expect(foundBefore).toBe(true);

          // Build a MediaItem matching what getMediaItems returns for the target
          const itemToDelete = beforeItems.find((item) => item.id === targetId);

          // Delete the item
          await globalThis.MediaManager.deleteMedia('photos', itemToDelete);

          // Verify the deleted item no longer appears
          const afterItems = await globalThis.MediaManager.getMediaItems('photos');
          const foundAfter = afterItems.some((item) => item.id === targetId);
          expect(foundAfter).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
