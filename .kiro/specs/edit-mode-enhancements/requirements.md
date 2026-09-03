# Requirements Document

## Introduction

This feature enhances Edit Mode with a comprehensive set of editing capabilities. When Edit Mode is active, users can inline-edit content (song names, photo captions, section titles, item descriptions), customize visual appearance (section background colors, section ordering), manage media (pin/feature items), and control layout (grid/list toggle, column count, section visibility). All changes persist via localStorage and are only accessible when Edit Mode is active.

## Glossary

- **Edit_Mode**: The application state toggled via the "🛠️ Edit Mode" checkbox, which adds `dev-mode-active` class to `<body>` and enables all editing capabilities.
- **Section**: One of the five content areas: Photos, Songs, Timeline, Things You Like, Funny Moments. Each has a `.section` wrapper with a unique ID.
- **Inline_Edit**: A UI pattern where clicking on text transforms it into an editable input field, and pressing Enter or blurring saves the change.
- **Section_Settings_Panel**: A collapsible panel shown at the top of each section (only in Edit Mode) containing visual customization, layout, and ordering controls.
- **Pinned_Item**: An item marked as "featured" within a section, displayed with visual prominence (e.g., larger size, star badge, or first position).
- **Layout_Mode**: The display format for a section's items — either "grid" (cards in columns) or "list" (single-column rows).

## Requirements

### Requirement 1: Inline Song Rename

**User Story:** As a user, I want to edit a song's name and artist directly on the song card while in Edit Mode, so that I can correct or personalize song metadata without opening a separate editor.

#### Acceptance Criteria

1. WHILE Edit_Mode is active, WHEN the user clicks on a song name or artist text on a Song_Card, THE text SHALL transform into an editable text input pre-filled with the current value.
2. WHEN the user presses Enter or the input loses focus, THE system SHALL save the new value to localStorage and update the display immediately.
3. WHEN the user presses Escape, THE system SHALL discard changes and revert to the original text.
4. WHILE Edit_Mode is not active, WHEN the user clicks on song name or artist text, THE system SHALL NOT enable editing.
5. THE system SHALL persist renamed song names and artists in a dedicated localStorage key (`song_renames`).

### Requirement 2: Inline Photo Rename

**User Story:** As a user, I want to edit a photo's caption/label directly on the photo card while in Edit Mode, so that I can give meaningful names to my memories.

#### Acceptance Criteria

1. WHILE Edit_Mode is active, WHEN the user clicks on a photo caption/label, THE text SHALL transform into an editable text input pre-filled with the current value.
2. WHEN the user presses Enter or the input loses focus, THE system SHALL save the new caption to localStorage and update the display immediately.
3. WHEN the user presses Escape, THE system SHALL discard changes and revert to the original caption.
4. WHILE Edit_Mode is not active, WHEN the user clicks on a photo caption, THE system SHALL NOT enable editing.
5. THE system SHALL persist renamed photo captions in a dedicated localStorage key (`photo_renames`).

### Requirement 3: Edit Section Titles

**User Story:** As a user, I want to edit section headings (e.g., "Photos", "Songs") while in Edit Mode, so that I can personalize the page layout.

#### Acceptance Criteria

1. WHILE Edit_Mode is active, WHEN the user clicks on a section title (`<h2>`), THE title SHALL transform into an editable text input pre-filled with the current title.
2. WHEN the user presses Enter or the input loses focus, THE system SHALL save the new title to localStorage and update the heading immediately.
3. WHEN the user presses Escape, THE system SHALL discard changes and revert to the original title.
4. WHILE Edit_Mode is not active, WHEN the user clicks on a section title, THE system SHALL NOT enable editing.
5. THE system SHALL persist custom section titles in a dedicated localStorage key (`section_titles`).
6. WHEN the page loads, THE system SHALL display custom titles from localStorage if they exist, otherwise display the default titles.

### Requirement 4: Item Descriptions/Notes

**User Story:** As a user, I want to add or edit a short description/note on any item (photo, song, liked thing, funny moment) while in Edit Mode, so that I can add context or memories to each item.

#### Acceptance Criteria

1. WHILE Edit_Mode is active, THE system SHALL display an "Add note" placeholder or existing note text below each item.
2. WHEN the user clicks on the note area, THE system SHALL open an editable text input or textarea for the note.
3. WHEN the user saves the note (Enter or blur), THE system SHALL persist the note in localStorage under a dedicated key (`item_notes`) keyed by item ID.
4. WHEN the page loads, THE system SHALL display saved notes below their respective items.
5. WHILE Edit_Mode is not active, saved notes SHALL be displayed as read-only text (if they exist), but the "Add note" placeholder SHALL be hidden.

### Requirement 5: Section Background Color/Theme

**User Story:** As a user, I want to change the background color of each section while in Edit Mode, so that I can visually distinguish and personalize different areas of the page.

#### Acceptance Criteria

