import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import fc from 'fast-check';

/**
 * Property 3: Delete-then-restore round-trip
 *
 * For any media item in any section, deleting the item and then restoring it
 * SHALL result in the item reappearing in getMediaItems(section) and being
 * removed from the trash store. The restored item's section, source, and
 * caption SHALL equal the original values.
 *
 * Validates: Requirements 3.5, 3.6
 * Feature: media-management, Property 3: Delete-then-restore round-trip
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

describe('Feature: media-management, Property 3: Delete-then-restore round-trip', () => {
  beforeEach(() => {
    // Reset localStorage and globals before each test iteration
    mockLocalStorage.clear();
    globalThis.photos = [];
    globalThis.songs = [];
    globalThis.thingsYouLike = [];
    globalThis.funnyMoments = [];
  });

  it('deleting then restoring a hardcoded item returns it to the section and removes it from trash', async () => {
    /**
     * Validates: Requirements 3.5, 3.6
     */
    await fc.assert(
      fc.asyncProperty(
        // Generate at least 1 hardcoded photo
        fc.array(hardcodedPhotoArb, { minLength: 1, maxLength: 10 }),
        // Index to pick which item to delete then restore
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

          // Pick a valid index
          const deleteIndex = deleteIndexRaw % uniquePhotos.length;

          // 1. Get items before deletion and record the original item
          const beforeItems = await globalThis.MediaManager.getMediaItems('photos');
          const targetId = uniquePhotos[deleteIndex].url;
          const originalItem = beforeItems.find((item) => item.id === targetId);
          expect(originalItem).toBeDefined();

          // Save original values for later comparison
          const originalSection = originalItem.section;
          const originalSource = originalItem.source;
          const originalCaption = originalItem.caption;

          // 2. Delete the item
          await globalThis.MediaManager.deleteMedia('photos', originalItem);

          // Verify item is gone from section after delete
          const afterDeleteItems = await globalThis.MediaManager.getMediaItems('photos');
          const foundAfterDelete = afterDeleteItems.some((item) => item.id === targetId);
          expect(foundAfterDelete).toBe(false);

          // 3. Read the trash and find the entry for the deleted item
          const trashItems = await globalThis.MediaManager.getTrashItems();
          const trashEntry = trashItems.find((e) => e.id === targetId);
          expect(trashEntry).toBeDefined();

          // 4. Restore the item
          await globalThis.MediaManager.restoreMedia(trashEntry);

          // 5. Verify the item reappears in getMediaItems
          const afterRestoreItems = await globalThis.MediaManager.getMediaItems('photos');
          const restoredItem = afterRestoreItems.find((item) => item.id === targetId);
          expect(restoredItem).toBeDefined();

          // 6. Verify the item is no longer in the trash
          const trashAfterRestore = await globalThis.MediaManager.getTrashItems();
          const stillInTrash = trashAfterRestore.some((e) => e.id === targetId);
          expect(stillInTrash).toBe(false);

          // 7. Verify restored item's section, source, and caption match originals
          expect(restoredItem.section).toBe(originalSection);
          expect(restoredItem.source).toBe(originalSource);
          expect(restoredItem.caption).toBe(originalCaption);
        }
      ),
      { numRuns: 100 }
    );
  });
});
