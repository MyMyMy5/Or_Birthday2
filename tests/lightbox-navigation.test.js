/**
 * Unit tests for lightbox navigation (arrows + keyboard) - Task 2.2
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

function setupDOM() {
    const html = `
    <!DOCTYPE html>
    <html>
    <body>
        <section id="memories-page" class="page">
            <div class="section photos-section" id="photos-section">
                <div class="photos-grid" id="photos-grid">
                    <div class="photo-card" data-id="p1">
                        <img src="img1.jpg" alt="Photo 1" class="zoomable">
                    </div>
                    <div class="photo-card" data-id="p2">
                        <img src="img2.jpg" alt="Photo 2" class="zoomable">
                    </div>
                    <div class="photo-card" data-id="p3">
                        <img src="img3.jpg" alt="Photo 3" class="zoomable">
                    </div>
                </div>
            </div>
        </section>
        <div id="lightbox" class="lightbox-overlay" aria-hidden="true">
            <div class="lightbox-content">
                <button class="lightbox-close" aria-label="Close lightbox">&times;</button>
                <button class="lightbox-arrow lightbox-prev" aria-label="Previous photo">&#10094;</button>
                <img id="lightbox-img" class="lightbox-photo" alt="">
                <button class="lightbox-arrow lightbox-next" aria-label="Next photo">&#10095;</button>
                <div class="lightbox-counter" aria-live="polite">1 / 6</div>
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
    `;

    const fn = new Function(lightboxCode + `
        return {
            openLightbox, closeLightbox, updateLightboxDisplay,
            lightboxNext, lightboxPrev,
            getLightboxState: () => ({ lightboxOpen, lightboxIndex, lightboxPhotos })
        };
    `);

    return fn();
}

describe('Lightbox navigation (arrows + keyboard) - Task 2.2', () => {
    let fns;

    beforeEach(() => {
        setupDOM();
        fns = loadLightboxFunctions();
    });

    describe('lightboxNext()', () => {
        it('should advance index by 1', () => {
            fns.openLightbox(0);
            fns.lightboxNext();
            const state = fns.getLightboxState();
            expect(state.lightboxIndex).toBe(1);
        });

        it('should wrap around from last to first', () => {
            fns.openLightbox(2); // last photo (index 2 of 3)
            fns.lightboxNext();
            const state = fns.getLightboxState();
            expect(state.lightboxIndex).toBe(0);
        });

        it('should update the counter text after navigation', () => {
            fns.openLightbox(0);
            fns.lightboxNext();
            const counter = document.querySelector('.lightbox-counter');
            expect(counter.textContent).toBe('2 / 3');
        });

        it('should update the image src after navigation', () => {
            fns.openLightbox(0);
            fns.lightboxNext();
            const img = document.getElementById('lightbox-img');
            expect(img.src).toContain('img2.jpg');
        });

        it('should not navigate when lightbox is closed', () => {
            fns.openLightbox(0);
            fns.closeLightbox();
            fns.lightboxNext();
            const state = fns.getLightboxState();
            expect(state.lightboxIndex).toBe(0);
        });

        it('should not navigate when gallery has only 1 photo', () => {
            // Remove 2 photos to leave only 1
            const grid = document.getElementById('photos-grid');
            const cards = grid.querySelectorAll('.photo-card');
            cards[1].remove();
            cards[2].remove();

            fns.openLightbox(0);
            fns.lightboxNext();
            const state = fns.getLightboxState();
            expect(state.lightboxIndex).toBe(0);
        });
    });

    describe('lightboxPrev()', () => {
        it('should go back by 1', () => {
            fns.openLightbox(2);
            fns.lightboxPrev();
            const state = fns.getLightboxState();
            expect(state.lightboxIndex).toBe(1);
        });

        it('should wrap around from first to last', () => {
            fns.openLightbox(0);
            fns.lightboxPrev();
            const state = fns.getLightboxState();
            expect(state.lightboxIndex).toBe(2);
        });

        it('should update the counter text after navigation', () => {
            fns.openLightbox(2);
            fns.lightboxPrev();
            const counter = document.querySelector('.lightbox-counter');
            expect(counter.textContent).toBe('2 / 3');
        });

        it('should update the image src after navigation', () => {
            fns.openLightbox(2);
            fns.lightboxPrev();
            const img = document.getElementById('lightbox-img');
            expect(img.src).toContain('img2.jpg');
        });

        it('should not navigate when lightbox is closed', () => {
            fns.openLightbox(1);
            fns.closeLightbox();
            fns.lightboxPrev();
            const state = fns.getLightboxState();
            expect(state.lightboxIndex).toBe(1);
        });

        it('should not navigate when gallery has only 1 photo', () => {
            const grid = document.getElementById('photos-grid');
            const cards = grid.querySelectorAll('.photo-card');
            cards[1].remove();
            cards[2].remove();

            fns.openLightbox(0);
            fns.lightboxPrev();
            const state = fns.getLightboxState();
            expect(state.lightboxIndex).toBe(0);
        });
    });

    describe('Arrow button visibility', () => {
        it('should show arrow buttons when gallery has > 1 photo', () => {
            fns.openLightbox(0);
            const overlay = document.getElementById('lightbox');
            const prevBtn = overlay.querySelector('.lightbox-prev');
            const nextBtn = overlay.querySelector('.lightbox-next');
            expect(prevBtn.style.display).not.toBe('none');
            expect(nextBtn.style.display).not.toBe('none');
        });

        it('should hide arrow buttons when gallery has exactly 1 photo', () => {
            const grid = document.getElementById('photos-grid');
            const cards = grid.querySelectorAll('.photo-card');
            cards[1].remove();
            cards[2].remove();

            fns.openLightbox(0);
            const overlay = document.getElementById('lightbox');
            const prevBtn = overlay.querySelector('.lightbox-prev');
            const nextBtn = overlay.querySelector('.lightbox-next');
            expect(prevBtn.style.display).toBe('none');
            expect(nextBtn.style.display).toBe('none');
        });
    });

    describe('Sequential navigation', () => {
        it('should cycle through all photos with repeated next calls', () => {
            fns.openLightbox(0);
            fns.lightboxNext(); // 0 → 1
            fns.lightboxNext(); // 1 → 2
            fns.lightboxNext(); // 2 → 0 (wrap)
            const state = fns.getLightboxState();
            expect(state.lightboxIndex).toBe(0);
        });

        it('should cycle through all photos with repeated prev calls', () => {
            fns.openLightbox(2);
            fns.lightboxPrev(); // 2 → 1
            fns.lightboxPrev(); // 1 → 0
            fns.lightboxPrev(); // 0 → 2 (wrap)
            const state = fns.getLightboxState();
            expect(state.lightboxIndex).toBe(2);
        });
    });
});
