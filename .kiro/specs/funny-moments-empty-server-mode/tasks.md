# Implementation Tasks

## Task 1: Write bug condition exploration test
- [ ] 1.1 Create `tests/funny-moments-server-mode.test.js` with a test that simulates the bug condition: when `_convertHardcodedToMediaItems('funnyMoments')` is called without registered data and the global `funnyMoments` const is not accessible, it returns an empty array. This test should FAIL after the fix is applied (confirming the bug existed).
- [ ] 1.2 Add a test that verifies `getMediaItems('funnyMoments')` returns an empty array when the server returns `[]` and no hardcoded data is accessible — confirming the current broken behavior.

## Task 2: Add `registerHardcodedData` API to MediaManager
- [ ] 2.1 In `media-manager.js`, add a `_registeredData` internal object (initialized to `{}`) inside the IIFE to store registered hardcoded arrays keyed by section name.
- [ ] 2.2 Add a `registerHardcodedData(section, dataArray)` public method to the `MediaManager` object that stores the given array in `_registeredData` if it is a valid array.
- [ ] 2.3 Modify `_convertHardcodedToMediaItems` to check `_registeredData[section]` first before falling back to the existing `typeof` global variable checks. For each section, use the registered data if available, otherwise fall back to the current behavior.

## Task 3: Register hardcoded arrays in `script.js`
- [ ] 3.1 In `script.js`, after the hardcoded arrays are defined (`photos`, `songs`, `thingsYouLike`, `funnyMoments`) and before the `DOMContentLoaded` handler, add calls to `MediaManager.registerHardcodedData()` for each section.

## Task 4: Write fix verification tests
- [ ] 4.1 Add a test that registers funnyMoments data via `registerHardcodedData`, then verifies `_convertHardcodedToMediaItems` (via `getMediaItems`) returns the correct video MediaItem objects with `type: 'video'` and valid `metadata.videoId`.
- [ ] 4.2 Add a test that verifies all other sections (`photos`, `songs`, `thingsYouLike`) still work correctly after the registration change — confirming no regressions.
- [ ] 4.3 Add a test that verifies server file listings and hardcoded video items merge correctly without duplicates when both exist for the `funnyMoments` section.

## Task 5: Run full test suite and verify
- [ ] 5.1 Run `npx vitest run` to execute all existing tests and confirm no regressions across upload, delete, restore, trash, and property tests.
