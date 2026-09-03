# Implementation Plan: Media and Editor Upgrades

## Overview

This plan implements 11 new capabilities for the birthday memories website, organized into incremental coding tasks. Each task builds on previous work, starting with server-side changes, then client-side media features, and finally Edit Mode upgrades. All code is vanilla JavaScript integrating with the existing architecture.

## Tasks

- [x] 1. Video Upload and Display
  - [x] 1.1 Extend server MIME validation to accept video types
    - Update `getAllowedMimes()` in `server.js` to include `video/mp4` and `video/webm` for image sections (Photos, Funny Moments)
    - Add `ALLOWED_VIDEO_TYPES` constant
    - _Requirements: 1.7, 1.9_

  - [x] 1.2 Extend MediaManager to handle video files
    - Add `ALLOWED_VIDEO_TYPES` array in `media-manager.js`
    - Update `addMedia()` validation to accept video MIME types for image sections
    - Store video items with `type: 'video'` in the media store
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.3 Write property test for MIME type validation (Property 1)
    - **Property 1: MIME Type Validation**
    - Test that MediaManager accepts only allowed MIME types per section
    - **Validates: Requirements 1.1, 1.2, 1.9**

  - [x] 1.4 Implement video player UI in section grid
    - Render video items as thumbnail cards with a play button overlay
    - On click, open modal with HTML5 `<video>` element for playback
    - Reuse existing `.image-modal` pattern
    - Add CSS styles for play button overlay and video modal
    - _Requirements: 1.5, 1.6, 1.8_

- [x] 2. Video Thumbnail Generation
  - [x] 2.1 Implement thumbnail generation and persistence
    - Create `generateVideoThumbnail(videoSource)` function using off-screen `<video>` + `<canvas>`
    - Capture first frame at `currentTime = 0.1s`, extract as data URL
    - Create `getVideoThumbnail(itemId)` and `setVideoThumbnail(itemId, dataUrl)` helpers
    - Persist thumbnails in localStorage under `video_thumbnails` key
    - Display generic placeholder icon on generation failure
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 2.2 Write property test for video thumbnail store round-trip (Property 2)
    - **Property 2: Video Thumbnail Store Round-Trip**
    - Test that storing and retrieving thumbnails produces equivalent data
    - Test JSON serialization/deserialization round-trip
    - **Validates: Requirements 2.2, 2.5**

- [x] 3. Photo Filters
  - [x] 3.1 Implement photo filter persistence and application
    - Create `getPhotoFilters()`, `setPhotoFilter(itemId, filterValues)`, `removePhotoFilter(itemId)` functions
    - Create `applyFilterToElement(imgElement, filterValues)` to set CSS `filter` property
    - Persist filter values in localStorage under `photo_filters` key
    - Apply saved filters on page load
    - _Requirements: 3.3, 3.4, 3.7_

  - [x] 3.2 Implement filter controls panel UI
    - Render filter panel below photo card in Edit Mode with range sliders for grayscale, sepia, brightness, contrast
    - Apply CSS filter live as user adjusts sliders
    - Add "Reset" button to clear all filters for the photo
    - Hide panel when Edit Mode is not active
    - Add CSS styles for filter panel layout
    - _Requirements: 3.1, 3.2, 3.5, 3.6_

  - [x] 3.3 Write property test for photo filter bounds and persistence (Property 3)
    - **Property 3: Photo Filter Bounds and Persistence**
    - Test that stored filter values remain within specified bounds after round-trip
    - **Validates: Requirements 3.3, 3.7**

- [x] 4. Photo Frames
  - [x] 4.1 Implement photo frame persistence and CSS classes
    - Create `getPhotoFrames()`, `setPhotoFrame(itemId, frameName)`, `removePhotoFrame(itemId)` functions
    - Define CSS classes: `.frame-confetti`, `.frame-balloons`, `.frame-hearts`, `.frame-stars`, `.frame-cake`
    - Apply saved frames on page load
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

  - [x] 4.2 Implement frame selector UI in filter panel
    - Add frame selector with 5 birthday-themed options + "No Frame" to the filter controls panel
    - Apply frame class immediately on selection
    - Remove frame on "No Frame" selection
    - _Requirements: 4.1, 4.6_

  - [x] 4.3 Write property test for photo frame persistence round-trip (Property 4)
    - **Property 4: Photo Frame Persistence Round-Trip**
    - Test that storing and retrieving frame names produces equivalent values
    - **Validates: Requirements 4.3**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Spotify Embed
  - [x] 6.1 Implement Spotify URL parsing and item creation
    - Create `parseSpotifyUrl(url)` function to extract track ID from Spotify URLs
    - Update MediaManager's `addMediaByUrl()` to detect Spotify URLs and create `spotify-embed` items
    - Display error message for invalid Spotify URL format
    - _Requirements: 5.1, 5.2, 5.4, 5.6_

  - [x] 6.2 Implement Spotify embed rendering
    - Render `spotify-embed` items as iframes with `src="https://open.spotify.com/embed/track/{TRACK_ID}"`
    - Set dimensions: height 80px, width 100%
    - Restore and render on page reload
    - _Requirements: 5.3, 5.5_

  - [x] 6.3 Write property test for Spotify URL parsing (Property 5)
    - **Property 5: Spotify URL Parsing**
    - Test that valid Spotify track URLs are correctly parsed to extract track IDs
    - **Validates: Requirements 5.1**

