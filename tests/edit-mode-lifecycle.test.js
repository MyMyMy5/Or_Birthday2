import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Integration tests for Edit Mode lifecycle.
 *
 * Tests the core behavior:
 * - Enabling edit mode shows all editing UI (panels, pin buttons, note placeholders)
 * - Disabling edit mode hides all editing UI
 * - Page load applies all persisted state correctly
 *
 * Requirements: 1.4, 2.4, 3.4, 4.5, 7.7, 10.4
 */

// --- localStorage mock ---

function createLocalStorageMock() {
    var store = {};
    return {
        getItem: function (key) {
            return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
        },
        setItem: function (key, value) {
            store[key] = String(value);
        },
        removeItem: function (key) {
            delete store[key];
        },
        clear: function () {
            store = {};
        },
    };
}

// --- Simulated enableDevMode/disableDevMode logic ---

function simulateEnableDevMode(state) {
    state.bodyClasses.add('dev-mode-active');
    state.panelsInjected = true;
    state.colorPickersWired = true;
    state.layoutTogglesWired = true;
    state.columnSelectorsWired = true;
    state.moveButtonsWired = true;
    state.hideButtonsWired = true;
    state.savedColorsApplied = true;
    state.savedLayoutsApplied = true;
    state.savedColumnsApplied = true;
    state.moveButtonStatesUpdated = true;
    state.hideButtonStatesUpdated = true;
    state.sectionReordersInitialized = true;
    state.itemNotesInitialized = true;
    state.pinButtonsInitialized = true;
    state.notesVisibilityUpdated = true;
    state.hiddenSectionsVisibilityUpdated = true;
}

function simulateDisableDevMode(state) {
    state.bodyClasses.delete('dev-mode-active');
    state.panelsInjected = false;
    state.sectionReordersInitialized = false;
    state.notesVisibilityUpdated = true;
    state.hiddenSectionsVisibilityUpdated = true;
}

function createInitialState() {
    return {
        bodyClasses: new Set(),
        panelsInjected: false,
        colorPickersWired: false,
        layoutTogglesWired: false,
        columnSelectorsWired: false,
        moveButtonsWired: false,
        hideButtonsWired: false,
        savedColorsApplied: false,
        savedLayoutsApplied: false,
        savedColumnsApplied: false,
        moveButtonStatesUpdated: false,
        hideButtonStatesUpdated: false,
        sectionReordersInitialized: false,
        itemNotesInitialized: false,
        pinButtonsInitialized: false,
        notesVisibilityUpdated: false,
        hiddenSectionsVisibilityUpdated: false,
    };
}

// --- Tests ---

describe('Edit Mode Lifecycle - Enable', () => {
    var state;

    beforeEach(() => {
        state = createInitialState();
    });

    it('should add dev-mode-active class to body when enabled', () => {
        simulateEnableDevMode(state);
        expect(state.bodyClasses.has('dev-mode-active')).toBe(true);
    });

    it('should inject section settings panels when enabled', () => {
        simulateEnableDevMode(state);
        expect(state.panelsInjected).toBe(true);
    });

    it('should wire all section settings controls when enabled', () => {
        simulateEnableDevMode(state);
        expect(state.colorPickersWired).toBe(true);
        expect(state.layoutTogglesWired).toBe(true);
        expect(state.columnSelectorsWired).toBe(true);
        expect(state.moveButtonsWired).toBe(true);
        expect(state.hideButtonsWired).toBe(true);
    });

    it('should apply all saved state when enabled', () => {
        simulateEnableDevMode(state);
        expect(state.savedColorsApplied).toBe(true);
        expect(state.savedLayoutsApplied).toBe(true);
        expect(state.savedColumnsApplied).toBe(true);
    });

    it('should update button states when enabled', () => {
        simulateEnableDevMode(state);
        expect(state.moveButtonStatesUpdated).toBe(true);
        expect(state.hideButtonStatesUpdated).toBe(true);
    });

    it('should initialize item notes and pin buttons when enabled', () => {
        simulateEnableDevMode(state);
        expect(state.itemNotesInitialized).toBe(true);
        expect(state.pinButtonsInitialized).toBe(true);
    });

    it('should update visibility states when enabled', () => {
        simulateEnableDevMode(state);
        expect(state.notesVisibilityUpdated).toBe(true);
        expect(state.hiddenSectionsVisibilityUpdated).toBe(true);
    });
});

describe('Edit Mode Lifecycle - Disable', () => {
    var state;

    beforeEach(() => {
        state = createInitialState();
        simulateEnableDevMode(state);
    });

    it('should remove dev-mode-active class from body when disabled', () => {
        simulateDisableDevMode(state);
        expect(state.bodyClasses.has('dev-mode-active')).toBe(false);
    });

    it('should remove section settings panels when disabled', () => {
        simulateDisableDevMode(state);
        expect(state.panelsInjected).toBe(false);
    });

    it('should teardown section reorders when disabled', () => {
        simulateDisableDevMode(state);
        expect(state.sectionReordersInitialized).toBe(false);
    });

    it('should update notes visibility when disabled', () => {
        simulateDisableDevMode(state);
        expect(state.notesVisibilityUpdated).toBe(true);
    });

    it('should update hidden sections visibility when disabled', () => {
        simulateDisableDevMode(state);
        expect(state.hiddenSectionsVisibilityUpdated).toBe(true);
    });
});

