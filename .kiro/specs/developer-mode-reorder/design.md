# Design Document: Developer Mode & Drag-and-Drop Reordering

## Overview

This feature adds a "Developer Mode" toggle and drag-and-drop reordering to all five sections (Photos, Songs, Things You Like, Funny Moments, Timeline). When enabled, items become draggable with smooth "make space" animations during drag. Custom order is persisted in localStorage. The implementation uses vanilla JavaScript with the native HTML5 Drag and Drop API and CSS transitions for animations.

## Architecture

### Developer Mode State

A global boolean `_devMode` tracks whether developer mode is active. It is read from and written to localStorage under the key `developer_mode_enabled`.

```js
var DEV_MODE_KEY = 'developer_mode_enabled';
var ORDER_MAP_KEY = 'developer_mode_order';
```

### Order Map Storage

The Order_Map is a JSON object stored in localStorage:

```js
{
  "photos": ["img1.jpg", "img2.png", "url-abc123"],
  "songs": ["song1.mp3", "url-xyz789"],
  "thingsYouLike": ["item1.jpg", "item2.jpg"],
  "funnyMoments": ["videoId1", "videoId2"],
  "timeline": ["calc1", "calc2", "linalg1"]
}
```

Each key maps to an ordered array of item identifiers. Items not in the array are appended at the end in their default order.

### Order Map Helpers

```js
function readOrderMap() {
    try {
        var raw = localStorage.getItem(ORDER_MAP_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
}

function writeOrderMap(map) {
    try { localStorage.setItem(ORDER_MAP_KEY, JSON.stringify(map)); } catch (e) {}
}

function getOrderedIds(section) {
    var map = readOrderMap();
    return Array.isArray(map[section]) ? map[section] : [];
}

function saveOrder(section, orderedIds) {
    var map = readOrderMap();
    map[section] = orderedIds;
    writeOrderMap(map);
}

function applyOrder(items, section) {
    var orderedIds = getOrderedIds(section);
    if (orderedIds.length === 0) return items;

    var idToItem = {};
    items.forEach(function (item) { idToItem[item.id] = item; });

    var ordered = [];
    orderedIds.forEach(function (id) {
        if (idToItem[id]) {
            ordered.push(idToItem[id]);
            delete idToItem[id];
        }
    });
    // Append items not in the saved order (new items)
    Object.keys(idToItem).forEach(function (id) {
        ordered.push(idToItem[id]);
    });
    return ordered;
}

function removeFromOrder(section, itemId) {
    var map = readOrderMap();
    if (Array.isArray(map[section])) {
        map[section] = map[section].filter(function (id) { return id !== itemId; });
        writeOrderMap(map);
    }
}
```

### Drag-and-Drop Reorder Engine

A reusable `setupSectionReorder(container, sectionKey, options)` function handles all drag-and-drop logic for any section. It uses the HTML5 Drag and Drop API with CSS transition animations.

#### Parameters
- `container` — the DOM element containing the items (e.g., `#photos-grid`)
- `sectionKey` — the section identifier string (e.g., `'photos'`)
- `options.itemSelector` — CSS selector for draggable items (e.g., `'.photo-card'`)
- `options.excludeSelector` — CSS selector for non-draggable items (e.g., `'.add-btn-card, .snow-globe-card'`)
- `options.direction` — `'grid'` or `'vertical'` (determines animation axis)
- `options.onReorder` — callback invoked with the new ordered ID array after a drop

#### Core Algorithm

1. **dragstart**: Record the dragged element's index. Set opacity to 0.4. Store the item ID in `dataTransfer`.
2. **dragover**: For each sibling item, calculate whether the pointer is above/below (vertical) or before/after (grid) the item's midpoint. Determine the new drop index. Apply CSS `transform: translateY(Npx)` or `transform: translateX(Npx)` to shift items that need to move, with `transition: transform 200ms ease`.
3. **dragend/drop**: Remove all transforms. If a valid drop occurred, reorder the DOM elements, extract the new ID order, and call `saveOrder(sectionKey, newOrder)`. Re-render the section.
4. **dragleave/cancel**: Remove all transforms, restore original positions.

#### Animation Strategy

For **vertical lists** (Songs, Timeline):
- Items below the drop target get `transform: translateY(itemHeight + gap)` to shift down
- Items above the drop target that were below the original position get `transform: translateY(-(itemHeight + gap))` to shift up

For **grid layouts** (Photos, Likes, Funny Moments):
- Use a simplified approach: hide the dragged item (display: none) and insert a placeholder element at the drop position. The CSS grid auto-layout handles the reflow. Apply `transition: transform 200ms ease` on all grid items for smooth animation.

### Developer Mode Toggle

Added to `index.html` inside `.header-actions`:

```html
<label class="dev-mode-toggle" id="dev-mode-toggle-label">
    <input type="checkbox" id="dev-mode-toggle">
    <span class="envelope-toggle-slider"></span>
    <span class="envelope-toggle-text">🛠️ Edit Mode</span>
</label>
```

Reuses the existing `.envelope-toggle` styling pattern with a new class `.dev-mode-toggle`.

### Toggle Logic (in script.js)

