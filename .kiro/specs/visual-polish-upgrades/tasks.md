# Implementation Plan: Visual Polish Upgrades

## Overview

This plan implements three visual enhancements: a full-screen photo lightbox with arrow/keyboard/swipe navigation, animated section transitions with staggered card reveals, and glassmorphism card styling. All changes are confined to `index.html`, `styles.css`, and `script.js` with no new dependencies.

## Tasks

- [x] 1. Implement Lightbox HTML and CSS
  - [x] 1.1 Replace the existing `#image-modal` markup in `index.html` with the new lightbox overlay structure
    - Replace `<div id="image-modal" class="image-modal">` with the new `<div id="lightbox" class="lightbox-overlay">` structure
    - Include close button, prev/next arrow buttons, lightbox image, and counter element
    - Add proper `aria-hidden`, `aria-label`, and `aria-live` attributes
    - _Requirements: 1.1, 1.2, 1.6, 1.7, 2.1_

  - [x] 1.2 Add lightbox CSS styles to `styles.css`
    - Full-screen overlay with dark backdrop
    - Centered photo display with max-width/max-height constraints
    - Close button positioned top-right
    - Arrow buttons positioned left/right with hover states
    - Photo counter styled at the bottom center
    - Responsive sizing for mobile viewports
    - _Requirements: 1.1, 1.2, 2.1_

- [x] 2. Implement Lightbox JavaScript Logic
  - [x] 2.1 Implement lightbox open/close functions in `script.js`
    - Add `openLightbox(photoIndex)` that collects visible photo cards, sets state, and shows overlay
    - Add `closeLightbox()` that hides overlay and restores `aria-hidden`
    - Add `updateLightboxDisplay()` to update image src, alt, and counter text
    - Set `aria-hidden="true"` on main content when lightbox is open
    - Guard against empty gallery (return early)
    - Wire photo card click handlers to call `openLightbox`
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 2.2 Implement lightbox navigation (arrows + keyboard) in `script.js`
    - Add `lightboxNext()` and `lightboxPrev()` with wrap-around index math
    - Wire arrow button click handlers
    - Add keydown listener for ArrowLeft, ArrowRight, and Escape
    - Hide arrow buttons when gallery has ≤ 1 photo
    - Update counter on each navigation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 2.3 Implement lightbox swipe gesture handler in `script.js`
    - Add `setupLightboxSwipe()` with touchstart/touchend listeners
    - Enforce 50px minimum horizontal distance threshold
    - Reject vertical-dominant swipes (|dy| > |dx|)
    - Swipe left → next, swipe right → prev
    - Use `{ passive: true }` for touch listeners
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.4 Write property test for lightbox display correctness (Property 1)
    - **Property 1: Lightbox display correctness**
    - For any gallery size M ≥ 1 and valid index N, verify displayed URL equals `gallery[N].url` and counter equals `"(N+1) / M"`
    - Test file: `tests/visual-polish-lightbox-navigation.test.js`
    - **Validates: Requirements 1.1, 1.6, 2.8**

  - [x] 2.5 Write property test for navigation wrap-around (Property 2)
    - **Property 2: Navigation index correctness with wrap-around**
    - For any gallery size M ≥ 2 and index N, verify `next()` → `(N+1) % M` and `prev()` → `(N-1+M) % M`
    - Test file: `tests/visual-polish-lightbox-navigation.test.js`
    - **Validates: Requirements 2.2, 2.3, 2.6, 2.7**

  - [x] 2.6 Write property test for swipe gesture decision (Property 3)
    - **Property 3: Swipe gesture navigation decision**
    - For any dx/dy, navigation occurs iff `|dx| ≥ 50` AND `|dx| > |dy|`; direction: dx < 0 → next, dx > 0 → prev
    - Test file: `tests/visual-polish-swipe-gesture.test.js`
    - **Validates: Requirements 3.4, 3.5**

