# UI Testing Requirements

## Overview

Comprehensive UI test suite covering every user-facing interaction, component, and flow in the Or Birthday website. Tests validate that all buttons, toggles, navigation, modals, media controls, and editing features work correctly.

## Actors

- **Visitor** — A normal user viewing the birthday page (no edit mode)
- **Editor** — A user with Edit Mode (developer mode) enabled

## Non-Goals

- Performance testing / load testing
- Visual regression / pixel-perfect screenshot comparisons
- Testing third-party services (YouTube embeds loading, external audio streams)
- Testing server deployment or production environment

---

## 1. Envelope Page

### 1.1 Envelope Interaction

WHEN the visitor hovers over the envelope
THE SYSTEM SHALL apply a peek animation (CSS class change)

WHEN the visitor clicks the envelope
THE SYSTEM SHALL open the envelope (add 'opened' class), hide the instruction text, and begin the typewriter animation for the letter text

WHEN the typewriter animation completes
THE SYSTEM SHALL show the "Continue to Memories" button

### 1.2 Continue Button

WHEN the visitor clicks "Continue to Memories"
THE SYSTEM SHALL hide the envelope page and show the memories page (class 'active' moves from envelope-page to memories-page)

---

## 2. Navigation

### 2.1 Back Button

WHEN the visitor clicks "Back to Letter" on the memories page
THE SYSTEM SHALL show the envelope page and hide the memories page

### 2.2 Envelope Toggle

WHEN the editor unchecks the envelope toggle checkbox
THE SYSTEM SHALL skip the envelope page on future loads (go directly to memories)

WHEN the editor re-checks the envelope toggle
THE SYSTEM SHALL restore the envelope page behavior

---

## 3. Lightbox

### 3.1 Open

WHEN the visitor clicks a photo image in the photos grid
THE SYSTEM SHALL open the lightbox overlay (set aria-hidden=false, display the clicked image)

### 3.2 Close

WHEN the visitor clicks the close button (×)
THE SYSTEM SHALL close the lightbox

WHEN the visitor presses the Escape key while the lightbox is open
THE SYSTEM SHALL close the lightbox

### 3.3 Navigation

WHEN the visitor clicks the next arrow or presses the right arrow key
THE SYSTEM SHALL advance to the next photo (wrapping from last to first)

WHEN the visitor clicks the prev arrow or presses the left arrow key
THE SYSTEM SHALL go to the previous photo (wrapping from first to last)

WHEN the gallery has only 1 photo
THE SYSTEM SHALL hide the navigation arrows

### 3.4 Counter

WHEN the lightbox displays a photo
THE SYSTEM SHALL show an accurate counter "X / Y" reflecting current position and total

### 3.5 Swipe (Mobile)

WHEN the visitor swipes left on the lightbox image
THE SYSTEM SHALL navigate to the next photo

WHEN the visitor swipes right on the lightbox image
THE SYSTEM SHALL navigate to the previous photo

---

## 4. Music Player

### 4.1 Song Cards

WHEN the page loads with songs data
THE SYSTEM SHALL render a song card for each song with cover image, title, and artist

### 4.2 Play/Pause

WHEN the visitor clicks a song card
THE SYSTEM SHALL begin audio playback and show playing state (visual indicator)

WHEN the visitor clicks a currently playing song card
THE SYSTEM SHALL pause the audio and remove playing state

### 4.3 Track Switching

WHEN the visitor clicks a different song card while one is playing
THE SYSTEM SHALL stop the current song and start the new one

---

## 5. Section Display

### 5.1 Section Rendering

WHEN the memories page loads
THE SYSTEM SHALL render all sections: Photos, Songs, Timeline, Things You Like, Funny Moments, and any custom sections

### 5.2 Section Visibility Animation

WHEN a section scrolls into the viewport
THE SYSTEM SHALL add the 'visible' class to trigger the entrance animation

### 5.3 Section Order

WHEN the editor has saved a section order in localStorage
THE SYSTEM SHALL render sections in that saved order on page load

