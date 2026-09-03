# Implementation Plan: Media Management

## Overview

This plan implements UI-based media management for the birthday website. The approach is incremental: first set up the server and core data module, then wire in delete functionality, then add functionality (file picker + drag-and-drop), then trash/restore, and finally integrate everything with the existing render functions. Each step builds on the previous one and ends with wiring into the live site.

## Tasks

- [x] 1. Create the Media_Manager module with data models and storage abstraction
  - [x] 1.1 Create `media-manager.js` with MediaItem and TrashEntry data structures, Section constants, section-to-directory mapping, MIME type allow-lists, and localStorage key constants
    - Define the `MediaItem` and `TrashEntry` object shapes as documented in the design
    - Define the `Section` constants (`photos`, `thingsYouLike`, `funnyMoments`, `songs`) and the section-to-directory mapping
    - Define allowed MIME types for images and audio
    - Define localStorage keys (`media_manager_added`, `media_manager_trash`)
    - Export a `MediaManager` object with stub methods: `init()`, `getMode()`, `addMedia()`, `deleteMedia()`, `restoreMedia()`, `getMediaItems()`, `getTrashItems()`
    - _Requirements: 3.3, 3.7, 8.8, 10.3_

  - [x] 1.2 Implement health-check detection in `MediaManager.init()`
    - Send a GET request to `/api/health` with a 2-second timeout using `fetch` and `AbortController`
    - On success, set internal mode to `'server'`; on failure or timeout, set mode to `'local'`
    - Expose mode via `getMode()`
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 1.3 Implement localStorage read/write helpers for added items and trash store
    - `_readAdded()`: parse `media_manager_added` from localStorage, return `[]` on error
    - `_writeAdded(items)`: serialize and write to localStorage
    - `_readTrash()`: parse `media_manager_trash` from localStorage, return `[]` on error
    - `_writeTrash(items)`: serialize and write to localStorage
    - Handle `localStorage` unavailability gracefully (catch errors, return defaults)
    - _Requirements: 1.7, 2.5, 3.2, 10.2, 10.4_

  - [x] 1.4 Implement `getMediaItems(section)` for local mode
    - Merge the original hardcoded arrays (photos, songs, thingsYouLike, funnyMoments) with user-added items from localStorage
    - Exclude any items whose `id` appears in the trash store
    - Return the merged, filtered list
    - _Requirements: 1.8, 2.6, 4.8, 5.7, 10.2_

  - [x] 1.5 Write property test for JSON serialization round-trip (Property 4)
    - **Property 4: JSON serialization round-trip**
    - Generate random MediaItem and TrashEntry objects using fast-check arbitraries
    - Verify `JSON.parse(JSON.stringify(obj))` deeply equals the original
    - **Validates: Requirements 3.7, 10.3**

  - [x] 1.6 Write property test for merged list logic (Property 7)
    - **Property 7: Merged list on reload equals hardcoded plus added minus trashed**
    - Generate random sets of hardcoded items, user-added items, and trashed items
    - Verify `getMediaItems(section)` returns exactly hardcoded ∪ added − trashed
    - **Validates: Requirements 1.8, 2.6, 4.8, 5.7, 10.2**

