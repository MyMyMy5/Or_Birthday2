# Bugfix Requirements Document

## Introduction

The Funny Moments section displays completely empty when the application runs in server mode (via Express). The section should show 5 hardcoded YouTube video embeds, but `MediaManager.getMediaItems('funnyMoments')` returns an empty array because the hardcoded-to-MediaItem conversion fails silently.

The root cause is a JavaScript scoping issue: the `funnyMoments` array is declared with `const` in `script.js`, which creates a binding in the global lexical scope but does **not** attach it as a property of `window`. The `_convertHardcodedToMediaItems` function inside the IIFE in `media-manager.js` checks `typeof funnyMoments !== 'undefined'`, but because `const` declarations are not properties of the global object, this check evaluates to `'undefined'` from within the IIFE closure. As a result, the function returns an empty array `[]`.

In server mode, the merge logic in `getMediaItems` fetches the file listing from `GET /api/media/funnyMoments`, which returns `[]` (the `Images/Funny_Moments/` directory is empty). It then attempts to include non-file hardcoded items (YouTube videos) from the `_convertHardcodedToMediaItems` result — but since that also returned `[]`, the final merged list is empty.

Other sections (Photos, Songs, Things You Like) are unaffected because they have actual files on disk, so the server file listing provides content regardless of whether the hardcoded conversion succeeds.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the app runs in server mode AND `getMediaItems('funnyMoments')` is called THEN the system returns an empty array because `_convertHardcodedToMediaItems('funnyMoments')` fails to access the `const funnyMoments` global variable from within the IIFE, resulting in no YouTube video embeds being displayed.

1.2 WHEN `_convertHardcodedToMediaItems` checks `typeof funnyMoments !== 'undefined'` from inside the IIFE in `media-manager.js` THEN the system evaluates the condition as false because `const` declarations do not become properties of the global object (`window`), causing the function to return an empty array.

1.3 WHEN the server returns an empty file listing for `funnyMoments` (no files in `Images/Funny_Moments/`) AND the hardcoded conversion also returns an empty array THEN the system renders the Funny Moments section with zero items, showing a blank grid to the user.

### Expected Behavior (Correct)

2.1 WHEN the app runs in server mode AND `getMediaItems('funnyMoments')` is called THEN the system SHALL return all 5 hardcoded YouTube video entries as MediaItem objects with `type: 'video'` and valid `metadata.videoId` values.

2.2 WHEN `_convertHardcodedToMediaItems('funnyMoments')` is called THEN the system SHALL successfully access the `funnyMoments` data regardless of whether it was declared with `const`, `var`, or `let`, and SHALL return the correct MediaItem array.

2.3 WHEN the server returns an empty file listing for `funnyMoments` AND hardcoded YouTube video items exist THEN the system SHALL include those video items in the merged result so the Funny Moments section displays all YouTube embeds.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the app runs in local mode (no server) THEN the system SHALL CONTINUE TO display all Funny Moments YouTube video embeds correctly, as it does today.

3.2 WHEN `getMediaItems('photos')` is called in server mode THEN the system SHALL CONTINUE TO return the correct list of photo items from the server file listing merged with any hardcoded entries.

3.3 WHEN `getMediaItems('songs')` is called in server mode THEN the system SHALL CONTINUE TO return the correct list of song items from the server file listing merged with any hardcoded entries.

3.4 WHEN `getMediaItems('thingsYouLike')` is called in server mode THEN the system SHALL CONTINUE TO return the correct list of liked-things items from the server file listing merged with any hardcoded entries.

3.5 WHEN a user adds a new image file to the Funny Moments section via upload in server mode THEN the system SHALL CONTINUE TO include that uploaded file in the merged results alongside the hardcoded YouTube videos.

3.6 WHEN a user deletes a media item from any section in server mode THEN the system SHALL CONTINUE TO move the file to the `Deleted/` directory and remove it from the displayed list.