---

## 6. Edit Mode (Developer Mode)

### 6.1 Toggle

WHEN the editor toggles the "Edit Mode" checkbox ON
THE SYSTEM SHALL add 'dev-mode-active' to document.body, inject undo/redo buttons, and inject the "Add Section" button

WHEN the editor toggles the "Edit Mode" checkbox OFF
THE SYSTEM SHALL remove 'dev-mode-active' from document.body, remove undo/redo buttons, remove "Add Section" button, and clear the history stack

### 6.2 Inline Editing

WHEN the editor clicks a section title while edit mode is active
THE SYSTEM SHALL replace the title with an editable input pre-filled with the current text

WHEN the editor presses Enter in the inline edit input
THE SYSTEM SHALL save the new value to localStorage and update the display

WHEN the editor presses Escape in the inline edit input
THE SYSTEM SHALL discard changes and revert to the original text

WHEN the editor submits an empty string
THE SYSTEM SHALL revert to the original text (not save empty)

### 6.3 Section Color Picker

WHEN the editor changes a section's color setting in edit mode
THE SYSTEM SHALL apply the new background color and persist to localStorage

### 6.4 Section Layout Toggle

WHEN the editor toggles a section's layout between grid and list
THE SYSTEM SHALL switch the display layout and persist the choice

### 6.5 Section Column Count

WHEN the editor changes the column count for a grid section
THE SYSTEM SHALL update the CSS grid columns and persist the value

---

## 7. Drag and Drop (Reorder)

### 7.1 Item Reorder

WHEN the editor drags a media item to a new position within the same section
THE SYSTEM SHALL reorder the items in the DOM and persist the new order to localStorage

### 7.2 Section Reorder

WHEN the editor has a saved section order
THE SYSTEM SHALL render sections in that order on page load

---

## 8. Undo/Redo

### 8.1 Undo

WHEN the editor clicks the Undo button or presses Ctrl+Z in edit mode
THE SYSTEM SHALL revert the most recent edit operation and update the DOM

### 8.2 Redo

WHEN the editor clicks the Redo button or presses Ctrl+Y in edit mode
THE SYSTEM SHALL re-apply the most recently undone operation and update the DOM

### 8.3 Button State

WHEN the undo stack is empty
THE SYSTEM SHALL disable the Undo button (add undo-redo-disabled class)

WHEN the redo stack is empty
THE SYSTEM SHALL disable the Redo button (add undo-redo-disabled class)

---

## 9. Photo Features

### 9.1 Photo Filters

WHEN the editor applies a filter (grayscale, sepia, brightness, contrast) to a photo
THE SYSTEM SHALL apply the CSS filter and persist values (clamped to valid bounds)

### 9.2 Photo Frames

WHEN the editor selects a frame for a photo (confetti, balloons, hearts, stars, cake)
THE SYSTEM SHALL add the frame class to the photo card and persist the selection

### 9.3 Photo Tags

WHEN the editor clicks on a photo image in edit mode
THE SYSTEM SHALL show an inline input at the click position for adding a tag

WHEN the editor submits a tag
THE SYSTEM SHALL save the tag with coordinates to localStorage and render it on the photo

WHEN the editor clicks an existing tag
THE SYSTEM SHALL show edit/delete action options

---

## 10. Custom Sections

### 10.1 Create

WHEN the editor clicks "+ Add Section"
THE SYSTEM SHALL show a creation form with title input, layout radio (grid/list), and item type radio (text/image/link)

WHEN the editor submits the form with a valid title
THE SYSTEM SHALL create the section in localStorage, render it in the DOM, and close the form

WHEN the editor submits with an empty title
THE SYSTEM SHALL show a validation error and keep the form open

### 10.2 Delete

WHEN the editor clicks "Delete Section" on a custom section and confirms
THE SYSTEM SHALL remove the section from localStorage and the DOM

### 10.3 Add Items

WHEN the editor clicks the "+" button within a custom section
THE SYSTEM SHALL show an inline add-item form appropriate to the section's item type

