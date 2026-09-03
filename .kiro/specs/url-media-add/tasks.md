# Implementation Tasks

## Task 1: Add URL utility functions and `addMediaByUrl` to MediaManager
- [x] 1.1 In `media-manager.js`, add the `_isValidUrl(str)` internal helper function inside the IIFE that checks the string starts with `http://` or `https://` and is parseable by `new URL()`. #[[.kiro/specs/url-media-add/requirements.md]] Requirement 11
- [x] 1.2 In `media-manager.js`, add the `_parseYouTubeUrl(url)` internal helper function inside the IIFE that extracts a YouTube video ID from supported URL formats (youtube.com/watch, youtu.be, youtube.com/shorts) using a regex. Returns `{ videoId: string }` or `null`. #[[.kiro/specs/url-media-add/requirements.md]] Requirement 3
- [x] 1.3 In `media-manager.js`, add the `addMediaByUrl(section, url, caption)` public method to the MediaManager object. This method validates the URL, detects YouTube URLs for image sections, creates a MediaItem with `origin: 'url-added'`, stores it in the localStorage added-items store, and fires section callbacks. For Songs section, creates audio type. For image sections with YouTube URL, creates video type with videoId metadata. For image sections with non-YouTube URL, creates image type. #[[.kiro/specs/url-media-add/requirements.md]] Requirements 2, 3, 4, 5

## Task 2: Modify `getMediaItems` to include URL-added items in server mode
- [x] 2.1 In `media-manager.js`, modify the `getMediaItems` method's server mode path to also read URL-added items from localStorage (filtered by section and `origin === 'url-added'`) and append them to the merged result of server files + hardcoded non-file items. #[[.kiro/specs/url-media-add/requirements.md]] Requirement 7

## Task 3: Modify `deleteMedia` and `restoreMedia` for URL-added items
- [x] 3.1 In `media-manager.js`, modify `deleteMedia` so that when in server mode and the item has `origin === 'url-added'`, it uses the localStorage trash flow instead of sending a server DELETE request. Remove the item from the localStorage added store and add it to the trash store. #[[.kiro/specs/url-media-add/requirements.md]] Requirement 8
- [x] 3.2 In `media-manager.js`, modify `restoreMedia` so that when in server mode and the trash entry has `origin === 'url-added'`, it uses the localStorage restore flow instead of sending a server POST restore request. Remove from trash and re-add to the added store. #[[.kiro/specs/url-media-add/requirements.md]] Requirement 9

## Task 4: Build the Add Menu UI component
- [x] 4.1 In `script.js`, create a reusable `createAddMenu(section, fileAccept, onRefresh)` function that replaces the current direct file-picker click on each `add-btn-card`. The function should create a small dropdown menu with two options: "📁 Add from disk" (triggers existing file picker) and "🔗 Add via URL" (opens the URL prompt modal). The menu should close when clicking outside. #[[.kiro/specs/url-media-add/requirements.md]] Requirement 1
- [x] 4.2 Update `populatePhotos`, `populateSongs`, `populateLikes`, and `populateFunnyMoments` to use `createAddMenu` instead of the current direct file-input click handler on the add button card. #[[.kiro/specs/url-media-add/requirements.md]] Requirement 1

## Task 5: Build the URL Prompt modal
- [x] 5.1 In `script.js`, create a `showUrlPrompt(section)` function that displays a modal overlay with a URL text input, an optional caption text input, Add and Cancel buttons, and an error message area. On submit, validate the URL using `MediaManager.addMediaByUrl`, show errors for invalid URLs, and close on success or cancel. #[[.kiro/specs/url-media-add/requirements.md]] Requirements 2, 11
- [x] 5.2 In `styles.css`, add styles for the Add Menu (`.add-menu`, `.add-menu-option`) and URL Prompt modal (`.url-prompt-modal`, `.url-prompt-content`, `.url-input`, `.caption-input`, `.url-error`, `.url-prompt-actions`, `.url-cancel-btn`, `.url-add-btn`). Style them to match the existing app aesthetic (pink theme, rounded corners, soft shadows). #[[.kiro/specs/url-media-add/requirements.md]] Requirements 1, 2

## Task 6: Update section renderers to handle YouTube videos in Photos and Things You Like
- [x] 6.1 In `script.js`, update `populatePhotos` to handle MediaItems with `type: 'video'` and `metadata.videoId` by rendering a YouTube thumbnail image that opens the video in a new tab or shows an embedded player on click. #[[.kiro/specs/url-media-add/requirements.md]] Requirement 10
- [x] 6.2 In `script.js`, update `populateLikes` to handle MediaItems with `type: 'video'` and `metadata.videoId` using the same YouTube thumbnail approach as Photos. #[[.kiro/specs/url-media-add/requirements.md]] Requirement 10

## Task 7: Update trash panel to display and restore URL-added items
- [x] 7.1 In `script.js`, update the trash panel's `renderTrashItems` function to include URL-added items from the localStorage trash store when in server mode (currently it only fetches from `GET /api/trash` in server mode, which won't include URL-added items). Merge server trash entries with localStorage trash entries that have `origin === 'url-added'`. #[[.kiro/specs/url-media-add/requirements.md]] Requirement 9

## Task 8: Write tests for URL utility functions and addMediaByUrl
- [x] 8.1 Create `tests/url-media-add.test.js` with tests for YouTube URL parsing covering all supported formats (youtube.com/watch, youtu.be, shorts, with/without www, with extra query params) and non-YouTube URLs returning null. #[[.kiro/specs/url-media-add/requirements.md]] Requirement 3
- [x] 8.2 Add tests for URL validation (`_isValidUrl`) covering valid http/https URLs, invalid URLs (no protocol, ftp://, malformed), and edge cases. #[[.kiro/specs/url-media-add/requirements.md]] Requirement 11
- [x] 8.3 Add tests for `addMediaByUrl` verifying correct MediaItem creation for image URLs, audio URLs, and YouTube URLs, including proper origin, type, and metadata fields. #[[.kiro/specs/url-media-add/requirements.md]] Requirements 3, 4, 5
- [x] 8.4 Add tests verifying URL-added items appear in `getMediaItems` results, can be deleted to trash, and can be restored from trash. #[[.kiro/specs/url-media-add/requirements.md]] Requirements 7, 8, 9

## Task 9: Run full test suite and verify no regressions
- [x] 9.1 Run `npx vitest run` to execute all existing and new tests, confirming no regressions in upload, delete, restore, trash, and property tests. #[[.kiro/specs/url-media-add/requirements.md]] All requirements
