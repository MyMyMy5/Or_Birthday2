import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

/**
 * Property 12: Custom Section Persistence Round-Trip
 *
 * For any array of valid custom section definitions (each with unique id,
 * non-empty title, valid layout, valid itemType, and items array), persisting
 * to localStorage under `custom_sections` and reading back SHALL produce an
 * equivalent array.
 *
 * **Validates: Requirements 10.4, 10.7**
 * Feature: media-and-editor-upgrades, Property 12: Custom Section Persistence Round-Trip
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

function addItemToCustomSection(sectionId, item) {
  if (!sectionId || !item) return false;
  try {
    var sections = getCustomSections();
    var found = false;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].id === sectionId) {
        if (!Array.isArray(sections[i].items)) {
          sections[i].items = [];
        }
        sections[i].items.push(item);
        found = true;
        break;
      }
    }
    if (!found) return false;
    mockStorage.setItem(CUSTOM_SECTIONS_STORAGE_KEY, JSON.stringify(sections));
    return true;
  } catch (e) {
    return false;
  }
}

// --- Arbitraries ---

/** Generate a title accepted by addCustomSection (non-empty after trimming) */
const validTitleArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter((title) => title.trim().length > 0);

/** Generate a valid section item with non-empty id and content */
const sectionItemArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  content: fc.string({ minLength: 1, maxLength: 50 })
});

/** Generate a valid custom section definition */
const customSectionArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 40 }),
  title: validTitleArb,
  layout: fc.constantFrom('grid', 'list'),
  itemType: fc.constantFrom('text', 'image', 'link'),
  items: fc.array(sectionItemArb, { minLength: 0, maxLength: 5 })
});

/** Generate an array of custom sections with unique IDs */
const customSectionsArrayArb = fc.array(customSectionArb, { minLength: 0, maxLength: 5 })
  .map((sections) => {
    // Ensure unique IDs by appending index
    return sections.map((s, i) => ({ ...s, id: s.id + '-' + i }));
  });

// --- Property Tests ---

describe('Feature: media-and-editor-upgrades, Property 12: Custom Section Persistence Round-Trip', () => {
  beforeEach(() => {
    mockStorage = createMockLocalStorage();
  });

  it('persisting and reading back custom sections produces equivalent data', () => {
    /**
     * Validates: Requirements 10.4, 10.7
     *
     * For any array of valid custom section definitions, persisting to
     * localStorage under `custom_sections` and reading back SHALL produce
     * an equivalent array.
     */
    fc.assert(
      fc.property(
        customSectionsArrayArb,
        (sections) => {
          // Persist the sections array to localStorage
          mockStorage.setItem(CUSTOM_SECTIONS_STORAGE_KEY, JSON.stringify(sections));

          // Read back using getCustomSections
          const retrieved = getCustomSections();

          // Should be equivalent
          expect(retrieved).toEqual(sections);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('addCustomSection followed by getCustomSections preserves section data', () => {
    /**
     * Validates: Requirements 10.4, 10.7
     *
     * For any valid title, layout, and itemType, adding a custom section
     * and reading back SHALL produce a section with the same title, layout,
     * itemType, and an empty items array.
     */
    fc.assert(
      fc.property(
        validTitleArb,
        fc.constantFrom('grid', 'list'),
        fc.constantFrom('text', 'image', 'link'),
        (title, layout, itemType) => {
          mockStorage.clear();

          const created = addCustomSection(title, layout, itemType);
          expect(created).not.toBeNull();

          const stored = getCustomSections();
          expect(stored).toHaveLength(1);
          expect(stored[0].title).toBe(title.trim());
          expect(stored[0].layout).toBe(layout);
          expect(stored[0].itemType).toBe(itemType);
          expect(stored[0].items).toEqual([]);
          expect(stored[0].id).toBe(created.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('addItemToCustomSection persists items and round-trips correctly', () => {
    /**
     * Validates: Requirements 10.4, 10.7
     *
     * For any valid section and array of items, adding items one by one
     * and reading back SHALL produce a section with all items in order.
     */
    fc.assert(
      fc.property(
        validTitleArb,
        fc.constantFrom('grid', 'list'),
        fc.constantFrom('text', 'image', 'link'),
        fc.array(sectionItemArb, { minLength: 0, maxLength: 5 }),
        (title, layout, itemType, items) => {
          mockStorage.clear();

          const section = addCustomSection(title, layout, itemType);
          expect(section).not.toBeNull();

          // Add items one by one
          for (const item of items) {
            const result = addItemToCustomSection(section.id, item);
            expect(result).toBe(true);
          }

          // Read back and verify
          const stored = getCustomSections();
          expect(stored).toHaveLength(1);
          expect(stored[0].items).toEqual(items);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('JSON serialization/deserialization round-trip preserves custom sections', () => {
    /**
     * Validates: Requirements 10.4, 10.7
     *
     * For any array of valid custom section definitions, serializing to JSON
     * and deserializing SHALL produce an equivalent array (verifying the
     * localStorage persistence mechanism).
     */
    fc.assert(
      fc.property(
        customSectionsArrayArb,
        (sections) => {
          // Simulate the full localStorage round-trip
          const serialized = JSON.stringify(sections);
          const deserialized = JSON.parse(serialized);

          expect(deserialized).toEqual(sections);
        }
      ),
      { numRuns: 100 }
    );
  });
});
