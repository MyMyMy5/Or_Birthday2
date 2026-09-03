# Design Document: Visual Polish Upgrades

## Overview

This design covers three interconnected visual enhancements for the birthday memories website:

1. **Photo Lightbox** — Replaces the existing basic `#image-modal` with a full-featured lightbox supporting arrow navigation, keyboard controls, swipe gestures, and a photo counter.
2. **Animated Section & Card Transitions** — Upgrades the existing IntersectionObserver-based section reveal to use a 600ms ease-out animation with 15% threshold, and adds staggered 70ms card animations within each section.
3. **Glassmorphism Card Styling** — Applies frosted-glass visual treatment (backdrop-filter blur + semi-transparent pink backgrounds) to cards and containers, with contrast-safe fallbacks.

All changes are confined to `styles.css`, `script.js`, and `index.html`. No new dependencies or build tools are introduced.

## Architecture

```mermaid
graph TD
    subgraph HTML
        A[index.html] --> B[#lightbox overlay]
        A --> C[.section containers]
        A --> D[.photo-card / .song-card]
    end

    subgraph CSS
        E[styles.css] --> F[Lightbox styles]
        E --> G[Section transition: 600ms ease-out]
        E --> H[Staggered card keyframes]
        E --> I[Glassmorphism classes]
        E --> J[@supports fallback]
    end

    subgraph JS
        K[script.js] --> L[Lightbox controller]
        K --> M[IntersectionObserver - sections]
        K --> N[Stagger delay calculator]
        K --> O[Touch/swipe handler]
    end

    L --> B
    M --> C
    N --> D
    O --> L
```

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Replace `#image-modal` in-place | Avoids breaking existing click handlers; same element ID, expanded functionality |
| Single IntersectionObserver for sections + cards | Reuses existing pattern; one observer triggers both section fade and child stagger |
| CSS-only glassmorphism with `@supports` | No JS needed for visual styling; graceful degradation built into CSS |
| Swipe detection in vanilla JS | No library needed for simple horizontal swipe; keeps zero-dependency approach |
| Wrap-around navigation | Better UX for small galleries; avoids disabled-state complexity |

## Components and Interfaces

### 1. Lightbox Module (script.js)

```javascript
// State
let lightboxOpen = false;
let lightboxIndex = 0;
let lightboxPhotos = []; // Array of { url, caption }

// Public API
function openLightbox(photoIndex) { ... }
function closeLightbox() { ... }
function lightboxNext() { ... }
function lightboxPrev() { ... }

// Internal
function updateLightboxDisplay() { ... }
function setupLightboxKeyboard() { ... }
function setupLightboxSwipe() { ... }
```

**Lightbox HTML structure** (replaces existing `#image-modal`):

```html
<div id="lightbox" class="lightbox-overlay" aria-hidden="true">
  <div class="lightbox-content">
    <button class="lightbox-close" aria-label="Close lightbox">&times;</button>
    <button class="lightbox-arrow lightbox-prev" aria-label="Previous photo">&#10094;</button>
    <img id="lightbox-img" class="lightbox-photo" alt="">
    <button class="lightbox-arrow lightbox-next" aria-label="Next photo">&#10095;</button>
    <div class="lightbox-counter" aria-live="polite">1 / 6</div>
  </div>
</div>
```

### 2. Section Observer (script.js — upgraded)

The existing `setupSectionObserver()` function is modified:
- Threshold changes from `0.25` to `0.15`
- Stagger delay between sections removed (each section animates independently)
- On section visibility, child cards receive staggered `animation-delay` via inline style
- Observer uses `unobserve` after trigger (one-time, already present)

```javascript
function setupSectionObserver() {
    const sections = document.querySelectorAll('.section');
    sectionObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                staggerChildCards(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    sections.forEach((section) => {
        if (!section.classList.contains('visible')) {
            sectionObserver.observe(section);
        }
    });
}

function staggerChildCards(section) {
    const cards = section.querySelectorAll('.photo-card, .song-card, .like-card, .timeline-item, .moment-card');
    cards.forEach((card, i) => {
        const delay = Math.min(i * 70, 700); // Cap at 700ms
        card.style.animationDelay = delay + 'ms';
        card.classList.add('card-animate');
    });
}
```

### 3. Swipe Handler (script.js)

```javascript
function setupLightboxSwipe() {
    const lightboxEl = document.getElementById('lightbox');
    let touchStartX = 0;
    let touchStartY = 0;

    lightboxEl.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].clientX;
        touchStartY = e.changedTouches[0].clientY;
    }, { passive: true });

    lightboxEl.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dy) > Math.abs(dx)) return; // Vertical dominates
        if (Math.abs(dx) < 50) return; // Below threshold
        if (dx < 0) lightboxNext();
        else lightboxPrev();
    }, { passive: true });
}
```

### 4. Glassmorphism CSS (styles.css)

Applied via updated `.section`, `.photo-card`, `.song-card`, `.memories-header`, and filter panel selectors:

```css
/* Glassmorphism base */
.section {
    background: rgba(255, 241, 247, 0.65);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.3);
}

/* Fallback for browsers without backdrop-filter */
@supports not (backdrop-filter: blur(1px)) {
    .section {
        background: rgba(255, 241, 247, 0.92);
    }
}
```

## Data Models

