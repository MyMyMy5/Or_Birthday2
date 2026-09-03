import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Property 4: JSON serialization round-trip
 *
 * For any valid MediaItem or TrashEntry object,
 * JSON.parse(JSON.stringify(obj)) SHALL produce an object deeply equal to the original.
 *
 * Validates: Requirements 3.7, 10.3
 * Feature: media-management, Property 4: JSON serialization round-trip
 */

// --- Arbitraries ---

const sectionArb = fc.constantFrom('photos', 'thingsYouLike', 'funnyMoments', 'songs');
const mediaTypeArb = fc.constantFrom('image', 'audio', 'video');
const originArb = fc.constantFrom('hardcoded', 'user-added');

const metadataArb = fc.record({
  artist: fc.option(fc.string(), { nil: undefined }),
  coverImage: fc.option(fc.string(), { nil: undefined }),
  videoId: fc.option(fc.string(), { nil: undefined }),
});

const mediaItemArb = fc.record({
  id: fc.string({ minLength: 1 }),
  section: sectionArb,
  source: fc.string(),
  caption: fc.string(),
  type: mediaTypeArb,
  origin: originArb,
  metadata: metadataArb,
});

const trashEntryArb = fc.record({
  id: fc.string({ minLength: 1 }),
  section: sectionArb,
  source: fc.string(),
  caption: fc.string(),
  type: mediaTypeArb,
  metadata: metadataArb,
  deletedAt: fc.integer({ min: 946684800000, max: 4102444799999 }).map((ts) => new Date(ts).toISOString()),
});

// --- Property Tests ---

describe('Feature: media-management, Property 4: JSON serialization round-trip', () => {
  it('MediaItem survives JSON round-trip', () => {
    /**
     * Validates: Requirements 3.7, 10.3
     */
    fc.assert(
      fc.property(mediaItemArb, (item) => {
        const roundTripped = JSON.parse(JSON.stringify(item));
        expect(roundTripped).toEqual(item);
      }),
      { numRuns: 100 }
    );
  });

  it('TrashEntry survives JSON round-trip', () => {
    /**
     * Validates: Requirements 3.7, 10.3
     */
    fc.assert(
      fc.property(trashEntryArb, (entry) => {
        const roundTripped = JSON.parse(JSON.stringify(entry));
        expect(roundTripped).toEqual(entry);
      }),
      { numRuns: 100 }
    );
  });
});
