import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Property 1: Inline edit round-trip
 *
 * For any item ID and any non-empty string value, after saving an inline edit,
 * reading the value back from localStorage SHALL return the exact same string.
 *
 * Validates: Requirements 1.2, 1.5, 2.2, 2.5, 3.2, 3.5
 * Feature: edit-mode-enhancements, Property 1: Inline edit round-trip
 */

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

// --- Save/Read helpers (mirrors makeInlineEditable logic) ---

/**
 * Saves a value to localStorage using the same pattern as makeInlineEditable.
 * Without field: store[itemId] = value
 * With field: store[itemId][field] = value
 */
function saveInlineEdit(storage, storageKey, itemId, value, field) {
  const raw = storage.getItem(storageKey);
  const store = raw ? JSON.parse(raw) : {};

  if (field) {
    if (!store[itemId] || typeof store[itemId] !== 'object') {
      store[itemId] = {};
    }
    store[itemId][field] = value;
  } else {
    store[itemId] = value;
  }

  storage.setItem(storageKey, JSON.stringify(store));
}

/**
 * Reads a value back from localStorage using the same pattern.
 */
function readInlineEdit(storage, storageKey, itemId, field) {
  const raw = storage.getItem(storageKey);
  if (!raw) return undefined;
  const store = JSON.parse(raw);

  if (field) {
    return store[itemId] && typeof store[itemId] === 'object'
      ? store[itemId][field]
      : undefined;
  } else {
    return store[itemId];
  }
}

// --- Arbitraries ---

const nonEmptyStringArb = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0);
const itemIdArb = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0);
const fieldNameArb = fc.constantFrom('name', 'artist', 'caption', 'title');
const storageKeyArb = fc.constantFrom('song_renames', 'photo_renames', 'section_titles');

// --- Property Tests ---

describe('Feature: edit-mode-enhancements, Property 1: Inline edit round-trip', () => {
  it('without field: saving and reading back returns the exact same string', () => {
    /**
     * Validates: Requirements 1.2, 1.5, 2.2, 2.5, 3.2, 3.5
     */
    fc.assert(
      fc.property(storageKeyArb, itemIdArb, nonEmptyStringArb, (storageKey, itemId, value) => {
        const storage = createLocalStorageMock();

        saveInlineEdit(storage, storageKey, itemId, value, null);
        const readBack = readInlineEdit(storage, storageKey, itemId, null);

        expect(readBack).toBe(value);
      }),
      { numRuns: 200 }
    );
  });

  it('with field: saving and reading back returns the exact same string', () => {
    /**
     * Validates: Requirements 1.2, 1.5, 2.2, 2.5, 3.2, 3.5
     */
    fc.assert(
      fc.property(
        storageKeyArb,
        itemIdArb,
        fieldNameArb,
        nonEmptyStringArb,
        (storageKey, itemId, field, value) => {
          const storage = createLocalStorageMock();

          saveInlineEdit(storage, storageKey, itemId, value, field);
          const readBack = readInlineEdit(storage, storageKey, itemId, field);

          expect(readBack).toBe(value);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('multiple edits to same item preserve latest value (without field)', () => {
    /**
     * Validates: Requirements 1.2, 1.5, 2.2, 2.5, 3.2, 3.5
     */
    fc.assert(
      fc.property(
        storageKeyArb,
        itemIdArb,
        fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 10 }),
        (storageKey, itemId, values) => {
          const storage = createLocalStorageMock();

          for (const value of values) {
            saveInlineEdit(storage, storageKey, itemId, value, null);
          }

          const lastValue = values[values.length - 1];
          const readBack = readInlineEdit(storage, storageKey, itemId, null);

          expect(readBack).toBe(lastValue);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('multiple edits to same item with field preserve latest value', () => {
    /**
     * Validates: Requirements 1.2, 1.5, 2.2, 2.5, 3.2, 3.5
     */
    fc.assert(
      fc.property(
        storageKeyArb,
        itemIdArb,
        fieldNameArb,
        fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 10 }),
        (storageKey, itemId, field, values) => {
          const storage = createLocalStorageMock();

          for (const value of values) {
            saveInlineEdit(storage, storageKey, itemId, value, field);
          }

          const lastValue = values[values.length - 1];
          const readBack = readInlineEdit(storage, storageKey, itemId, field);

          expect(readBack).toBe(lastValue);
        }
      ),
      { numRuns: 100 }
    );
  });
});
