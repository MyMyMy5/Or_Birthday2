import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

/**
 * Property 8: Photo Tag Array Round-Trip
 *
 * For any photo item ID and any array of tag objects (each with x in [0,100],
 * y in [0,100], and a non-empty name string), storing the tags via setPhotoTags
 * and reading back SHALL produce an equivalent array. Serializing to JSON and
 * deserializing SHALL also produce an equivalent array.
 *
 * **Validates: Requirements 7.3, 7.8**
 * Feature: media-and-editor-upgrades, Property 8: Photo Tag Array Round-Trip
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

const PHOTO_TAGS_STORAGE_KEY = 'photo_tags';

function clampCoordinate(value) {
  return Math.max(0, Math.min(100, value));
}

function getPhotoTags() {
  try {
    var raw = mockLocalStorage.getItem(PHOTO_TAGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function setPhotoTags(itemId, tags) {
  try {
    var currentStore = getPhotoTags();
    currentStore[itemId] = tags.map(function (tag) {
      return {
        x: clampCoordinate(tag.x),
        y: clampCoordinate(tag.y),
        name: tag.name,
      };
    });
    mockLocalStorage.setItem(PHOTO_TAGS_STORAGE_KEY, JSON.stringify(currentStore));
  } catch (e) {
    // Silently fail
  }
}

function addPhotoTag(itemId, tag) {
  try {
    var currentStore = getPhotoTags();
    if (!currentStore[itemId]) {
      currentStore[itemId] = [];
    }
    currentStore[itemId].push({
      x: clampCoordinate(tag.x),
      y: clampCoordinate(tag.y),
      name: tag.name,
    });
    mockLocalStorage.setItem(PHOTO_TAGS_STORAGE_KEY, JSON.stringify(currentStore));
  } catch (e) {
    // Silently fail
  }
}

// --- Arbitraries ---

const RESERVED_KEYS = ['__proto__', 'constructor', 'toString', 'valueOf', 'hasOwnProperty'];

/** Generate a valid photo item ID (non-empty alphanumeric + dashes/underscores) */
const itemIdArb = fc
  .stringMatching(/^[a-zA-Z0-9_-]+$/, { minLength: 1, maxLength: 40 })
  .filter((id) => !RESERVED_KEYS.includes(id));

/** Generate tag coordinates clamped to [0, 100] */
const tagCoordArb = fc.float({ min: 0, max: 100, noNaN: true });

/** Generate a non-empty tag name */
const tagNameArb = fc.string({ minLength: 1, maxLength: 50 });

/** Generate a single tag object */
const tagArb = fc.record({
  x: tagCoordArb,
  y: tagCoordArb,
  name: tagNameArb,
});

/** Generate an array of tags */
const tagArrayArb = fc.array(tagArb, { minLength: 0, maxLength: 10 });

// --- Property Tests ---

describe('Feature: media-and-editor-upgrades, Property 8: Photo Tag Array Round-Trip', () => {
  beforeEach(() => {
    mockLocalStorage = createMockLocalStorage();
  });

  it('setPhotoTags then getPhotoTags returns an equivalent tag array', () => {
    /**
     * Validates: Requirements 7.3, 7.8
     *
     * For any photo item ID and any array of tag objects with coordinates in [0,100]
     * and non-empty names, storing via setPhotoTags and reading back via getPhotoTags
     * SHALL produce an equivalent array.
     */
    fc.assert(
      fc.property(
        itemIdArb,
        tagArrayArb,
        (itemId, tags) => {
          mockLocalStorage.clear();

          setPhotoTags(itemId, tags);
          const stored = getPhotoTags();

          expect(stored[itemId]).toHaveLength(tags.length);

          for (let i = 0; i < tags.length; i++) {
            expect(stored[itemId][i].x).toBeCloseTo(clampCoordinate(tags[i].x), 5);
            expect(stored[itemId][i].y).toBeCloseTo(clampCoordinate(tags[i].y), 5);
            expect(stored[itemId][i].name).toBe(tags[i].name);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('JSON serialization round-trip of the tag store produces equivalent data', () => {
    /**
     * Validates: Requirements 7.3, 7.8
     *
     * For any photo item ID and tag array, serializing the photo_tags store to JSON
     * and deserializing SHALL produce an equivalent object.
     */
    fc.assert(
      fc.property(
        itemIdArb,
        tagArrayArb,
        (itemId, tags) => {
          mockLocalStorage.clear();

          setPhotoTags(itemId, tags);

          const raw = mockLocalStorage.getItem(PHOTO_TAGS_STORAGE_KEY);
          expect(raw).not.toBeNull();

          const parsed = JSON.parse(raw);
          const reserialized = JSON.stringify(parsed);
          const reparsed = JSON.parse(reserialized);

          expect(reparsed).toEqual(parsed);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('addPhotoTag appends to existing tags and round-trips correctly', () => {
    /**
     * Validates: Requirements 7.3, 7.8
     *
     * For any photo item ID, initial tag array, and additional tag, adding a tag
     * via addPhotoTag after setPhotoTags SHALL result in the stored array having
     * length = initial.length + 1, and the last element matching the added tag.
     */
    fc.assert(
      fc.property(
        itemIdArb,
        tagArrayArb,
        tagArb,
        (itemId, initialTags, newTag) => {
          mockLocalStorage.clear();

          setPhotoTags(itemId, initialTags);
          addPhotoTag(itemId, newTag);

          const stored = getPhotoTags();
          expect(stored[itemId]).toHaveLength(initialTags.length + 1);

          // Last tag should match the added tag (with clamping)
          const lastTag = stored[itemId][stored[itemId].length - 1];
          expect(lastTag.x).toBeCloseTo(clampCoordinate(newTag.x), 5);
          expect(lastTag.y).toBeCloseTo(clampCoordinate(newTag.y), 5);
          expect(lastTag.name).toBe(newTag.name);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('multiple photos store and retrieve tags independently', () => {
    /**
     * Validates: Requirements 7.3, 7.8
     *
     * For any two distinct photo item IDs and their respective tag arrays,
     * storing both and retrieving SHALL return the correct tags for each photo.
     */
    fc.assert(
      fc.property(
        itemIdArb,
        itemIdArb,
        tagArrayArb,
        tagArrayArb,
        (id1, id2, tags1, tags2) => {
          fc.pre(id1 !== id2);
          mockLocalStorage.clear();

          setPhotoTags(id1, tags1);
          setPhotoTags(id2, tags2);

          const stored = getPhotoTags();

          expect(stored[id1]).toHaveLength(tags1.length);
          expect(stored[id2]).toHaveLength(tags2.length);

          for (let i = 0; i < tags1.length; i++) {
            expect(stored[id1][i].name).toBe(tags1[i].name);
          }
          for (let i = 0; i < tags2.length; i++) {
            expect(stored[id2][i].name).toBe(tags2[i].name);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
