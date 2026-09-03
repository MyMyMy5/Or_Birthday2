import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import fc from 'fast-check';

/**
 * Property 7: Merged list on reload equals hardcoded plus added minus trashed
 *
 * For any combination of hardcoded items, user-added items in localStorage,
 * and trashed items in localStorage, after a simulated page reload in local mode,
 * getMediaItems(section) SHALL return exactly the union of hardcoded items and
 * user-added items, minus any items present in the trash store.
 *
 * Validates: Requirements 1.8, 2.6, 4.8, 5.7, 10.2
 * Feature: media-management, Property 7: Merged list on reload equals hardcoded plus added minus trashed
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

  // The IIFE reads `window` and `localStorage` at definition time,
  // but reads the hardcoded arrays and localStorage data at call time.
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

/** Generate a user-added MediaItem for the photos section */
const addedMediaItemArb = fc
  .record({
    id: fc.stringMatching(/^[a-zA-Z0-9_]+$/, { minLength: 1, maxLength: 30 }).map((s) => 'added/' + s + '.jpg'),
    source: fc.string({ maxLength: 30 }),
    caption: fc.string({ maxLength: 20 }),
  })
  .map((r) => ({
    id: r.id,
    section: 'photos',
    source: r.source,
    caption: r.caption,
    type: 'image',
    origin: 'user-added',
    metadata: {},
  }));

// --- Property Test ---

describe('Feature: media-management, Property 7: Merged list on reload equals hardcoded plus added minus trashed', () => {
  beforeEach(() => {
    // Reset localStorage and globals before each test iteration
    mockLocalStorage.clear();
    globalThis.photos = [];
    globalThis.songs = [];
    globalThis.thingsYouLike = [];
    globalThis.funnyMoments = [];
  });

  it('getMediaItems("photos") returns exactly hardcoded ∪ added − trashed', async () => {
    /**
     * Validates: Requirements 1.8, 2.6, 4.8, 5.7, 10.2
     */
    await fc.assert(
      fc.asyncProperty(
        // Generate hardcoded photos (may have duplicate urls)
        fc.array(hardcodedPhotoArb, { minLength: 0, maxLength: 8 }),
        // Generate user-added items (may have duplicate ids)
        fc.array(addedMediaItemArb, { minLength: 0, maxLength: 8 }),
        // Boolean flags to decide which combined items to trash
        fc.array(fc.boolean(), { minLength: 0, maxLength: 16 }),
        async (hardcodedPhotos, addedItems, trashFlags) => {
          // Deduplicate hardcoded photos by url (the IIFE uses url as id)
          const seenHardcoded = new Set();
          const uniqueHardcoded = hardcodedPhotos.filter((p) => {
            if (seenHardcoded.has(p.url)) return false;
            seenHardcoded.add(p.url);
            return true;
          });

          // Deduplicate added items by id, ensuring no overlap with hardcoded IDs
          const seenIds = new Set(uniqueHardcoded.map((p) => p.url));
          const uniqueAdded = addedItems.filter((item) => {
            if (seenIds.has(item.id)) return false;
            seenIds.add(item.id);
            return true;
          });

          // Build the combined ID list (hardcoded uses url as id)
          const hardcodedIds = uniqueHardcoded.map((p) => p.url);
          const addedIds = uniqueAdded.map((item) => item.id);
          const allIds = [...hardcodedIds, ...addedIds];

          // Decide which items to trash based on trashFlags
          const trashedIds = new Set();
          for (let i = 0; i < Math.min(trashFlags.length, allIds.length); i++) {
            if (trashFlags[i]) {
              trashedIds.add(allIds[i]);
            }
          }

          // Build trash entries
          const trashEntries = [...trashedIds].map((id) => ({
            id,
            section: 'photos',
            source: '',
            caption: '',
            type: 'image',
            metadata: {},
            deletedAt: new Date().toISOString(),
          }));

          // Set up mock localStorage with added and trash data
          mockLocalStorage.clear();
          mockLocalStorage.setItem('media_manager_added', JSON.stringify(uniqueAdded));
          mockLocalStorage.setItem('media_manager_trash', JSON.stringify(trashEntries));

          // Set up the global hardcoded array
          globalThis.photos = uniqueHardcoded;

          // Call getMediaItems — the IIFE reads globals and localStorage at call time
          const result = await globalThis.MediaManager.getMediaItems('photos');
          const resultIds = new Set(result.map((item) => item.id));

          // Expected: (hardcoded ∪ added) − trashed
          const expectedIds = new Set();
          for (const id of allIds) {
            if (!trashedIds.has(id)) {
              expectedIds.add(id);
            }
          }

          // Verify the sets are equal
          expect(resultIds).toEqual(expectedIds);
        }
      ),
      { numRuns: 100 }
    );
  });
});
