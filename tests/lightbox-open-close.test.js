/**
 * Unit tests for lightbox open/close functions (Task 2.1)
 * Validates: Requirements 1.1, 1.3, 1.5, 1.6, 1.7
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
                    <div class="photo-card video-card" data-id="v1">
                        <img src="vid-thumb.jpg" alt="Video" class="zoomable">
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

    // Set up globals
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

function loadScriptFunctions() {
    // Read script.js and extract just the lightbox functions
    const scriptContent = fs.readFileSync(
        path.join(__dirname, '..', 'script.js'),
        'utf8'
    );

    // Extract lightbox state and functions using eval in the global context
    // We need to define the state variables and functions
    const lightboxCode = `
        let lightboxOpen = false;
        let lightboxIndex = 0;
        let lightboxPhotos = [];

        ${extractFunction(scriptContent, 'openLightbox')}
        ${extractFunction(scriptContent, 'closeLightbox')}
        ${extractFunction(scriptContent, 'updateLightboxDisplay')}
    `;

    // Use Function constructor to create the functions in the current scope
    const fn = new Function(lightboxCode + `
        return { openLightbox, closeLightbox, updateLightboxDisplay,
                 getLightboxState: () => ({ lightboxOpen, lightboxIndex, lightboxPhotos }) };
    `);

    return fn();
}

function extractFunction(code, funcName) {
    // Find function declaration and extract it
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

describe('Lightbox open/close functions', () => {
    let fns;

    beforeEach(() => {
        setupDOM();
        fns = loadScriptFunctions();
    });

    describe('openLightbox', () => {
        it('should collect visible photo card images (excluding video cards)', () => {
            fns.openLightbox(0);
            const state = fns.getLightboxState();
            // Should have 3 photos (excludes the video-card)
            expect(state.lightboxPhotos).toHaveLength(3);
            expect(state.lightboxPhotos[0].url).toContain('img1.jpg');
            expect(state.lightboxPhotos[1].url).toContain('img2.jpg');
            expect(state.lightboxPhotos[2].url).toContain('img3.jpg');
        });

        it('should set lightboxIndex to the provided photoIndex', () => {
            fns.openLightbox(1);
            const state = fns.getLightboxState();
            expect(state.lightboxIndex).toBe(1);
        });

        it('should set lightboxOpen to true', () => {
            fns.openLightbox(0);
            const state = fns.getLightboxState();
            expect(state.lightboxOpen).toBe(true);
        });

        it('should add .active class to the overlay', () => {
            fns.openLightbox(0);
            const overlay = document.getElementById('lightbox');
            expect(overlay.classList.contains('active')).toBe(true);
        });

        it('should set aria-hidden="true" on main content', () => {
            fns.openLightbox(0);
            const mainContent = document.getElementById('memories-page');
            expect(mainContent.getAttribute('aria-hidden')).toBe('true');
        });

        it('should update lightbox image src and alt', () => {
            fns.openLightbox(1);
            const img = document.getElementById('lightbox-img');
            expect(img.src).toContain('img2.jpg');
            expect(img.alt).toBe('Photo 2');
        });

        it('should update counter text', () => {
            fns.openLightbox(1);
            const counter = document.querySelector('.lightbox-counter');
            expect(counter.textContent).toBe('2 / 3');
        });

        it('should guard against empty gallery', () => {
            // Remove all photo cards
            const grid = document.getElementById('photos-grid');
            grid.innerHTML = '';
            fns.openLightbox(0);
            const state = fns.getLightboxState();
            expect(state.lightboxOpen).toBe(false);
        });

        it('should clamp invalid index to 0', () => {
            fns.openLightbox(99);
            const state = fns.getLightboxState();
            expect(state.lightboxIndex).toBe(0);
        });
    });

    describe('closeLightbox', () => {
        it('should remove .active class from overlay', () => {
            fns.openLightbox(0);
            fns.closeLightbox();
            const overlay = document.getElementById('lightbox');
            expect(overlay.classList.contains('active')).toBe(false);
        });

        it('should set aria-hidden="true" on lightbox', () => {
            fns.openLightbox(0);
            fns.closeLightbox();
            const overlay = document.getElementById('lightbox');
            expect(overlay.getAttribute('aria-hidden')).toBe('true');
        });

        it('should remove aria-hidden from main content', () => {
            fns.openLightbox(0);
            fns.closeLightbox();
            const mainContent = document.getElementById('memories-page');
            expect(mainContent.hasAttribute('aria-hidden')).toBe(false);
        });

        it('should set lightboxOpen to false', () => {
            fns.openLightbox(0);
            fns.closeLightbox();
            const state = fns.getLightboxState();
            expect(state.lightboxOpen).toBe(false);
        });
    });

    describe('updateLightboxDisplay', () => {
        it('should update image src to current photo url', () => {
            fns.openLightbox(2);
            const img = document.getElementById('lightbox-img');
            expect(img.src).toContain('img3.jpg');
        });

        it('should update image alt to current photo caption', () => {
            fns.openLightbox(0);
            const img = document.getElementById('lightbox-img');
            expect(img.alt).toBe('Photo 1');
        });

        it('should format counter as "(index+1) / total"', () => {
            fns.openLightbox(0);
            const counter = document.querySelector('.lightbox-counter');
            expect(counter.textContent).toBe('1 / 3');

            // Manually change index and call update
            fns.openLightbox(2);
            expect(counter.textContent).toBe('3 / 3');
        });
    });
});
