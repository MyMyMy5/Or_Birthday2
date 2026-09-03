# Requirements Document

## Introduction

This feature adds a second media-input method — pasting a URL — alongside the existing file-upload-from-disk flow. Every section in the app (Photos, Songs, Things You Like, Funny Moments) will let users add media by providing a web URL (image URL, audio stream URL, or YouTube video URL). URL-added items are stored, displayed, deleted, and restored using the same MediaManager pipeline as file-uploaded items.

## Glossary

- **App**: The birthday memories web application consisting of `index.html`, `script.js`, `media-manager.js`, `styles.css`, and `server.js`.
- **Section**: One of the four media areas in the App: Photos, Songs, Things You Like, or Funny Moments.
- **MediaManager**: The central JavaScript module (`media-manager.js`) that manages adding, deleting, restoring, and listing media items across all Sections.
- **Add_Button**: The "+" card rendered at the end of each Section's grid that triggers the media-add flow.
- **Add_Menu**: A small popup or dropdown presented when the user clicks the Add_Button, offering the choice between "Add from disk" and "Add via URL".
- **URL_Prompt**: A dialog or inline input that collects a URL string from the user after the user selects "Add via URL" from the Add_Menu.
- **Media_Item**: The internal data object representing a single piece of media, containing id, section, source, caption, type, origin, and metadata fields.
- **URL_Media_Item**: A Media_Item whose source field contains an external URL (starting with `http://` or `https://`) and whose origin is `url-added`.
- **YouTube_URL**: A URL matching the patterns `https://www.youtube.com/watch?v=VIDEO_ID`, `https://youtu.be/VIDEO_ID`, or `https://youtube.com/shorts/VIDEO_ID`.
- **Image_URL**: A URL pointing to a web-hosted image resource (e.g., ending in `.jpg`, `.png`, `.gif`, `.webp`, `.avif`, or served with an image MIME type).
- **Audio_URL**: A URL pointing to a web-hosted audio resource (e.g., ending in `.mp3`, `.wav`, `.ogg`, or a streaming audio endpoint).
- **Server_Mode**: The App's operating mode when the Express backend (`server.js`) is reachable, where files are stored on disk.
- **Local_Mode**: The App's fallback operating mode where data is stored in the browser's localStorage as Data URLs or URL strings.
- **Video_ID**: The unique identifier extracted from a YouTube_URL, used to construct embed and thumbnail URLs.

## Requirements

### Requirement 1: Add Menu on Add Button Click

**User Story:** As a user, I want the "+" button to show a choice between adding from disk and adding via URL, so that I can pick the input method that suits me.

#### Acceptance Criteria

1. WHEN the user clicks the Add_Button in any Section, THE App SHALL display the Add_Menu with exactly two options: "Add from disk" and "Add via URL".
2. WHEN the user selects "Add from disk" from the Add_Menu, THE App SHALL open the existing file picker dialog for that Section.
3. WHEN the user selects "Add via URL" from the Add_Menu, THE App SHALL display the URL_Prompt for that Section.
4. WHEN the user clicks outside the Add_Menu without selecting an option, THE App SHALL close the Add_Menu without performing any action.

### Requirement 2: URL Prompt Input

**User Story:** As a user, I want a simple input to paste a URL and optionally provide a caption, so that I can add web-hosted media quickly.

#### Acceptance Criteria

1. WHEN the URL_Prompt is displayed, THE App SHALL present a text input field for the URL and an optional text input field for a caption.
2. WHEN the user submits the URL_Prompt with a non-empty URL, THE App SHALL pass the URL and caption to the MediaManager for processing.
3. WHEN the user submits the URL_Prompt with an empty URL, THE App SHALL close the URL_Prompt without adding any Media_Item.
4. WHEN the user cancels the URL_Prompt, THE App SHALL close the URL_Prompt without adding any Media_Item.

### Requirement 3: YouTube URL Detection and Parsing

**User Story:** As a user, I want to paste a YouTube link and have the app automatically recognize it as a video, so that I do not need to manually extract the video ID.

#### Acceptance Criteria

1. WHEN the user submits a YouTube_URL in the URL_Prompt for the Photos, Things You Like, or Funny Moments Section, THE MediaManager SHALL extract the Video_ID from the YouTube_URL.
2. THE MediaManager SHALL recognize YouTube_URLs in the following formats: `https://www.youtube.com/watch?v=VIDEO_ID`, `https://youtu.be/VIDEO_ID`, `https://youtube.com/shorts/VIDEO_ID`, and variants with or without `www.` prefix and with additional query parameters.
3. WHEN a valid Video_ID is extracted, THE MediaManager SHALL create a URL_Media_Item with type `video` and metadata containing the extracted Video_ID.
4. IF the submitted URL matches a YouTube_URL pattern but contains no valid Video_ID, THEN THE App SHALL display an error message indicating the YouTube URL is invalid.

### Requirement 4: Image URL Handling for Image Sections

**User Story:** As a user, I want to paste an image URL in the Photos, Things You Like, or Funny Moments section, so that I can add web-hosted images without downloading them first.

#### Acceptance Criteria

