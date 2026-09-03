# Edit Mode Toggle Bugs - Bugfix Design

## Overview

Two bugs affect the Edit Mode toggle feature: (1) the toggle slider doesn't visually move when checked because the CSS `:checked` selectors only target `.envelope-toggle` and not `.dev-mode-toggle`, and (2) the "Drop files here" file-upload overlay incorrectly appears during internal reorder drags because `setupDragAndDrop` doesn't distinguish internal drags from external file drops.

The fix adds CSS rules for the `.dev-mode-toggle` checked state and guards the dragenter handler in `setupDragAndDrop` to only activate the overlay when `e.dataTransfer.types` includes `'Files'`.

## Glossary

- **Bug_Condition (C)**: The conditions that trigger each bug — (1) dev-mode toggle checked state missing visual feedback, (2) internal drag triggering file-upload overlay
- **Property (P)**: The desired behavior — (1) slider moves and changes color on check, (2) overlay only appears for external file drops
- **Preservation**: Existing envelope toggle styling and external file-drop upload behavior must remain unchanged
- **setupDragAndDrop**: The function in `script.js` (~line 1965) that attaches drag-and-drop file upload handlers to section elements
- **dev-mode-toggle**: The label class for the Edit Mode toggle in the header, which reuses `.envelope-toggle-slider` for its inner slider span

## Bug Details

### Bug Condition

**Bug 1 — Toggle Slider Visual**: The bug manifests when the user checks the Edit Mode toggle. The `.dev-mode-toggle` label wraps a checkbox and a `.envelope-toggle-slider` span, but the CSS rule `.envelope-toggle input:checked + .envelope-toggle-slider` only matches when the parent label has class `.envelope-toggle`. Since the Edit Mode toggle uses `.dev-mode-toggle`, the checked styles never apply.

**Bug 2 — Overlay During Reorder**: The bug manifests when Edit Mode is active and the user drags an internal element (photo card, song card, etc.) to reorder it. The `setupDragAndDrop` dragenter handler fires for all drag events and unconditionally adds the `drag-active` class, showing the file-upload overlay even though no files are being dragged.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type UserInteraction
  OUTPUT: boolean

  IF input.type = "toggle_check" THEN
    RETURN input.toggleLabelClass = "dev-mode-toggle"
           AND input.checked = true
  ELSE IF input.type = "dragenter" THEN
    RETURN NOT input.dataTransfer.types.includes("Files")
  END IF

  RETURN false