- [x] 7. YouTube Embed in Songs Section
  - [x] 7.1 Implement YouTube embed item creation for Songs section
    - Update MediaManager's `addMediaByUrl()` to detect YouTube URLs in Songs section
    - Create `youtube-embed` items with video ID in metadata
    - Reuse existing `_parseYouTubeUrl` logic
    - _Requirements: 6.1, 6.2, 6.4_

  - [x] 7.2 Implement YouTube embed rendering in Songs section
    - Render `youtube-embed` items as song cards with YouTube thumbnail
    - Add play button that expands to iframe embed on click
    - Restore and render on page reload
    - _Requirements: 6.3, 6.5_

  - [x] 7.3 Write property test for YouTube URL parsing (Property 6)
    - **Property 6: YouTube URL Parsing for Songs Section**
    - Test that valid YouTube URLs in all supported formats are correctly parsed
    - **Validates: Requirements 6.1**

- [x] 8. Photo Tagging
  - [x] 8.1 Implement photo tag persistence
    - Create `getPhotoTags()`, `setPhotoTags(itemId, tags)`, `addPhotoTag(itemId, tag)`, `removePhotoTag(itemId, tagIndex)` functions
    - Persist tags in localStorage under `photo_tags` key
    - Clamp coordinates to [0, 100] range
    - _Requirements: 7.3, 7.7_

  - [x] 8.2 Implement photo tagging UI
    - In Edit Mode, on photo click show inline input at click position for tag name
    - Display tags as absolutely positioned labels using `left: x%`, `top: y%`
    - Allow editing/deleting existing tags on click in Edit Mode
    - Show tags on hover only when Edit Mode is not active
    - Add CSS styles for tag labels and input
    - _Requirements: 7.1, 7.2, 7.4, 7.5, 7.6_

  - [x] 8.3 Write property test for photo tag coordinate bounds (Property 7)
    - **Property 7: Photo Tag Coordinate Bounds**
    - Test that computed tag coordinates are always clamped to [0, 100]
    - **Validates: Requirements 7.2, 7.7**

  - [x] 8.4 Write property test for photo tag array round-trip (Property 8)
    - **Property 8: Photo Tag Array Round-Trip**
    - Test that storing and retrieving tag arrays produces equivalent data
    - **Validates: Requirements 7.3, 7.8**

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Undo/Redo History
  - [x] 10.1 Implement HistoryStack data structure
    - Create `HistoryStack` object with `_undoStack`, `_redoStack` arrays
    - Implement `push(operation)`, `undo()`, `redo()`, `canUndo()`, `canRedo()`, `clear()` methods
    - `push` clears redo stack; `undo` moves from undo to redo; `redo` moves from redo to undo
    - Clear history when Edit Mode deactivates
    - _Requirements: 8.1, 8.5, 8.6_

  - [x] 10.2 Integrate undo/redo with existing edit operations
    - Record Edit_Operations for: inline edits, color changes, layout changes, pin/unpin, hide/show, reorder, filter/frame changes, tag additions/deletions
    - On undo: restore `oldValue` to localStorage and update DOM
    - On redo: restore `newValue` to localStorage and update DOM
    - _Requirements: 8.1, 8.3, 8.4_

  - [x] 10.3 Implement undo/redo UI and keyboard shortcuts
    - Add Undo and Redo buttons to Edit Mode toolbar
    - Bind Ctrl+Z for undo, Ctrl+Y for redo
    - Disable buttons visually when stack is empty
    - _Requirements: 8.2, 8.3, 8.4, 8.7, 8.8_

  - [x] 10.4 Write property test for undo/redo round-trip (Property 9)
    - **Property 9: Undo/Redo Round-Trip**
    - Test that undo followed by redo restores original state
    - **Validates: Requirements 8.3, 8.4, 8.9**

  - [x] 10.5 Write property test for redo invalidation (Property 10)
    - **Property 10: Redo Invalidation on New Operation**
    - Test that pushing a new operation after undo clears the redo stack
    - **Validates: Requirements 8.5**

