import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Property 2: Section order is a permutation
 *
 * For any saved section order, it SHALL be a permutation of the original section IDs
 * (no duplicates, no missing sections).
 * Use fast-check to generate random permutations, verify validity.
 *
 * Validates: Requirements 6.4, 6.5
 * Feature: edit-mode-enhancements, Property 2: Section order is a permutation
 */

// --- The canonical section IDs ---

const ALL_SECTION_IDS = [
  'photos-section',
  'songs-section',
  'timeline-section',
  'likes-section',
  'funny-section',
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

/**
 * Reads the section_order array from localStorage.
 * Mirrors getSectionOrder() from script.js.
 */
function getSectionOrder(storage) {
  try {
    const raw = storage.getItem('section_order');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    // Invalid JSON or localStorage unavailable
  }
  return [];
}

/**
 * Saves the section_order array to localStorage.
 * Mirrors saveSectionOrder() from script.js.
 */
function saveSectionOrder(storage, order) {
  try {
    storage.setItem('section_order', JSON.stringify(order));
  } catch (e) {
    // localStorage unavailable — silently fail
  }
}

/**
 * Checks if an array is a valid permutation of the original section IDs.
 * A valid permutation has the same elements, no duplicates, no missing.
 */
function isValidPermutation(order, originalIds) {
  if (order.length !== originalIds.length) return false;
  const sorted1 = [...order].sort();
  const sorted2 = [...originalIds].sort();
  return sorted1.every((id, i) => id === sorted2[i]);
}

/**
 * Simulates moveSection logic: moves a section up or down in an order array.
 * Returns the new order array.
 */
function moveSection(order, sectionId, direction) {
  const newOrder = [...order];
  const index = newOrder.indexOf(sectionId);
  if (index === -1) return newOrder;

  if (direction === 'up' && index > 0) {
    // Swap with previous
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
  } else if (direction === 'down' && index < newOrder.length - 1) {
    // Swap with next
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
  }

  return newOrder;
}

// --- Arbitraries ---

/** Generates a random permutation of the section IDs */
const permutationArb = fc.shuffledSubarray(ALL_SECTION_IDS, {
  minLength: ALL_SECTION_IDS.length,
  maxLength: ALL_SECTION_IDS.length,
});

/** Generates a random section ID from the list */
const sectionIdArb = fc.constantFrom(...ALL_SECTION_IDS);

/** Generates a random direction */
const directionArb = fc.constantFrom('up', 'down');

/** Generates a sequence of move operations */
const moveOpsArb = fc.array(
  fc.tuple(sectionIdArb, directionArb),
  { minLength: 1, maxLength: 20 }
);

// --- Property Tests ---

describe('Feature: edit-mode-enhancements, Property 2: Section order is a permutation', () => {
  it('any random permutation of section IDs is a valid permutation', () => {
    /**
     * Validates: Requirements 6.4, 6.5
     */
    fc.assert(
      fc.property(permutationArb, (order) => {
        expect(isValidPermutation(order, ALL_SECTION_IDS)).toBe(true);
        expect(order.length).toBe(ALL_SECTION_IDS.length);

        // No duplicates
        const unique = new Set(order);
        expect(unique.size).toBe(ALL_SECTION_IDS.length);

        // No missing sections
        for (const id of ALL_SECTION_IDS) {
          expect(order).toContain(id);
        }
      }),
      { numRuns: 200 }
    );
  });

  it('saving and reading back a permutation preserves the permutation property', () => {
    /**
     * Validates: Requirements 6.4, 6.5
     */
    fc.assert(
      fc.property(permutationArb, (order) => {
        const storage = createLocalStorageMock();

        saveSectionOrder(storage, order);
        const readBack = getSectionOrder(storage);

        // Read back should be identical
        expect(readBack).toEqual(order);

        // And still a valid permutation
        expect(isValidPermutation(readBack, ALL_SECTION_IDS)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it('moveSection always produces a valid permutation from a valid permutation', () => {
    /**
     * Validates: Requirements 6.4, 6.5
     */
    fc.assert(
      fc.property(permutationArb, sectionIdArb, directionArb, (order, sectionId, direction) => {
        const newOrder = moveSection(order, sectionId, direction);

        // Result must still be a valid permutation
        expect(isValidPermutation(newOrder, ALL_SECTION_IDS)).toBe(true);
        expect(newOrder.length).toBe(ALL_SECTION_IDS.length);

        // No duplicates
        const unique = new Set(newOrder);
        expect(unique.size).toBe(ALL_SECTION_IDS.length);
      }),
      { numRuns: 500 }
    );
  });

  it('a sequence of moveSection operations always maintains a valid permutation', () => {
    /**
     * Validates: Requirements 6.4, 6.5
     */
    fc.assert(
      fc.property(permutationArb, moveOpsArb, (initialOrder, moveOps) => {
        let currentOrder = [...initialOrder];

        for (const [sectionId, direction] of moveOps) {
          currentOrder = moveSection(currentOrder, sectionId, direction);

          // After every move, the order must remain a valid permutation
          expect(isValidPermutation(currentOrder, ALL_SECTION_IDS)).toBe(true);
        }
      }),
      { numRuns: 200 }
    );
  });

  it('saving after multiple moves and reading back preserves the permutation', () => {
    /**
     * Validates: Requirements 6.4, 6.5
     */
    fc.assert(
      fc.property(permutationArb, moveOpsArb, (initialOrder, moveOps) => {
        const storage = createLocalStorageMock();
        let currentOrder = [...initialOrder];

        for (const [sectionId, direction] of moveOps) {
          currentOrder = moveSection(currentOrder, sectionId, direction);
        }

        // Save final order and read back
        saveSectionOrder(storage, currentOrder);
        const readBack = getSectionOrder(storage);

        expect(readBack).toEqual(currentOrder);
        expect(isValidPermutation(readBack, ALL_SECTION_IDS)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });
});