END FUNCTION
```

### Examples

- User clicks Edit Mode toggle ON → checkbox becomes checked, but slider knob stays at left position and background stays light pink (should move right and turn hot-pink)
- User drags a photo card in Edit Mode → "Drop files here" overlay appears on the photos section (should not appear for internal drags)
- User completes reorder drag → overlay may remain stuck visible because drop event was consumed by reorder handler (should always reset)
- User drags a file from OS onto section → overlay correctly appears (this behavior must be preserved)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The Envelope toggle (`.envelope-toggle`) slider visual behavior must continue to work exactly as before
- External file drops from the OS file manager must continue to show the "Drop files here" overlay and accept uploads
- The Edit Mode toggle's functional behavior (adding/removing `dev-mode-active` class, enabling reorder) is already correct and must remain unchanged
- Mouse clicks, touch interactions, and all non-drag interactions must be unaffected

**Scope:**
All inputs that do NOT involve (1) the dev-mode-toggle checked state or (2) internal drag events should be completely unaffected by this fix. This includes:
- Envelope toggle interactions
- External file drag-and-drop uploads
- All mouse click interactions on cards and buttons
- Keyboard interactions

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Missing CSS selector for dev-mode-toggle (Bug 1)**: The existing CSS only has `.envelope-toggle input:checked + .envelope-toggle-slider` and `.envelope-toggle input:checked + .envelope-toggle-slider::after`. The `.dev-mode-toggle` label needs identical rules with its own class prefix.

2. **Unconditional dragenter handler (Bug 2)**: The `setupDragAndDrop` function's dragenter listener does `sectionElement.classList.add('drag-active')` without checking whether the drag contains files. Internal reorder drags (which only have `text/plain` or custom types in `dataTransfer.types`) should be ignored.

3. **Missing dragend safety reset (Bug 2)**: When a reorder drag ends, the file-upload overlay's `dragCounter` may be non-zero if dragenter fired but the corresponding dragleave/drop was consumed by the reorder engine. A `dragend` listener should reset the overlay state.

## Correctness Properties

Property 1: Bug Condition - Toggle Slider Visual Feedback

_For any_ toggle interaction where the dev-mode-toggle checkbox becomes checked (isBugCondition returns true for toggle_check), the CSS SHALL apply `background: var(--hot-pink)` to the slider and `transform: translateX(16px)` to the slider knob, providing visual feedback identical to the envelope toggle.

**Validates: Requirements 2.1**

Property 2: Bug Condition - No Overlay on Internal Drag

_For any_ dragenter event where `dataTransfer.types` does NOT include `'Files'` (isBugCondition returns true for dragenter), the setupDragAndDrop handler SHALL NOT add the `drag-active` class to the section element, preventing the file-upload overlay from appearing.

**Validates: Requirements 2.2, 2.3**

Property 3: Preservation - Envelope Toggle Unchanged

_For any_ toggle interaction on the envelope toggle (`.envelope-toggle`), the fixed code SHALL produce exactly the same visual behavior as the original code, preserving the existing slider animation and color change.

**Validates: Requirements 3.1, 3.4**

Property 4: Preservation - External File Drop Unchanged

_For any_ dragenter event where `dataTransfer.types` includes `'Files'` (external file drop), the fixed code SHALL continue to add the `drag-active` class and show the overlay, preserving existing file upload functionality.

**Validates: Requirements 3.2, 3.3**

## Fix Implementation

### Changes Required

**File**: `styles.css`

**Change**: Add checked-state CSS rules for `.dev-mode-toggle`

**Specific Changes**:
1. **Add slider background rule**: After the existing `.envelope-toggle input:checked + .envelope-toggle-slider` rule, add:
   ```css
   .dev-mode-toggle input:checked + .envelope-toggle-slider {
       background: var(--hot-pink);
   }
   ```

2. **Add slider knob transform rule**: After the existing `.envelope-toggle input:checked + .envelope-toggle-slider::after` rule, add:
   ```css
   .dev-mode-toggle input:checked + .envelope-toggle-slider::after {
       transform: translateX(16px);
   }
   ```

---

**File**: `script.js`

**Function**: `setupDragAndDrop`

**Specific Changes**:
3. **Guard dragenter handler**: In the dragenter event listener, check if `e.dataTransfer.types` includes `'Files'` before adding `drag-active`. If it doesn't include `'Files'`, return early without showing the overlay.

4. **Guard dragover handler**: Similarly guard the dragover handler to only call `e.preventDefault()` (which enables drop) when files are present, so internal reorder drags are not affected.

5. **Add dragend safety reset**: Add a `dragend` event listener on the section element that resets `dragCounter` to 0 and removes `drag-active`, ensuring the overlay never gets stuck after any drag operation ends.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write tests that check CSS selector matching for the toggle and simulate drag events to verify overlay behavior. Run on UNFIXED code to observe failures.

**Test Cases**:
1. **Toggle Visual Test**: Check that `.dev-mode-toggle input:checked + .envelope-toggle-slider` has computed styles matching the active state (will fail on unfixed code — no matching CSS rule)
2. **Internal Drag Test**: Simulate a dragenter event with `dataTransfer.types = ['text/plain']` and assert `drag-active` is NOT added (will fail on unfixed code — overlay appears unconditionally)
3. **Stuck Overlay Test**: Simulate dragenter followed by a reorder drop (no dragleave) and assert overlay is hidden (will fail on unfixed code — overlay stays visible)

**Expected Counterexamples**:
- Toggle slider has no visual change when checked (missing CSS rule)
- Section gets `drag-active` class on internal drag events
- Overlay remains visible after reorder completes

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed code produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  IF input.type = "toggle_check" THEN
    slider ← querySelector('.dev-mode-toggle input:checked + .envelope-toggle-slider')
    ASSERT slider.backgroundColor = hotPink
    ASSERT slider.knobTransform = "translateX(16px)"
  ELSE IF input.type = "dragenter" THEN
    result := setupDragAndDrop_fixed(input)
    ASSERT NOT section.classList.contains("drag-active")
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original code.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT setupDragAndDrop_original(input) = setupDragAndDrop_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many drag event configurations to verify only file-containing drags trigger the overlay
- It catches edge cases with different `dataTransfer.types` combinations
- It provides strong guarantees that non-buggy interactions remain unchanged

**Test Plan**: Observe behavior on UNFIXED code for external file drops and envelope toggle, then write tests capturing that behavior.

**Test Cases**:
1. **Envelope Toggle Preservation**: Verify `.envelope-toggle input:checked + .envelope-toggle-slider` still matches and applies styles
2. **External File Drop Preservation**: Verify dragenter with `types = ['Files']` still adds `drag-active`
3. **Drop Handler Preservation**: Verify files dropped externally are still processed by `MediaManager.addMedia`
4. **Unchecked State Preservation**: Verify both toggles display correctly in unchecked state

### Unit Tests

- Test that CSS rules exist for `.dev-mode-toggle input:checked + .envelope-toggle-slider`
- Test dragenter handler ignores events without 'Files' in dataTransfer.types
- Test dragenter handler activates overlay for events with 'Files' in dataTransfer.types
- Test dragend resets overlay state

### Property-Based Tests

- Generate random `dataTransfer.types` arrays and verify overlay only appears when 'Files' is present
- Generate random toggle states and verify both toggle classes produce correct visual output
- Test that dragCounter always resets to 0 after any complete drag cycle

### Integration Tests

- Test full reorder drag flow with Edit Mode active — no overlay appears
- Test full file upload drag flow — overlay appears and file is uploaded
- Test Edit Mode toggle visual state matches functional state
- Test switching between Edit Mode on/off doesn't affect file upload behavior
