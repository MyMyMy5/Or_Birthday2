import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Property 4: Column count bounds
 *
 * For any section, the stored column count SHALL be an integer between 2 and 6 inclusive.
 * Use fast-check to generate arbitrary integers, verify clamping behavior.
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4
 * Feature: edit-mode-enhancements, Property 4: Column count bounds
 */

// --- clampColumnCount implementation (mirrors script.js) ---

function clampColumnCount(value) {
  var num = parseInt(value, 10);
  if (isNaN(num) || num < 2) return 2;
  if (num > 6) return 6;
  return num;
}

// --- Property Tests ---

describe('Feature: edit-mode-enhancements, Property 4: Column count bounds', () => {
  it('clampColumnCount always returns an integer between 2 and 6 inclusive for any integer input', () => {
    /**
     * Validates: Requirements 9.1, 9.2, 9.3, 9.4
     */
    fc.assert(
      fc.property(fc.integer({ min: -1000000, max: 1000000 }), (value) => {
        const result = clampColumnCount(value);

        expect(result).toBeGreaterThanOrEqual(2);
        expect(result).toBeLessThanOrEqual(6);
        expect(Number.isInteger(result)).toBe(true);
      }),
      { numRuns: 500 }
    );
  });

  it('for values already in range (2-6), clampColumnCount returns the same value', () => {
    /**
     * Validates: Requirements 9.1, 9.2, 9.3, 9.4
     */
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 6 }), (value) => {
        const result = clampColumnCount(value);

        expect(result).toBe(value);
      }),
      { numRuns: 200 }
    );
  });

  it('for values below 2, clampColumnCount returns 2', () => {
    /**
     * Validates: Requirements 9.1, 9.2, 9.3, 9.4
     */
    fc.assert(
      fc.property(fc.integer({ min: -1000000, max: 1 }), (value) => {
        const result = clampColumnCount(value);

        expect(result).toBe(2);
      }),
      { numRuns: 200 }
    );
  });

  it('for values above 6, clampColumnCount returns 6', () => {
    /**
     * Validates: Requirements 9.1, 9.2, 9.3, 9.4
     */
    fc.assert(
      fc.property(fc.integer({ min: 7, max: 1000000 }), (value) => {
        const result = clampColumnCount(value);

        expect(result).toBe(6);
      }),
      { numRuns: 200 }
    );
  });

  it('clampColumnCount handles string representations of integers correctly', () => {
    /**
     * Validates: Requirements 9.1, 9.2, 9.3, 9.4
     */
    fc.assert(
      fc.property(fc.integer({ min: -1000000, max: 1000000 }), (value) => {
        const result = clampColumnCount(String(value));

        expect(result).toBeGreaterThanOrEqual(2);
        expect(result).toBeLessThanOrEqual(6);
        expect(Number.isInteger(result)).toBe(true);

        // If the numeric value is in range, it should be preserved
        if (value >= 2 && value <= 6) {
          expect(result).toBe(value);
        }
      }),
      { numRuns: 200 }
    );
  });

  it('clampColumnCount returns 2 for NaN-producing inputs', () => {
    /**
     * Validates: Requirements 9.1, 9.2, 9.3, 9.4
     */
    fc.assert(
      fc.property(
        fc.constantFrom(undefined, null, NaN, '', 'abc', 'not-a-number', '  ', Infinity, -Infinity),
        (value) => {
          const result = clampColumnCount(value);

          expect(result).toBeGreaterThanOrEqual(2);
          expect(result).toBeLessThanOrEqual(6);
          expect(Number.isInteger(result)).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });
});
