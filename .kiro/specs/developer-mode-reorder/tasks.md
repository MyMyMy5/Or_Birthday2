# Implementation Tasks

## Task 1: Add Order Map utility functions to script.js
- [x] 1.1 In `script.js`, add the constants `DEV_MODE_KEY = 'developer_mode_enabled'` and `ORDER_MAP_KEY = 'developer_mode_order'` at the top of the file (after the configuration arrays). #[[.kiro/specs/developer-mode-reorder/requirements.md]] Requirement 7
- [x] 1.2 In `script.js`, add the `readOrderMap()`, `writeOrderMap(map)`, `getOrderedIds(section)`, `saveOrder(section, orderedIds)`, `applyOrder(items, section)`, and `removeFromOrder(section, itemId)` utility functions. These handle reading/writing the Order_Map from localStorage and sorting item arrays by saved order. #[[.kiro/specs/developer-mode-reorder/requirements.md]] Requirement 7

## Task 2: Add Developer Mode toggle to HTML and script.js
- [x] 2.1 In `index.html`, add the Developer Mode toggle markup inside the `.header-actions` div, after the existing envelope toggle. Use a `<label class="dev-mode-toggle">` with a checkbox input, slider span, and "🛠️ Edit Mode" label text. #[[.kiro/specs/developer-mode-reorder/requirements.md]] Requirement 1
- [x] 2.2 In `script.js`, add the `setupDevModeToggle()` function that reads the saved state from localStorage, restores the toggle, and listens for changes. On enable, add `dev-mode-active` class to `document.body` and call `initAllSectionReorders()`. On disable, remove the class and call `teardownAllSectionReorders()`. Call `setupDevModeToggle()` from the `DOMContentLoaded` handler. #[[.kiro/specs/developer-mode-reorder/requirements.md]] Requirements 1, 2, 3

## Task 3: Add Developer Mode CSS styles
- [x] 3.1 In `styles.css`, add styles for the `.dev-mode-toggle` (reusing the envelope-toggle visual pattern), `.dev-mode-active` body class visual indicators (dashed outline on sections, grab cursor on items), `.dragging` class (reduced opacity, shadow), reorder transition (`transition: transform 200ms ease`), and `.reorder-placeholder` (dashed border gap indicator). #[[.kiro/specs/developer-mode-reorder/requirements.md]] Requirements 3, 5

## Task 4: Build the reusable drag-and-drop reorder engine
- [x] 4.1 In `script.js`, create the `setupSectionReorder(container, sectionKey, options)` function that attaches HTML5 Drag and Drop event listeners (`dragstart`, `dragover`, `dragend`, `drop`, `dragleave`) to reorderable items in a container. The function should: set `draggable=true` on items matching `options.itemSelector` (excluding `options.excludeSelector`), handle drag initiation with visual feedback, calculate drop position from pointer coordinates, animate sibling items with CSS transforms during drag, insert a placeholder gap, finalize the reorder on drop, save the new order via `saveOrder()`, and clean up on cancel/dragend. #[[.kiro/specs/developer-mode-reorder/requirements.md]] Requirements 4, 5, 6
- [x] 4.2 In `script.js`, create the `teardownSectionReorder(container, options)` function that removes all drag-and-drop reorder event listeners and sets `draggable=false` on all items. Also removes any lingering transforms or placeholder elements. #[[.kiro/specs/developer-mode-reorder/requirements.md]] Requirement 13
- [x] 4.3 In `script.js`, create `initAllSectionReorders()` that calls `setupSectionReorder` for each of the five sections with appropriate selectors and options. Create `teardownAllSectionReorders()` that calls `teardownSectionReorder` for each section. #[[.kiro/specs/developer-mode-reorder/requirements.md]] Requirements 8, 9, 10, 11, 12

## Task 5: Integrate order persistence into section renderers
- [x] 5.1 In `script.js`, modify `populatePhotos` to call `applyOrder(items, 'photos')` on the items array before rendering, so that saved custom order is applied. After rendering, if dev mode is active, call `setupSectionReorder` for the photos grid. #[[.kiro/specs/developer-mode-reorder/requirements.md]] Requirements 7, 8
- [x] 5.2 In `script.js`, modify `populateSongs` to call `applyOrder(items, 'songs')` on the items array before rendering, and set up reorder if dev mode is active. #[[.kiro/specs/developer-mode-reorder/requirements.md]] Requirements 7, 9
- [x] 5.3 In `script.js`, modify `populateLikes` to call `applyOrder(items, 'thingsYouLike')` on the items array before rendering, and set up reorder if dev mode is active. #[[.kiro/specs/developer-mode-reorder/requirements.md]] Requirements 7, 10
- [x] 5.4 In `script.js`, modify `populateFunnyMoments` to call `applyOrder(items, 'funnyMoments')` on the items array before rendering, and set up reorder if dev mode is active. #[[.kiro/specs/developer-mode-reorder/requirements.md]] Requirements 7, 11
- [x] 5.5 In `script.js`, modify `populateTimeline` to apply saved order to the `courses` array before rendering, and set up reorder if dev mode is active. #[[.kiro/specs/developer-mode-reorder/requirements.md]] Requirements 7, 12

## Task 6: Integrate order cleanup with delete and add operations
- [x] 6.1 In `script.js`, update the delete button handlers in each section renderer to call `removeFromOrder(section, itemId)` when an item is deleted, so the Order_Map stays in sync. #[[.kiro/specs/developer-mode-reorder/requirements.md]] Requirement 7
- [x] 6.2 Verify that newly added items (via file upload or URL) and restored items automatically appear at the end of the ordered list, since `applyOrder` appends unknown IDs at the end. No code change needed if `applyOrder` handles this correctly — just verify. #[[.kiro/specs/developer-mode-reorder/requirements.md]] Requirements 7, 14

## Task 7: Write tests for order utilities and reorder logic
- [x] 7.1 Create `tests/developer-mode-reorder.test.js` with tests for `applyOrder` covering: full match ordering, partial match (some IDs missing from saved order), new items appended at end, empty saved order returns original array, and items not in the data are skipped. #[[.kiro/specs/developer-mode-reorder/requirements.md]] Requirement 7
- [x] 7.2 Add tests for `saveOrder`/`readOrderMap`/`getOrderedIds` localStorage round-trip, and `removeFromOrder` for existing and non-existing IDs. #[[.kiro/specs/developer-mode-reorder/requirements.md]] Requirement 7
- [x] 7.3 Add a test verifying the Order_Map JSON round-trip property: `JSON.parse(JSON.stringify(orderMap))` deep-equals the original. #[[.kiro/specs/developer-mode-reorder/requirements.md]] Requirement 7

## Task 8: Run full test suite and verify no regressions
- [x] 8.1 Run `npx vitest run` to execute all existing and new tests, confirming no regressions in upload, delete, restore, trash, URL media add, and property tests. #[[.kiro/specs/developer-mode-reorder/requirements.md]] All requirements
