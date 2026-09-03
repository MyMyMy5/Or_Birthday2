import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Property 7: Photo Tag Coordinate Bounds
 *
 * For any click position on a photo (any non-negative pixel coordinates) and any
 * photo dimensions (positive width and height), the computed tag coordinates SHALL
 * have x in [0, 100] and y in [0, 100] after clamping.
 *
 * **Validates: Requirements 7.2, 7.7**
 * Feature: media-and-editor-upgrades, Property 7: Photo Tag Coordinate Bounds
 */

// --- Replicate the logic from script.js for isolated testing ---

/**
 * Clamp a numeric value to the [0, 100] range.
 * Matches: Math.max(0, Math.min(100, value))
 */
function clampCoordinate(value) {
  return Math.max(0, Math.min(100, value));
}

/**
 * Compute the tag coordinate percentage from pixel position and image dimension.
 * Matches: clampCoordinate((pixel / dimension) * 100)
 */
function computeTagCoordinate(pixel, dimension) {
  return clampCoordinate((pixel / dimension) * 100);
}

// --- Property Tests ---

describe('Feature: media-and-editor-upgrades, Property 7: Photo Tag Coordinate Bounds', () => {
  it('clampCoordinate always returns a value in [0, 100] for any finite number', () => {
    /**
     * Validates: Requirements 7.7
     *
     * For any finite numeric input, clampCoordinate SHALL return a value
     * that is >= 0 and <= 100.
     */
    fc.assert(
      fc.property(
        fc.double({ min: -1e10, max: 1e10, noNaN: true, noDefaultInfinity: true }),
        (value) => {
          const result = clampCoordinate(value);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('clampCoordinate returns the input unchanged when it is within [0, 100]', () => {
    /**
     * Validates: Requirements 7.7
     *
     * For any value already in [0, 100], clampCoordinate SHALL return
     * the exact same value (identity within bounds).
     */
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
        (value) => {
          const result = clampCoordinate(value);
          expect(result).toBe(value);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('clampCoordinate clamps negative values to 0', () => {
    /**
     * Validates: Requirements 7.7
     *
     * For any negative value, clampCoordinate SHALL return 0.
     */
    fc.assert(
      fc.property(
        fc.double({ min: -1e10, max: -Number.MIN_VALUE, noNaN: true, noDefaultInfinity: true }),
        (value) => {
          const result = clampCoordinate(value);
          expect(result).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('clampCoordinate clamps values above 100 to 100', () => {
    /**
     * Validates: Requirements 7.7
     *
     * For any value greater than 100, clampCoordinate SHALL return 100.
     */
    fc.assert(
      fc.property(
        fc.double({ min: 100 + Number.MIN_VALUE, max: 1e10, noNaN: true, noDefaultInfinity: true }),
        (value) => {
          fc.pre(value > 100);
          const result = clampCoordinate(value);
          expect(result).toBe(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('computed tag coordinates are always in [0, 100] for any pixel position and image dimensions', () => {
    /**
     * Validates: Requirements 7.2, 7.7
     *
     * For any click position (pixel coordinates, including negatives and very large values)
     * and any positive image dimensions, the computed tag coordinate
     * (clampCoordinate((pixel / dimension) * 100)) SHALL always be in [0, 100].
     */
    fc.assert(
      fc.property(
        fc.float({ min: -1000, max: 10000, noNaN: true }),  // xPixel
        fc.float({ min: -1000, max: 10000, noNaN: true }),  // yPixel
        fc.float({ min: 1, max: 5000, noNaN: true }),       // image width
        fc.float({ min: 1, max: 5000, noNaN: true }),       // image height
        (xPixel, yPixel, width, height) => {
          fc.pre(width > 0 && height > 0);

          const xPercent = computeTagCoordinate(xPixel, width);
          const yPercent = computeTagCoordinate(yPixel, height);

          expect(xPercent).toBeGreaterThanOrEqual(0);
          expect(xPercent).toBeLessThanOrEqual(100);
          expect(yPercent).toBeGreaterThanOrEqual(0);
          expect(yPercent).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('computed tag coordinates equal the raw percentage when pixel is within image bounds', () => {
    /**
     * Validates: Requirements 7.2
     *
     * When the pixel position is within the image (0 <= pixel <= dimension),
     * the computed coordinate SHALL equal (pixel / dimension) * 100 exactly
     * (no clamping needed since result is naturally in [0, 100]).
     */
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 5000, noNaN: true }),  // image width
        fc.float({ min: 1, max: 5000, noNaN: true }),  // image height
        (width, height) => {
          fc.pre(width > 0 && height > 0);

          // Generate pixel positions within image bounds
          return fc.assert(
            fc.property(
              fc.float({ min: 0, max: width, noNaN: true }),   // xPixel within bounds
              fc.float({ min: 0, max: height, noNaN: true }),  // yPixel within bounds
              (xPixel, yPixel) => {
                const rawX = (xPixel / width) * 100;
                const rawY = (yPixel / height) * 100;
                const xPercent = computeTagCoordinate(xPixel, width);
                const yPercent = computeTagCoordinate(yPixel, height);

                // When pixel is within image, raw percentage is in [0, 100]
                // so clamping should not change the value
                expect(xPercent).toBeCloseTo(rawX, 5);
                expect(yPercent).toBeCloseTo(rawY, 5);
              }
            ),
            { numRuns: 20 }
          );
        }
      ),
      { numRuns: 5 }
    );
  });
});
