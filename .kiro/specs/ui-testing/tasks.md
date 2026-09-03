# UI Testing Tasks

All tasks use Chrome DevTools MCP tools against the live running app.

---

## Task 1: Start server and open app

- **Action**: Run `node server.js` in background, navigate browser to `http://localhost:3000`, take snapshot to confirm app loaded
- **Requirements covered**: Pre-condition for all tests
- **Acceptance**: Snapshot shows envelope page with envelope element and instruction text

---

## Task 2: Test envelope interaction (Req 1)

- **Actions**:
  1. Take snapshot → confirm envelope-page is active, instruction text visible
  2. Click the envelope wrapper element
  3. Wait for letter text to appear (typewriter)
  4. Take snapshot → verify envelope has 'opened' class, instruction hidden, letter text present
  5. Wait for "Continue to Memories" button to appear
  6. Click "Continue to Memories"
  7. Take snapshot → verify memories-page is now active, envelope-page no longer active
- **Acceptance**: Envelope opens, typewriter runs, continue button navigates to memories page

---

## Task 3: Test navigation — back button & envelope toggle (Req 2)

- **Actions**:
  1. From memories page, take snapshot → find "Back to Letter" button
  2. Click "Back to Letter"
  3. Take snapshot → verify envelope-page is active again
  4. Navigate back to memories page (click envelope → continue)
  5. Find envelope toggle checkbox, uncheck it
  6. evaluate_script → verify localStorage has envelope toggle disabled
  7. Reload page → take snapshot → verify app loads directly to memories page
  8. Re-check the envelope toggle, reload → verify envelope page appears
- **Acceptance**: Back button works, envelope toggle controls initial page display

---

## Task 4: Test lightbox (Req 3)

- **Actions**:
  1. Navigate to memories page, take snapshot → find a photo in photos-grid
  2. Click a photo image
  3. Take snapshot → verify lightbox is visible with image, counter shows "1 / N"
  4. Click next arrow → take snapshot → verify counter advances
  5. Click prev arrow → take snapshot → verify counter goes back
  6. Press ArrowRight key → verify navigation
  7. Press ArrowLeft key → verify navigation
  8. Press Escape → take snapshot → verify lightbox closed
  9. Reopen lightbox, click close (×) button → verify closed
  10. Test wrap-around: navigate to last photo, press next → verify wraps to first
- **Acceptance**: Lightbox opens/closes via all methods, navigation works with wrap-around, counter accurate

---

## Task 5: Test music player (Req 4)

- **Actions**:
  1. Take snapshot → find song cards in songs-container
  2. Verify each song shows title, artist, cover image
  3. Click first song card
  4. evaluate_script → check if audio element exists and is playing (or has src set)
  5. Click same song card again → verify paused state
  6. Click a different song card → verify new song plays, previous stopped
- **Acceptance**: Song cards render, play/pause toggles, track switching works

---

## Task 6: Test edit mode toggle (Req 6.1)

- **Actions**:
  1. Take snapshot → find "Edit Mode" toggle checkbox
  2. Click the Edit Mode toggle ON
  3. Take snapshot → verify undo/redo buttons appear, "Add Section" button appears
  4. evaluate_script → verify `document.body.classList.contains('dev-mode-active')` is true
  5. Click Edit Mode toggle OFF
  6. Take snapshot → verify undo/redo and add-section buttons removed
  7. evaluate_script → verify 'dev-mode-active' removed
- **Acceptance**: Toggle controls edit mode UI elements correctly

---

## Task 7: Test inline editing (Req 6.2)

- **Actions**:
  1. Enable edit mode
  2. Take snapshot → find a section title (e.g. "Photos")
  3. Click the section title
  4. Take snapshot → verify an input/textarea appeared with current text
  5. Clear and type new title, press Enter
  6. Take snapshot → verify title displays new text
  7. evaluate_script → verify localStorage 'section_titles' contains new value
  8. Click another title, type text, press Escape
  9. Take snapshot → verify title reverted to original
  10. Click title, clear input completely, press Enter → verify reverts to original (no empty save)
