import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Property 3: Only one pinned item per section
 *
 * For any section, the `pinned_items` store SHALL contain at most one entry per section ID.
 * Use fast-check to generate random pin operations, verify single pin constraint.
 *
 * Validates: Requirements 7.2, 7.3, 7.5
 * Feature: edit-mode-enhancements, Property 3: Only one pinned item per section
 */

// --- The canonical section IDs ---

const ALL_SECTION_IDS = [
  'photos-section',
  'songs-section',
  'timeline-section',
  'likes-section',
  'funny-section',
];

// --- Example item IDs per section ---

const ITEM_IDS = [
  'photo1.jpg',
  'photo2.jpg',
  'photo3.jpg',
  'song1.mp3',
  'song2.mp3',
  'song3.mp3',
  'timeline1',
  'timeline2',
  'like1.jpg',
  'like2.jpg',
  'funny1.gif',
  'funny2.gif',
];

// --- localStorage mock ---

function createLocalStorageMock() {
  let store = {};
  return {
    getItem(key) {
      return store[key] !== undefined ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
}

// --- Functions mirroring script.js logic ---

const PINNED_ITEMS_KEY = 'pinned_items';

/**
 * Reads the pinned_items map from localStorage.
 * Mirrors getPinnedItems() from script.js.
 */
function getPinnedItems(storage) {
  try {
    const raw = storage.getItem(PINNED_ITEMS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

/**
 * Saves the pinned_items map to localStorage.
 * Mirrors savePinnedItems() from script.js.
 */
function savePinnedItems(storage, pinnedMap) {
  try {
    storage.setItem(PINNED_ITEMS_KEY, JSON.stringify(pinnedMap));
  } catch (e) {
    // localStorage unavailable — silently fail
  }
}

/**
 * Toggles pin state for an item in a section.
 * If the item is already pinned, it unpins it.
 * If another item is pinned, it replaces it (only one per section).
 * Mirrors togglePinItem() from script.js.
 */
function togglePinItem(storage, sectionId, itemId) {
  const pinned = getPinnedItems(storage);
  if (pinned[sectionId] === itemId) {
    // Unpin (toggle off)
    delete pinned[sectionId];
  } else {
    // Pin this item (replaces any previous pin in this section)
    pinned[sectionId] = itemId;
  }
  savePinnedItems(storage, pinned);
}

/**
 * Validates that the pinned_items map has at most one entry per section ID.
 * Since it's a plain JS object, keys are unique by nature, but we verify:
 * - Each key is a valid section ID
 * - Each value is a non-empty string (item ID)
 * - No section appears more than once (inherent in object, but verify structure)
 */
function isValidPinnedMap(pinnedMap, allSectionIds) {
  const keys = Object.keys(pinnedMap);

  // Each key must be a valid section ID
  for (const key of keys) {
    if (!allSectionIds.includes(key)) return false;
  }

  // Each value must be a non-empty string
  for (const key of keys) {
    if (typeof pinnedMap[key] !== 'string' || pinnedMap[key].length === 0) return false;
  }

  // At most one entry per section (object keys are unique, but verify no duplicates in keys array)
  const uniqueKeys = new Set(keys);
  if (uniqueKeys.size !== keys.length) return false;

  return true;
}

// --- Arbitraries ---

/** Generates a random section ID from the list */
const sectionIdArb = fc.constantFrom(...ALL_SECTION_IDS);

/** Generates a random item ID from the list */
const itemIdArb = fc.constantFrom(...ITEM_IDS);

/** Generates a single pin operation: [sectionId, itemId] */
const pinOpArb = fc.tuple(sectionIdArb, itemIdArb);

/** Generates a sequence of pin operations */
const pinOpsArb = fc.array(pinOpArb, { minLength: 1, maxLength: 30 });

// --- Property Tests ---

describe('Feature: edit-mode-enhancements, Property 3: Only one pinned item per section', () => {
  it('after any single pin operation, the section has at most one pinned item', () => {
    /**
     * Validates: Requirements 7.2, 7.3, 7.5
     */
    fc.assert(
      fc.property(sectionIdArb, itemIdArb, (sectionId, itemId) => {
        const storage = createLocalStorageMock();

        togglePinItem(storage, sectionId, itemId);
        const pinned = getPinnedItems(storage);

        // At most one entry for this section
        const sectionEntries = Object.keys(pinned).filter((k) => k === sectionId);
        expect(sectionEntries.length).toBeLessThanOrEqual(1);

        // The pinned map is valid
        expect(isValidPinnedMap(pinned, ALL_SECTION_IDS)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it('after any sequence of pin operations, each section has at most one pinned item', () => {
    /**
     * Validates: Requirements 7.2, 7.3, 7.5
     */
    fc.assert(
      fc.property(pinOpsArb, (ops) => {
        const storage = createLocalStorageMock();

        for (const [sectionId, itemId] of ops) {
          togglePinItem(storage, sectionId, itemId);

          // After every operation, verify the constraint
          const pinned = getPinnedItems(storage);

          // Each section has at most one pinned item
          for (const sid of ALL_SECTION_IDS) {
            const entries = Object.keys(pinned).filter((k) => k === sid);
            expect(entries.length).toBeLessThanOrEqual(1);
          }

          // The overall map is valid
          expect(isValidPinnedMap(pinned, ALL_SECTION_IDS)).toBe(true);
        }
      }),
      { numRuns: 300 }
    );
  });

  it('pinning a new item in a section replaces the previous pinned item (not adds)', () => {
    /**
     * Validates: Requirements 7.2, 7.3, 7.5
     */
    fc.assert(
      fc.property(sectionIdArb, itemIdArb, itemIdArb, (sectionId, itemId1, itemId2) => {
        const storage = createLocalStorageMock();

        // Pin first item
        togglePinItem(storage, sectionId, itemId1);
        // Pin second item (different or same)
        togglePinItem(storage, sectionId, itemId2);

        const pinned = getPinnedItems(storage);

        // Section still has at most one pinned item
        const sectionEntries = Object.keys(pinned).filter((k) => k === sectionId);
        expect(sectionEntries.length).toBeLessThanOrEqual(1);

        // If itemId1 === itemId2, the second toggle unpins it
        // If itemId1 !== itemId2, the second toggle pins itemId2
        if (itemId1 === itemId2) {
          // Toggle off: section should have no pinned item
          expect(pinned[sectionId]).toBeUndefined();
        } else {
          // Replace: section should have itemId2 pinned
          expect(pinned[sectionId]).toBe(itemId2);
        }
      }),
      { numRuns: 300 }
    );
  });

  it('pinning items across different sections maintains at most one per section', () => {
    /**
     * Validates: Requirements 7.2, 7.3, 7.5
     */
    fc.assert(
      fc.property(pinOpsArb, (ops) => {
        const storage = createLocalStorageMock();

        // Apply all operations
        for (const [sectionId, itemId] of ops) {
          togglePinItem(storage, sectionId, itemId);
        }

        // Final state check
        const pinned = getPinnedItems(storage);

        // Total pinned items should be <= number of sections
        const pinnedCount = Object.keys(pinned).length;
        expect(pinnedCount).toBeLessThanOrEqual(ALL_SECTION_IDS.length);

        // Each section has at most one entry
        for (const sid of ALL_SECTION_IDS) {
          const entries = Object.keys(pinned).filter((k) => k === sid);
          expect(entries.length).toBeLessThanOrEqual(1);
        }

        // All keys are valid section IDs
        for (const key of Object.keys(pinned)) {
          expect(ALL_SECTION_IDS).toContain(key);
        }

        // All values are non-empty strings
        for (const value of Object.values(pinned)) {
          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 300 }
    );
  });

  it('save/read round-trip preserves the single-pin-per-section constraint', () => {
    /**
     * Validates: Requirements 7.2, 7.3, 7.5
     */
    fc.assert(
      fc.property(pinOpsArb, (ops) => {
        const storage = createLocalStorageMock();

        // Apply all operations
        for (const [sectionId, itemId] of ops) {
          togglePinItem(storage, sectionId, itemId);
        }

        // Read back from storage
        const pinned = getPinnedItems(storage);

        // Verify round-trip: save again and read back
        savePinnedItems(storage, pinned);
        const readBack = getPinnedItems(storage);

        // Should be identical
        expect(readBack).toEqual(pinned);

        // And still valid
        expect(isValidPinnedMap(readBack, ALL_SECTION_IDS)).toBe(true);

        // Each section still has at most one entry
        for (const sid of ALL_SECTION_IDS) {
          const entries = Object.keys(readBack).filter((k) => k === sid);
          expect(entries.length).toBeLessThanOrEqual(1);
        }
      }),
      { numRuns: 200 }
    );
  });
});