1. WHILE Edit_Mode is active, THE Section_Settings_Panel SHALL display a color picker or preset color palette for each section.
2. WHEN the user selects a color, THE section's background SHALL update immediately.
3. THE system SHALL persist section background colors in localStorage under the key `section_colors` (keyed by section ID).
4. WHEN the page loads, THE system SHALL apply saved background colors to their respective sections.
5. THE Section_Settings_Panel SHALL provide a "Reset" option to revert to the default background.

### Requirement 6: Custom Section Ordering

**User Story:** As a user, I want to reorder entire sections (move Photos below Songs, etc.) while in Edit Mode, so that I can arrange the page layout to my preference.

#### Acceptance Criteria

1. WHILE Edit_Mode is active, THE Section_Settings_Panel SHALL display "Move Up" and "Move Down" buttons (or drag handles) for each section.
2. WHEN the user clicks "Move Up", THE section SHALL swap positions with the section above it in the DOM.
3. WHEN the user clicks "Move Down", THE section SHALL swap positions with the section below it in the DOM.
4. THE system SHALL persist the section order in localStorage under the key `section_order` (as an ordered array of section IDs).
5. WHEN the page loads, THE system SHALL reorder sections according to the saved order.
6. THE first section SHALL NOT have a "Move Up" button, and the last section SHALL NOT have a "Move Down" button.

### Requirement 7: Featured/Pinned Item

**User Story:** As a user, I want to pin or feature one item per section while in Edit Mode, so that my favorite memory, song, or item is displayed prominently.

#### Acceptance Criteria

1. WHILE Edit_Mode is active, THE system SHALL display a "Pin" button (⭐ or 📌) on each item in every section.
2. WHEN the user clicks the Pin button on an item, THE system SHALL mark that item as the Pinned_Item for its section.
3. IF another item in the same section was previously pinned, THE system SHALL unpin it (only one pinned item per section).
4. THE Pinned_Item SHALL be displayed with visual prominence: a star/pin badge and positioned first in the section.
5. THE system SHALL persist pinned items in localStorage under the key `pinned_items` (keyed by section ID, value is item ID).
6. WHEN the user clicks the Pin button on an already-pinned item, THE system SHALL unpin it (toggle behavior).
7. WHILE Edit_Mode is not active, THE Pinned_Item SHALL still be displayed prominently, but the Pin button SHALL be hidden.

### Requirement 8: Grid/List View Toggle

**User Story:** As a user, I want to switch between grid and list view for each section while in Edit Mode, so that I can choose the layout that best suits the content.

#### Acceptance Criteria

1. WHILE Edit_Mode is active, THE Section_Settings_Panel SHALL display a toggle (grid icon / list icon) for switching between Layout_Modes.
2. WHEN the user selects "Grid" mode, THE section's items SHALL be displayed in a multi-column grid layout.
3. WHEN the user selects "List" mode, THE section's items SHALL be displayed in a single-column list layout.
4. THE system SHALL persist the layout mode per section in localStorage under the key `section_layouts` (keyed by section ID).
5. WHEN the page loads, THE system SHALL apply the saved layout mode to each section.
6. THE default Layout_Mode SHALL be "grid" for Photos, Things You Like, and Funny Moments, and "list" for Songs and Timeline.

### Requirement 9: Grid Column Count

**User Story:** As a user, I want to adjust how many columns the grid uses for each section while in Edit Mode, so that I can control the density of the layout.

#### Acceptance Criteria

1. WHILE Edit_Mode is active AND the section is in "Grid" Layout_Mode, THE Section_Settings_Panel SHALL display a column count selector (range: 2–6).
2. WHEN the user changes the column count, THE section's grid SHALL update immediately to use the specified number of columns.
3. THE system SHALL persist the column count per section in localStorage under the key `section_columns` (keyed by section ID).
4. WHEN the page loads, THE system SHALL apply the saved column count to each section.
5. THE column count selector SHALL be hidden when the section is in "List" Layout_Mode.

### Requirement 10: Hide/Show Sections

**User Story:** As a user, I want to hide sections I don't want to see while in Edit Mode, so that I can declutter the page and focus on what matters.

#### Acceptance Criteria

1. WHILE Edit_Mode is active, THE Section_Settings_Panel SHALL display a "Hide Section" toggle or button for each section.
2. WHEN the user hides a section, THE section content SHALL be collapsed/hidden, showing only a minimal "hidden" indicator with the section name.
3. WHILE Edit_Mode is active, hidden sections SHALL show a "Show Section" button to restore them.
4. WHILE Edit_Mode is not active, hidden sections SHALL be completely invisible (no indicator shown).
5. THE system SHALL persist hidden section IDs in localStorage under the key `hidden_sections` (as an array of section IDs).
6. WHEN the page loads, THE system SHALL hide sections that are in the saved hidden list.
7. AT LEAST one section SHALL remain visible at all times (prevent hiding all sections).
