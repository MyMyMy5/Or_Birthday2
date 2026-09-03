# Requirements Document

## Introduction

This feature adds UI-based media management to the birthday website, enabling users to add and delete images and songs across all media sections (Photos, Things You Like, Funny Moments, Songs) without editing code. The system uses a hybrid approach: when a local Node.js server is running, media files are physically saved to and deleted from disk directories; when no server is available, the system falls back to localStorage with base64 data URLs. Deleted items are moved to a `Deleted/` directory on disk (server mode) or tracked in localStorage (fallback mode), and can be restored.

## Glossary

- **Media_Manager**: The client-side JavaScript module responsible for adding, deleting, restoring, and persisting media items across all sections. It detects whether the Local_Server is available and chooses the appropriate storage strategy.
- **Local_Server**: A lightweight Node.js/Express server that handles file upload, file deletion (move to Deleted directory), file restoration, and serves the static site. It exposes a REST API consumed by the Media_Manager.
- **Trash_Store**: A collection of deleted media items. In server mode, deleted files are moved to the `Deleted/` directory on disk. In fallback mode, deletion records are stored in localStorage.
- **Media_Item**: A single image or song entry, consisting of a source (file path or data URL), a caption/title, and metadata identifying its section.
- **Section**: One of the four media areas on the page: Photos, Things You Like, Funny Moments, or Songs.
- **Data_URL**: A base64-encoded representation of a file, used to store user-added media in localStorage when the Local_Server is unavailable.
- **Delete_Button**: An overlay button (×) that appears on hover over a media card, allowing the user to remove that item.
- **Add_Button**: A persistent button (+) within each section that opens a file picker for adding new media.
- **Drop_Zone**: A designated area within each section that accepts files dragged from the user's file system.
- **Media_Store**: In server mode, the actual file system directories (`Images/Memories/`, `Images/Liked_Things/`, `Songs/`, etc.). In fallback mode, a localStorage-backed collection that holds user-added media items as data URLs.
- **Deleted_Directory**: A `Deleted/` directory on disk where the Local_Server moves deleted files, organized by sub-directories matching the original section paths.

## Requirements

### Requirement 1: Delete Images via Hover Button

**User Story:** As a user, I want to see a delete button when I hover over any image card, so that I can remove images I no longer want displayed.

#### Acceptance Criteria

1. WHEN the user hovers over an image card in the Photos section, THE Media_Manager SHALL display a Delete_Button overlay in the top-right corner of the card.
2. WHEN the user hovers over an image card in the Things You Like section, THE Media_Manager SHALL display a Delete_Button overlay in the top-right corner of the card.
3. WHEN the user hovers over a media card in the Funny Moments section, THE Media_Manager SHALL display a Delete_Button overlay in the top-right corner of the card.
4. WHEN the user moves the cursor away from a media card, THE Media_Manager SHALL hide the Delete_Button overlay.
5. WHEN the user clicks the Delete_Button on an image card, THE Media_Manager SHALL remove the Media_Item from the rendered section.
6. WHILE the Local_Server is available, WHEN the user clicks the Delete_Button on an image card, THE Media_Manager SHALL send a delete request to the Local_Server, which moves the file to the Deleted_Directory.
7. WHILE the Local_Server is unavailable, WHEN the user clicks the Delete_Button on an image card, THE Media_Manager SHALL add the Media_Item to the Trash_Store in localStorage.
8. WHEN the page is reloaded after a deletion, THE Media_Manager SHALL exclude deleted Media_Items from the rendered section.

### Requirement 2: Delete Songs via Hover Button

**User Story:** As a user, I want to delete songs from the Songs section, so that I can manage my playlist through the UI.

#### Acceptance Criteria

1. WHEN the user hovers over a song card in the Songs section, THE Media_Manager SHALL display a Delete_Button overlay on the card.
2. WHEN the user clicks the Delete_Button on a song card, THE Media_Manager SHALL stop playback if that song is currently playing.
3. WHEN the user clicks the Delete_Button on a song card, THE Media_Manager SHALL remove the song from the rendered Songs section.
4. WHILE the Local_Server is available, WHEN the user clicks the Delete_Button on a song card, THE Media_Manager SHALL send a delete request to the Local_Server, which moves the audio file to the Deleted_Directory.
5. WHILE the Local_Server is unavailable, WHEN the user clicks the Delete_Button on a song card, THE Media_Manager SHALL add the song to the Trash_Store in localStorage.
6. WHEN the page is reloaded after a song deletion, THE Media_Manager SHALL exclude deleted songs from the rendered Songs section.

