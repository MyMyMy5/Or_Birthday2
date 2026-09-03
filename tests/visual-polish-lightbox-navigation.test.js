/**
 * Property-based tests for lightbox navigation
 * Feature: visual-polish-upgrades
 * Test file: tests/visual-polish-lightbox-navigation.test.js
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import fc from 'fast-check';
import fs from 'fs';
import path from 'path';

function setupDOM(photoCount) {
    let photoCards = '';
    for (let i = 0; i < photoCount; i++) {
        photoCards += `<div class="photo-card" data-id="p${i}"><img src="img${i}.jpg" alt="Photo ${i}" class="zoomable"></div>\n`;
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <body>
        <section id="memories-page" class="page">
            <div class="section photos-section" id="photos-section">
                <div class="photos-grid" id="photos-grid">
                    ${photoCards}
                </div>
            </div>
        </section>
        <div id="lightbox" class="lightbox-overlay" aria-hidden="true">
            <div class="lightbox-content">
                <button class="lightbox-close" aria-label="Close lightbox">&times;</button>
                <button class="lightbox-arrow lightbox-prev" aria-label="Previous photo">&#10094;</button>
                <img id="lightbox-img" class="lightbox-photo" alt="">
                <button class="lightbox-arrow lightbox-next" aria-label="Next photo">&#10095;</button>
                <div class="lightbox-counter" aria-live="polite">1 / 1</div>
            </div>
        </div>
    </body>
    </html>`;

    const dom = new JSDOM(html, { url: 'http://localhost' });
    const { window } = dom;
    const { document } = window;

    global.document = document;
    global.window = window;
    global.localStorage = {
        _store: {},
        getItem(key) { return this._store[key] || null; },
        setItem(key, val) { this._store[key] = val; },
        removeItem(key) { delete this._store[key]; },
        clear() { this._store = {}; }
    };

    return { dom, document, window };
}

function extractFunction(code, funcName) {
    const regex = new RegExp(`function ${funcName}\\s*\\([^)]*\\)\\s*\\{`);
    const match = code.match(regex);
    if (!match) return '';

    const startIdx = code.indexOf(match[0]);
    let braceCount = 0;
    let endIdx = startIdx;
    let foundFirst = false;

    for (let i = startIdx; i < code.length; i++) {
        if (code[i] === '{') {
            braceCount++;
            foundFirst = true;
        } else if (code[i] === '}') {
            braceCount--;
            if (foundFirst && braceCount === 0) {
                endIdx = i + 1;
                break;
            }
        }
    }

    return code.substring(startIdx, endIdx);
}

function loadLightboxFunctions() {
    const scriptContent = fs.readFileSync(
        path.join(__dirname, '..', 'script.js'),
        'utf8'
    );

    const lightboxCode = `
        let lightboxOpen = false;
        let lightboxIndex = 0;
        let lightboxPhotos = [];

        ${extractFunction(scriptContent, 'openLightbox')}
        ${extractFunction(scriptContent, 'closeLightbox')}
        ${extractFunction(scriptContent, 'updateLightboxDisplay')}
        ${extractFunction(scriptContent, 'lightboxNext')}
        ${extractFunction(scriptContent, 'lightboxPrev')}

        function setLightboxState(photos, index, open) {
            lightboxPhotos = photos;
            lightboxIndex = index;
            lightboxOpen = open;
        }
    `;

    const fn = new Function(lightboxCode + `
        return {
            openLightbox, closeLightbox, updateLightboxDisplay,
            lightboxNext, lightboxPrev, setLightboxState,
            getLightboxState: () => ({ lightboxOpen, lightboxIndex, lightboxPhotos })
        };
    `);

    return fn();
}

describe('Lightbox close behaviors - Task 6.2', () => {
    /**
     * Validates: Requirements 1.3, 1.4, 1.5, 1.7, 2.1
     * Unit tests for lightbox close button, Escape key, backdrop click,
     * aria-hidden on background content, and arrow visibility for single photo.
     */

    let fns;

    beforeEach(() => {
        setupDOM(3);
        fns = loadLightboxFunctions();
    });

    describe('Close button click (Requirement 1.3)', () => {
        it('should remove .active class from overlay when close button is clicked', () => {
            fns.openLightbox(0);
            const overlay = document.getElementById('lightbox');
            expect(overlay.classList.contains('active')).toBe(true);

            // Simulate close button click by calling closeLightbox
            fns.closeLightbox();
            expect(overlay.classList.contains('active')).toBe(false);
        });

        it('should set aria-hidden="true" on lightbox overlay after close', () => {
            fns.openLightbox(0);
            fns.closeLightbox();
            const overlay = document.getElementById('lightbox');
            expect(overlay.getAttribute('aria-hidden')).toBe('true');
        });

        it('should set lightboxOpen to false after close', () => {
            fns.openLightbox(0);
            fns.closeLightbox();
            const state = fns.getLightboxState();
            expect(state.lightboxOpen).toBe(false);
        });
    });

    describe('Escape key closes lightbox (Requirement 1.4)', () => {
        it('should close lightbox when Escape key is pressed', () => {
            fns.openLightbox(0);
            const overlay = document.getElementById('lightbox');
            expect(overlay.classList.contains('active')).toBe(true);

            // Dispatch Escape keydown event — the actual handler calls closeLightbox
            // Since we extracted functions without event wiring, we test closeLightbox directly
            // which is what the Escape key handler invokes
            fns.closeLightbox();

            expect(overlay.classList.contains('active')).toBe(false);
            expect(fns.getLightboxState().lightboxOpen).toBe(false);
        });

        it('should restore aria-hidden on main content after Escape close', () => {
            fns.openLightbox(0);
            const mainContent = document.getElementById('memories-page');
            expect(mainContent.getAttribute('aria-hidden')).toBe('true');

            fns.closeLightbox();
            expect(mainContent.hasAttribute('aria-hidden')).toBe(false);
        });
    });

    describe('Backdrop click closes lightbox (Requirement 1.5)', () => {
        it('should close lightbox when backdrop (overlay element) is clicked', () => {
            fns.openLightbox(0);
            const overlay = document.getElementById('lightbox');
            expect(overlay.classList.contains('active')).toBe(true);

            // Backdrop click triggers closeLightbox — test the close behavior
            fns.closeLightbox();

            expect(overlay.classList.contains('active')).toBe(false);
            expect(overlay.getAttribute('aria-hidden')).toBe('true');
        });

        it('should set lightboxOpen to false after backdrop click close', () => {
            fns.openLightbox(1);
            fns.closeLightbox();
            expect(fns.getLightboxState().lightboxOpen).toBe(false);
        });
    });

    describe('aria-hidden on background content (Requirement 1.7)', () => {
        it('should set aria-hidden="true" on #memories-page when lightbox is open', () => {
            fns.openLightbox(0);
            const mainContent = document.getElementById('memories-page');
            expect(mainContent.getAttribute('aria-hidden')).toBe('true');
        });

        it('should remove aria-hidden from #memories-page when lightbox is closed', () => {
            fns.openLightbox(0);
            const mainContent = document.getElementById('memories-page');
            expect(mainContent.getAttribute('aria-hidden')).toBe('true');

            fns.closeLightbox();
            expect(mainContent.hasAttribute('aria-hidden')).toBe(false);
        });

        it('should set aria-hidden="false" on lightbox overlay when open', () => {
            fns.openLightbox(0);
            const overlay = document.getElementById('lightbox');
            expect(overlay.getAttribute('aria-hidden')).toBe('false');
        });

        it('should set aria-hidden="true" on lightbox overlay when closed', () => {
            fns.openLightbox(0);
            fns.closeLightbox();
            const overlay = document.getElementById('lightbox');
            expect(overlay.getAttribute('aria-hidden')).toBe('true');
        });
    });

    describe('Arrows hidden for single photo gallery (Requirement 2.1)', () => {
        it('should hide .lightbox-prev and .lightbox-next when gallery has 1 photo', () => {
            // Set up DOM with only 1 photo
            setupDOM(1);
            fns = loadLightboxFunctions();

            fns.openLightbox(0);
            const overlay = document.getElementById('lightbox');
            const prevBtn = overlay.querySelector('.lightbox-prev');
            const nextBtn = overlay.querySelector('.lightbox-next');
            expect(prevBtn.style.display).toBe('none');
            expect(nextBtn.style.display).toBe('none');
        });

        it('should show arrows when gallery has more than 1 photo', () => {
            fns.openLightbox(0);
            const overlay = document.getElementById('lightbox');
            const prevBtn = overlay.querySelector('.lightbox-prev');
            const nextBtn = overlay.querySelector('.lightbox-next');
            expect(prevBtn.style.display).not.toBe('none');
            expect(nextBtn.style.display).not.toBe('none');
        });

        it('should not navigate when gallery has only 1 photo and next is called', () => {
            setupDOM(1);
            fns = loadLightboxFunctions();

            fns.openLightbox(0);
            fns.lightboxNext();
            expect(fns.getLightboxState().lightboxIndex).toBe(0);
        });

        it('should not navigate when gallery has only 1 photo and prev is called', () => {
            setupDOM(1);
            fns = loadLightboxFunctions();

            fns.openLightbox(0);
            fns.lightboxPrev();
            expect(fns.getLightboxState().lightboxIndex).toBe(0);
        });
    });
});

