import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

/**
 * Property 11: Import/Export Settings Round-Trip
 *
 * For any valid localStorage state containing any subset of the export keys
 * with JSON-serializable values, exporting to a JSON object and then importing
 * (writing each key-value pair back to localStorage) SHALL produce an equivalent
 * localStorage state for all exported keys.
 *
 * **Validates: Requirements 9.2, 9.6, 9.9**
 * Feature: media-and-editor-upgrades, Property 11: Import/Export Settings Round-Trip
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

// --- Constants (matching script.js) ---

const EXPORT_KEYS = [
  'section_titles', 'section_colors', 'section_order', 'section_layouts',
  'section_columns', 'hidden_sections', 'pinned_items', 'item_notes',
  'song_renames', 'photo_renames', 'photo_filters', 'photo_frames',
  'photo_tags', 'video_thumbnails', 'song_thumbnails', 'custom_sections',
  'developer_mode_order', 'media_manager_added', 'media_manager_trash'
];

// --- Re-implement export/import logic for isolated testing (matching script.js) ---

let mockLocalStorage;

/**
 * Export: collect all EXPORT_KEYS from localStorage into a JSON object.
 * Mirrors the exportSettings() logic in script.js.
 */
function exportSettings(storage) {
  var data = {};
  for (var i = 0; i < EXPORT_KEYS.length; i++) {
    var key = EXPORT_KEYS[i];
    var value = storage.getItem(key);
    if (value !== null) {
      try {
        data[key] = JSON.parse(value);
      } catch (e) {
        // If value is not valid JSON, store as raw string
        data[key] = value;
      }
    }
  }
  return data;
}

/**
 * Import: parse JSON object and write each key-value pair to localStorage.
 * Mirrors the expected importSettings() logic per design doc.
 */
function importSettings(storage, data) {
  for (var key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      storage.setItem(key, JSON.stringify(data[key]));
    }
  }
}

// --- Arbitraries ---

/** Generate a JSON-serializable value suitable for localStorage.
 * We normalize through JSON round-trip to avoid -0 vs 0 issues since
 * JSON.stringify(-0) === "0" - this is expected JSON behavior. */
const jsonValueArb = fc.oneof(
  fc.dictionary(fc.string({ minLength: 0, maxLength: 10 }), fc.string({ minLength: 0, maxLength: 20 })),
  fc.array(fc.string({ minLength: 0, maxLength: 15 }), { minLength: 0, maxLength: 5 }),
  fc.array(fc.integer(), { minLength: 0, maxLength: 5 }),
  fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), fc.integer()),
  fc.jsonValue({ maxDepth: 2 })
).map((v) => JSON.parse(JSON.stringify(v)));

/** Generate a subset of EXPORT_KEYS with associated JSON-serializable values */
const localStorageStateArb = fc.subarray(EXPORT_KEYS, { minLength: 1 }).chain((keys) =>
  fc.tuple(
    fc.constant(keys),
    fc.array(jsonValueArb, { minLength: keys.length, maxLength: keys.length })
  )
);

// --- Property Tests ---