1. WHEN the user submits a non-YouTube URL in the URL_Prompt for the Photos, Things You Like, or Funny Moments Section, THE MediaManager SHALL create a URL_Media_Item with type `image` and the submitted URL as the source.
2. THE App SHALL render URL_Media_Items of type `image` using an `<img>` element with the source URL as the `src` attribute.
3. WHEN the user clicks a rendered URL_Media_Item image, THE App SHALL open the image in the existing image modal.

### Requirement 5: Audio URL Handling for Songs Section

**User Story:** As a user, I want to paste an audio URL in the Songs section, so that I can add web-hosted audio tracks or streams.

#### Acceptance Criteria

1. WHEN the user submits a URL in the URL_Prompt for the Songs Section, THE MediaManager SHALL create a URL_Media_Item with type `audio` and the submitted URL as the source.
2. THE App SHALL render URL_Media_Items of type `audio` as song cards with a functional audio player using the source URL.
3. WHEN the user provides a caption in the URL_Prompt for the Songs Section, THE MediaManager SHALL use the caption as the song name in the URL_Media_Item.
4. WHEN the user does not provide a caption in the URL_Prompt for the Songs Section, THE MediaManager SHALL derive a display name from the URL (e.g., the filename portion of the URL path).

### Requirement 6: URL Media Persistence in Local Mode

**User Story:** As a user in local mode, I want URL-added items to persist across page reloads, so that I do not lose my added media.

#### Acceptance Criteria

1. WHILE the App is in Local_Mode, THE MediaManager SHALL store URL_Media_Items in the localStorage added-items store with origin set to `url-added`.
2. WHILE the App is in Local_Mode, THE MediaManager SHALL include URL_Media_Items when listing media items for a Section via `getMediaItems`.
3. FOR ALL URL_Media_Items stored in Local_Mode, serializing to JSON then deserializing from JSON SHALL produce an equivalent URL_Media_Item (round-trip property).

### Requirement 7: URL Media Persistence in Server Mode

**User Story:** As a user in server mode, I want URL-added items to persist across page reloads, so that I do not lose my added media.

#### Acceptance Criteria

1. WHILE the App is in Server_Mode, THE MediaManager SHALL store URL_Media_Items in a persistent store (localStorage or a server-side JSON file) separate from the file-based media.
2. WHILE the App is in Server_Mode, THE MediaManager SHALL merge URL_Media_Items with file-based items when listing media items for a Section via `getMediaItems`.
3. WHEN the App reloads in Server_Mode, THE MediaManager SHALL restore all previously added URL_Media_Items.

### Requirement 8: Deleting URL Media Items

**User Story:** As a user, I want to delete URL-added items the same way I delete file-uploaded items, so that the experience is consistent.

#### Acceptance Criteria

1. THE App SHALL display a delete button on every rendered URL_Media_Item, identical in appearance and position to the delete button on file-uploaded items.
2. WHEN the user clicks the delete button on a URL_Media_Item, THE MediaManager SHALL remove the URL_Media_Item from the active items list for that Section.
3. WHEN a URL_Media_Item is deleted, THE MediaManager SHALL add the URL_Media_Item to the trash store with a `deletedAt` timestamp.
4. WHEN a URL_Media_Item is deleted, THE App SHALL re-render the Section without the deleted URL_Media_Item.

### Requirement 9: Restoring URL Media Items

**User Story:** As a user, I want to restore deleted URL-added items from the trash, so that I can recover accidentally removed media.

#### Acceptance Criteria

1. WHEN the user opens the trash view, THE App SHALL display deleted URL_Media_Items alongside deleted file-uploaded items.
2. WHEN the user restores a deleted URL_Media_Item, THE MediaManager SHALL remove the URL_Media_Item from the trash store and re-add the URL_Media_Item to the active items list for the original Section.
3. WHEN a URL_Media_Item is restored, THE App SHALL re-render the original Section including the restored URL_Media_Item.

### Requirement 10: URL Media Items Display Alongside Existing Items

**User Story:** As a user, I want URL-added items to appear in the same grid as file-uploaded and hardcoded items, so that all media in a section is presented together.

#### Acceptance Criteria

1. THE App SHALL render URL_Media_Items in the same grid or container as hardcoded and file-uploaded items for each Section.
2. THE App SHALL render YouTube video URL_Media_Items in the Funny Moments Section using the same YouTube embed placeholder and click-to-play behavior as hardcoded YouTube videos.
3. THE App SHALL render YouTube video URL_Media_Items in the Photos and Things You Like Sections using the YouTube thumbnail as a clickable image that opens the video in a new browser tab or an embedded player.

### Requirement 11: URL Validation

**User Story:** As a user, I want the app to validate my URL input, so that I receive clear feedback when I enter an invalid URL.

#### Acceptance Criteria

1. WHEN the user submits a URL in the URL_Prompt, THE App SHALL verify that the URL starts with `http://` or `https://`.
2. IF the submitted URL does not start with `http://` or `https://`, THEN THE App SHALL display an error message indicating the URL must be a valid web address.
3. IF the submitted URL is not a well-formed URL, THEN THE App SHALL display an error message indicating the URL format is invalid.
