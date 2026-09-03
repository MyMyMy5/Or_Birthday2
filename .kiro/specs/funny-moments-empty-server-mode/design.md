# Design Document: Funny Moments Empty in Server Mode

## Overview

This document describes the fix for the Funny Moments section appearing empty when the app runs in server mode. The root cause is that `_convertHardcodedToMediaItems` inside the IIFE in `media-manager.js` cannot reliably access `const`-declared global arrays from `script.js`. The fix introduces an explicit registration API so `script.js` passes its hardcoded data arrays into MediaManager, eliminating the fragile implicit global variable access.

## Root Cause

The `_convertHardcodedToMediaItems` function in `media-manager.js` (inside an IIFE) accesses hardcoded data arrays (`photos`, `songs`, `thingsYouLike`, `funnyMoments`) using `typeof <varName> !== 'undefined'`. These arrays are declared with `const` in `script.js`.

In JavaScript, `const` (and `let`) declarations at the top level of a `<script>` tag create bindings in the global lexical environment but do **not** become properties of `window`. While `typeof` checks can technically resolve these bindings across scripts in the same global scope, the pattern is fragile and browser-implementation-dependent when accessed from within an IIFE closure.

The Funny Moments section is the only section that depends entirely on this hardcoded conversion working, because:
- `Images/Funny_Moments/` is empty on disk (no local files)
- All content is YouTube video embeds defined in the hardcoded `funnyMoments` array
- Other sections have actual files on disk, so the server file listing provides content regardless

## Fix Strategy

### Approach: Explicit Registration API

Add a `registerHardcodedData(section, dataArray)` method to `MediaManager`. Instead of `_convertHardcodedToMediaItems` reaching into the global scope to find arrays by name, `script.js` will explicitly register each hardcoded array after defining it.

This approach:
- Eliminates the `typeof` global variable access pattern entirely
- Makes the data flow explicit and debuggable
- Works regardless of `const`/`let`/`var` declaration
- Requires minimal changes to both files
- Is backward-compatible (the `typeof` fallback can remain for safety)

### Changes

#### 1. `media-manager.js` — Add registration store and API

Add an internal `_registeredData` object to store registered hardcoded arrays:

```js
var _registeredData = {}; // { [section]: Array }
```

Add a public `registerHardcodedData` method:

```js
registerHardcodedData: function (section, dataArray) {
    if (Array.isArray(dataArray)) {
        _registeredData[section] = dataArray;
    }
}
```

Modify `_convertHardcodedToMediaItems` to check `_registeredData[section]` first, falling back to the existing `typeof` global checks:

```js
function _convertHardcodedToMediaItems(section) {
    var items = [];
    var rawData = _registeredData[section] || null;

    if (section === Section.PHOTOS) {
        var arr = rawData || (typeof photos !== 'undefined' && Array.isArray(photos) ? photos : null);
        if (arr) { /* existing mapping logic */ }
    }
    // ... same pattern for other sections
}
```

#### 2. `script.js` — Register hardcoded arrays after definition

After the hardcoded arrays are defined (and before `DOMContentLoaded`), register them:

```js
MediaManager.registerHardcodedData('photos', photos);
MediaManager.registerHardcodedData('songs', songs);
MediaManager.registerHardcodedData('thingsYouLike', thingsYouLike);
MediaManager.registerHardcodedData('funnyMoments', funnyMoments);
```

This runs at script parse time, before any async operations, ensuring the data is available when `getMediaItems` is called.

## Correctness Properties

### P1: Funny Moments video items appear in server mode
For any set of hardcoded funnyMoments entries with `type: 'video'` and a `videoId`, when `getMediaItems('funnyMoments')` is called in server mode with an empty directory listing, the returned array must contain all those video entries as MediaItem objects with correct `type` and `metadata.videoId`.

### P2: Registration does not break local mode
When the app runs in local mode, `getMediaItems` for all sections must return the same items as before the fix (hardcoded + user-added, minus trashed).

### P3: Server file listing still takes precedence
When the server returns files for a section, those files must appear in the result. Hardcoded non-file items (videos, external URLs) are appended, not duplicated.

### P4: Other sections remain unaffected
`getMediaItems` for `photos`, `songs`, and `thingsYouLike` must continue to return correct results in both server and local modes.

## Test Plan

### New test: `tests/funny-moments-server-mode.test.js`

1. **Test that hardcoded YouTube videos appear when server returns empty file list**: Mock/simulate server mode behavior where `GET /api/media/funnyMoments` returns `[]`, verify that `getMediaItems` still returns the hardcoded video items.

2. **Test that registered data is used by `_convertHardcodedToMediaItems`**: Register a test array via `registerHardcodedData`, call `getMediaItems`, verify the registered data appears in results.

3. **Test that server files and hardcoded videos merge correctly**: When the server returns some image files AND hardcoded videos exist, verify both appear in the merged result without duplicates.

### Existing tests: Verify no regressions

Run the full test suite (`npx vitest run`) to confirm:
- Upload, delete, restore, and trash endpoints still work
- All existing property tests pass
- Integration tests pass
