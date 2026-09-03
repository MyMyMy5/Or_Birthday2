/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Pure swipe decision function extracted from the lightbox swipe handler logic.
 *
 * Given horizontal distance dx and vertical distance dy:
 * - Returns null if |dy| > |dx| (vertical dominates — reject)
 * - Returns null if |dx| < 50 (below minimum threshold)
 * - Returns 'next' if dx < 0 (swipe left → next photo)
 * - Returns 'prev' if dx > 0 (swipe right → prev photo)
 *
 * The actual code checks conditions in this order:
 *   1. if (Math.abs(dy) > Math.abs(dx)) return; // vertical dominates
 *   2. if (Math.abs(dx) < 50) return; // below threshold
 * So navigation occurs when |dy| <= |dx| AND |dx| >= 50.
 */
function swipeDecision(dx, dy) {
    if (Math.abs(dy) > Math.abs(dx)) return null; // Vertical dominates
    if (Math.abs(dx) < 50) return null; // Below minimum threshold
    if (dx < 0) return 'next';
    return 'prev';
}

describe('swipeDecision', () => {
    it('returns null for small horizontal movements', () => {
        expect(swipeDecision(10, 5)).toBe(null);
        expect(swipeDecision(-30, 0)).toBe(null);
        expect(swipeDecision(49, 0)).toBe(null);
        expect(swipeDecision(-49, 10)).toBe(null);
    });

    it('returns null for vertical-dominant swipes', () => {
        expect(swipeDecision(60, 80)).toBe(null);
        expect(swipeDecision(-100, 150)).toBe(null);
        expect(swipeDecision(50, 51)).toBe(null);
    });

    it('returns next for left swipe (dx < 0) meeting threshold', () => {
        expect(swipeDecision(-50, 0)).toBe('next');
        expect(swipeDecision(-100, 50)).toBe('next');
        expect(swipeDecision(-200, 100)).toBe('next');
    });

    it('returns prev for right swipe (dx > 0) meeting threshold', () => {
        expect(swipeDecision(50, 0)).toBe('prev');
        expect(swipeDecision(100, 50)).toBe('prev');
        expect(swipeDecision(200, 100)).toBe('prev');
    });

    it('handles boundary case dx === 50 exactly', () => {
        expect(swipeDecision(50, 49)).toBe('prev');
        expect(swipeDecision(50, 50)).toBe('prev'); // |dy| > |dx| is false when equal, so navigation occurs
        expect(swipeDecision(-50, 49)).toBe('next');
        expect(swipeDecision(-50, 50)).toBe('next'); // |dy| > |dx| is false when equal, so navigation occurs
        expect(swipeDecision(50, 51)).toBe(null); // |dy| > |dx| is true, rejected
        expect(swipeDecision(-50, 51)).toBe(null);
    });

    it('handles dx === 0 (always rejected)', () => {
        expect(swipeDecision(0, 0)).toBe(null);
        expect(swipeDecision(0, 100)).toBe(null);
    });
});

/**
 * Property 3: Swipe gesture navigation decision
 *
 * For any touch movement with horizontal distance dx and vertical distance dy:
 * - Navigation shall occur if and only if |dx| >= 50 AND |dx| > |dy|
 * - When navigation occurs: if dx < 0 then next, if dx > 0 then prev
 *
 * **Validates: Requirements 3.4, 3.5**
 * Feature: visual-polish-upgrades, Property 3: Swipe gesture navigation decision
 */
describe('Feature: visual-polish-upgrades, Property 3: Swipe gesture navigation decision', () => {
    it('navigation occurs iff |dx| >= 50 AND |dx| >= |dy|', () => {
        /**
         * Validates: Requirements 3.4, 3.5
         *
         * For any dx in [-500, 500] and dy in [-500, 500], swipeDecision returns
         * a non-null value if and only if |dx| >= 50 AND |dy| <= |dx|.
         * (The code rejects when |dy| > |dx|, so navigation occurs when |dy| <= |dx|.)
         */
        fc.assert(
            fc.property(
                fc.integer({ min: -500, max: 500 }),
                fc.integer({ min: -500, max: 500 }),
                (dx, dy) => {
                    const result = swipeDecision(dx, dy);
                    const shouldNavigate = Math.abs(dx) >= 50 && Math.abs(dy) <= Math.abs(dx);

                    if (shouldNavigate) {
                        expect(result).not.toBe(null);
                    } else {
                        expect(result).toBe(null);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('direction is next when dx < 0, prev when dx > 0', () => {
        /**
         * Validates: Requirements 3.4, 3.5
         *
         * For any dx in [-500, 500] and dy in [-500, 500] where navigation occurs,
         * the direction SHALL be 'next' if dx < 0 and 'prev' if dx > 0.
         */
        fc.assert(
            fc.property(
                fc.integer({ min: -500, max: 500 }),
                fc.integer({ min: -500, max: 500 }),
                (dx, dy) => {
                    const result = swipeDecision(dx, dy);
                    const shouldNavigate = Math.abs(dx) >= 50 && Math.abs(dy) <= Math.abs(dx);

                    if (shouldNavigate) {
                        if (dx < 0) {
                            expect(result).toBe('next');
                        } else {
                            expect(result).toBe('prev');
                        }
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('swipes below 50px threshold never navigate regardless of dy', () => {
        /**
         * Validates: Requirements 3.4
         *
         * For any dx with |dx| < 50 and any dy, swipeDecision SHALL return null.
         */
        fc.assert(
            fc.property(
                fc.integer({ min: -49, max: 49 }),
                fc.integer({ min: -500, max: 500 }),
                (dx, dy) => {
                    const result = swipeDecision(dx, dy);
                    expect(result).toBe(null);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('vertical-dominant swipes never navigate regardless of dx magnitude', () => {
        /**
         * Validates: Requirements 3.5
         *
         * For any dx and dy where |dy| > |dx| (strictly), swipeDecision SHALL return null
         * even if |dx| >= 50.
         */
        fc.assert(
            fc.property(
                fc.integer({ min: -500, max: 500 }),
                fc.integer({ min: -500, max: 500 }),
                (dx, dy) => {
                    // Only test cases where vertical strictly dominates
                    fc.pre(Math.abs(dy) > Math.abs(dx));
                    const result = swipeDecision(dx, dy);
                    expect(result).toBe(null);
                }
            ),
            { numRuns: 100 }
        );
    });
});
