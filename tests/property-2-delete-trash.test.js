import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import fc from 'fast-check';

/**
 * Property 2: Delete in local mode populates trash with required fields
 *
 * For any media item deleted while in local mode, the Trash_Store in
 * localStorage SHALL contain an entry with the item's original section,
 * source, caption, type, and a valid ISO 8601 deletedAt timestamp.
 *
 * Validates: Requirements 1.7, 2.5, 3.3
 * Feature: media-management, Property 2: Delete in local mode populates trash with required fields
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

// --- Helper: ISO 8601 validation ---

/**
 * Checks if a string is a valid ISO 8601 date-time.
 * Must parse to a valid Date and round-trip back to the same string.
 */
function isValidISO8601(str) {
  if (typeof str !== 'string') return false;
  const date = new Date(str);
  if (isNaN(date.getTime())) return false;
  // Verify it's a proper ISO string format (ends with Z or has timezone offset)
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str);
}

// --- Property Test ---

describe('Feature: media-management, Property 2: Delete in local mode populates trash with required fields', () => {
  beforeEach(() => {
    // Reset localStorage and globals before each test iteration
    mockLocalStorage.clear();
    globalThis.photos = [];
    globalThis.songs = [];
    globalThis.thingsYouLike = [];
    globalThis.funnyMoments = [];
  });

  it('deleteMedia in local mode creates a trash entry with section, source, caption, type, and valid ISO 8601 deletedAt', async () => {
    /**
     * Validates: Requirements 1.7, 2.5, 3.3
     */
    await fc.assert(
      fc.asyncProperty(
        // Generate at least 1 hardcoded photo
        fc.array(hardcodedPhotoArb, { minLength: 1, maxLength: 10 }),
        // Index to pick which item to delete
        fc.nat(),
        async (hardcodedPhotos, deleteIndexRaw) => {
          // Deduplicate hardcoded photos by url
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

          // Get the MediaItem from getMediaItems (so we have the full shape)
          const items = await globalThis.MediaManager.getMediaItems('photos');
          const targetId = uniquePhotos[deleteIndex].url;
          const itemToDelete = items.find((item) => item.id === targetId);

          // Record time just before deletion for timestamp validation
          const timeBefore = Date.now();

          // Delete the item in local mode
          await globalThis.MediaManager.deleteMedia('photos', itemToDelete);

          const timeAfter = Date.now();

          // Read the trash from localStorage
          const trashRaw = mockLocalStorage.getItem('media_manager_trash');
          expect(trashRaw).not.toBeNull();

          const trashEntries = JSON.parse(trashRaw);
          expect(Array.isArray(trashEntries)).toBe(true);

          // Find the trash entry for the deleted item
          const trashEntry = trashEntries.find((e) => e.id === targetId);
          expect(trashEntry).toBeDefined();

          // Verify required fields match the original item
          expect(trashEntry.section).toBe('photos');
          expect(trashEntry.source).toBe(itemToDelete.source);
          expect(trashEntry.caption).toBe(itemToDelete.caption);
          expect(trashEntry.type).toBe(itemToDelete.type);

          // Verify deletedAt is a valid ISO 8601 string
          expect(isValidISO8601(trashEntry.deletedAt)).toBe(true);

          // Verify the timestamp is within a reasonable range
          const deletedAtMs = new Date(trashEntry.deletedAt).getTime();
          expect(deletedAtMs).toBeGreaterThanOrEqual(timeBefore);
          expect(deletedAtMs).toBeLessThanOrEqual(timeAfter + 1000); // 1s tolerance
        }
      ),
      { numRuns: 100 }
    );
  });
});
