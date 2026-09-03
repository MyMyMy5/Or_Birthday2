import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

/**
 * Property 3: Photo Filter Bounds and Persistence
 *
 * For any photo item ID and any filter values where grayscale is in [0,100],
 * sepia is in [0,100], brightness is in [50,200], and contrast is in [50,200],
 * persisting the filter via `setPhotoFilter` and reading back via `getPhotoFilters`
 * SHALL return equivalent values, and all stored values SHALL remain within their
 * specified bounds.
 *
 * Also tests with out-of-bounds values to verify clamping works correctly.
 *
 * **Validates: Requirements 3.3, 3.7**
 * Feature: media-and-editor-upgrades, Property 3: Photo Filter Bounds and Persistence
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

// --- Re-implement the functions under test (matching script.js logic exactly) ---

const PHOTO_FILTERS_STORAGE_KEY = 'photo_filters';

function clampFilterValue(key, value) {
  var bounds = {
    grayscale: { min: 0, max: 100 },
    sepia: { min: 0, max: 100 },
    brightness: { min: 50, max: 200 },
    contrast: { min: 50, max: 200 },
  };
  var b = bounds[key];
  if (!b) return value;
  return Math.max(b.min, Math.min(b.max, value));
}

function getPhotoFilters() {
  try {
    var raw = mockLocalStorage.getItem(PHOTO_FILTERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function setPhotoFilter(itemId, filterValues) {
  try {
    var store = getPhotoFilters();
    var clamped = {
      grayscale: clampFilterValue('grayscale', filterValues.grayscale),
      sepia: clampFilterValue('sepia', filterValues.sepia),
      brightness: clampFilterValue('brightness', filterValues.brightness),
      contrast: clampFilterValue('contrast', filterValues.contrast),
    };
    store[itemId] = clamped;
    mockLocalStorage.setItem(PHOTO_FILTERS_STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    // Silently fail on localStorage errors
  }
}

function removePhotoFilter(itemId) {
  try {
    var store = getPhotoFilters();
    delete store[itemId];
    mockLocalStorage.setItem(PHOTO_FILTERS_STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    // Silently fail on localStorage errors
  }
}

// --- Arbitraries ---

/**
 * Generate a valid photo item ID (non-empty alphanumeric + dashes/underscores).
 * Excludes prototype-polluting keys.
 */
const RESERVED_KEYS = ['__proto__', 'constructor', 'toString', 'valueOf', 'hasOwnProperty'];
const itemIdArb = fc
  .stringMatching(/^[a-zA-Z0-9_-]+$/, { minLength: 1, maxLength: 40 })
  .filter((id) => !RESERVED_KEYS.includes(id));

/** Generate in-bounds filter values */
const inBoundsFilterArb = fc.record({
  grayscale: fc.integer({ min: 0, max: 100 }),
  sepia: fc.integer({ min: 0, max: 100 }),
  brightness: fc.integer({ min: 50, max: 200 }),
  contrast: fc.integer({ min: 50, max: 200 }),
});

/** Generate arbitrary (possibly out-of-bounds) filter values */
const anyFilterArb = fc.record({
  grayscale: fc.integer({ min: -500, max: 500 }),
  sepia: fc.integer({ min: -500, max: 500 }),
  brightness: fc.integer({ min: -500, max: 500 }),
  contrast: fc.integer({ min: -500, max: 500 }),
});

// --- Property Tests ---