- [x] 2. Create the Local Server with REST API
  - [x] 2.1 Create `server.js` with Express, static file serving, and the health endpoint
    - Set up Express app serving static files from the project root
    - Implement `GET /api/health` returning `{ status: 'ok' }`
    - Listen on a configurable port (default 3000)
    - _Requirements: 8.1, 9.1_

  - [x] 2.2 Implement the file listing endpoint `GET /api/media/:section`
    - Map section parameter to the correct directory using the section-to-directory mapping
    - Read the directory and return a JSON array of filenames
    - Return 404 if the section is unknown
    - _Requirements: 8.6, 10.1_

  - [x] 2.3 Implement the file upload endpoint `POST /api/media/:section` using multer
    - Accept multipart file uploads via multer
    - Validate MIME type against the allowed list for the target section
    - Save file to the correct section directory
    - Return 400 for invalid MIME types, 409 if file already exists, 404 for unknown section
    - _Requirements: 4.5, 5.3, 8.2, 8.8_

  - [x] 2.4 Implement the delete endpoint `DELETE /api/media/:section/:filename`
    - Move the file from its section directory to `Deleted/<section-path>/`
    - Create the `Deleted/` subdirectory structure if it doesn't exist
    - Return 404 if the file does not exist
    - _Requirements: 1.6, 2.4, 3.1, 8.3, 8.7_

  - [x] 2.5 Implement the trash listing endpoint `GET /api/trash`
    - Recursively list all files in the `Deleted/` directory
    - Return entries with original section, filename, and path information
    - _Requirements: 8.5_

  - [x] 2.6 Implement the restore endpoint `POST /api/media/restore`
    - Accept `{ section, filename }` in the request body
    - Move the file from `Deleted/<section-path>/` back to the original section directory
    - Return 404 if the file is not found in the Deleted directory
    - _Requirements: 3.4, 8.4_

  - [x] 2.7 Write property test for server 404 on non-existent files (Property 8)
    - **Property 8: Server returns 404 for non-existent files**
    - Generate random filenames that don't exist on disk
    - Send DELETE requests and verify 404 status with descriptive error message
    - **Validates: Requirements 8.7**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement delete functionality in Media_Manager and UI
  - [x] 4.1 Implement `deleteMedia(section, item)` in Media_Manager for both modes
    - In server mode: send `DELETE /api/media/:section/:filename` to the server
    - In local mode: add the item to the localStorage trash store with `deletedAt` timestamp
    - Remove the item from the rendered section by triggering a re-render callback
    - _Requirements: 1.5, 1.6, 1.7, 2.3, 2.4, 2.5, 3.2, 3.3_

  - [x] 4.2 Add Delete_Button overlay to image cards in `populatePhotos`, `populateLikes`, and `populateFunnyMoments`
    - Add a `<button class="delete-btn">×</button>` positioned absolutely in the top-right corner of each media card
    - Show on hover via CSS (`:hover` on parent card), hide when cursor leaves
    - On click, call `MediaManager.deleteMedia(section, item)` and re-render the section
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 4.3 Add Delete_Button overlay to song cards in `populateSongs`
    - Add a `<button class="delete-btn">×</button>` to each song card
    - On click, stop playback if the song is currently playing, then call `MediaManager.deleteMedia('songs', item)` and re-render
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 4.4 Add CSS styles for Delete_Button (hover visibility, positioning, appearance)
    - Style `.delete-btn` with absolute positioning, top-right corner, circular shape, "×" content
    - Hidden by default, visible on parent card `:hover`
    - Consistent styling across all section card types (photo-card, song-card, like-card, moment-card)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1_

  - [x] 4.5 Implement `getMediaItems(section)` for server mode
    - Fetch file listings from `GET /api/media/:section`
    - Convert server file entries to MediaItem objects
    - _Requirements: 10.1_

  - [x] 4.6 Write property test for delete removes item from section (Property 1)
    - **Property 1: Delete removes item from section**
    - Generate random MediaItems, delete one, verify it no longer appears in `getMediaItems(section)`
    - **Validates: Requirements 1.5, 2.3**

  - [x] 4.7 Write property test for delete populates trash in local mode (Property 2)
    - **Property 2: Delete in local mode populates trash with required fields**
    - Generate random MediaItems, delete in local mode, verify trash entry has section, source, caption, type, and valid ISO 8601 deletedAt
    - **Validates: Requirements 1.7, 2.5, 3.3**

- [x] 5. Implement add functionality via file picker
  - [x] 5.1 Implement `addMedia(section, files)` in Media_Manager for both modes
    - In server mode: upload each file via `POST /api/media/:section` using FormData
    - In local mode: convert each file to Data URL via FileReader, store in localStorage added items
    - Validate MIME type before processing; silently skip invalid files
    - Trigger section re-render after all files are processed
    - _Requirements: 4.5, 4.6, 4.7, 5.3, 5.4, 5.5, 5.6_

  - [x] 5.2 Add Add_Button card to image sections (`populatePhotos`, `populateLikes`, `populateFunnyMoments`)
    - Append a `<div class="add-btn-card">+</div>` as the last item in each section grid
    - On click, open a hidden `<input type="file" accept="image/*">` filtered to image types (JPEG, PNG, GIF, WebP, AVIF, JFIF)
    - On file selection, call `MediaManager.addMedia(section, files)` and re-render
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.7_

  - [x] 5.3 Add Add_Button card to Songs section (`populateSongs`)
    - Append an Add_Button to the songs container
    - On click, open a file picker filtered to audio types (MP3, WAV, OGG, M4A)
    - Derive song name from filename (strip extension), set artist to "User Added"
    - On file selection, call `MediaManager.addMedia('songs', files)` and re-render
    - _Requirements: 5.1, 5.2, 5.5, 5.6_

  - [x] 5.4 Add CSS styles for Add_Button card (appearance, hover effect)
    - Style `.add-btn-card` as a dashed-border card with "+" centered, matching section card dimensions
    - Hover effect with subtle scale and color change
    - _Requirements: 4.1, 4.2, 4.3, 5.1_

  - [x] 5.5 Write property test for song name derived from filename (Property 5)
    - **Property 5: Song name derived from filename**
    - Generate random filenames with various extensions
    - Verify the song name equals filename without extension and artist is "User Added"
    - **Validates: Requirements 5.5**

  - [x] 5.6 Write property test for MIME type filtering (Property 6)
    - **Property 6: MIME type filtering rejects disallowed types**
    - Generate random MIME types (both allowed and disallowed)
    - Verify disallowed types are rejected without error, allowed types are accepted
    - **Validates: Requirements 6.4, 7.4, 8.8**