```js
function setupDevModeToggle() {
    var toggle = document.getElementById('dev-mode-toggle');
    if (!toggle) return;

    // Restore saved state
    var saved = localStorage.getItem(DEV_MODE_KEY);
    if (saved === 'true') {
        toggle.checked = true;
        enableDevMode();
    }

    toggle.addEventListener('change', function () {
        localStorage.setItem(DEV_MODE_KEY, toggle.checked ? 'true' : 'false');
        if (toggle.checked) {
            enableDevMode();
        } else {
            disableDevMode();
        }
    });
}

function enableDevMode() {
    document.body.classList.add('dev-mode-active');
    initAllSectionReorders();
}

function disableDevMode() {
    document.body.classList.remove('dev-mode-active');
    teardownAllSectionReorders();
}
```

### Section Integration

Each populate function applies the saved order before rendering:

```js
// In populatePhotos, after building photoList:
photoList = applyOrder(photoList.map(function(p) { return p._mediaItem; }), 'photos')
    .map(function(item) { return { url: item.source, caption: item.caption, _mediaItem: item }; });
```

After rendering, if dev mode is active, `setupSectionReorder` is called for that container.

### CSS Changes

```css
/* Developer mode visual indicators */
.dev-mode-active .section {
    outline: 2px dashed var(--soft-rose);
    outline-offset: -2px;
}

.dev-mode-active .photo-card,
.dev-mode-active .song-card,
.dev-mode-active .like-card,
.dev-mode-active .moment-card,
.dev-mode-active .timeline-item {
    cursor: grab;
}

.dev-mode-active .photo-card:active,
.dev-mode-active .song-card:active,
.dev-mode-active .like-card:active,
.dev-mode-active .moment-card:active,
.dev-mode-active .timeline-item:active {
    cursor: grabbing;
}

/* Dragging state */
.dev-mode-active .dragging {
    opacity: 0.4;
    box-shadow: 0 8px 30px rgba(255, 79, 154, 0.4);
}

/* Smooth transition for reorder animation */
.dev-mode-active .photo-card,
.dev-mode-active .song-card,
.dev-mode-active .like-card,
.dev-mode-active .moment-card,
.dev-mode-active .timeline-item {
    transition: transform 200ms ease;
}

/* Drop placeholder gap */
.reorder-placeholder {
    background: rgba(255, 127, 183, 0.15);
    border: 2px dashed var(--soft-rose);
    border-radius: 12px;
    min-height: 80px;
    transition: all 200ms ease;
}

/* Dev mode toggle styling (reuses envelope-toggle pattern) */
.dev-mode-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 18px;
    font-family: 'Poppins', sans-serif;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-light);
    background: rgba(255, 255, 255, 0.85);
    border: 2px solid var(--soft-rose);
    border-radius: 50px;
    cursor: pointer;
    transition: all 0.25s ease;
    box-shadow: 0 4px 14px rgba(255, 111, 161, 0.15);
    user-select: none;
}

.dev-mode-toggle:hover {
    border-color: var(--primary-pink);
    box-shadow: 0 6px 18px rgba(255, 111, 161, 0.2);
}

.dev-mode-toggle input[type="checkbox"] {
    display: none;
}
```

## Data Flow

```
User clicks Edit Mode toggle ON
  → body gets 'dev-mode-active' class
  → All section items get draggable=true, grab cursor
  → setupSectionReorder() called for each container

User drags a song card upward
  → dragstart: card gets .dragging class (opacity 0.4)
  → dragover: calculate drop index from pointer Y position
    → Items below drop index get transform: translateY(+height)
    → Items above original index get transform: translateY(-height)
    → Visual gap appears at drop position
  → drop:
    → Remove all transforms
    → Reorder DOM nodes
    → Extract new ID order from DOM
    → saveOrder('songs', newIds)
    → Re-render section

User clicks Edit Mode toggle OFF
  → body loses 'dev-mode-active' class
  → All items get draggable=false, default cursor
  → Reorder event listeners removed
  → Saved order still applied on next render
```

## Correctness Properties

### P1: Order Map round-trip
For any valid Order_Map, `JSON.parse(JSON.stringify(orderMap))` produces a deep-equal object.

### P2: Order preservation
After a reorder operation, `getOrderedIds(section)` returns the exact sequence of IDs matching the visual DOM order.

### P3: New items append at end
When an item is added to a section with a saved order, it appears at the end of the ordered list.

### P4: Deleted items removed from order
When an item is deleted, its ID is removed from the Order_Map for that section.

### P5: Dev mode toggle does not affect saved order
Toggling developer mode on/off does not modify the Order_Map. The saved order is always applied during rendering regardless of dev mode state.

## Test Plan

### Unit tests (vitest)

1. `applyOrder` — test ordering with full match, partial match, new items, empty order
2. `saveOrder` / `readOrderMap` — test localStorage round-trip
3. `removeFromOrder` — test removal of existing and non-existing IDs
4. Order Map JSON round-trip property

### Manual testing

1. Enable Edit Mode, drag a song card up/down, verify animation and new position
2. Drag a photo card in the grid, verify grid reflow animation
3. Reload page, verify order persists
4. Disable Edit Mode, verify items are not draggable
5. Add a new item, verify it appears at the end
6. Delete an item, verify it's removed from the order
7. Verify file drag-and-drop upload still works with Edit Mode off