- [x] 3. Checkpoint - Lightbox functionality complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Animated Section Transitions and Staggered Cards
  - [x] 4.1 Add section transition CSS to `styles.css`
    - Set `.section` initial state: `opacity: 0; transform: translateY(30px)`
    - Add `.section.visible` state: `opacity: 1; transform: translateY(0)` with `transition: 600ms ease-out`
    - Add `@keyframes cardFadeIn` for card animation (fade + slide-up)
    - Add `.card-animate` class that applies the keyframe animation
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 4.2 Upgrade `setupSectionObserver()` in `script.js`
    - Change threshold from current value to `0.15`
    - On intersection, add `.visible` class to section and call `staggerChildCards(section)`
    - Keep `unobserve()` after trigger for one-time animation
    - _Requirements: 4.2, 4.4, 4.5, 5.1, 5.4_

  - [x] 4.3 Implement `staggerChildCards()` function in `script.js`
    - Query child cards (`.photo-card, .song-card, .like-card, .timeline-item, .moment-card`)
    - Assign `animation-delay` of `min(i * 70, 700)` ms to each card
    - Add `.card-animate` class to trigger the animation
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

  - [x] 4.4 Write property test for stagger delay calculation (Property 4)
    - **Property 4: Stagger delay calculation**
    - For any number of cards N ≥ 0, verify card at index i gets delay `min(i × 70, 700)` ms
    - Test file: `tests/visual-polish-stagger-delay.test.js`
    - **Validates: Requirements 5.2, 5.5**

- [x] 5. Implement Glassmorphism Card Styling
  - [x] 5.1 Add glassmorphism base styles to `styles.css`
    - Apply to `.section`: `background: rgba(255, 241, 247, 0.65); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.3)`
    - Apply to `.photo-card`: semi-transparent pink background with backdrop blur and glass border
    - Apply to `.song-card`: semi-transparent pink background with backdrop blur and glass border
    - Apply to memories header area: glassmorphism treatment
    - Apply to filter panel: glassmorphism treatment
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 5.2 Add `@supports` fallback and contrast safety in `styles.css`
    - Add `@supports not (backdrop-filter: blur(1px))` block with solid semi-transparent backgrounds (alpha ≥ 0.92)
    - Ensure minimum 0.6 alpha on glassmorphism backgrounds for text legibility
    - Verify blur radius is between 10px–20px
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 6. Integration and Wiring
  - [x] 6.1 Wire lightbox initialization into the page lifecycle in `script.js`
    - Call lightbox setup in `DOMContentLoaded` or existing init function
    - Call `setupLightboxSwipe()` after lightbox DOM is ready
    - Ensure lightbox works with dynamically rendered photo cards (edit mode, filters)
    - Update any existing `setupImageModal()` references to use the new lightbox
    - _Requirements: 1.1, 2.1, 3.1_

  - [x] 6.2 Write unit tests for lightbox close behaviors
    - Test close button click closes lightbox
    - Test Escape key closes lightbox
    - Test backdrop click closes lightbox
    - Test `aria-hidden` is set on background content when open
    - Test arrows hidden when gallery ≤ 1 photo
    - Test file: `tests/visual-polish-lightbox-navigation.test.js`
    - _Requirements: 1.3, 1.4, 1.5, 1.7, 2.1_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All code uses vanilla JavaScript — no new dependencies introduced
- The existing `#image-modal` is replaced in-place to avoid breaking existing click handler patterns
- The `@supports` CSS fallback ensures graceful degradation in older browsers

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "4.1", "5.1"] },
    { "id": 1, "tasks": ["1.2", "4.2", "5.2"] },
    { "id": 2, "tasks": ["2.1", "4.3"] },
    { "id": 3, "tasks": ["2.2", "2.3", "4.4"] },
    { "id": 4, "tasks": ["2.4", "2.5", "2.6"] },
    { "id": 5, "tasks": ["6.1"] },
    { "id": 6, "tasks": ["6.2"] }
  ]
}
```
