# Requirements Document

## Introduction

This feature adds a "Developer Mode" toggle and drag-and-drop reordering to the birthday memories web app. When Developer Mode is enabled, users can reorder items within every section (Photos, Songs, Things You Like, Funny Moments, and Timeline/Courses) by dragging and dropping them. Items animate smoothly during the drag to preview the final drop position. The custom order is persisted in localStorage so it survives page reloads. When Developer Mode is off, the app behaves normally with no reordering affordances visible.

## Glossary

- **App**: The birthday memories web application consisting of `index.html`, `script.js`, `media-manager.js`, `styles.css`, and `server.js`.
- **Developer_Mode**: A user-togglable state that enables drag-and-drop reordering of items within all Sections. When Developer_Mode is inactive, the App displays items normally without reorder affordances.
- **Developer_Mode_Toggle**: A labeled toggle switch in the header actions area (next to the existing Envelope toggle) that activates or deactivates Developer_Mode.
- **Section**: One of the five content areas in the App: Photos, Songs, Things You Like, Funny Moments, or Timeline/Courses.
- **Photos_Section**: The grid-layout section displaying photo cards rendered by the `populatePhotos` function into the `#photos-grid` container.
- **Songs_Section**: The vertical-list section displaying song cards rendered by the `populateSongs` function into the `#songs-container` container.
- **Likes_Section**: The grid-layout section displaying like cards rendered by the `populateLikes` function into the `#likes-grid` container.
- **Funny_Moments_Section**: The grid-layout section displaying moment cards rendered by the `populateFunnyMoments` function into the `#funny-grid` container.
- **Timeline_Section**: The vertical-list section displaying timeline course items rendered by the `populateTimeline` function into the `#timeline` container.
- **Drag_Item**: The DOM element currently being dragged by the user during a reorder operation.
- **Drop_Target**: The position within a Section's item list where the Drag_Item will be inserted when released.
- **Reorder_Animation**: The smooth CSS transition applied to sibling items that shift position to visually indicate the Drop_Target location while the user drags.
- **Order_Map**: A JSON-serializable object stored in localStorage that maps each Section identifier to an ordered array of item identifiers, representing the user's custom sort order.
- **Item_Identifier**: A unique string identifying a single item within a Section, derived from the item's `id` field in the MediaManager data model (for media sections) or the course `id` (for the Timeline_Section).
- **Envelope_Toggle**: The existing toggle switch in the header actions area that controls whether the envelope page is shown.
- **Header_Actions**: The `<div class="header-actions">` container in the memories page header that holds the Trash button and Envelope_Toggle.

## Requirements

### Requirement 1: Developer Mode Toggle Display

**User Story:** As a user, I want a clearly labeled toggle switch for Developer Mode in the header, so that I can easily enable and disable item reordering.

#### Acceptance Criteria

1. THE App SHALL render the Developer_Mode_Toggle inside the Header_Actions area, adjacent to the existing Envelope_Toggle.
2. THE Developer_Mode_Toggle SHALL consist of a labeled checkbox input with a slider, visually consistent with the Envelope_Toggle styling.
3. THE Developer_Mode_Toggle SHALL display a label text that identifies the toggle as "Developer Mode" or "Edit Mode".
4. WHEN the App loads, THE Developer_Mode_Toggle SHALL be in the off (unchecked) state by default.

### Requirement 2: Developer Mode State Persistence

**User Story:** As a user, I want my Developer Mode preference to be remembered across page reloads, so that I do not have to re-enable it every time.

#### Acceptance Criteria

1. WHEN the user changes the Developer_Mode_Toggle state, THE App SHALL persist the new state to localStorage under a dedicated key.
2. WHEN the App loads and a previously saved Developer_Mode state exists in localStorage, THE App SHALL restore the Developer_Mode_Toggle to the saved state.
3. IF localStorage is unavailable or the saved state is missing, THEN THE App SHALL default the Developer_Mode_Toggle to the off state.

### Requirement 3: Visual Indicators for Developer Mode Active

**User Story:** As a user, I want a clear visual indication when Developer Mode is active, so that I know reordering is available.

#### Acceptance Criteria

1. WHILE Developer_Mode is active, THE App SHALL apply a distinct visual indicator to each Section to signal that items are reorderable (for example, a subtle border, background tint, or icon overlay).
2. WHILE Developer_Mode is active, THE App SHALL apply a drag cursor style to each reorderable item within all Sections.
3. WHEN Developer_Mode is deactivated, THE App SHALL remove all reorder-related visual indicators from every Section and restore the default cursor on all items.

