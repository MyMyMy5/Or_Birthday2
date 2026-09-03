import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Property 5: Hidden sections subset
 *
 * For any saved hidden sections list, it SHALL be a proper subset of all section IDs
 * (at least one section remains visible).
 * Use fast-check to generate random subsets, verify constraint.
 *
 * Validates: Requirements 10.5, 10.6, 10.7
 * Feature: edit-mode-enhancements, Property 5: Hidden sections subset
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
 * Reads the hidden_sections array from localStorage.
 * Mirrors getHiddenSections() from script.js.
 */
function getHiddenSections(storage) {
  try {
    const raw = storage.getItem('hidden_sections');
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
 * Saves the hidden_sections array to localStorage.
 * Mirrors saveHiddenSections() from script.js.
 */
function saveHiddenSections(storage, hiddenIds) {
  try {
    storage.setItem('hidden_sections', JSON.stringify(hiddenIds));
  } catch (e) {
    // localStorage unavailable — silently fail
  }
}

/**
 * Checks if hiding another section is allowed (at least one must remain visible).
 * Mirrors canHideSection() from script.js.
 */
function canHideSection(allIds, hiddenIds) {
  const visibleCount = allIds.filter((id) => hiddenIds.indexOf(id) === -1).length;
  return visibleCount > 1;
}

/**
 * Validates that a hidden sections list is a proper subset of all section IDs:
 * - All hidden IDs must be valid section IDs
 * - At least one section must remain visible (hidden.length < all.length)
 */
function isValidHiddenSubset(hiddenIds, allIds) {
  // Must be a proper subset: not all sections hidden
  if (hiddenIds.length >= allIds.length) return false;
  // All hidden IDs must be valid section IDs
  return hiddenIds.every((id) => allIds.includes(id));
}

/**
 * Simulates the hide logic: attempts to hide a section, respecting the constraint
 * that at least one section must remain visible.
 */
function hideSection(allIds, currentHidden, sectionId) {
  // Don't hide if already hidden
  if (currentHidden.includes(sectionId)) return currentHidden;
  // Don't hide if it's not a valid section ID
  if (!allIds.includes(sectionId)) return currentHidden;
  // Don't hide if it would leave no visible sections
  if (!canHideSection(allIds, currentHidden)) return currentHidden;
  return [...currentHidden, sectionId];
}

// --- Arbitraries ---

/** Generates a random proper subset of section IDs (0 to n-1 elements) */
const properSubsetArb = fc.shuffledSubarray(ALL_SECTION_IDS, {
  minLength: 0,
  maxLength: ALL_SECTION_IDS.length - 1,
});

/** Generates a random subset of section IDs (0 to n elements, including full set) */
const anySubsetArb = fc.shuffledSubarray(ALL_SECTION_IDS, {
  minLength: 0,
  maxLength: ALL_SECTION_IDS.length,
});

/** Generates a random section ID from the list */
const sectionIdArb = fc.constantFrom(...ALL_SECTION_IDS);

/** Generates a sequence of hide operations */
const hideOpsArb = fc.array(sectionIdArb, { minLength: 1, maxLength: 20 });

// --- Property Tests ---

describe('Feature: edit-mode-enhancements, Property 5: Hidden sections subset', () => {
  it('any valid hidden sections list is a proper subset of all section IDs', () => {
    /**
     * Validates: Requirements 10.5, 10.6, 10.7
     */
    fc.assert(
      fc.property(properSubsetArb, (hiddenIds) => {
        // A proper subset has fewer elements than the full set
        expect(hiddenIds.length).toBeLessThan(ALL_SECTION_IDS.length);

        // All hidden IDs are valid section IDs
        for (const id of hiddenIds) {
          expect(ALL_SECTION_IDS).toContain(id);
        }

        // At least one section remains visible
        const visibleCount = ALL_SECTION_IDS.filter(
          (id) => !hiddenIds.includes(id)
        ).length;
        expect(visibleCount).toBeGreaterThanOrEqual(1);

        // Validation function agrees
        expect(isValidHiddenSubset(hiddenIds, ALL_SECTION_IDS)).toBe(true);
      }),
      { numRuns: 500 }
    );
  });

  it('hiding all sections is never a valid hidden subset', () => {
    /**
     * Validates: Requirements 10.5, 10.6, 10.7
     */
    fc.assert(
      fc.property(
        fc.shuffledSubarray(ALL_SECTION_IDS, {
          minLength: ALL_SECTION_IDS.length,
          maxLength: ALL_SECTION_IDS.length,
        }),
        (allHidden) => {
          // Hiding all sections should never be valid
          expect(isValidHiddenSubset(allHidden, ALL_SECTION_IDS)).toBe(false);

          // canHideSection should prevent this state
          // When all but one are hidden, canHideSection should return false
          const allButOne = allHidden.slice(0, allHidden.length - 1);
          expect(canHideSection(ALL_SECTION_IDS, allButOne)).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('hidden sections contain no invalid IDs (only valid section IDs)', () => {
    /**
     * Validates: Requirements 10.5, 10.6, 10.7
     */
    fc.assert(
      fc.property(properSubsetArb, (hiddenIds) => {
        // Every hidden ID must exist in the canonical list
        for (const id of hiddenIds) {
          expect(ALL_SECTION_IDS).toContain(id);
        }

        // No duplicates in the hidden list
        const unique = new Set(hiddenIds);
        expect(unique.size).toBe(hiddenIds.length);
      }),
      { numRuns: 300 }
    );
  });

  it('save/read round-trip preserves the subset property', () => {
    /**
     * Validates: Requirements 10.5, 10.6, 10.7
     */
    fc.assert(
      fc.property(properSubsetArb, (hiddenIds) => {
        const storage = createLocalStorageMock();

        // Save and read back
        saveHiddenSections(storage, hiddenIds);
        const readBack = getHiddenSections(storage);

        // Read back should be identical
        expect(readBack).toEqual(hiddenIds);

        // And still a valid proper subset
        expect(isValidHiddenSubset(readBack, ALL_SECTION_IDS)).toBe(true);

        // At least one section remains visible
        const visibleCount = ALL_SECTION_IDS.filter(
          (id) => !readBack.includes(id)
        ).length;
        expect(visibleCount).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 300 }
    );
  });

  it('a sequence of hideSection operations always maintains the proper subset constraint', () => {
    /**
     * Validates: Requirements 10.5, 10.6, 10.7
     */
    fc.assert(
      fc.property(hideOpsArb, (ops) => {
        let currentHidden = [];

        for (const sectionId of ops) {
          currentHidden = hideSection(ALL_SECTION_IDS, currentHidden, sectionId);

          // After every hide operation, the constraint must hold
          expect(currentHidden.length).toBeLessThan(ALL_SECTION_IDS.length);

          // All hidden IDs are valid
          for (const id of currentHidden) {
            expect(ALL_SECTION_IDS).toContain(id);
          }

          // At least one section remains visible
          const visibleCount = ALL_SECTION_IDS.filter(
            (id) => !currentHidden.includes(id)
          ).length;
          expect(visibleCount).toBeGreaterThanOrEqual(1);
        }
      }),
      { numRuns: 300 }
    );
  });

  it('saving after multiple hide operations and reading back preserves the subset', () => {
    /**
     * Validates: Requirements 10.5, 10.6, 10.7
     */
    fc.assert(
      fc.property(hideOpsArb, (ops) => {
        const storage = createLocalStorageMock();
        let currentHidden = [];

        for (const sectionId of ops) {
          currentHidden = hideSection(ALL_SECTION_IDS, currentHidden, sectionId);
        }

        // Save final state and read back
        saveHiddenSections(storage, currentHidden);
        const readBack = getHiddenSections(storage);

        expect(readBack).toEqual(currentHidden);
        expect(isValidHiddenSubset(readBack, ALL_SECTION_IDS)).toBe(true);

        // At least one section remains visible
        const visibleCount = ALL_SECTION_IDS.filter(
          (id) => !readBack.includes(id)
        ).length;
        expect(visibleCount).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 300 }
    );
  });
});
