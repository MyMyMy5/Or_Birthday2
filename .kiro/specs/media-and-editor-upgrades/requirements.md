# Requirements Document

## Introduction

This feature set adds eight new capabilities to the birthday memories website, split into two groups: Content & Media enhancements (video support, photo filters/frames, Spotify/YouTube embeds, photo tagging) and Edit Mode upgrades (undo/redo, import/export settings, section templates, rich text notes). All features integrate with the existing vanilla JavaScript architecture, Express server, and localStorage persistence layer.

## Glossary

- **App**: The birthday memories web application consisting of `index.html`, `script.js`, `media-manager.js`, `styles.css`, and `server.js`.
- **Edit_Mode**: The application state toggled via the "🛠️ Edit Mode" checkbox, which adds `dev-mode-active` class to `<body>` and enables editing capabilities.
- **Section**: One of the content areas on the page: Photos, Songs, Timeline, Things You Like, Funny Moments, or any user-created custom section.
- **Video_Item**: A media item of type video, stored with a source (file path, data URL, or embed URL), format metadata, and a generated thumbnail.
- **Photo_Filter**: A CSS filter combination (grayscale, sepia, brightness, contrast) applied to a photo via inline styles or CSS classes.
- **Photo_Frame**: A decorative border/overlay applied to a photo card using CSS pseudo-elements or wrapper elements with birthday-themed styling.
- **Embed_Player**: An iframe-based player for Spotify tracks or YouTube videos, rendered from a pasted URL.
- **Photo_Tag**: A named label positioned at specific x/y coordinates (as percentages) on a photo, persisted in localStorage.
- **History_Stack**: An ordered list of edit operations supporting undo (revert last) and redo (re-apply last undone) actions.
- **Edit_Operation**: A recorded change containing the operation type, target element/key, previous value, and new value.
- **Settings_Export**: A JSON file containing all localStorage customization data (titles, colors, order, notes, pins, filters, frames, tags, custom sections, etc.).
- **Custom_Section**: A user-created section with configurable title, layout mode, and item type, persisted in localStorage.
- **Rich_Text_Editor**: A lightweight inline editor using `contenteditable` with a formatting toolbar supporting bold, italic, links, and bullet lists.
- **Local_Server**: The Express.js backend (`server.js`) that handles file serving and media management API endpoints.
- **MediaManager**: The client-side JavaScript module (`media-manager.js`) responsible for adding, deleting, restoring, and persisting media items.

## Requirements

### Requirement 1: Video Upload and Display

**User Story:** As a user, I want to upload or add videos to sections (especially Funny Moments and Photos), so that I can include video memories alongside photos.

#### Acceptance Criteria

1. THE App SHALL accept video files in MP4 and WebM formats via the existing Add_Button file picker in the Photos and Funny Moments sections.
2. WHEN the user selects a video file via the file picker, THE MediaManager SHALL validate that the file MIME type is `video/mp4` or `video/webm` before processing.
3. WHILE the Local_Server is available, WHEN the user uploads a video file, THE Local_Server SHALL save the video to the corresponding section directory on disk.
4. WHILE the Local_Server is unavailable, WHEN the user uploads a video file, THE MediaManager SHALL convert the file to a data URL and store it in localStorage.
5. WHEN a Video_Item is rendered in a section grid, THE App SHALL display a thumbnail image with a play button overlay centered on the thumbnail.
6. WHEN the user clicks the play button on a Video_Item thumbnail, THE App SHALL open a modal or inline player that plays the video using an HTML5 `<video>` element.
7. THE Local_Server SHALL include `video/mp4` and `video/webm` in the allowed MIME types for the Photos and Funny Moments section upload endpoints.
8. WHEN the page is reloaded after adding a video, THE App SHALL render the Video_Item with its thumbnail and play button in the correct section.
9. IF the user uploads a file with a MIME type other than the allowed image, audio, or video types, THEN THE App SHALL reject the file and display no error to the user.

### Requirement 2: Video Thumbnail Generation

**User Story:** As a user, I want uploaded videos to show a preview thumbnail, so that I can visually identify videos in the grid without playing them.

#### Acceptance Criteria