### Requirement 4: Drag Initiation in Developer Mode

**User Story:** As a user with Developer Mode enabled, I want to start dragging an item by pressing and holding it, so that I can begin a reorder operation.

#### Acceptance Criteria

1. WHILE Developer_Mode is active, THE App SHALL set the `draggable` attribute to `true` on each reorderable item in every Section.
2. WHEN the user initiates a drag on a reorderable item while Developer_Mode is active, THE App SHALL visually distinguish the Drag_Item from the remaining items (for example, by reducing opacity or adding a shadow).
3. WHEN Developer_Mode is inactive, THE App SHALL set the `draggable` attribute to `false` on all items, preventing drag initiation for reordering purposes.
4. WHILE Developer_Mode is active, THE App SHALL exclude non-reorderable elements (such as the "+" add-button card and the snow globe card) from being draggable.

### Requirement 5: Live Reorder Animation During Drag

**User Story:** As a user dragging an item, I want the other items to animate smoothly to show where my item will land, so that I can see a live preview of the final order.

#### Acceptance Criteria

1. WHILE the user drags a Drag_Item over sibling items in the same Section, THE App SHALL calculate the Drop_Target position based on the pointer location relative to the sibling items.
2. WHEN the Drop_Target position changes during a drag, THE App SHALL animate the sibling items using CSS transitions to shift and create a visual gap at the Drop_Target position.
3. THE Reorder_Animation SHALL have a duration between 150ms and 300ms to provide a smooth visual transition without feeling sluggish.
4. THE Reorder_Animation SHALL work correctly for both grid-layout Sections (Photos_Section, Likes_Section, Funny_Moments_Section) and vertical-list Sections (Songs_Section, Timeline_Section).
5. WHILE the user drags a Drag_Item, THE App SHALL display a visual placeholder or gap at the Drop_Target position indicating where the item will be inserted upon release.

### Requirement 6: Drop and Reorder Completion

**User Story:** As a user, I want to release the dragged item to finalize its new position, so that the reorder takes effect.

#### Acceptance Criteria

1. WHEN the user releases the Drag_Item over a valid Drop_Target within the same Section, THE App SHALL insert the Drag_Item at the Drop_Target position in the DOM.
2. WHEN the Drag_Item is dropped, THE App SHALL remove all Reorder_Animation transforms and visual drag indicators from all items in the Section.
3. WHEN the Drag_Item is dropped, THE App SHALL update the Order_Map in localStorage to reflect the new item order for that Section.
4. IF the user releases the Drag_Item outside the Section or cancels the drag (for example, by pressing Escape), THEN THE App SHALL return all items to their original positions and remove all Reorder_Animation transforms.

### Requirement 7: Order Persistence in localStorage

**User Story:** As a user, I want my custom item order to persist across page reloads, so that I do not lose my arrangement.

#### Acceptance Criteria

1. THE App SHALL store the Order_Map in localStorage under a dedicated key (for example, `developer_mode_order`).
2. THE Order_Map SHALL map each Section identifier to an ordered array of Item_Identifiers representing the user's custom sort order.
3. WHEN the App loads and an Order_Map exists in localStorage, THE App SHALL apply the saved order when rendering items in each Section.
4. WHEN a new item is added to a Section that has a saved order, THE App SHALL append the new item at the end of the ordered list.
5. WHEN an item is deleted from a Section, THE App SHALL remove the corresponding Item_Identifier from the Order_Map for that Section.
6. IF localStorage is unavailable or the Order_Map is missing, THEN THE App SHALL render items in their default order (hardcoded array order merged with user-added items).
7. FOR ALL valid Order_Map objects, serializing to JSON then deserializing from JSON SHALL produce an equivalent Order_Map (round-trip property).

### Requirement 8: Photos Section Reordering

**User Story:** As a user, I want to reorder photo cards in the Photos grid by dragging them, so that I can arrange my memories in a meaningful order.

#### Acceptance Criteria

1. WHILE Developer_Mode is active, THE App SHALL enable drag-and-drop reordering on all photo cards within the Photos_Section grid.
2. WHEN a photo card is dragged over other photo cards in the grid, THE App SHALL animate the surrounding cards to shift and reveal the Drop_Target gap.
3. WHEN a photo card is dropped at a new position, THE App SHALL re-render the Photos_Section grid with the updated order.
4. THE App SHALL exclude the add-button card from participating in drag-and-drop reordering within the Photos_Section.

