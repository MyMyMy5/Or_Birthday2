# Requirements Document

## Introduction

This feature combines three visual enhancements for the birthday memories website: a full-screen photo lightbox with swipe navigation, animated section transitions using IntersectionObserver, and glassmorphism card styling. These upgrades modernize the visual presentation while preserving the existing pink color scheme and functionality.

## Glossary

- **Lightbox**: A full-screen overlay that displays a photo at maximum size with navigation controls, replacing the current basic image modal
- **Photo_Gallery**: The ordered collection of photos currently displayed in the photos grid section
- **Swipe_Gesture**: A touch interaction where the user drags horizontally across the screen on a touch-enabled device
- **IntersectionObserver**: A browser API that detects when elements enter or exit the viewport
- **Glassmorphism**: A visual design style using semi-transparent backgrounds combined with backdrop blur to create a frosted glass appearance
- **Staggered_Animation**: An animation pattern where multiple sibling elements animate sequentially with a fixed delay between each
- **Section**: A content block on the memories page identified by the `.section` class
- **Photo_Card**: An individual photo element in the photos grid identified by the `.photo-card` class
- **Song_Card**: An individual song element in the songs list identified by the `.song-card` class
- **Filter_Panel**: The tag-based filtering UI for photos in the photos section

## Requirements

### Requirement 1: Photo Lightbox Display

**User Story:** As a visitor, I want to view photos in a full-screen lightbox overlay, so that I can see photos at maximum size without page distractions.

#### Acceptance Criteria

1. WHEN a user clicks a Photo_Card image, THE Lightbox SHALL open as a full-screen overlay displaying the selected photo centered on screen
2. THE Lightbox SHALL display a close button (×) in the top-right corner of the overlay
3. WHEN the user clicks the close button, THE Lightbox SHALL close and return to the memories page
4. WHEN the user presses the Escape key while the Lightbox is open, THE Lightbox SHALL close and return to the memories page
5. WHEN the user clicks the dark backdrop area outside the photo, THE Lightbox SHALL close and return to the memories page
6. WHILE the Lightbox is open, THE Lightbox SHALL display a photo counter showing the current position and total count in the format "N / M" (e.g., "3 / 6")
7. THE Lightbox SHALL set `aria-hidden="true"` on background content while open to maintain accessibility

### Requirement 2: Lightbox Arrow Navigation

**User Story:** As a visitor, I want to browse through photos using arrow buttons without closing the lightbox, so that I can view the entire photo collection seamlessly.

#### Acceptance Criteria

1. WHILE the Lightbox is open and more than one photo exists in the Photo_Gallery, THE Lightbox SHALL display a left arrow button and a right arrow button for navigation
2. WHEN the user clicks the right arrow button, THE Lightbox SHALL display the next photo in the Photo_Gallery sequence
3. WHEN the user clicks the left arrow button, THE Lightbox SHALL display the previous photo in the Photo_Gallery sequence
4. WHEN the user presses the right arrow key on the keyboard, THE Lightbox SHALL display the next photo in the Photo_Gallery sequence
5. WHEN the user presses the left arrow key on the keyboard, THE Lightbox SHALL display the previous photo in the Photo_Gallery sequence
6. WHEN the user navigates past the last photo, THE Lightbox SHALL wrap around to the first photo
7. WHEN the user navigates before the first photo, THE Lightbox SHALL wrap around to the last photo
8. WHEN the user navigates to a new photo, THE Lightbox SHALL update the photo counter to reflect the new position

### Requirement 3: Lightbox Swipe Gesture Support

**User Story:** As a mobile visitor, I want to swipe left and right to navigate photos in the lightbox, so that I can browse photos using natural touch gestures.

#### Acceptance Criteria

1. WHILE the Lightbox is open on a touch-enabled device, THE Lightbox SHALL detect horizontal Swipe_Gesture input on the photo area
2. WHEN the user performs a left Swipe_Gesture (finger moves from right to left), THE Lightbox SHALL navigate to the next photo
3. WHEN the user performs a right Swipe_Gesture (finger moves from left to right), THE Lightbox SHALL navigate to the previous photo
4. THE Lightbox SHALL require a minimum horizontal swipe distance of 50 pixels to register as a valid Swipe_Gesture
5. THE Lightbox SHALL ignore vertical swipe movements that exceed the horizontal distance to prevent accidental navigation during scrolling

