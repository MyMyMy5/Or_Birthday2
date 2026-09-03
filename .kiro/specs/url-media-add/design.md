# Design Document: URL-Based Media Add

## Overview

This feature adds a "Add via URL" option alongside the existing "Add from disk" file upload for all four sections (Photos, Songs, Things You Like, Funny Moments). Users can paste image URLs, audio URLs, or YouTube video URLs. URL-added items are stored in localStorage (in both server and local modes), integrated into the existing MediaManager pipeline, and support delete/restore via the trash system.

## Architecture

### Storage Strategy

URL-added items use the existing `media_manager_added` localStorage store (key: `STORAGE_KEYS.ADDED`) in **both** server and local modes. This is the simplest approach because:

- URLs don't need server-side file storage — they're just references to external resources
- The localStorage `added` store already supports user-added items in local mode
- In server mode, `getMediaItems` already merges hardcoded + server files + non-file items; URL items fit naturally as non-file items
- Delete/restore already works for localStorage-based items

URL-added items are distinguished by `origin: 'url-added'` (vs `'user-added'` for file uploads and `'hardcoded'` for built-in items).

### YouTube URL Parsing

A utility function `parseYouTubeUrl(url)` extracts the video ID from supported formats:

```
https://www.youtube.com/watch?v=VIDEO_ID
https://youtube.com/watch?v=VIDEO_ID
https://youtu.be/VIDEO_ID
https://www.youtube.com/shorts/VIDEO_ID
https://youtube.com/shorts/VIDEO_ID
```

Returns `{ videoId: string }` or `null` if not a YouTube URL.

Regex pattern:
```js
/(?:youtube\.com\/(?:watch\?.*v=|shorts\/)|youtu\.be\/)([\w-]{11})/
```

### URL Validation

A utility function `isValidUrl(str)` checks:
1. String starts with `http://` or `https://`
2. String is parseable by `new URL(str)` without throwing

### Data Flow

```
User clicks "+" → Add_Menu appears
  ├─ "Add from disk" → existing file picker flow (unchanged)
  └─ "Add via URL" → URL_Prompt modal appears
       ├─ User enters URL + optional caption → Submit
       │    ├─ Validate URL format
       │    ├─ Check if YouTube URL → extract videoId
       │    ├─ Create MediaItem with origin: 'url-added'
       │    ├─ Store in localStorage added store
       │    └─ Fire section callbacks → re-render
       └─ User cancels → close modal
```

## Component Changes

### 1. `media-manager.js` — New Methods

#### `addMediaByUrl(section, url, caption)`

New public method on MediaManager:

```js
addMediaByUrl: function (section, url, caption) {
    // 1. Validate URL
    if (!_isValidUrl(url)) return Promise.reject('Invalid URL');

    // 2. Determine media type
    var youtubeInfo = _parseYouTubeUrl(url);
    var isSongs = (section === Section.SONGS);
    var type, source, metadata, id;

    if (youtubeInfo && !isSongs) {
        // YouTube video
        type = 'video';
        source = '';
        id = youtubeInfo.videoId;
        metadata = { videoId: youtubeInfo.videoId };
    } else if (isSongs) {
        // Audio URL
        type = 'audio';
        source = url;
        id = 'url-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        metadata = { artist: 'URL Added' };
    } else {
        // Image URL
        type = 'image';
        source = url;
        id = 'url-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        metadata = {};
    }

    // 3. Build caption
    if (!caption) {
        if (youtubeInfo) caption = 'YouTube Video';
        else {
            // Derive from URL filename
            var pathParts = url.split('/');
            var lastPart = pathParts[pathParts.length - 1].split('?')[0];
            var dotIdx = lastPart.lastIndexOf('.');
            caption = dotIdx > 0 ? lastPart.substring(0, dotIdx) : lastPart || 'Untitled';
        }
    }

    // 4. Create MediaItem
    var mediaItem = {
        id: id,
        section: section,
        source: source,
        caption: caption,
        type: type,
        origin: 'url-added',
        metadata: metadata
    };

    // 5. Store in localStorage (both modes)
    var added = _readAdded();
    added.push(mediaItem);
    _writeAdded(added);

    // 6. Fire callbacks
    _fireSectionCallbacks(section);
    return Promise.resolve(mediaItem);
}
```

#### Internal helpers

```js
function _isValidUrl(str) {
    if (typeof str !== 'string') return false;
    if (str.indexOf('http://') !== 0 && str.indexOf('https://') !== 0) return false;
    try { new URL(str); return true; } catch (e) { return false; }
}

function _parseYouTubeUrl(url) {
    var match = url.match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/)|youtu\.be\/)([\w-]{11})/);
    return match ? { videoId: match[1] } : null;
}
```