- **Acceptance**: Inline edit saves on Enter, reverts on Escape, rejects empty

---

## Task 8: Test section color & layout (Req 6.3, 6.4, 6.5)

- **Actions**:
  1. Enable edit mode
  2. Find and interact with color picker for a section (if visible in edit mode UI)
  3. evaluate_script → verify section background-color changed and persisted to 'section_colors'
  4. Find layout toggle (grid/list), click it
  5. Take snapshot → verify layout class changed
  6. evaluate_script → verify 'section_layouts' updated in localStorage
  7. Find column count control, change value
  8. evaluate_script → verify 'section_columns' updated
- **Acceptance**: Color, layout, and column changes apply and persist

---

## Task 9: Test photo filters (Req 9.1)

- **Actions**:
  1. Enable edit mode
  2. Find a photo card, interact with filter controls (if panel appears on click/hover in edit mode)
  3. Adjust filter values (grayscale, brightness, etc.)
  4. evaluate_script → verify CSS filter applied to the img element
  5. evaluate_script → verify 'photo_filters' in localStorage has clamped values
  6. Disable edit mode, reload → verify filter still applied
- **Acceptance**: Filters apply visually and persist

---

## Task 10: Test photo frames (Req 9.2)

- **Actions**:
  1. Enable edit mode
  2. Find frame selector UI for a photo
  3. Select a frame (e.g. "hearts")
  4. evaluate_script → verify photo card has 'frame-hearts' class
  5. evaluate_script → verify 'photo_frames' in localStorage
  6. Reload → verify frame persists
- **Acceptance**: Frame class applied and persists

---

## Task 11: Test photo tags (Req 9.3)

- **Actions**:
  1. Enable edit mode
  2. Click directly on a photo image
  3. Take snapshot → verify tag input appeared
  4. Type a tag name, press Enter
  5. Take snapshot → verify tag label appears on the photo
  6. evaluate_script → verify 'photo_tags' in localStorage with coordinates
  7. Click existing tag → verify edit/delete popup appears
  8. Click delete → verify tag removed
- **Acceptance**: Tags created at click position, editable, deletable

---

## Task 12: Test custom sections (Req 10)

- **Actions**:
  1. Enable edit mode
  2. Take snapshot → find "+ Add Section" button
  3. Click it → take snapshot → verify creation form with title input, layout radios, item type radios
  4. Click Create with empty title → verify error message shown
  5. Type "Test Section", select "list" layout, select "link" item type, click Create
  6. Take snapshot → verify new section appears in DOM with title "Test Section"
  7. evaluate_script → verify 'custom_sections' in localStorage
  8. Find "+" add-item button in new section, click it
  9. Type a URL, submit → verify item rendered
  10. Find "Delete Section" button, click it, accept confirm
  11. Take snapshot → verify section removed from DOM and localStorage
- **Acceptance**: Full custom section lifecycle works

---

## Task 13: Test undo/redo (Req 8)

- **Actions**:
  1. Enable edit mode
  2. Make an edit (e.g. rename a section title to "Changed")
  3. Take snapshot → verify Undo button is enabled
  4. Click Undo → take snapshot → verify title reverted
  5. Verify Redo button enabled, click Redo → verify title is "Changed" again
  6. Press Ctrl+Z → verify undo works via keyboard
  7. Press Ctrl+Y → verify redo works via keyboard
  8. With empty undo stack, verify Undo button disabled
- **Acceptance**: Undo/redo work via buttons and keyboard, button states correct

---

## Task 14: Test hide/show sections (Req 11)

- **Actions**:
  1. Enable edit mode
  2. Find hide control for a section, activate it
  3. Take snapshot → verify section has 'section-hidden' class or is not visible
  4. evaluate_script → verify 'hidden_sections' in localStorage includes the section
  5. Reload page → verify section still hidden
  6. Show the section again → verify visible and removed from localStorage
