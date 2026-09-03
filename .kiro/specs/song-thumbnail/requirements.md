# Requirements Document

## Introduction

This feature adds the ability for users to set a custom thumbnail/cover image for any song in the Songs section. Currently, songs display either a hardcoded Unsplash cover image or a default fallback. With this feature, users can click on a song's thumbnail while Edit Mode is active to replace it with a custom image (uploaded file or URL). Custom thumbnails persist via localStorage and are displayed on the song card.

## Glossary

- **Thumbnail_Editor**: The UI component (modal/popover) that allows the user to provide a new cover image for a song, either by uploading a file or entering an image URL.
- **Song_Card**: The rendered DOM element representing a single song, including its cover image, name, artist, and playback controls.
- **MediaManager**: The central JavaScript module that manages media items across all sections, handling storage in both server and local modes.
- **Edit_Mode**: The application state toggled via the "🛠️ Edit Mode" checkbox, which enables editing capabilities such as reordering and deletion.
- **Cover_Image**: The thumbnail image displayed on a Song_Card, stored in the song's `metadata.coverImage` field.
- **Thumbnail_Overlay**: A visual indicator shown on the song cover image when Edit Mode is active, signaling that the thumbnail is clickable/editable.

## Requirements

### Requirement 1: Thumbnail Edit Trigger

**User Story:** As a user, I want to click on a song's cover image while Edit Mode is active, so that I can change the thumbnail to a custom image.

#### Acceptance Criteria

1. WHILE Edit_Mode is active, THE Thumbnail_Overlay SHALL be displayed on each Song_Card cover image to indicate editability.
2. WHILE Edit_Mode is active, WHEN the user clicks on a Song_Card cover image, THE Thumbnail_Editor SHALL open for that song.
3. WHILE Edit_Mode is not active, WHEN the user clicks on a Song_Card cover image, THE system SHALL not open the Thumbnail_Editor.

### Requirement 2: Thumbnail Image Upload

**User Story:** As a user, I want to upload an image file as a song's thumbnail, so that I can use my own photos as cover art.

#### Acceptance Criteria

1. WHEN the user selects a file in the Thumbnail_Editor, THE Thumbnail_Editor SHALL accept only image files with MIME types: image/jpeg, image/png, image/gif, image/webp, image/avif.
2. WHEN the user selects a valid image file, THE system SHALL read the file and store it as a data URL in the song's metadata.coverImage field.
3. IF the user selects a file with a disallowed MIME type, THEN THE Thumbnail_Editor SHALL display an error message indicating the file type is not supported.

### Requirement 3: Thumbnail Image URL

**User Story:** As a user, I want to provide an image URL as a song's thumbnail, so that I can use images from the web without downloading them first.

#### Acceptance Criteria

1. THE Thumbnail_Editor SHALL provide a text input for entering an image URL.
2. WHEN the user submits a valid http:// or https:// URL, THE system SHALL set the song's metadata.coverImage field to that URL.
3. IF the user submits an invalid URL (not http:// or https://), THEN THE Thumbnail_Editor SHALL display an error message indicating the URL is invalid.

### Requirement 4: Thumbnail Persistence

**User Story:** As a user, I want my custom thumbnails to persist across page reloads, so that I do not lose my customizations.

#### Acceptance Criteria

1. WHEN the user sets a custom thumbnail, THE MediaManager SHALL save the updated coverImage in localStorage.
2. WHEN the page loads, THE Song_Card SHALL display the persisted custom coverImage from localStorage for each song that has one.
3. THE system SHALL store custom thumbnails in a dedicated localStorage key separate from the media_manager_added store.

### Requirement 5: Thumbnail Display

**User Story:** As a user, I want to see my custom thumbnail displayed on the song card, so that I can visually identify songs by their cover art.

#### Acceptance Criteria

1. WHEN a song has a custom coverImage set, THE Song_Card SHALL display the custom image as the cover instead of the default Unsplash image.
2. IF a custom coverImage fails to load (broken URL or corrupted data), THEN THE Song_Card SHALL fall back to the default cover image.
3. WHEN the user sets a new thumbnail via the Thumbnail_Editor, THE Song_Card SHALL immediately update to display the new image without requiring a page reload.

### Requirement 6: Thumbnail Reset

**User Story:** As a user, I want to reset a song's thumbnail back to its original default, so that I can undo a custom thumbnail if I change my mind.

#### Acceptance Criteria

1. THE Thumbnail_Editor SHALL provide a "Reset to Default" option.
2. WHEN the user selects "Reset to Default", THE system SHALL remove the custom coverImage from localStorage for that song.
3. WHEN the custom coverImage is removed, THE Song_Card SHALL revert to displaying the original default cover image.