### Requirement 3: Trash Store and Restore

**User Story:** As a user, I want deleted items to be recoverable, so that I can undo accidental deletions.

#### Acceptance Criteria

1. WHILE the Local_Server is available, WHEN a Media_Item is deleted, THE Local_Server SHALL move the file to the Deleted_Directory, preserving the original sub-directory structure.
2. WHILE the Local_Server is unavailable, THE Media_Manager SHALL persist the Trash_Store as a JSON array in localStorage under a dedicated key.
3. WHEN a Media_Item is added to the Trash_Store, THE Media_Manager SHALL record the item's original section, source, caption/title, and a timestamp.
4. WHILE the Local_Server is available, WHEN the user triggers a restore action, THE Local_Server SHALL move the file from the Deleted_Directory back to its original directory.
5. WHILE the Local_Server is unavailable, WHEN the user triggers a restore action, THE Media_Manager SHALL remove the item from the localStorage Trash_Store and re-add it to its original section data.
6. WHEN a Media_Item is restored, THE Media_Manager SHALL re-render the corresponding section to include the restored item.
7. FOR ALL valid Trash_Store entries, serializing to JSON then deserializing SHALL produce an equivalent object (round-trip property).

### Requirement 4: Add Images via File Picker

**User Story:** As a user, I want to click a plus button in each image section to add new images, so that I can expand my collection through the UI.

#### Acceptance Criteria

1. THE Media_Manager SHALL display an Add_Button within the Photos section grid.
2. THE Media_Manager SHALL display an Add_Button within the Things You Like section grid.
3. THE Media_Manager SHALL display an Add_Button within the Funny Moments section grid.
4. WHEN the user clicks the Add_Button in an image section, THE Media_Manager SHALL open a file picker dialog filtered to image file types (JPEG, PNG, GIF, WebP, AVIF, JFIF).
5. WHILE the Local_Server is available, WHEN the user selects one or more image files, THE Media_Manager SHALL upload each file to the Local_Server, which saves it to the corresponding section directory on disk.
6. WHILE the Local_Server is unavailable, WHEN the user selects one or more image files, THE Media_Manager SHALL convert each file to a Data_URL using the FileReader API and store it in localStorage.
7. WHEN a new image is added, THE Media_Manager SHALL re-render the section to display the new image immediately.
8. WHEN the page is reloaded after adding images, THE Media_Manager SHALL render both the original hardcoded images and the user-added images.

### Requirement 5: Add Songs via File Picker

**User Story:** As a user, I want to click a plus button in the Songs section to add new songs, so that I can expand my playlist through the UI.

#### Acceptance Criteria

1. THE Media_Manager SHALL display an Add_Button within the Songs section.
2. WHEN the user clicks the Add_Button in the Songs section, THE Media_Manager SHALL open a file picker dialog filtered to audio file types (MP3, WAV, OGG, M4A).
3. WHILE the Local_Server is available, WHEN the user selects one or more audio files, THE Media_Manager SHALL upload each file to the Local_Server, which saves it to the `Songs/` directory on disk.
4. WHILE the Local_Server is unavailable, WHEN the user selects one or more audio files, THE Media_Manager SHALL convert each file to a Data_URL using the FileReader API and store it in localStorage.
5. WHEN a new song is added, THE Media_Manager SHALL create a song entry with the file name (without extension) as the song name and "User Added" as the artist.
6. WHEN a new song is added, THE Media_Manager SHALL re-render the Songs section to include the new song card immediately.
7. WHEN the page is reloaded after adding songs, THE Media_Manager SHALL render both the original hardcoded songs and the user-added songs.

### Requirement 6: Drag and Drop for Images

**User Story:** As a user, I want to drag and drop image files onto a section to add them, so that I have a quick and intuitive way to add media.

#### Acceptance Criteria

