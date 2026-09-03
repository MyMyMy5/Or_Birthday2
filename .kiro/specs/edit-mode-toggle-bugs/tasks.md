# Tasks: Edit Mode Toggle Bugs

## Bug 1: Toggle Slider Visual Fix

- [x] 1.1 Add CSS rule for `.dev-mode-toggle input:checked + .envelope-toggle-slider` with `background: var(--hot-pink)` in styles.css after the existing envelope-toggle checked rules
- [x] 1.2 Add CSS rule for `.dev-mode-toggle input:checked + .envelope-toggle-slider::after` with `transform: translateX(16px)` in styles.css after the rule added in 1.1

## Bug 2: File-Upload Overlay During Reorder Fix

- [x] 2.1 In `setupDragAndDrop` dragenter handler in script.js, add a guard that checks `e.dataTransfer.types` includes `'Files'` before adding `drag-active` class — return early if no files are being dragged
- [x] 2.2 In `setupDragAndDrop` dragleave handler in script.js, add the same guard so dragCounter is only decremented for file drags
- [x] 2.3 Add a `dragend` event listener on the section element in `setupDragAndDrop` that resets `dragCounter` to 0 and removes `drag-active` class as a safety net

## Testing

- [x] 3.1 Write a test that verifies the dragenter handler does NOT add `drag-active` when `dataTransfer.types` does not include `'Files'` (internal reorder drag)
- [x] 3.2 Write a test that verifies the dragenter handler DOES add `drag-active` when `dataTransfer.types` includes `'Files'` (external file drop)
- [x] 3.3 Write a test that verifies `dragend` resets `dragCounter` and removes `drag-active` class

## Verification

- [x] 4.1 Manually verify Edit Mode toggle slider moves visually when toggled on/off
- [x] 4.2 Manually verify reorder drag in Edit Mode does not show file-upload overlay
- [x] 4.3 Manually verify external file drop still shows overlay and uploads correctly
- [x] 4.4 Manually verify Envelope toggle still works correctly (preservation)