- [x] 11. Import/Export Settings
  - [x] 11.1 Implement export settings functionality
    - Define `EXPORT_KEYS` array with all localStorage customization keys
    - Create `exportSettings()` function that collects all keys into JSON object
    - Trigger browser file download with filename `birthday-settings-{YYYY-MM-DD}.json`
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 11.2 Implement import settings functionality
    - Create `importSettings(file)` function that parses JSON and writes to localStorage
    - Open file picker filtered to `.json` files on button click
    - Display error message for invalid JSON
    - Reload page after successful import
    - _Requirements: 9.4, 9.5, 9.6, 9.7, 9.8_

  - [x] 11.3 Write property test for import/export round-trip (Property 11)
    - **Property 11: Import/Export Settings Round-Trip**
    - Test that exporting then importing produces equivalent localStorage state
    - **Validates: Requirements 9.2, 9.6, 9.9**

- [x] 12. Custom Sections
  - [x] 12.1 Implement custom section persistence and rendering
    - Create `getCustomSections()`, `addCustomSection(title, layout, itemType)`, `deleteCustomSection(sectionId)`, `addItemToCustomSection(sectionId, item)` functions
    - Persist in localStorage under `custom_sections` key
    - Render custom sections after built-in sections on page load with configured layout
    - _Requirements: 10.3, 10.4, 10.5, 10.7_

  - [x] 12.2 Implement custom section creation UI
    - Add "Add Section" button below existing sections in Edit Mode
    - Display creation form with title input, layout radio (grid/list), item type radio (text/image/link)
    - Validate non-empty title before creation
    - _Requirements: 10.1, 10.2_

  - [x] 12.3 Implement custom section item management and deletion
    - Add items of configured type via Add_Button in each custom section
    - Add "Delete Section" button with confirmation dialog in Edit Mode
    - Support Section_Settings_Panel features (color, ordering, hide/show, column count)
    - _Requirements: 10.6, 10.8, 10.9, 10.10_

  - [x] 12.4 Write property test for custom section persistence round-trip (Property 12)
    - **Property 12: Custom Section Persistence Round-Trip**
    - Test that storing and retrieving custom section arrays produces equivalent data
    - **Validates: Requirements 10.4, 10.7**

  - [x] 12.5 Write property test for custom section deletion (Property 13)
    - **Property 13: Custom Section Deletion**
    - Test that deleting a section removes it and decreases array length by one
    - **Validates: Requirements 10.9**

- [x] 13. Rich Text Notes
  - [x] 13.1 Implement HTML sanitization and rich text persistence
    - Create `sanitizeHtml(html)` function that strips all tags except `<strong>`, `<em>`, `<a>`, `<ul>`, `<li>`, `<br>`
    - Only allow `href` attribute on `<a>` tags, strip all other attributes
    - Update `item_notes` localStorage to store HTML strings
    - Render saved notes as formatted HTML on page load
    - _Requirements: 7, 11.7, 11.8, 11.9, 11.10, 11.11_

  - [x] 13.2 Implement rich text editor UI with formatting toolbar
    - Create `createRichTextEditor(itemId, existingHtml)` function returning a `contenteditable` div with toolbar
    - Add toolbar buttons: Bold (Ctrl+B), Italic (Ctrl+I), Link, Bullet List
    - Sanitize pasted content on paste event
    - Show editor in Edit Mode, display read-only formatted HTML otherwise
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 13.3 Write property test for HTML sanitization (Property 14)
    - **Property 14: HTML Sanitization Invariant**
    - Test that sanitized output contains only allowed tags and `<a>` retains only `href`
    - **Validates: Requirements 11.10, 11.11**

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All code is vanilla JavaScript — no frameworks or build tools required
- Test files follow the naming pattern `tests/media-editor-property-{N}-{name}.test.js`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3"] },
    { "id": 5, "tasks": ["6.1", "7.1", "8.1"] },
    { "id": 6, "tasks": ["6.2", "6.3", "7.2", "7.3", "8.2"] },
    { "id": 7, "tasks": ["8.3", "8.4", "10.1"] },
    { "id": 8, "tasks": ["10.2", "10.3", "11.1"] },
    { "id": 9, "tasks": ["10.4", "10.5", "11.2", "11.3"] },
    { "id": 10, "tasks": ["12.1"] },
    { "id": 11, "tasks": ["12.2", "12.3"] },
    { "id": 12, "tasks": ["12.4", "12.5", "13.1"] },
    { "id": 13, "tasks": ["13.2", "13.3"] }
  ]
}
```