describe('Feature: media-and-editor-upgrades, Property 11: Import/Export Settings Round-Trip', () => {
  beforeEach(() => {
    mockLocalStorage = createMockLocalStorage();
  });

  it('exporting then importing produces equivalent localStorage state for all exported keys', () => {
    /**
     * Validates: Requirements 9.2, 9.6, 9.9
     *
     * For any valid localStorage state containing any subset of the export keys
     * with JSON-serializable values, exporting to a JSON object and then importing
     * (writing each key-value pair back to localStorage) SHALL produce an equivalent
     * localStorage state for all exported keys.
     */
    fc.assert(
      fc.property(
        localStorageStateArb,
        ([keys, values]) => {
          // Step 1: Set up localStorage with random state
          mockLocalStorage.clear();
          for (let i = 0; i < keys.length; i++) {
            mockLocalStorage.setItem(keys[i], JSON.stringify(values[i]));
          }

          // Step 2: Export - collect all keys into a JSON object
          const exported = exportSettings(mockLocalStorage);

          // Step 3: Clear localStorage (simulating transfer to another browser)
          mockLocalStorage.clear();

          // Step 4: Import - write each key-value pair back
          importSettings(mockLocalStorage, exported);

          // Step 5: Verify - for each key, the stored value equals the original
          for (let i = 0; i < keys.length; i++) {
            const storedRaw = mockLocalStorage.getItem(keys[i]);
            expect(storedRaw).not.toBeNull();

            const storedValue = JSON.parse(storedRaw);
            const originalValue = values[i];
            expect(storedValue).toEqual(originalValue);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('export only includes keys that exist in localStorage', () => {
    /**
     * Validates: Requirements 9.2, 9.6, 9.9
     *
     * For any subset of EXPORT_KEYS populated in localStorage, the exported
     * JSON object SHALL contain exactly those keys that were set (not missing
     * keys or extra keys).
     */
    fc.assert(
      fc.property(
        localStorageStateArb,
        ([keys, values]) => {
          mockLocalStorage.clear();
          for (let i = 0; i < keys.length; i++) {
            mockLocalStorage.setItem(keys[i], JSON.stringify(values[i]));
          }

          const exported = exportSettings(mockLocalStorage);

          // Exported object should have exactly the keys that were set
          const exportedKeys = Object.keys(exported).sort();
          const expectedKeys = [...keys].sort();
          expect(exportedKeys).toEqual(expectedKeys);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('import then export produces the same JSON object (double round-trip)', () => {
    /**
     * Validates: Requirements 9.2, 9.6, 9.9
     *
     * For any valid export JSON object, importing it and then exporting again
     * SHALL produce an equivalent JSON object.
     */
    fc.assert(
      fc.property(
        localStorageStateArb,
        ([keys, values]) => {
          // Build an export object directly
          const originalExport = {};
          for (let i = 0; i < keys.length; i++) {
            originalExport[keys[i]] = values[i];
          }

          // Import into clean localStorage
          mockLocalStorage.clear();
          importSettings(mockLocalStorage, originalExport);

          // Export again
          const reExported = exportSettings(mockLocalStorage);

          // Should be equivalent
          expect(reExported).toEqual(originalExport);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('keys not in EXPORT_KEYS are not affected by import/export', () => {
    /**
     * Validates: Requirements 9.2, 9.6, 9.9
     *
     * The export function only collects EXPORT_KEYS. Any other keys in
     * localStorage are not included in the export and are not overwritten
     * by import.
     */
    const RESERVED = ['__proto__', 'constructor', 'toString', 'valueOf', 'hasOwnProperty',
      'toLocaleString', 'isPrototypeOf', 'propertyIsEnumerable'];

    fc.assert(
      fc.property(
        localStorageStateArb,
        fc.string({ minLength: 1, maxLength: 20 }).filter(
          (s) => !EXPORT_KEYS.includes(s) && !RESERVED.includes(s)
        ),
        fc.string({ minLength: 1, maxLength: 20 }),
        ([keys, values], extraKey, extraValue) => {
          mockLocalStorage.clear();
          // Set export keys
          for (let i = 0; i < keys.length; i++) {
            mockLocalStorage.setItem(keys[i], JSON.stringify(values[i]));
          }
          // Set a non-export key
          mockLocalStorage.setItem(extraKey, extraValue);

          // Export should not include the extra key
          const exported = exportSettings(mockLocalStorage);
          expect(Object.prototype.hasOwnProperty.call(exported, extraKey)).toBe(false);

          // Import should not overwrite the extra key
          mockLocalStorage.clear();
          mockLocalStorage.setItem(extraKey, extraValue);
          importSettings(mockLocalStorage, exported);

          expect(mockLocalStorage.getItem(extraKey)).toBe(extraValue);
        }
      ),
      { numRuns: 100 }
    );
  });
});