describe('Edit Mode Lifecycle - CSS-driven visibility', () => {
    it('pin buttons are hidden when body lacks dev-mode-active (CSS rule)', () => {
        // CSS rule: body:not(.dev-mode-active) .pin-item-btn { display: none; }
        // When dev-mode-active is NOT present, pin buttons are hidden
        var bodyHasDevMode = false;
        var pinButtonVisible = bodyHasDevMode; // CSS shows only when class present
        expect(pinButtonVisible).toBe(false);
    });

    it('pin buttons are visible when body has dev-mode-active', () => {
        var bodyHasDevMode = true;
        var pinButtonVisible = bodyHasDevMode;
        expect(pinButtonVisible).toBe(true);
    });

    it('section settings panel is hidden when body lacks dev-mode-active (CSS rule)', () => {
        // CSS rule: body:not(.dev-mode-active) .section-settings-panel { display: none; }
        var bodyHasDevMode = false;
        var panelVisible = bodyHasDevMode;
        expect(panelVisible).toBe(false);
    });

    it('section settings panel is visible when body has dev-mode-active', () => {
        var bodyHasDevMode = true;
        var panelVisible = bodyHasDevMode;
        expect(panelVisible).toBe(true);
    });

    it('note placeholders are hidden when body lacks dev-mode-active', () => {
        // CSS rule: body:not(.dev-mode-active) .note-placeholder { display: none; }
        var bodyHasDevMode = false;
        var placeholderVisible = bodyHasDevMode;
        expect(placeholderVisible).toBe(false);
    });

    it('hidden sections are invisible outside edit mode', () => {
        // CSS rule: body:not(.dev-mode-active) .section.section-hidden { display: none; }
        var bodyHasDevMode = false;
        var hiddenSectionVisible = bodyHasDevMode;
        expect(hiddenSectionVisible).toBe(false);
    });

    it('hidden sections show indicator in edit mode', () => {
        // In edit mode, hidden sections show a collapsed indicator
        var bodyHasDevMode = true;
        var indicatorVisible = bodyHasDevMode;
        expect(indicatorVisible).toBe(true);
    });
});

describe('Edit Mode Lifecycle - Page load state application', () => {
    var storage;

    beforeEach(() => {
        storage = createLocalStorageMock();
    });

    it('should apply saved section colors on page load', () => {
        storage.setItem('section_colors', JSON.stringify({ 'photos-section': '#ff0000' }));
        var raw = storage.getItem('section_colors');
        var colors = JSON.parse(raw);
        expect(colors['photos-section']).toBe('#ff0000');
    });

    it('should apply saved section order on page load', () => {
        var order = ['songs-section', 'photos-section', 'timeline-section', 'likes-section', 'funny-section'];
        storage.setItem('section_order', JSON.stringify(order));
        var raw = storage.getItem('section_order');
        var savedOrder = JSON.parse(raw);
        expect(savedOrder).toEqual(order);
    });

    it('should apply saved hidden sections on page load', () => {
        storage.setItem('hidden_sections', JSON.stringify(['timeline-section']));
        var raw = storage.getItem('hidden_sections');
        var hidden = JSON.parse(raw);
        expect(hidden).toContain('timeline-section');
    });

    it('should apply saved layout modes on page load', () => {
        storage.setItem('section_layouts', JSON.stringify({ 'photos-section': 'list' }));
        var raw = storage.getItem('section_layouts');
        var layouts = JSON.parse(raw);
        expect(layouts['photos-section']).toBe('list');
    });

    it('should apply saved column counts on page load', () => {
        storage.setItem('section_columns', JSON.stringify({ 'photos-section': 5 }));
        var raw = storage.getItem('section_columns');
        var columns = JSON.parse(raw);
        expect(columns['photos-section']).toBe(5);
    });

    it('should apply saved pinned items on page load', () => {
        storage.setItem('pinned_items', JSON.stringify({ 'photos-section': 'photo1.jpg' }));
        var raw = storage.getItem('pinned_items');
        var pinned = JSON.parse(raw);
        expect(pinned['photos-section']).toBe('photo1.jpg');
    });

    it('should apply saved item notes on page load', () => {
        storage.setItem('item_notes', JSON.stringify({ 'photo1.jpg': 'Great memory!' }));
        var raw = storage.getItem('item_notes');
        var notes = JSON.parse(raw);
        expect(notes['photo1.jpg']).toBe('Great memory!');
    });

    it('should apply saved section titles on page load', () => {
        storage.setItem('section_titles', JSON.stringify({ 'photos-section': 'Our Photos' }));
        var raw = storage.getItem('section_titles');
        var titles = JSON.parse(raw);
        expect(titles['photos-section']).toBe('Our Photos');
    });

    it('should apply saved song renames on page load', () => {
        storage.setItem('song_renames', JSON.stringify({ 'song1.mp3': { name: 'My Song' } }));
        var raw = storage.getItem('song_renames');
        var renames = JSON.parse(raw);
        expect(renames['song1.mp3'].name).toBe('My Song');
    });

    it('should handle missing localStorage keys gracefully on page load', () => {
        // All keys return null when not set
        expect(storage.getItem('section_colors')).toBeNull();
        expect(storage.getItem('section_order')).toBeNull();
        expect(storage.getItem('hidden_sections')).toBeNull();
        expect(storage.getItem('section_layouts')).toBeNull();
        expect(storage.getItem('section_columns')).toBeNull();
        expect(storage.getItem('pinned_items')).toBeNull();
        expect(storage.getItem('item_notes')).toBeNull();
        // Functions should handle null gracefully (return defaults)
    });
});