- **Acceptance**: Hide/show persists across reloads

---

## Task 15: Test trash panel (Req 12)

- **Actions**:
  1. Enable edit mode
  2. Delete a media item (find delete button on a photo/song card)
  3. Click "Trash" button in header
  4. Take snapshot → verify trash panel opens with the deleted item listed
  5. Click restore on the trashed item
  6. Take snapshot → verify item returns to its section, removed from trash
- **Acceptance**: Trash shows deleted items, restore works

---

## Task 16: Test import/export (Req 13)

- **Actions**:
  1. Make some edits (rename a title, set a filter) so localStorage has data
  2. evaluate_script → capture current EXPORT_KEYS values
  3. Click "Export Settings" → (verify no console errors; file download triggers)
  4. Clear localStorage via evaluate_script
  5. Create a test JSON file with known settings, use `upload_file` on import input
  6. Wait for reload
  7. evaluate_script → verify localStorage restored with imported values
  8. Test invalid JSON import → verify alert shown and localStorage unchanged
- **Acceptance**: Export creates file, import restores state, invalid import rejected

---

## Task 17: Test pin items (Req 14)

- **Actions**:
  1. Enable edit mode
  2. Find pin button on a media item, click it
  3. evaluate_script → verify 'pinned_items' in localStorage
  4. Take snapshot → verify item shows pinned visual state
  5. Click pin again (unpin) → verify removed from localStorage and visual state
- **Acceptance**: Pin/unpin toggles persist

---

## Task 18: Test item notes (Req 15)

- **Actions**:
  1. Enable edit mode
  2. Find notes control on a media item, activate it
  3. Type a note, save
  4. evaluate_script → verify 'item_notes' in localStorage
  5. Take snapshot → verify note displays on the item
- **Acceptance**: Notes persist and display

---

## Task 19: Test decorations & timeline (Req 16, 17)

- **Actions**:
  1. Take snapshot → verify balloon/confetti elements exist in decorations container
  2. evaluate_script → `document.querySelectorAll('.balloon').length > 0` and `.confetti`
  3. Scroll to timeline section, take snapshot → verify timeline items rendered for courses
  4. Find a course completion toggle, click it
  5. evaluate_script → verify completion state persisted to localStorage
  6. Reload → verify state persists
- **Acceptance**: Decorations render, timeline courses toggleable and persistent

---

## Task 20: Test funny moments (Req 18)

- **Actions**:
  1. Scroll to funny moments section, take snapshot
  2. Verify video items show YouTube thumbnails or iframes with correct videoId in src
  3. Verify titles/captions present for each item
- **Acceptance**: Video and image funny moments render correctly

---

## Task 21: Test keyboard accessibility (Req 19)

- **Actions**:
  1. Open lightbox, press Escape → verify closes
  2. Open lightbox, press ArrowRight → verify navigates next
  3. Press ArrowLeft → verify navigates prev
  4. Close lightbox, enable edit mode
  5. Press Ctrl+Z → verify undo triggered (or no-op if stack empty — no error)
  6. Make an edit, press Ctrl+Z → verify undone
  7. Press Ctrl+Y → verify redone
  8. Disable edit mode, press Ctrl+Z → verify nothing happens (no console errors)
- **Acceptance**: All keyboard shortcuts work in correct contexts, no errors in wrong contexts

---

## Task 22: Test responsive/mobile viewport (Bonus)

- **Actions**:
  1. Resize page to mobile viewport (375x667)
  2. Take snapshot → verify layout adapts (no horizontal overflow)
  3. Navigate through envelope → memories flow
  4. Open lightbox → verify usable at mobile size
  5. Resize back to desktop (1280x800) → verify normal layout
- **Acceptance**: App is usable at mobile viewport

---

## Task 23: Final validation & error check

- **Actions**:
  1. Navigate through entire app one full pass
  2. `list_console_messages` → verify no JavaScript errors
  3. Take final screenshot of memories page as evidence
- **Acceptance**: Zero console errors, all features functional