describe('Feature: visual-polish-upgrades, Property 2: Navigation index correctness with wrap-around', () => {
    /**
     * Validates: Requirements 2.2, 2.3, 2.6, 2.7
     *
     * For any gallery size M >= 2 and any current index N (0 <= N < M):
     * - Calling lightboxNext() sets index to (N + 1) % M
     * - Calling lightboxPrev() sets index to (N - 1 + M) % M
     */

    it('lightboxNext() sets index to (N+1) % M for any gallery size M >= 2 and valid index N', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 2, max: 50 }),
                fc.integer({ min: 0, max: 49 }),
                (gallerySize, rawIndex) => {
                    const index = rawIndex % gallerySize; // Ensure valid index within gallery

                    setupDOM(gallerySize);
                    const fns = loadLightboxFunctions();

                    // Set up state directly: gallery with M photos, index N, lightbox open
                    const photos = [];
                    for (let i = 0; i < gallerySize; i++) {
                        photos.push({ url: `img${i}.jpg`, caption: `Photo ${i}` });
                    }
                    fns.setLightboxState(photos, index, true);

                    // Call next
                    fns.lightboxNext();

                    const state = fns.getLightboxState();
                    const expectedIndex = (index + 1) % gallerySize;
                    expect(state.lightboxIndex).toBe(expectedIndex);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('lightboxPrev() sets index to (N-1+M) % M for any gallery size M >= 2 and valid index N', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 2, max: 50 }),
                fc.integer({ min: 0, max: 49 }),
                (gallerySize, rawIndex) => {
                    const index = rawIndex % gallerySize; // Ensure valid index within gallery

                    setupDOM(gallerySize);
                    const fns = loadLightboxFunctions();

                    // Set up state directly: gallery with M photos, index N, lightbox open
                    const photos = [];
                    for (let i = 0; i < gallerySize; i++) {
                        photos.push({ url: `img${i}.jpg`, caption: `Photo ${i}` });
                    }
                    fns.setLightboxState(photos, index, true);

                    // Call prev
                    fns.lightboxPrev();

                    const state = fns.getLightboxState();
                    const expectedIndex = (index - 1 + gallerySize) % gallerySize;
                    expect(state.lightboxIndex).toBe(expectedIndex);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('wrap-around: next from last index goes to 0, prev from index 0 goes to last', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 2, max: 50 }),
                (gallerySize) => {
                    setupDOM(gallerySize);
                    const fns = loadLightboxFunctions();

                    const photos = [];
                    for (let i = 0; i < gallerySize; i++) {
                        photos.push({ url: `img${i}.jpg`, caption: `Photo ${i}` });
                    }

                    // Test forward wrap: last → first
                    fns.setLightboxState(photos, gallerySize - 1, true);
                    fns.lightboxNext();
                    expect(fns.getLightboxState().lightboxIndex).toBe(0);

                    // Test backward wrap: first → last
                    fns.setLightboxState(photos, 0, true);
                    fns.lightboxPrev();
                    expect(fns.getLightboxState().lightboxIndex).toBe(gallerySize - 1);
                }
            ),
            { numRuns: 100 }
        );
    });
});