---

## 11. Hide/Show Sections

### 11.1 Hide

WHEN the editor hides a section
THE SYSTEM SHALL add 'section-hidden' class and persist to localStorage

### 11.2 Restore

WHEN the editor shows a hidden section
THE SYSTEM SHALL remove 'section-hidden' class and update localStorage

### 11.3 Persistence

WHEN the page reloads after sections were hidden
THE SYSTEM SHALL re-hide those sections from the persisted list

---

## 12. Trash Panel

### 12.1 Open

WHEN the editor clicks the "Trash" button
THE SYSTEM SHALL display the trash panel showing all soft-deleted items

### 12.2 Restore

WHEN the editor clicks restore on a trashed item
THE SYSTEM SHALL call MediaManager.restoreMedia and re-render the appropriate section

---

## 13. Import/Export Settings

### 13.1 Export

WHEN the editor clicks "Export Settings"
THE SYSTEM SHALL collect all EXPORT_KEYS from localStorage and trigger a JSON file download

### 13.2 Import

WHEN the editor clicks "Import Settings" and selects a valid JSON file
THE SYSTEM SHALL write the keys to localStorage and reload the page

WHEN the editor selects an invalid file
THE SYSTEM SHALL show an alert and not modify localStorage

---

## 14. Pin Items

### 14.1 Pin

WHEN the editor pins an item in a section
THE SYSTEM SHALL visually mark the item as pinned and persist the choice

### 14.2 Unpin

WHEN the editor unpins a pinned item
THE SYSTEM SHALL remove the pinned state and update localStorage

---

## 15. Item Notes

### 15.1 Add/Edit Note

WHEN the editor adds or edits a note on a media item
THE SYSTEM SHALL persist the note text and display it on the item

---

## 16. Decorations & Animations

### 16.1 Balloons and Confetti

WHEN the page loads
THE SYSTEM SHALL create balloon and confetti decoration elements in the decorations container

### 16.2 Christmas Tree

WHEN the "Things You Like" section loads
THE SYSTEM SHALL build and render the decorative Christmas tree with colored lights

---

## 17. Timeline

### 17.1 Course Rendering

WHEN the page loads with courses data
THE SYSTEM SHALL render a timeline item for each course

### 17.2 Completion Toggle

WHEN the visitor toggles a course's completion state
THE SYSTEM SHALL persist the change to localStorage and update the visual state

---

## 18. Funny Moments

### 18.1 YouTube Embeds

WHEN a funny moment has type "video" with a videoId
THE SYSTEM SHALL render a YouTube embed or thumbnail for that video

### 18.2 Image Items

WHEN a funny moment has type "image"
THE SYSTEM SHALL render the image with its title/caption

---

## 19. Keyboard Accessibility

### 19.1 Escape Key

WHEN the user presses Escape with the lightbox open
THE SYSTEM SHALL close the lightbox

### 19.2 Arrow Keys

WHEN the user presses left/right arrows with the lightbox open
THE SYSTEM SHALL navigate between photos

### 19.3 Undo/Redo Shortcuts

WHEN the editor presses Ctrl+Z in edit mode
THE SYSTEM SHALL perform undo

WHEN the editor presses Ctrl+Y in edit mode
THE SYSTEM SHALL perform redo

---

## 20. MediaManager Integration

### 20.1 Server Mode

WHEN the server health check succeeds
THE SYSTEM SHALL use server API for media operations

### 20.2 Local Mode Fallback

WHEN the server health check fails
THE SYSTEM SHALL fall back to localStorage for media operations

### 20.3 Add Media

WHEN the editor uploads a valid file
THE SYSTEM SHALL add it to the appropriate section and re-render

### 20.4 Delete Media

WHEN the editor deletes a media item
THE SYSTEM SHALL soft-delete it (move to trash) and re-render the section

### 20.5 Restore Media

WHEN the editor restores an item from trash
THE SYSTEM SHALL return it to its original section and re-render
