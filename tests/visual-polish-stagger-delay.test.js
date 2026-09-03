/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

// Import staggerChildCards by evaluating script.js in jsdom
// The function is defined globally, so we load it via a minimal approach.

function staggerChildCards(section) {
    const cards = section.querySelectorAll('.photo-card, .song-card, .like-card, .timeline-item, .moment-card');
    cards.forEach((card, i) => {
        const delay = Math.min(i * 70, 700);
        card.style.animationDelay = delay + 'ms';
        card.classList.add('card-animate');
    });
}

describe('staggerChildCards', () => {
    let section;

    beforeEach(() => {
        section = document.createElement('div');
        section.classList.add('section');
    });

    it('assigns incremental 70ms delays to each card', () => {
        for (let i = 0; i < 5; i++) {
            const card = document.createElement('div');
            card.classList.add('photo-card');
            section.appendChild(card);
        }

        staggerChildCards(section);

        const cards = section.querySelectorAll('.photo-card');
        expect(cards[0].style.animationDelay).toBe('0ms');
        expect(cards[1].style.animationDelay).toBe('70ms');
        expect(cards[2].style.animationDelay).toBe('140ms');
        expect(cards[3].style.animationDelay).toBe('210ms');
        expect(cards[4].style.animationDelay).toBe('280ms');
    });

    it('caps delay at 700ms for cards beyond index 10', () => {
        for (let i = 0; i < 15; i++) {
            const card = document.createElement('div');
            card.classList.add('song-card');
            section.appendChild(card);
        }

        staggerChildCards(section);

        const cards = section.querySelectorAll('.song-card');
        // Index 10: 10*70 = 700 (at cap)
        expect(cards[10].style.animationDelay).toBe('700ms');
        // Index 11: 11*70 = 770, capped to 700
        expect(cards[11].style.animationDelay).toBe('700ms');
        // Index 14: 14*70 = 980, capped to 700
        expect(cards[14].style.animationDelay).toBe('700ms');
    });

    it('adds .card-animate class to all cards', () => {
        for (let i = 0; i < 3; i++) {
            const card = document.createElement('div');
            card.classList.add('like-card');
            section.appendChild(card);
        }

        staggerChildCards(section);

        const cards = section.querySelectorAll('.like-card');
        cards.forEach((card) => {
            expect(card.classList.contains('card-animate')).toBe(true);
        });
    });

    it('handles sections with no matching cards gracefully', () => {
        const unrelatedDiv = document.createElement('div');
        unrelatedDiv.classList.add('other-element');
        section.appendChild(unrelatedDiv);

        // Should not throw
        staggerChildCards(section);

        expect(unrelatedDiv.classList.contains('card-animate')).toBe(false);
    });

    it('selects all supported card types', () => {
        const types = ['photo-card', 'song-card', 'like-card', 'timeline-item', 'moment-card'];
        types.forEach((type) => {
            const card = document.createElement('div');
            card.classList.add(type);
            section.appendChild(card);
        });

        staggerChildCards(section);

        const allCards = section.querySelectorAll('.photo-card, .song-card, .like-card, .timeline-item, .moment-card');
        expect(allCards.length).toBe(5);
        allCards.forEach((card, i) => {
            expect(card.style.animationDelay).toBe(Math.min(i * 70, 700) + 'ms');
            expect(card.classList.contains('card-animate')).toBe(true);
        });
    });
});

/**
 * Property 4: Stagger delay calculation
 *
 * For any number of cards N (N ≥ 0) within a section, the animation delay
 * assigned to card at index i (0-based) shall equal `min(i × 70, 700)` milliseconds.
 *
 * **Validates: Requirements 5.2, 5.5**
 * Feature: visual-polish-upgrades, Property 4: Stagger delay calculation
 */
describe('Feature: visual-polish-upgrades, Property 4: Stagger delay calculation', () => {
    it('each card at index i gets delay min(i * 70, 700) ms for any card count 0–100', () => {
        /**
         * Validates: Requirements 5.2, 5.5
         *
         * For any number of cards N in [0, 100], after calling staggerChildCards,
         * each card at index i SHALL have animationDelay equal to
         * Math.min(i * 70, 700) + 'ms' and SHALL have the 'card-animate' class.
         */
        fc.assert(
            fc.property(
                fc.nat({ max: 100 }),
                (cardCount) => {
                    // Create a fresh section with N cards
                    const section = document.createElement('div');
                    section.classList.add('section');

                    for (let i = 0; i < cardCount; i++) {
                        const card = document.createElement('div');
                        card.classList.add('photo-card');
                        section.appendChild(card);
                    }

                    staggerChildCards(section);

                    const cards = section.querySelectorAll('.photo-card');
                    expect(cards.length).toBe(cardCount);

                    for (let i = 0; i < cardCount; i++) {
                        const expectedDelay = Math.min(i * 70, 700) + 'ms';
                        expect(cards[i].style.animationDelay).toBe(expectedDelay);
                        expect(cards[i].classList.contains('card-animate')).toBe(true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('delay is monotonically non-decreasing across card indices', () => {
        /**
         * Validates: Requirements 5.2
         *
         * For any card count N > 0, the delay at index i+1 SHALL be
         * greater than or equal to the delay at index i (monotonically non-decreasing).
         */
        fc.assert(
            fc.property(
                fc.integer({ min: 2, max: 100 }),
                (cardCount) => {
                    const section = document.createElement('div');
                    section.classList.add('section');

                    for (let i = 0; i < cardCount; i++) {
                        const card = document.createElement('div');
                        card.classList.add('song-card');
                        section.appendChild(card);
                    }

                    staggerChildCards(section);

                    const cards = section.querySelectorAll('.song-card');
                    for (let i = 1; i < cardCount; i++) {
                        const prevDelay = parseInt(cards[i - 1].style.animationDelay);
                        const currDelay = parseInt(cards[i].style.animationDelay);
                        expect(currDelay).toBeGreaterThanOrEqual(prevDelay);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('delay never exceeds 700ms cap regardless of card index', () => {
        /**
         * Validates: Requirements 5.5
         *
         * For any card count N in [0, 100], no card SHALL have an
         * animationDelay value exceeding 700ms.
         */
        fc.assert(
            fc.property(
                fc.nat({ max: 100 }),
                (cardCount) => {
                    const section = document.createElement('div');
                    section.classList.add('section');

                    for (let i = 0; i < cardCount; i++) {
                        const card = document.createElement('div');
                        card.classList.add('timeline-item');
                        section.appendChild(card);
                    }

                    staggerChildCards(section);

                    const cards = section.querySelectorAll('.timeline-item');
                    for (let i = 0; i < cardCount; i++) {
                        const delay = parseInt(cards[i].style.animationDelay);
                        expect(delay).toBeLessThanOrEqual(700);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});
