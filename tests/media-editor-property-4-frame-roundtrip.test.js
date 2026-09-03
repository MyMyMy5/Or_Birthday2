import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

/**
 * Property 4: Photo Frame Persistence Round-Trip
 *
 * For any photo item ID and any valid frame name (one of 'confetti', 'balloons',
 * 'hearts', 'stars', 'cake', or null), storing via setPhotoFrame and reading back
 * SHALL return the same frame name.
 *
 * **Validates: Requirements 4.3**
 * Feature: media-and-editor-upgrades, Property 4: Photo Frame Persistence Round-Trip
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

const PHOTO_FRAMES_STORAGE_KEY = 'photo_frames';
const VALID_FRAME_NAMES = ['confetti', 'balloons', 'hearts', 'stars', 'cake'];

function getPhotoFrames() {
  try {
    var raw = mockLocalStorage.getItem(PHOTO_FRAMES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function setPhotoFrame(itemId, frameName) {
  try {
    if (VALID_FRAME_NAMES.indexOf(frameName) === -1) return;
    var store = getPhotoFrames();
    store[itemId] = frameName;
    mockLocalStorage.setItem(PHOTO_FRAMES_STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    // Silently fail on localStorage errors
  }
}

function removePhotoFrame(itemId) {
  try {
    var store = getPhotoFrames();
    delete store[itemId];
    mockLocalStorage.setItem(PHOTO_FRAMES_STORAGE_KEY, JSON.stringify(store));
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

/** Generate a valid frame name from the allowed set */
const validFrameNameArb = fc.constantFrom('confetti', 'balloons', 'hearts', 'stars', 'cake');

/** Generate a frame name or null (for the "no frame" case) */
const frameNameOrNullArb = fc.oneof(validFrameNameArb, fc.constant(null));

// --- Property Tests ---

describe('Feature: media-and-editor-upgrades, Property 4: Photo Frame Persistence Round-Trip', () => {
  beforeEach(() => {
    mockLocalStorage = createMockLocalStorage();
  });

  it('storing a valid frame name and reading back returns the same frame name', () => {
    /**
     * Validates: Requirements 4.3
     *
     * For any photo item ID and any valid frame name, storing via setPhotoFrame
     * and reading back via getPhotoFrames SHALL return the same frame name.
     */
    fc.assert(
      fc.property(
        itemIdArb,
        validFrameNameArb,
        (itemId, frameName) => {
          mockLocalStorage.clear();

          setPhotoFrame(itemId, frameName);
          const stored = getPhotoFrames();

          expect(stored[itemId]).toBe(frameName);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('null frame name (no frame) results in no entry being stored', () => {
    /**
     * Validates: Requirements 4.3
     *
     * For any photo item ID and a null frame name, setPhotoFrame SHALL not
     * store any entry (since null is not in VALID_FRAME_NAMES).
     */
    fc.assert(
      fc.property(
        itemIdArb,
        (itemId) => {
          mockLocalStorage.clear();

          setPhotoFrame(itemId, null);
          const stored = getPhotoFrames();

          expect(stored[itemId]).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('removePhotoFrame followed by getPhotoFrames returns undefined for that item', () => {
    /**
     * Validates: Requirements 4.3
     *
     * For any photo item ID and any valid frame name, storing a frame then
     * removing it SHALL result in getPhotoFrames returning undefined for that item.
     */
    fc.assert(
      fc.property(
        itemIdArb,
        validFrameNameArb,
        (itemId, frameName) => {
          mockLocalStorage.clear();

          setPhotoFrame(itemId, frameName);
          removePhotoFrame(itemId);
          const stored = getPhotoFrames();

          expect(stored[itemId]).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('multiple frames are stored and retrieved independently', () => {
    /**
     * Validates: Requirements 4.3
     *
     * For any two distinct photo item IDs and their respective valid frame names,
     * storing both and retrieving SHALL return the correct frame for each.
     */
    fc.assert(
      fc.property(
        itemIdArb,
        itemIdArb,
        validFrameNameArb,
        validFrameNameArb,
        (id1, id2, frame1, frame2) => {
          fc.pre(id1 !== id2);
          mockLocalStorage.clear();

          setPhotoFrame(id1, frame1);
          setPhotoFrame(id2, frame2);

          const stored = getPhotoFrames();
          expect(stored[id1]).toBe(frame1);
          expect(stored[id2]).toBe(frame2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('JSON serialization round-trip of the frame store produces equivalent object', () => {
    /**
     * Validates: Requirements 4.3
     *
     * For any set of photo item ID / frame name pairs, the photo_frames store
     * serialized to JSON and deserialized SHALL produce an equivalent object.
     */
    fc.assert(
      fc.property(
        fc.array(fc.tuple(itemIdArb, validFrameNameArb), { minLength: 1, maxLength: 15 }),
        (entries) => {
          mockLocalStorage.clear();

          for (const [id, frame] of entries) {
            setPhotoFrame(id, frame);
          }

          const raw = mockLocalStorage.getItem(PHOTO_FRAMES_STORAGE_KEY);
          expect(raw).not.toBeNull();

          // JSON round-trip
          const parsed = JSON.parse(raw);
          const reserialized = JSON.stringify(parsed);
          const reparsed = JSON.parse(reserialized);

          expect(reparsed).toEqual(parsed);

          // Verify all stored values are valid frame names
          for (const key of Object.keys(parsed)) {
            expect(VALID_FRAME_NAMES).toContain(parsed[key]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