1. WHEN the user drags a file over an image section (Photos, Things You Like, or Funny Moments), THE Media_Manager SHALL display a visual Drop_Zone indicator on the section.
2. WHEN the user drops one or more image files onto the Drop_Zone, THE Media_Manager SHALL process each file using the same add logic as the file picker (server upload or localStorage Data_URL).
3. WHEN files are dropped, THE Media_Manager SHALL re-render the section to display the new images immediately.
4. IF the user drops a non-image file onto an image section Drop_Zone, THEN THE Media_Manager SHALL ignore the file and display no error.
5. WHEN the user drags a file away from the section without dropping, THE Media_Manager SHALL remove the Drop_Zone visual indicator.

### Requirement 7: Drag and Drop for Songs

**User Story:** As a user, I want to drag and drop audio files onto the Songs section to add them, so that adding songs is quick and intuitive.

#### Acceptance Criteria

1. WHEN the user drags a file over the Songs section, THE Media_Manager SHALL display a visual Drop_Zone indicator on the section.
2. WHEN the user drops one or more audio files onto the Songs section Drop_Zone, THE Media_Manager SHALL process each file using the same add logic as the file picker (server upload or localStorage Data_URL).
3. WHEN audio files are dropped, THE Media_Manager SHALL re-render the Songs section to include the new song cards immediately.
4. IF the user drops a non-audio file onto the Songs section Drop_Zone, THEN THE Media_Manager SHALL ignore the file and display no error.
5. WHEN the user drags a file away from the Songs section without dropping, THE Media_Manager SHALL remove the Drop_Zone visual indicator.

### Requirement 8: Local Server API

**User Story:** As a user, I want a simple local server that handles file operations, so that my media changes are saved to disk.

#### Acceptance Criteria

1. THE Local_Server SHALL serve the static site files (HTML, CSS, JS, images, songs) from the project root directory.
2. THE Local_Server SHALL expose a POST endpoint for uploading files to a specified section directory.
3. THE Local_Server SHALL expose a DELETE endpoint that moves a specified file from its section directory to the Deleted_Directory.
4. THE Local_Server SHALL expose a POST endpoint for restoring a file from the Deleted_Directory back to its original section directory.
5. THE Local_Server SHALL expose a GET endpoint that lists files in the Deleted_Directory for the trash/restore UI.
6. THE Local_Server SHALL expose a GET endpoint that lists media files in each section directory, so the client can discover files on disk dynamically.
7. IF the Local_Server receives a request for a file that does not exist, THEN THE Local_Server SHALL return an appropriate HTTP error status code with a descriptive message.
8. THE Local_Server SHALL validate that uploaded files have allowed MIME types (image or audio) before saving them to disk.

### Requirement 9: Server Availability Detection

**User Story:** As a user, I want the site to work whether or not the server is running, so that I can always view and manage my media.

#### Acceptance Criteria

1. WHEN the page loads, THE Media_Manager SHALL send a health-check request to the Local_Server.
2. WHEN the health-check request succeeds, THE Media_Manager SHALL use server-based file operations for all add, delete, and restore actions.
3. WHEN the health-check request fails or times out, THE Media_Manager SHALL fall back to localStorage-based operations for all add, delete, and restore actions.
4. THE Media_Manager SHALL complete the health-check detection within 2 seconds of page load.
5. WHILE in fallback mode, THE Media_Manager SHALL provide the same UI experience (Add_Button, Delete_Button, Drop_Zone, trash/restore) as in server mode.

### Requirement 10: Persistence and Data Integrity

**User Story:** As a user, I want my additions and deletions to persist across page reloads, so that my changes are not lost.

#### Acceptance Criteria

1. WHILE the Local_Server is available, WHEN the page loads, THE Media_Manager SHALL fetch the current file listings from the server to render each section.
2. WHILE the Local_Server is unavailable, WHEN the page loads, THE Media_Manager SHALL merge the original hardcoded arrays with user-added items from localStorage, excluding items present in the localStorage Trash_Store.
3. FOR ALL valid Media_Store entries, serializing to JSON then deserializing SHALL produce an equivalent object (round-trip property).
4. IF localStorage is unavailable or throws an error while in fallback mode, THEN THE Media_Manager SHALL render only the hardcoded arrays without user additions or deletions.