### Requirement 4: Animated Section Transitions on Scroll

**User Story:** As a visitor, I want sections to animate into view as I scroll down the page, so that the browsing experience feels dynamic and polished.

#### Acceptance Criteria

1. WHILE a Section is below the viewport and not yet observed, THE Section SHALL remain visually hidden with zero opacity and a vertical offset
2. WHEN a Section enters the viewport (detected by IntersectionObserver), THE Section SHALL animate into view with a combined fade-in and slide-up effect
3. THE Section transition animation SHALL complete within 600 milliseconds using an ease-out timing function
4. WHEN a Section has already been animated into view, THE Section SHALL remain visible and not re-trigger the animation on subsequent scroll events
5. THE IntersectionObserver SHALL trigger the animation when at least 15% of the Section is visible in the viewport

### Requirement 5: Staggered Card Animations Within Sections

**User Story:** As a visitor, I want individual cards within a section to appear one after another with a slight delay, so that the page feels lively and each item gets a moment of attention.

#### Acceptance Criteria

1. WHEN a Section enters the viewport, THE Section SHALL animate its child cards (Photo_Card, Song_Card, or equivalent items) with a Staggered_Animation
2. THE Staggered_Animation SHALL apply a delay of 70 milliseconds between each consecutive card within the same Section
3. Each card in the Staggered_Animation SHALL use the same fade-in and slide-up effect as the parent Section
4. WHEN a Section has already played its Staggered_Animation, THE Section SHALL not replay the card animations on subsequent scroll events
5. THE Staggered_Animation SHALL cap the maximum total delay at 700 milliseconds (10 cards maximum stagger) to prevent excessively long animation sequences for sections with many items

### Requirement 6: Glassmorphism Card Styling

**User Story:** As a visitor, I want the cards and containers to have a modern frosted glass appearance, so that the site feels visually elevated and contemporary.

#### Acceptance Criteria

1. THE Photo_Card SHALL use a semi-transparent background with `backdrop-filter: blur()` to create a frosted glass effect
2. THE Song_Card SHALL use a semi-transparent background with `backdrop-filter: blur()` to create a frosted glass effect
3. THE Section containers SHALL use a semi-transparent background with `backdrop-filter: blur()` to create a frosted glass effect
4. THE memories header area SHALL use a semi-transparent background with `backdrop-filter: blur()` to create a frosted glass effect
5. THE Filter_Panel SHALL use a semi-transparent background with `backdrop-filter: blur()` to create a frosted glass effect
6. Each glassmorphism element SHALL include a subtle border using `rgba(255, 255, 255, 0.3)` to create a glass edge highlight effect
7. THE glassmorphism styling SHALL preserve the existing pink color scheme by using pink-tinted semi-transparent backgrounds (e.g., `rgba(255, 241, 247, 0.65)`)

### Requirement 7: Glassmorphism Readability and Fallback

**User Story:** As a visitor, I want text on glassmorphism cards to remain readable, so that the visual enhancement does not compromise usability.

#### Acceptance Criteria

1. THE glassmorphism cards SHALL maintain a minimum contrast ratio of 4.5:1 between text and background as perceived against typical page content
2. IF a browser does not support `backdrop-filter`, THEN THE cards SHALL fall back to a solid semi-transparent background that maintains readability without the blur effect
3. THE glassmorphism blur radius SHALL be set between 10px and 20px to provide sufficient frosting without obscuring the background entirely
4. THE glassmorphism backgrounds SHALL use sufficient opacity (minimum 0.6 alpha) to ensure text remains legible regardless of what content scrolls behind the element

## Non-Goals

- Pinch-to-zoom within the lightbox is not included in this feature
- Video lightbox navigation is not included (videos retain their existing modal)
- Parallax scrolling effects are not part of this feature
- Animations on the envelope/letter page (page 1) are not affected
- Changing the existing floating balloons or confetti animations is not in scope
- Dark mode or theme switching is not included
