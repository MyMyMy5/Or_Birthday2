# Bugfix Requirements Document

## Introduction

Two bugs exist in the developer-mode-reorder feature's Edit Mode toggle and its interaction with drag-and-drop file upload:

1. **Toggle slider visual bug**: The Edit Mode toggle checkbox changes state correctly (body gets `dev-mode-active` class), but the slider knob does not move and the background color does not change to indicate the "on" state. This is because the CSS checked-state selectors only target `.envelope-toggle input:checked + .envelope-toggle-slider`, while the dev-mode toggle uses class `.dev-mode-toggle` on its label.

2. **File-upload overlay appears during reorder drag**: When Edit Mode is active and the user drags a photo card to reorder it, the "Drop files here" file-upload overlay appears on top of the section and can get stuck visible. The `setupDragAndDrop` function does not distinguish between internal reorder drags and external file drops from the OS.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the user clicks the Edit Mode toggle and the checkbox becomes checked THEN the system does not visually move the slider knob or change the slider background color, because the CSS selector `.envelope-toggle input:checked + .envelope-toggle-slider` does not match the `.dev-mode-toggle` label class.

1.2 WHEN Edit Mode is active and the user initiates a drag on a photo card (internal reorder drag) THEN the system shows the "Drop files here" file-upload overlay on the section, because `setupDragAndDrop` treats all `dragenter` events identically regardless of drag origin.

1.3 WHEN the reorder drag completes while the file-upload overlay is visible THEN the system may leave the overlay stuck in the visible state, because the reorder engine's `e.stopPropagation()` on drop prevents the file-upload drop handler from resetting `dragCounter` to zero.

### Expected Behavior (Correct)

2.1 WHEN the user clicks the Edit Mode toggle and the checkbox becomes checked THEN the system SHALL move the slider knob to the right (translateX 16px) and change the slider background to the active color (hot-pink), matching the visual behavior of the Envelope toggle.

2.2 WHEN Edit Mode is active and the user initiates a drag on an internal page element (reorder drag where `e.dataTransfer.types` does not include `'Files'`) THEN the system SHALL NOT show the "Drop files here" file-upload overlay.

2.3 WHEN any drag operation ends or is cancelled THEN the system SHALL ensure the file-upload overlay is hidden and `dragCounter` is reset to zero, preventing the overlay from getting stuck.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user clicks the Envelope toggle THEN the system SHALL CONTINUE TO visually move its slider knob and change its background color as before (existing `.envelope-toggle` CSS rules remain unchanged).

3.2 WHEN Edit Mode is inactive and the user drags files from the OS file manager onto a section (external file drop where `e.dataTransfer.types` includes `'Files'`) THEN the system SHALL CONTINUE TO show the "Drop files here" overlay and accept the file upload.

3.3 WHEN Edit Mode is active and the user drags files from the OS file manager onto a section (external file drop) THEN the system SHALL CONTINUE TO show the "Drop files here" overlay and accept the file upload.

3.4 WHEN the Edit Mode toggle is unchecked THEN the system SHALL CONTINUE TO display the slider in the off position with the default background color.

---

## Bug Condition Derivation

### Bug 1: Toggle Slider Visual

```pascal
FUNCTION isBugCondition_ToggleVisual(X)
  INPUT: X of type ToggleInteraction
  OUTPUT: boolean

  // The bug triggers when the dev-mode toggle is checked,
  // because CSS only targets .envelope-toggle, not .dev-mode-toggle
  RETURN X.toggleClass = "dev-mode-toggle" AND X.checked = true
END FUNCTION
```

```pascal
// Property: Fix Checking - Toggle Visual
FOR ALL X WHERE isBugCondition_ToggleVisual(X) DO
  slider ← getSliderElement(X.toggle)
  ASSERT slider.backgroundColor = hotPink
  ASSERT slider.knobTransform = "translateX(16px)"
END FOR
```

```pascal
// Property: Preservation Checking - Envelope Toggle Unaffected
FOR ALL X WHERE NOT isBugCondition_ToggleVisual(X) DO
  ASSERT F(X) = F'(X)
END FOR
```

### Bug 2: File-Upload Overlay During Reorder

```pascal
FUNCTION isBugCondition_OverlayDuringReorder(X)
  INPUT: X of type DragEvent
  OUTPUT: boolean

  // The bug triggers when a dragenter event fires on a section
  // but the drag originated internally (no 'Files' in dataTransfer.types)
  RETURN X.eventType = "dragenter"
    AND NOT X.dataTransfer.types.includes("Files")
END FUNCTION
```

```pascal
// Property: Fix Checking - No Overlay on Internal Drag
FOR ALL X WHERE isBugCondition_OverlayDuringReorder(X) DO
  section ← X.targetSection
  ASSERT NOT section.classList.contains("drag-active")
END FOR
```

```pascal
// Property: Preservation Checking - External File Drop Still Works
FOR ALL X WHERE NOT isBugCondition_OverlayDuringReorder(X) DO
  ASSERT F(X) = F'(X)
END FOR
```
