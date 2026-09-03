# Implementation Plan: Edit Mode Enhancements

## Overview

This plan implements comprehensive editing capabilities for Edit Mode, organized into: a reusable inline-edit utility, section settings panel, pinned items, item notes, and CSS-driven layout switching. All features are gated behind the `dev-mode-active` class and persist via localStorage. Implementation uses JavaScript (vanilla) with Vitest + fast-check for testing.

## Tasks

- [ ] 1. Implement the `makeInlineEditable` utility and inline song rename
  - [x] 1.1 Create the reusable `makeInlineEditable(element, options)` function in `script.js`
    - Implement click-to-edit behavior: replace textContent with `<input>` (or `<textarea>` if `options.multiline`)
    - Pre-fill input with current value
    - Handle Enter/blur to save: persist to `localStorage[options.storageKey][options.itemId]` and update display
    - Handle Escape to discard changes and revert to original text
    - Prevent saving empty strings (revert to original)
    - Only activate when `document.body.classList.contains('dev-mode-active')`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

  - [x] 1.2 Apply `makeInlineEditable` to song name and artist elements on song cards
    - Attach inline edit to `.song-name` and `.song-artist` elements
    - Use localStorage key `song_renames` with song ID as item key
    - On page load, apply saved renames from `song_renames` to song card text
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.3 Write property test for inline edit round-trip (Property 1)
    - **Property 1: Inline edit round-trip**
    - For any item ID and any non-empty string value, after saving an inline edit, reading the value back from localStorage SHALL return the exact same string
    - Use fast-check to generate arbitrary IDs and string values, verify round-trip consistency
    - **Validates: Requirements 1.2, 1.5, 2.2, 2.5, 3.2, 3.5**

- [ ] 2. Implement inline photo rename and section title editing
  - [x] 2.1 Apply `makeInlineEditable` to photo captions
    - Attach inline edit to `.photo-caption` elements
    - Use localStorage key `photo_renames` with photo ID as item key
    - On page load, apply saved renames from `photo_renames` to photo captions
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.2 Apply `makeInlineEditable` to section titles (`<h2>` elements)
    - Attach inline edit to `.section-title` elements within each `.section`
    - Use localStorage key `section_titles` with section ID as item key
    - On page load, apply saved custom titles from `section_titles` (fall back to defaults)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 2.3 Write unit tests for inline editing behavior
    - Test: clicking in edit mode transforms text to input
    - Test: Enter saves and updates display
    - Test: Escape discards changes
    - Test: clicking outside edit mode does nothing
    - Test: empty string reverts to original
    - _Requirements: 1.1–1.5, 2.1–2.5, 3.1–3.6_

- [ ] 3. Implement item notes
  - [x] 3.1 Add item notes UI below each item in all sections
    - In edit mode: show "Add note" placeholder or existing note text below each item
    - On click: open editable text input/textarea for the note
    - On save (Enter/blur): persist to localStorage under `item_notes` keyed by item ID
    - On page load: display saved notes below their respective items
    - Outside edit mode: show saved notes as read-only, hide "Add note" placeholder
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 3.2 Write unit tests for item notes
    - Test: note placeholder visible in edit mode, hidden outside
    - Test: saving a note persists to localStorage
    - Test: notes display as read-only outside edit mode
    - _Requirements: 4.1–4.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement Section Settings Panel (color, layout, columns)
  - [x] 5.1 Create and inject the Section Settings Panel into each section
    - Build the `.section-settings-panel` HTML structure (color picker, layout toggle, column selector, move buttons, hide button)
    - Inject panel at the top of each `.section` div when Edit Mode is active
    - Remove/hide panel when Edit Mode is deactivated
    - _Requirements: 5.1, 6.1, 8.1, 9.1, 10.1_

  - [x] 5.2 Implement section background color picker
    - Wire color picker input to update section background immediately
    - Persist selected color to localStorage under `section_colors` keyed by section ID
    - On page load, apply saved colors to sections
    - Implement "Reset" button to revert to default background
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 5.3 Implement grid/list layout toggle
    - Wire grid/list buttons to toggle CSS classes `.layout-grid` / `.layout-list` on the section's item container
    - Persist layout mode per section to localStorage under `section_layouts`
    - On page load, apply saved layout modes (defaults: grid for Photos/Likes/Funny, list for Songs/Timeline)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 5.4 Implement grid column count selector
    - Wire range input (2–6) to set CSS custom property `--grid-columns` on the section container
    - Show column selector only when section is in grid mode
    - Persist column count per section to localStorage under `section_columns`
    - On page load, apply saved column counts
    - Clamp values to 2–6 range
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 5.5 Write property test for column count bounds (Property 4)
    - **Property 4: Column count bounds**
    - For any section, the stored column count SHALL be an integer between 2 and 6 inclusive
    - Use fast-check to generate arbitrary integers, verify clamping behavior
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**

