# UI Testing Design

## Test Approach

All testing is performed live in the browser using **Chrome DevTools MCP tools**. The agent navigates the real running application, takes snapshots, clicks elements, types text, presses keys, and verifies resulting DOM state through subsequent snapshots.

### Tools Used

| Tool | Purpose |
|------|---------|
| `navigate_page` | Load the app, reload, navigate back/forward |
| `take_snapshot` | Capture a11y tree to verify DOM state and find element UIDs |
| `take_screenshot` | Visual confirmation of state |
| `click` | Click buttons, toggles, images, cards |
| `fill` | Fill text inputs, select radio/checkbox values |
| `press_key` | Keyboard shortcuts (Escape, arrows, Ctrl+Z, Ctrl+Y) |
| `type_text` | Type into focused inputs |
| `hover` | Hover over envelope, elements with hover states |
| `wait_for` | Wait for text/elements to appear after async actions |
| `evaluate_script` | Read localStorage, check classes, execute setup/teardown |
| `list_console_messages` | Check for errors during interactions |

### Test Execution Model

```
1. Start the server (node server.js on a port)
2. Navigate browser to localhost
3. For each test area:
   a. Take snapshot → identify element UIDs
   b. Perform action (click/type/key)
   c. Take snapshot → verify expected state change
   d. Use evaluate_script for localStorage/class checks when needed
4. Report pass/fail for each requirement
```

### Pre-Conditions

- Server running at `http://localhost:3000` (or whatever port server.js uses)
- Browser page open to the app URL
- localStorage cleared between test groups (via `evaluate_script`)

### State Reset Between Tests

```javascript
// Via evaluate_script between test groups:
() => {
    localStorage.clear();
    location.reload();
}
```

### Verification Methods

| What to verify | How |
|---------------|-----|
| Element visible/hidden | `take_snapshot` → check element presence/absence |
| CSS class applied | `evaluate_script` → `el.classList.contains('class')` |
| Text content changed | `take_snapshot` → check text in a11y tree |
| localStorage updated | `evaluate_script` → `JSON.parse(localStorage.getItem(key))` |
| Audio playing | `evaluate_script` → `!document.querySelector('audio').paused` |
| Page transition | `take_snapshot` → check which page section is visible |
| Modal/overlay open | `take_snapshot` → check lightbox/modal visibility |
| Input focused | `take_snapshot` → check focused element in tree |

### Test Grouping

Tests are executed sequentially in logical groups. Each group tests a feature area and resets state before starting:

1. **Envelope & Navigation** — Page load, envelope interaction, page transitions
2. **Lightbox** — Open, close, navigate, keyboard, counter
3. **Music Player** — Song cards, play/pause, track switching
4. **Edit Mode** — Toggle, inline editing, color/layout/columns
5. **Photo Features** — Filters, frames, tags
6. **Custom Sections** — Create, add items, delete
7. **Undo/Redo** — Actions, keyboard shortcuts, button states
8. **Section Management** — Hide/show, reorder, drag-and-drop
9. **Trash & Media** — Delete, trash panel, restore
10. **Import/Export** — Export settings, import file
11. **Pin & Notes** — Pin items, add notes
12. **Decorations & Timeline** — Balloons, tree, course completion
13. **Funny Moments** — Video embeds, image rendering
14. **Keyboard Accessibility** — All shortcuts across contexts

### Risks

| Risk | Mitigation |
|------|-----------|
| Async operations (typewriter, animations) | Use `wait_for` with expected text/elements |
| Element UIDs change between snapshots | Always take fresh snapshot before interacting |
| Audio autoplay blocked by browser | Use `evaluate_script` to bypass or verify state |
| File upload (import) | Use `upload_file` tool with a test JSON file |
| Drag-and-drop | Use `evaluate_script` to simulate DnD events or use `drag` tool |