#### Modify `getMediaItems` (server mode)

In server mode, after merging server files + hardcoded non-file items, also include URL-added items from localStorage:

```js
// After building serverItems + nonFileHardcoded...
var urlAdded = _readAdded().filter(function (item) {
    return item.section === section && item.origin === 'url-added';
});
return serverItems.concat(nonFileHardcoded).concat(urlAdded);
```

#### Modify `deleteMedia`

For URL-added items in server mode, skip the server DELETE request and use the local trash flow instead:

```js
deleteMedia: function (section, item) {
    if (_mode === 'server' && item.origin !== 'url-added') {
        // existing server delete logic...
    }
    // Local/URL-added: use localStorage trash
    // ... existing local delete logic
}
```

#### Modify `restoreMedia`

For URL-added items in server mode, skip the server restore request and use the local restore flow:

```js
restoreMedia: function (trashEntry) {
    if (_mode === 'server' && trashEntry.origin !== 'url-added') {
        // existing server restore logic...
    }
    // Local/URL-added: use localStorage restore
    // ... existing local restore logic
}
```

### 2. `script.js` — UI Changes

#### Add Menu Component

Replace the direct file-picker click on each `add-btn-card` with a dropdown menu:

```html
<div class="add-menu">
    <button class="add-menu-option" data-action="disk">📁 Add from disk</button>
    <button class="add-menu-option" data-action="url">🔗 Add via URL</button>
</div>
```

The menu appears on click, positioned relative to the add button card. Clicking outside closes it.

#### URL Prompt Modal

A reusable modal with:
- URL text input (required)
- Caption text input (optional)
- Add button (submit)
- Cancel button
- Error message area for validation feedback

```html
<div class="url-prompt-modal">
    <div class="url-prompt-content">
        <h3>Add via URL</h3>
        <input type="url" placeholder="Paste URL here..." class="url-input">
        <input type="text" placeholder="Caption (optional)" class="caption-input">
        <div class="url-error" style="display:none"></div>
        <div class="url-prompt-actions">
            <button class="url-cancel-btn">Cancel</button>
            <button class="url-add-btn">Add</button>
        </div>
    </div>
</div>
```

#### Rendering Changes

The existing `populatePhotos`, `populateSongs`, `populateLikes`, and `populateFunnyMoments` functions already handle MediaItem objects with `type: 'video'`, `type: 'image'`, and `type: 'audio'`. The only additions needed:

- **Photos & Things You Like**: Handle `type: 'video'` items by showing YouTube thumbnail as clickable image
- **Songs**: No changes needed — audio URLs already work via `<audio src="...">`
- **Funny Moments**: No changes needed — already handles `type: 'video'` with YouTube embeds

### 3. `styles.css` — New Styles

Add styles for:
- `.add-menu` — dropdown positioned below the add button
- `.add-menu-option` — menu option buttons
- `.url-prompt-modal` — overlay modal
- `.url-prompt-content` — modal content box
- `.url-input`, `.caption-input` — input fields
- `.url-error` — error message styling
- `.url-prompt-actions` — button row

## Correctness Properties

### P1: YouTube URL parsing extracts correct video ID
For any YouTube URL in a supported format containing a valid 11-character video ID, `_parseYouTubeUrl` must return an object with that video ID. For non-YouTube URLs, it must return null.

### P2: URL validation accepts only http/https URLs
`_isValidUrl` must return true only for strings starting with `http://` or `https://` that are parseable by `new URL()`.

### P3: URL-added items persist across reloads
Any URL_Media_Item stored via `addMediaByUrl` must appear in `getMediaItems` results after a simulated reload (re-reading localStorage).

### P4: URL-added items integrate with delete/restore
Deleting a URL_Media_Item must move it to trash. Restoring it must return it to the active list. The item count must be preserved.

### P5: Existing file-based flows remain unchanged
Adding, deleting, and restoring file-based items must continue to work identically in both modes.

## Test Plan

### Unit tests (vitest)

1. `_parseYouTubeUrl` — test all supported formats + edge cases
2. `_isValidUrl` — test valid/invalid URLs
3. `addMediaByUrl` — test item creation for image, audio, and YouTube URLs
4. `getMediaItems` server mode — verify URL-added items appear alongside server files
5. Delete/restore flow for URL-added items

### Manual testing

1. Open app in server mode, click "+" on each section, verify Add Menu appears
2. Select "Add via URL", paste a YouTube URL, verify video appears
3. Paste an image URL in Photos, verify image renders
4. Paste an audio URL in Songs, verify playback works
5. Delete a URL-added item, verify it moves to trash
6. Restore from trash, verify it reappears
7. Reload page, verify URL-added items persist