- [ ] 6. Implement section ordering
  - [x] 6.1 Implement "Move Up" and "Move Down" buttons in Section Settings Panel
    - Wire buttons to swap section positions in the DOM using `insertBefore`
    - Persist section order to localStorage under `section_order` as an ordered array of section IDs
    - On page load, reorder sections according to saved order
    - Disable "Move Up" on first section, "Move Down" on last section
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 6.2 Write property test for section order permutation (Property 2)
    - **Property 2: Section order is a permutation**
    - For any saved section order, it SHALL be a permutation of the original section IDs (no duplicates, no missing sections)
    - Use fast-check to generate random permutations, verify validity
    - **Validates: Requirements 6.4, 6.5**

- [ ] 7. Implement hide/show sections
  - [x] 7.1 Implement "Hide Section" toggle in Section Settings Panel
    - Wire hide button to collapse section content, showing only a minimal "hidden" indicator with section name
    - In edit mode: show "Show Section" button on hidden sections to restore them
    - Outside edit mode: hidden sections are completely invisible
    - Persist hidden section IDs to localStorage under `hidden_sections` as an array
    - On page load, hide sections in the saved hidden list
    - Prevent hiding all sections (at least one must remain visible)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 7.2 Write property test for hidden sections subset (Property 5)
    - **Property 5: Hidden sections subset**
    - For any saved hidden sections list, it SHALL be a proper subset of all section IDs (at least one section remains visible)
    - Use fast-check to generate random subsets, verify constraint
    - **Validates: Requirements 10.5, 10.6, 10.7**

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement pinned/featured items
  - [x] 9.1 Add pin button overlay to items in all sections
    - Show 📌 button on each item only when Edit Mode is active
    - On click: mark item as pinned for its section, unpin any previously pinned item in same section
    - Toggle behavior: clicking pin on already-pinned item unpins it
    - Persist pinned items to localStorage under `pinned_items` keyed by section ID (value is item ID)
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6_

  - [x] 9.2 Display pinned items with visual prominence
    - Add `.pinned` class and "⭐ Featured" badge to pinned items
    - Position pinned item first in its section
    - Outside edit mode: pinned item still displayed prominently, but pin button hidden
    - On page load, apply pinned state from localStorage
    - _Requirements: 7.4, 7.5, 7.7_

  - [x] 9.3 Write property test for single pinned item per section (Property 3)
    - **Property 3: Only one pinned item per section**
    - For any section, the `pinned_items` store SHALL contain at most one entry per section ID
    - Use fast-check to generate random pin operations, verify single pin constraint
    - **Validates: Requirements 7.2, 7.3, 7.5**

- [ ] 10. Add CSS styles for all new UI components
  - [x] 10.1 Add styles for Section Settings Panel, layout modes, and pin/note UI to `styles.css`
    - Style `.section-settings-panel` with collapsible toolbar appearance
    - Style `.layout-grid` and `.layout-list` classes with `--grid-columns` custom property
    - Style `.pin-item-btn`, `.pinned`, `.pinned-badge` for pin UI
    - Style `.item-note`, `.note-text`, `.note-placeholder` for notes UI
    - Style hidden section indicator
    - Ensure all edit-mode-only UI is hidden when `body` lacks `dev-mode-active` class
    - _Requirements: 5.1, 7.4, 7.7, 8.2, 8.3, 9.2, 10.2, 10.4_

- [ ] 11. Integration wiring and load-time initialization
  - [x] 11.1 Wire all features into the Edit Mode toggle lifecycle
    - On `enableDevMode()`: inject section settings panels, attach inline edit handlers, show pin buttons, show note placeholders
    - On `disableDevMode()`: remove/hide panels, detach edit handlers, hide pin buttons, hide note placeholders
    - On page load: apply all saved state (titles, colors, order, layouts, columns, hidden, pinned, notes, renames)
    - _Requirements: 1.4, 2.4, 3.4, 4.5, 5.4, 6.5, 7.7, 8.5, 9.4, 10.4, 10.6_

  - [x] 11.2 Write integration tests for Edit Mode lifecycle
    - Test: enabling edit mode shows all editing UI
    - Test: disabling edit mode hides all editing UI
    - Test: page load applies all persisted state correctly
    - _Requirements: 1.4, 2.4, 3.4, 4.5, 7.7, 10.4_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All localStorage operations should silently fail if localStorage is unavailable (per error handling in design)
- The project uses Vitest + fast-check (already installed in devDependencies)