1. WHEN a video file is added, THE App SHALL generate a thumbnail by drawing the first frame of the video onto an off-screen `<canvas>` element and extracting it as a data URL.
2. THE App SHALL persist the generated thumbnail data URL in localStorage under a dedicated key (`video_thumbnails`) keyed by the Video_Item ID.
3. WHEN the page loads, THE App SHALL use the persisted thumbnail for each Video_Item rather than regenerating it.
4. IF thumbnail generation fails (e.g., video cannot be decoded), THEN THE App SHALL display a generic video placeholder icon instead.
5. FOR ALL Video_Items with a persisted thumbnail, serializing the thumbnail store to JSON then deserializing SHALL produce an equivalent object (round-trip property).

### Requirement 3: Photo Filters

**User Story:** As a user in Edit Mode, I want to apply visual filters (grayscale, sepia, brightness, contrast) to photos, so that I can enhance or stylize my memories.

#### Acceptance Criteria

1. WHILE Edit_Mode is active, WHEN the user clicks on a photo card, THE App SHALL display a filter controls panel with sliders or buttons for grayscale (0–100%), sepia (0–100%), brightness (50–200%), and contrast (50–200%).
2. WHEN the user adjusts a filter value, THE App SHALL apply the CSS `filter` property to the photo image immediately as a live preview.
3. WHEN the user confirms the filter selection, THE App SHALL persist the filter values in localStorage under the key `photo_filters` keyed by photo item ID.
4. WHEN the page loads, THE App SHALL apply saved filter values to their respective photos.
5. THE filter controls panel SHALL provide a "Reset" button that removes all filters from the photo and clears the persisted values for that photo.
6. WHILE Edit_Mode is not active, THE App SHALL display photos with their saved filters applied but hide the filter controls panel.
7. FOR ALL photo filter entries, the stored grayscale value SHALL be between 0 and 100, sepia between 0 and 100, brightness between 50 and 200, and contrast between 50 and 200.

### Requirement 4: Photo Frames

**User Story:** As a user in Edit Mode, I want to apply decorative birthday-themed frames to photos, so that I can make individual photos feel more festive.

#### Acceptance Criteria

1. WHILE Edit_Mode is active, WHEN the user opens the filter controls panel for a photo, THE App SHALL also display a frame selector with at least 5 birthday-themed frame options (e.g., confetti border, balloon corners, heart border, star sparkle, cake border) and a "No Frame" option.
2. WHEN the user selects a frame, THE App SHALL apply the frame as a CSS class or overlay on the photo card immediately.
3. THE App SHALL persist the selected frame per photo in localStorage under the key `photo_frames` keyed by photo item ID.
4. WHEN the page loads, THE App SHALL apply saved frames to their respective photo cards.
5. WHILE Edit_Mode is not active, THE App SHALL display photos with their saved frames applied but hide the frame selector.
6. WHEN the user selects "No Frame", THE App SHALL remove any applied frame from the photo and clear the persisted frame value for that photo.

### Requirement 5: Spotify Embed

**User Story:** As a user, I want to paste a Spotify track URL and have it render as an embedded Spotify player in the Songs section, so that I can share streaming music alongside local audio files.

#### Acceptance Criteria

1. WHEN the user pastes a URL matching the pattern `https://open.spotify.com/track/{TRACK_ID}` (with optional query parameters) in the URL_Prompt for the Songs section, THE App SHALL extract the Spotify track ID from the URL.
2. WHEN a valid Spotify track ID is extracted, THE App SHALL create a media item with type `spotify-embed` and store the track ID in the item metadata.
3. THE App SHALL render Spotify embed items as an iframe with `src` set to `https://open.spotify.com/embed/track/{TRACK_ID}` and appropriate dimensions (height: 80px for compact, width: 100%).
4. THE App SHALL persist Spotify embed items in the same media store as other URL-added items with origin `url-added` and type `spotify-embed`.
5. WHEN the page reloads, THE App SHALL restore and render all persisted Spotify embed items in the Songs section.
6. IF the pasted URL matches the Spotify domain but does not contain a valid track path, THEN THE App SHALL display an error message indicating the Spotify URL format is invalid.

### Requirement 6: YouTube Embed in Songs Section

**User Story:** As a user, I want to paste a YouTube URL in the Songs section and have it render as an embedded YouTube video player, so that I can include music videos alongside audio tracks.

#### Acceptance Criteria