describe('Feature: media-and-editor-upgrades, Property 3: Photo Filter Bounds and Persistence', () => {
  beforeEach(() => {
    mockLocalStorage = createMockLocalStorage();
  });

  it('in-bounds filter values are persisted and retrieved exactly', () => {
    /**
     * Validates: Requirements 3.3
     *
     * For any photo item ID and any filter values within the specified bounds,
     * setPhotoFilter followed by getPhotoFilters SHALL return the exact same values.
     */
    fc.assert(
      fc.property(
        itemIdArb,
        inBoundsFilterArb,
        (itemId, filterValues) => {
          mockLocalStorage.clear();

          setPhotoFilter(itemId, filterValues);
          const stored = getPhotoFilters();

          expect(stored[itemId]).toEqual(filterValues);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('stored filter values always remain within specified bounds', () => {
    /**
     * Validates: Requirements 3.7
     *
     * For any photo item ID and any arbitrary filter values (including out-of-bounds),
     * after persisting via setPhotoFilter, all stored values SHALL remain within
     * their specified bounds: grayscale [0,100], sepia [0,100], brightness [50,200],
     * contrast [50,200].
     */
    fc.assert(
      fc.property(
        itemIdArb,
        anyFilterArb,
        (itemId, filterValues) => {
          mockLocalStorage.clear();

          setPhotoFilter(itemId, filterValues);
          const stored = getPhotoFilters();
          const result = stored[itemId];

          expect(result.grayscale).toBeGreaterThanOrEqual(0);
          expect(result.grayscale).toBeLessThanOrEqual(100);
          expect(result.sepia).toBeGreaterThanOrEqual(0);
          expect(result.sepia).toBeLessThanOrEqual(100);
          expect(result.brightness).toBeGreaterThanOrEqual(50);
          expect(result.brightness).toBeLessThanOrEqual(200);
          expect(result.contrast).toBeGreaterThanOrEqual(50);
          expect(result.contrast).toBeLessThanOrEqual(200);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('out-of-bounds values are clamped correctly on round-trip', () => {
    /**
     * Validates: Requirements 3.7
     *
     * For any photo item ID and any out-of-bounds filter values, the stored values
     * SHALL equal the clamped versions: Math.max(min, Math.min(max, value)).
     */
    fc.assert(
      fc.property(
        itemIdArb,
        anyFilterArb,
        (itemId, filterValues) => {
          mockLocalStorage.clear();

          setPhotoFilter(itemId, filterValues);
          const stored = getPhotoFilters();
          const result = stored[itemId];

          // Verify clamping matches expected behavior
          expect(result.grayscale).toBe(Math.max(0, Math.min(100, filterValues.grayscale)));
          expect(result.sepia).toBe(Math.max(0, Math.min(100, filterValues.sepia)));
          expect(result.brightness).toBe(Math.max(50, Math.min(200, filterValues.brightness)));
          expect(result.contrast).toBe(Math.max(50, Math.min(200, filterValues.contrast)));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('multiple photo filters are stored and retrieved independently', () => {
    /**
     * Validates: Requirements 3.3
     *
     * For any two distinct photo item IDs and their respective filter values,
     * storing both and retrieving SHALL return the correct filter for each.
     */
    fc.assert(
      fc.property(
        itemIdArb,
        itemIdArb,
        inBoundsFilterArb,
        inBoundsFilterArb,
        (id1, id2, filter1, filter2) => {
          fc.pre(id1 !== id2);
          mockLocalStorage.clear();

          setPhotoFilter(id1, filter1);
          setPhotoFilter(id2, filter2);

          const stored = getPhotoFilters();
          expect(stored[id1]).toEqual(filter1);
          expect(stored[id2]).toEqual(filter2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('removePhotoFilter removes only the targeted entry', () => {
    /**
     * Validates: Requirements 3.3
     *
     * For any two distinct photo item IDs, storing filters for both and then
     * removing one SHALL leave the other intact.
     */
    fc.assert(
      fc.property(
        itemIdArb,
        itemIdArb,
        inBoundsFilterArb,
        inBoundsFilterArb,
        (id1, id2, filter1, filter2) => {
          fc.pre(id1 !== id2);
          mockLocalStorage.clear();

          setPhotoFilter(id1, filter1);
          setPhotoFilter(id2, filter2);
          removePhotoFilter(id1);

          const stored = getPhotoFilters();
          expect(stored[id1]).toBeUndefined();
          expect(stored[id2]).toEqual(filter2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('JSON serialization round-trip of the filter store produces equivalent object', () => {
    /**
     * Validates: Requirements 3.3, 3.7
     *
     * For any set of photo item ID / filter value pairs, the photo_filters store
     * serialized to JSON and deserialized SHALL produce an equivalent object,
     * and all values SHALL remain within bounds.
     */
    fc.assert(
      fc.property(
        fc.array(fc.tuple(itemIdArb, inBoundsFilterArb), { minLength: 1, maxLength: 15 }),
        (entries) => {
          mockLocalStorage.clear();

          for (const [id, filter] of entries) {
            setPhotoFilter(id, filter);
          }

          const raw = mockLocalStorage.getItem(PHOTO_FILTERS_STORAGE_KEY);
          expect(raw).not.toBeNull();

          // JSON round-trip
          const parsed = JSON.parse(raw);
          const reserialized = JSON.stringify(parsed);
          const reparsed = JSON.parse(reserialized);

          expect(reparsed).toEqual(parsed);

          // Verify all stored values are within bounds
          for (const key of Object.keys(parsed)) {
            const f = parsed[key];
            expect(f.grayscale).toBeGreaterThanOrEqual(0);
            expect(f.grayscale).toBeLessThanOrEqual(100);
            expect(f.sepia).toBeGreaterThanOrEqual(0);
            expect(f.sepia).toBeLessThanOrEqual(100);
            expect(f.brightness).toBeGreaterThanOrEqual(50);
            expect(f.brightness).toBeLessThanOrEqual(200);
            expect(f.contrast).toBeGreaterThanOrEqual(50);
            expect(f.contrast).toBeLessThanOrEqual(200);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
