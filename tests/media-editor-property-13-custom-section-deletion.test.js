import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

/**
 * Property 13: Custom Section Deletion
 *
 * For any array of custom sections and any valid section ID within that array,
 * deleting the section SHALL result in the stored array no longer containing a
 * section with that ID, and the array length SHALL decrease by exactly one.
 *
 * **Validates: Requirements 10.9**
 * Feature: media-and-editor-upgrades, Property 13: Custom Section Deletion
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
    get _store() {
      return store;
    },
  };
}

// --- Constants ---

const CUSTOM_SECTIONS_STORAGE_KEY = 'custom_sections';

// --- Re-implement functions for isolated testing (matching script.js logic) ---

let mockStorage;

function getCustomSections() {
  try {
    var raw = mockStorage.getItem(CUSTOM_SECTIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function addCustomSection(title, layout, itemType) {
  if (!title || typeof title !== 'string' || title.trim() === '') return null;
  var validLayouts = ['grid', 'list'];
  var validItemTypes = ['text', 'image', 'link'];
  if (validLayouts.indexOf(layout) === -1) return null;
  if (validItemTypes.indexOf(itemType) === -1) return null;

  var section = {
    id: 'custom-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
    title: title.trim(),
    layout: layout,
    itemType: itemType,
    items: []
  };

  try {
    var sections = getCustomSections();
    sections.push(section);
    mockStorage.setItem(CUSTOM_SECTIONS_STORAGE_KEY, JSON.stringify(sections));
  } catch (e) {
    // Silently fail
  }

  return section;
}

function deleteCustomSection(sectionId) {
  if (!sectionId) return false;
  try {
    var sections = getCustomSections();
    var originalLength = sections.length;
    var filtered = sections.filter(function (s) { return s.id !== sectionId; });
    if (filtered.length === originalLength) return false;
    mockStorage.setItem(CUSTOM_SECTIONS_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (e) {
    return false;
  }
}

// --- Arbitraries ---

/** Generate a valid section title */
const titleArb = fc.string({ minLength: 1, maxLength: 30 });

/** Generate a valid layout */
const layoutArb = fc.constantFrom('grid', 'list');

/** Generate a valid item type */
const itemTypeArb = fc.constantFrom('text', 'image', 'link');

/** Generate a number of sections to create (1-10) */
const numSectionsArb = fc.integer({ min: 1, max: 10 });

// --- Property Tests ---

describe('Feature: media-and-editor-upgrades, Property 13: Custom Section Deletion', () => {
  beforeEach(() => {
    mockStorage = createMockLocalStorage();
  });

  it('deleting a section removes it from the array and decreases length by one', () => {
    /**
     * Validates: Requirements 10.9
     *
     * For any array of custom sections and any valid section ID within that array,
     * deleting the section SHALL result in the stored array no longer containing a
     * section with that ID, and the array length SHALL decrease by exactly one.
     */
    fc.assert(
      fc.property(
        numSectionsArb,
        fc.array(titleArb, { minLength: 1, maxLength: 10 }),
        fc.array(layoutArb, { minLength: 10, maxLength: 10 }),
        fc.array(itemTypeArb, { minLength: 10, maxLength: 10 }),
        (numSections, titles, layouts, itemTypes) => {
          mockStorage.clear();

          // Create sections
          const actualCount = Math.min(numSections, titles.length);
          const createdSections = [];
          for (let i = 0; i < actualCount; i++) {
            const section = addCustomSection(
              titles[i],
              layouts[i % layouts.length],
              itemTypes[i % itemTypes.length]
            );
            if (section) {
              createdSections.push(section);
            }
          }

          // Need at least one section to test deletion
          if (createdSections.length === 0) return;

          // Pick a random index to delete (derived from array length)
          const indexToDelete = Math.floor(Math.random() * createdSections.length);
          const sectionToDelete = createdSections[indexToDelete];
          const lengthBefore = getCustomSections().length;

          // Delete the section
          const result = deleteCustomSection(sectionToDelete.id);

          // Assertions
          expect(result).toBe(true);

          const sectionsAfter = getCustomSections();

          // Array length decreased by exactly one
          expect(sectionsAfter.length).toBe(lengthBefore - 1);

          // Deleted section ID is no longer in the array
          const ids = sectionsAfter.map(s => s.id);
          expect(ids).not.toContain(sectionToDelete.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('deleting a section preserves all other sections unchanged', () => {
    /**
     * Validates: Requirements 10.9
     *
     * For any array of custom sections and any valid section ID within that array,
     * deleting the section SHALL leave all other sections intact and in their
     * original order.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        fc.array(titleArb, { minLength: 2, maxLength: 10 }),
        fc.array(layoutArb, { minLength: 10, maxLength: 10 }),
        fc.array(itemTypeArb, { minLength: 10, maxLength: 10 }),
        (numSections, titles, layouts, itemTypes) => {
          mockStorage.clear();

          // Create sections
          const actualCount = Math.min(numSections, titles.length);
          const createdSections = [];
          for (let i = 0; i < actualCount; i++) {
            const section = addCustomSection(
              titles[i],
              layouts[i % layouts.length],
              itemTypes[i % itemTypes.length]
            );
            if (section) {
              createdSections.push(section);
            }
          }

          // Need at least 2 sections to verify others are preserved
          if (createdSections.length < 2) return;

          // Pick a random index to delete
          const indexToDelete = Math.floor(Math.random() * createdSections.length);
          const sectionToDelete = createdSections[indexToDelete];

          // Get sections before deletion for comparison
          const sectionsBefore = getCustomSections();

          // Delete the section
          deleteCustomSection(sectionToDelete.id);

          // Get sections after deletion
          const sectionsAfter = getCustomSections();

          // All remaining sections should match the original (minus the deleted one)
          const expectedRemaining = sectionsBefore.filter(s => s.id !== sectionToDelete.id);
          expect(sectionsAfter).toEqual(expectedRemaining);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('deleteCustomSection returns false for non-existent ID and does not change array length', () => {
    /**
     * Validates: Requirements 10.9
     *
     * Deleting a section with an ID not present in the array SHALL return false
     * and SHALL NOT change the array length.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.array(titleArb, { minLength: 1, maxLength: 10 }),
        fc.array(layoutArb, { minLength: 10, maxLength: 10 }),
        fc.array(itemTypeArb, { minLength: 10, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        (numSections, titles, layouts, itemTypes, fakeId) => {
          mockStorage.clear();

          // Create sections
          const actualCount = Math.min(numSections, titles.length);
          const createdSections = [];
          for (let i = 0; i < actualCount; i++) {
            const section = addCustomSection(
              titles[i],
              layouts[i % layouts.length],
              itemTypes[i % itemTypes.length]
            );
            if (section) {
              createdSections.push(section);
            }
          }

          if (createdSections.length === 0) return;

          // Ensure fakeId doesn't match any existing section
          const existingIds = createdSections.map(s => s.id);
          const nonExistentId = 'nonexistent-' + fakeId;
          if (existingIds.includes(nonExistentId)) return;

          const lengthBefore = getCustomSections().length;

          // Attempt to delete non-existent section
          const result = deleteCustomSection(nonExistentId);

          // Should return false
          expect(result).toBe(false);

          // Array length should not change
          expect(getCustomSections().length).toBe(lengthBefore);
        }
      ),
      { numRuns: 100 }
    );
  });
});