1. WHEN the user pastes a YouTube URL in the URL_Prompt for the Songs section, THE App SHALL extract the Video_ID using the same YouTube URL parsing logic used in other sections.
2. WHEN a valid Video_ID is extracted for the Songs section, THE App SHALL create a media item with type `youtube-embed` and store the Video_ID in the item metadata.
3. THE App SHALL render YouTube embed items in the Songs section as a song card with a YouTube thumbnail and a play button that expands to an iframe embed on click.
4. THE App SHALL persist YouTube embed items in the same media store as other URL-added items with origin `url-added` and type `youtube-embed`.
5. WHEN the page reloads, THE App SHALL restore and render all persisted YouTube embed items in the Songs section.

### Requirement 7: Photo Tagging

**User Story:** As a user in Edit Mode, I want to click on a photo to place name tags at specific positions, so that I can label people or objects in my photos.

#### Acceptance Criteria

1. WHILE Edit_Mode is active, WHEN the user clicks on a photo image (not on an existing tag), THE App SHALL prompt the user to enter a tag name via an inline input at the click position.
2. WHEN the user submits a non-empty tag name, THE App SHALL create a Photo_Tag at the click coordinates (stored as percentage of image width and height) with the entered name.
3. THE App SHALL persist all Photo_Tags in localStorage under the key `photo_tags` keyed by photo item ID, storing an array of objects with `x` (percentage), `y` (percentage), and `name` fields.
4. WHILE Edit_Mode is active, THE App SHALL display all Photo_Tags as visible labels positioned at their stored coordinates on the photo.
5. WHILE Edit_Mode is not active, THE App SHALL hide Photo_Tags by default and display them only when the user hovers over the photo.
6. WHILE Edit_Mode is active, WHEN the user clicks on an existing Photo_Tag, THE App SHALL allow the user to edit the tag name or delete the tag.
7. FOR ALL Photo_Tag coordinate values, the stored `x` SHALL be between 0 and 100, and the stored `y` SHALL be between 0 and 100.
8. FOR ALL Photo_Tags stored per photo, serializing to JSON then deserializing SHALL produce an equivalent array of tag objects (round-trip property).

### Requirement 8: Undo/Redo History

**User Story:** As a user in Edit Mode, I want to undo and redo my edit operations, so that I can safely experiment with changes and revert mistakes.

#### Acceptance Criteria

1. WHILE Edit_Mode is active, THE App SHALL maintain a History_Stack that records each Edit_Operation (inline edits, color changes, layout changes, pin/unpin, hide/show, reorder, filter/frame changes, tag additions/deletions).
2. WHILE Edit_Mode is active, THE App SHALL display Undo and Redo buttons in the Edit Mode toolbar area.
3. WHEN the user clicks the Undo button or presses Ctrl+Z, THE App SHALL revert the most recent Edit_Operation by restoring the previous value and updating both the DOM and localStorage.
4. WHEN the user clicks the Redo button or presses Ctrl+Y, THE App SHALL re-apply the most recently undone Edit_Operation by restoring the new value and updating both the DOM and localStorage.
5. WHEN the user performs a new Edit_Operation after undoing one or more operations, THE App SHALL clear the redo portion of the History_Stack (redo history is lost on new edits).
6. WHEN Edit_Mode is deactivated, THE App SHALL clear the History_Stack (undo/redo history does not persist across Edit Mode sessions).
7. WHEN the History_Stack is empty (no operations to undo), THE Undo button SHALL be visually disabled.
8. WHEN there are no undone operations to redo, THE Redo button SHALL be visually disabled.
9. FOR ALL undo operations, applying undo then redo SHALL restore the state to the value before undo was applied (round-trip property).

### Requirement 9: Import/Export Settings

**User Story:** As a user, I want to export all my customizations to a JSON file and import them back, so that I can back up my settings or transfer them to another browser.

#### Acceptance Criteria

1. THE App SHALL display an "Export Settings" button in the Edit Mode toolbar area.
2. WHEN the user clicks "Export Settings", THE App SHALL collect all localStorage customization keys (section_titles, section_colors, section_order, section_layouts, section_columns, hidden_sections, pinned_items, item_notes, song_renames, photo_renames, photo_filters, photo_frames, photo_tags, video_thumbnails, song_thumbnails, custom_sections, developer_mode_order, added_items, deleted_items) into a single JSON object.
3. WHEN the export data is assembled, THE App SHALL trigger a browser file download with the filename `birthday-settings-{YYYY-MM-DD}.json` containing the JSON data.
4. THE App SHALL display an "Import Settings" button in the Edit Mode toolbar area.
5. WHEN the user clicks "Import Settings", THE App SHALL open a file picker filtered to `.json` files.
6. WHEN the user selects a valid JSON file, THE App SHALL parse the file and write each key-value pair to localStorage, overwriting existing values.
7. WHEN import completes, THE App SHALL reload the page to apply all imported settings.
8. IF the selected file contains invalid JSON, THEN THE App SHALL display an error message indicating the file format is invalid and make no changes to localStorage.
9. FOR ALL valid Settings_Export JSON objects, exporting then importing SHALL produce an equivalent localStorage state (round-trip property).