### Requirement 9: Songs Section Reordering

**User Story:** As a user, I want to reorder song cards in the Songs list by dragging them, so that I can create my preferred playlist order.

#### Acceptance Criteria

1. WHILE Developer_Mode is active, THE App SHALL enable drag-and-drop reordering on all song cards within the Songs_Section vertical list.
2. WHEN a song card is dragged upward or downward past other song cards, THE App SHALL animate the neighboring cards to shift vertically and reveal the Drop_Target gap.
3. WHEN a song card is dropped at a new position, THE App SHALL re-render the Songs_Section list with the updated order.
4. THE App SHALL exclude the add-button card from participating in drag-and-drop reordering within the Songs_Section.

### Requirement 10: Things You Like Section Reordering

**User Story:** As a user, I want to reorder like cards in the Things You Like grid by dragging them, so that I can prioritize my favorite things.

#### Acceptance Criteria

1. WHILE Developer_Mode is active, THE App SHALL enable drag-and-drop reordering on all like cards within the Likes_Section grid.
2. WHEN a like card is dragged over other like cards in the grid, THE App SHALL animate the surrounding cards to shift and reveal the Drop_Target gap.
3. WHEN a like card is dropped at a new position, THE App SHALL re-render the Likes_Section grid with the updated order.
4. THE App SHALL exclude the add-button card and the snow globe card from participating in drag-and-drop reordering within the Likes_Section.

### Requirement 11: Funny Moments Section Reordering

**User Story:** As a user, I want to reorder moment cards in the Funny Moments grid by dragging them, so that I can arrange my funniest clips in order.

#### Acceptance Criteria

1. WHILE Developer_Mode is active, THE App SHALL enable drag-and-drop reordering on all moment cards within the Funny_Moments_Section grid.
2. WHEN a moment card is dragged over other moment cards in the grid, THE App SHALL animate the surrounding cards to shift and reveal the Drop_Target gap.
3. WHEN a moment card is dropped at a new position, THE App SHALL re-render the Funny_Moments_Section grid with the updated order.
4. THE App SHALL exclude the add-button card from participating in drag-and-drop reordering within the Funny_Moments_Section.

### Requirement 12: Timeline Section Reordering

**User Story:** As a user, I want to reorder course items in the Timeline by dragging them, so that I can arrange my academic journey in a custom order.

#### Acceptance Criteria

1. WHILE Developer_Mode is active, THE App SHALL enable drag-and-drop reordering on all timeline items within the Timeline_Section vertical list.
2. WHEN a timeline item is dragged upward or downward past other timeline items, THE App SHALL animate the neighboring items to shift vertically and reveal the Drop_Target gap.
3. WHEN a timeline item is dropped at a new position, THE App SHALL re-render the Timeline_Section list with the updated order.

### Requirement 13: Reorder Disabled When Developer Mode is Off

**User Story:** As a user with Developer Mode off, I want the app to behave normally without any drag-and-drop reorder behavior, so that I do not accidentally rearrange items.

#### Acceptance Criteria

1. WHILE Developer_Mode is inactive, THE App SHALL prevent all drag-and-drop reorder interactions on items in every Section.
2. WHILE Developer_Mode is inactive, THE App SHALL preserve the existing drag-and-drop file upload behavior for adding new media files to Sections.
3. WHILE Developer_Mode is inactive, THE App SHALL continue to apply any previously saved Order_Map when rendering items, so that the custom order is visible even without Developer_Mode being active.

### Requirement 14: Interaction Between Reorder and Existing Features

**User Story:** As a user, I want reordering to work alongside existing features like delete, add, and restore without conflicts, so that the app remains fully functional.

#### Acceptance Criteria

1. WHILE Developer_Mode is active, THE App SHALL continue to display and respond to delete buttons on each item.
2. WHEN an item is added to a Section (via file upload or URL), THE App SHALL append the new item at the end of the current order and update the Order_Map.
3. WHEN an item is restored from the trash to a Section, THE App SHALL append the restored item at the end of the current order and update the Order_Map.
4. WHILE Developer_Mode is active, THE App SHALL continue to support the existing drag-and-drop file upload behavior when files are dragged from outside the browser onto a Section.