- [x] 6. Implement drag-and-drop support
  - [x] 6.1 Add drag-and-drop event listeners to image sections (Photos, Things You Like, Funny Moments)
    - Listen for `dragenter`, `dragover`, `dragleave`, `drop` on each section container
    - On `dragenter`/`dragover`: show Drop_Zone overlay, prevent default
    - On `dragleave` (when leaving the section): hide Drop_Zone overlay
    - On `drop`: extract files from `DataTransfer`, filter to image MIME types, call `MediaManager.addMedia(section, files)`, hide overlay
    - Silently ignore non-image files
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 6.2 Add drag-and-drop event listeners to Songs section
    - Same pattern as image sections but filter to audio MIME types
    - On drop, process audio files through `MediaManager.addMedia('songs', files)`
    - Silently ignore non-audio files
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 6.3 Add CSS styles for Drop_Zone overlay
    - Style `.drop-zone-overlay` as a full-section overlay with dashed border, semi-transparent background, and "Drop files here" text
    - Hidden by default, shown via a `.drag-active` class on the section
    - _Requirements: 6.1, 6.5, 7.1, 7.5_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement trash/restore functionality
  - [x] 8.1 Implement `restoreMedia(trashEntry)` in Media_Manager for both modes
    - In server mode: send `POST /api/media/restore` with section and filename
    - In local mode: remove entry from localStorage trash store, re-add to added items
    - Trigger re-render of the restored item's section
    - _Requirements: 3.4, 3.5, 3.6_

  - [x] 8.2 Implement `getTrashItems()` in Media_Manager for both modes
    - In server mode: fetch from `GET /api/trash`
    - In local mode: read from localStorage trash store
    - _Requirements: 3.2, 8.5_

  - [x] 8.3 Add a simple trash/restore UI panel
    - Add a "Trash" button or link in the memories page header area
    - When clicked, show a modal or panel listing deleted items with a "Restore" button for each
    - On restore click, call `MediaManager.restoreMedia(entry)` and update the panel
    - _Requirements: 3.4, 3.5, 3.6_

  - [x] 8.4 Write property test for delete-then-restore round-trip (Property 3)
    - **Property 3: Delete-then-restore round-trip**
    - Generate random MediaItems, delete then restore, verify item reappears in section and is removed from trash
    - Verify restored item's section, source, and caption equal the originals
    - **Validates: Requirements 3.5, 3.6**

- [x] 9. Wire everything together and update existing render functions
  - [x] 9.1 Modify `script.js` to initialize Media_Manager on DOMContentLoaded
    - Call `MediaManager.init()` at the start of the DOMContentLoaded handler
    - After init completes, call the existing populate functions with data from `MediaManager.getMediaItems(section)`
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 9.2 Update `populatePhotos`, `populateSongs`, `populateLikes`, `populateFunnyMoments` to accept items from Media_Manager
    - Modify each function to accept an items array parameter
    - Replace direct reads from global arrays with the passed-in items
    - Ensure re-render callbacks are registered so delete/add/restore trigger UI updates
    - _Requirements: 4.7, 4.8, 5.6, 5.7, 10.1, 10.2_

  - [x] 9.3 Add `<script src="media-manager.js"></script>` to `index.html` before `script.js`
    - _Requirements: 9.5_

  - [x] 9.4 Handle localStorage unavailability gracefully
    - If localStorage throws on read/write, render only hardcoded arrays
    - Log a warning to console but show no user-facing error
    - _Requirements: 10.4_

  - [x] 9.5 Write unit tests for integration scenarios
    - Test that delete button appears on hover and hides on unhover
    - Test that deleting a playing song stops playback
    - Test that add button is present in each section
    - Test health check success → server mode, failure → local mode
    - _Requirements: 1.1–1.4, 2.1, 2.2, 4.1–4.3, 5.1, 9.1–9.4_

- [ ] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation language is JavaScript (vanilla JS for client, Node.js/Express for server) as specified in the design
- fast-check is used for property-based testing as specified in the design