### Requirement 10: Section Templates (Custom Sections)

**User Story:** As a user in Edit Mode, I want to create new custom sections with a configurable title, layout, and item type, so that I can extend the page with categories like "Favorite Movies" or "Bucket List".

#### Acceptance Criteria

1. WHILE Edit_Mode is active, THE App SHALL display an "Add Section" button below the existing sections.
2. WHEN the user clicks "Add Section", THE App SHALL display a creation form with fields for: section title (required text input), layout mode (grid or list radio buttons), and item type (text, image, or link radio buttons).
3. WHEN the user submits the creation form with a non-empty title, THE App SHALL create a new Custom_Section with a generated unique ID, the specified title, layout mode, and item type.
4. THE App SHALL persist Custom_Sections in localStorage under the key `custom_sections` as an array of section definition objects (id, title, layout, itemType, items).
5. WHEN the page loads, THE App SHALL render all persisted Custom_Sections after the built-in sections, each with the configured layout and an empty items area with an Add_Button.
6. WHILE Edit_Mode is active, WHEN the user clicks the Add_Button in a Custom_Section, THE App SHALL allow adding items of the configured type (text input for text items, file picker or URL for image items, URL input for link items).
7. THE App SHALL persist items added to Custom_Sections within the `custom_sections` localStorage entry under the corresponding section's `items` array.
8. WHILE Edit_Mode is active, THE App SHALL display a "Delete Section" button on each Custom_Section that removes the section and its data from localStorage after confirmation.
9. WHEN a Custom_Section is deleted, THE App SHALL remove the section from the DOM and from the `custom_sections` localStorage entry.
10. Custom_Sections SHALL support the same Section_Settings_Panel features as built-in sections (color, ordering, hide/show, column count).

### Requirement 11: Rich Text Notes

**User Story:** As a user in Edit Mode, I want to format my item notes with bold, italic, links, and bullet lists, so that my notes are more expressive and readable.

#### Acceptance Criteria

1. WHILE Edit_Mode is active, WHEN the user clicks on a note area to edit it, THE App SHALL display a Rich_Text_Editor with a formatting toolbar containing buttons for Bold, Italic, Link, and Bullet List.
2. THE Rich_Text_Editor SHALL use a `contenteditable` div as the editing surface, supporting standard keyboard shortcuts (Ctrl+B for bold, Ctrl+I for italic).
3. WHEN the user clicks the Bold toolbar button, THE Rich_Text_Editor SHALL wrap the selected text in `<strong>` tags or toggle bold on the current selection.
4. WHEN the user clicks the Italic toolbar button, THE Rich_Text_Editor SHALL wrap the selected text in `<em>` tags or toggle italic on the current selection.
5. WHEN the user clicks the Link toolbar button, THE Rich_Text_Editor SHALL prompt for a URL and wrap the selected text in an `<a>` tag with the provided URL.
6. WHEN the user clicks the Bullet List toolbar button, THE Rich_Text_Editor SHALL convert the current line or selection into an unordered list (`<ul><li>...</li></ul>`).
7. WHEN the user saves the note (clicks outside or presses Escape then confirms), THE App SHALL persist the note as an HTML string in localStorage under the key `item_notes` keyed by item ID.
8. WHEN the page loads, THE App SHALL render saved rich text notes as formatted HTML (not raw HTML source).
9. WHILE Edit_Mode is not active, rich text notes SHALL be displayed as formatted read-only HTML.
10. THE Rich_Text_Editor SHALL sanitize pasted content to allow only `<strong>`, `<em>`, `<a>`, `<ul>`, `<li>`, `<br>` tags, stripping all other HTML tags and attributes (except `href` on `<a>` tags).
11. FOR ALL rich text note content, the stored HTML SHALL contain only the allowed tags listed in criterion 10.