### Lightbox State

| Field | Type | Description |
|-------|------|-------------|
| `lightboxOpen` | `boolean` | Whether lightbox overlay is currently displayed |
| `lightboxIndex` | `number` | Zero-based index of currently displayed photo |
| `lightboxPhotos` | `Array<{url: string, caption: string}>` | Ordered photo collection from the photos grid |

### Card Animation State

No persistent state. Animation is CSS-driven via:
- `.section.visible` — triggers section fade-in (600ms ease-out)
- `.card-animate` — triggers card fade-in with per-card `animation-delay`
- One-time: observer calls `unobserve()` after triggering

### Swipe Gesture State (transient)

| Field | Type | Description |
|-------|------|-------------|
| `touchStartX` | `number` | X coordinate at touchstart |
| `touchStartY` | `number` | Y coordinate at touchstart |

No persistence needed — these are event-scoped variables.


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Lightbox display correctness

*For any* photo gallery of size M (M ≥ 1) and *for any* valid index N (0 ≤ N < M), when the lightbox is opened at index N, the displayed photo URL shall equal `gallery[N].url` and the counter text shall equal `"(N+1) / M"`.

**Validates: Requirements 1.1, 1.6, 2.8**

### Property 2: Navigation index correctness with wrap-around

*For any* photo gallery of size M (M ≥ 2) and *for any* current index N (0 ≤ N < M):
- Calling `next()` shall set the index to `(N + 1) % M`
- Calling `prev()` shall set the index to `(N - 1 + M) % M`

This ensures forward wrap-around (last → first) and backward wrap-around (first → last).

**Validates: Requirements 2.2, 2.3, 2.6, 2.7**

### Property 3: Swipe gesture navigation decision

*For any* touch movement with horizontal distance `dx` and vertical distance `dy`:
- Navigation shall occur if and only if `|dx| ≥ 50` AND `|dx| > |dy|`
- When navigation occurs: if `dx < 0` then next, if `dx > 0` then prev

**Validates: Requirements 3.4, 3.5**

### Property 4: Stagger delay calculation

*For any* number of cards N (N ≥ 0) within a section, the animation delay assigned to card at index i (0-based) shall equal `min(i × 70, 700)` milliseconds.

**Validates: Requirements 5.2, 5.5**

## Error Handling

| Scenario | Handling |
|----------|----------|
| Lightbox opened with empty gallery | Lightbox does not open; `openLightbox()` returns early |
| Photo image fails to load in lightbox | Browser shows broken image; alt text provides context |
| `backdrop-filter` not supported | `@supports` fallback provides solid semi-transparent background |
| Touch events not available (desktop) | Swipe handler simply never fires; arrow buttons and keyboard still work |
| IntersectionObserver not supported | Sections remain at `opacity: 0`; add a no-JS/no-observer fallback that sets `.section { opacity: 1; transform: none; }` |
| Gallery has only 1 photo | Arrow buttons are hidden; keyboard arrows and swipe are no-ops |

## Testing Strategy

### Unit Tests (Jest — existing test infrastructure)

Focus on the pure logic functions that can be tested without a browser:

| Test | What it verifies |
|------|-----------------|
| `lightboxNext()` / `lightboxPrev()` index math | Wrap-around at boundaries, correct index advancement |
| `staggerChildCards()` delay calculation | 70ms increments, 700ms cap |
| Swipe decision logic | Threshold enforcement, vertical rejection |
| Counter text formatting | "N / M" format for various indices and sizes |

### Property-Based Tests (fast-check via Jest)

Each property test runs a minimum of 100 iterations with randomized inputs.

| Property | Generator Strategy |
|----------|-------------------|
| Property 1: Lightbox display | Random gallery size (1–50), random valid index |
| Property 2: Navigation wrap-around | Random gallery size (2–50), random index, random direction |
| Property 3: Swipe decision | Random dx (-500 to 500), random dy (-500 to 500) |
| Property 4: Stagger delay | Random card count (0–100), verify each card's delay |

Tag format: `Feature: visual-polish-upgrades, Property {N}: {title}`

### Example-Based Tests

| Test | Criteria covered |
|------|-----------------|
| Close button closes lightbox | 1.3 |
| Escape key closes lightbox | 1.4 |
| Backdrop click closes lightbox | 1.5 |
| `aria-hidden` set on background when open | 1.7 |
| Arrows hidden when gallery has ≤ 1 photo | 2.1 |
| Section starts with opacity 0 | 4.1 |
| `.visible` class triggers on intersection | 4.2 |
| Observer uses threshold 0.15 | 4.5 |
| One-time trigger (unobserve called) | 4.4, 5.4 |
| Glassmorphism CSS values correct | 6.1–6.7, 7.1–7.4 |

### Integration / Browser Tests

- Manual verification of visual transitions at realistic viewport sizes
- Touch gesture testing on mobile device or emulator
- Contrast ratio verification using browser DevTools accessibility audit
- `@supports` fallback verification in a browser without `backdrop-filter` support

### Test Configuration

- Library: **fast-check** (already compatible with Jest)
- Minimum iterations: 100 per property
- Test files: `tests/visual-polish-lightbox-navigation.test.js`, `tests/visual-polish-swipe-gesture.test.js`, `tests/visual-polish-stagger-delay.test.js`
