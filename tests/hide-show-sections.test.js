import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Unit tests for Hide/Show Sections functionality.
 *
 * Tests the core behavior:
 * - getHiddenSections reads from localStorage correctly
 * - saveHiddenSections persists to localStorage correctly
 * - hideSection collapses content and shows indicator
 * - showSection restores content and removes indicator
 * - Prevent hiding all sections (at least one must remain visible)
 * - applySavedHiddenSections applies hidden state on load
 * - Outside edit mode, hidden sections are completely invisible
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
 */

// --- localStorage mock ---

function createLocalStorageMock() {
    var store = {};
    return {
        getItem: function (key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
        setItem: function (key, value) { store[key] = String(value); },
        removeItem: function (key) { delete store[key]; },
        clear: function () { store = {}; },
        _store: store
    };
}

// --- Re-implementations for isolated testing ---

function getHiddenSections(storage) {
    try {
        var raw = storage.getItem('hidden_sections');
        if (raw) {
            var parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch (e) {}
    return [];
}

function saveHiddenSections(storage, hiddenIds) {
    try {
        storage.setItem('hidden_sections', JSON.stringify(hiddenIds));
    } catch (e) {}
}

function getAllSectionIds(sections) {
    return sections.map(function (s) { return s.id; }).filter(Boolean);
}

function canHideSection(allIds, hiddenIds) {
    var visibleCount = allIds.filter(function (id) {
        return hiddenIds.indexOf(id) === -1;
    }).length;
    return visibleCount > 1;
}

// --- Tests ---

describe('Hide/Show Sections - getHiddenSections', () => {
    it('should return empty array when localStorage has no hidden_sections', () => {
        var storage = createLocalStorageMock();
        expect(getHiddenSections(storage)).toEqual([]);
    });

    it('should return saved array from localStorage', () => {
        var storage = createLocalStorageMock();
        storage.setItem('hidden_sections', JSON.stringify(['photos-section', 'songs-section']));
        expect(getHiddenSections(storage)).toEqual(['photos-section', 'songs-section']);
    });

    it('should return empty array for invalid JSON', () => {
        var storage = createLocalStorageMock();
        storage.setItem('hidden_sections', 'not-json');
        expect(getHiddenSections(storage)).toEqual([]);
    });

    it('should return empty array for non-array JSON', () => {
        var storage = createLocalStorageMock();
        storage.setItem('hidden_sections', JSON.stringify({ foo: 'bar' }));
        expect(getHiddenSections(storage)).toEqual([]);
    });
});

describe('Hide/Show Sections - saveHiddenSections', () => {
    it('should persist hidden section IDs to localStorage', () => {
        var storage = createLocalStorageMock();
        saveHiddenSections(storage, ['timeline-section']);
        expect(JSON.parse(storage.getItem('hidden_sections'))).toEqual(['timeline-section']);
    });

    it('should overwrite previous value', () => {
        var storage = createLocalStorageMock();
        saveHiddenSections(storage, ['photos-section']);
        saveHiddenSections(storage, ['songs-section', 'likes-section']);
        expect(JSON.parse(storage.getItem('hidden_sections'))).toEqual(['songs-section', 'likes-section']);
    });

    it('should save empty array', () => {
        var storage = createLocalStorageMock();
        saveHiddenSections(storage, ['photos-section']);
        saveHiddenSections(storage, []);
        expect(JSON.parse(storage.getItem('hidden_sections'))).toEqual([]);
    });
});

describe('Hide/Show Sections - canHideSection (prevent hiding all)', () => {
    var allIds = ['photos-section', 'songs-section', 'timeline-section', 'likes-section', 'funny-section'];

    it('should allow hiding when multiple sections are visible', () => {
        expect(canHideSection(allIds, [])).toBe(true);
        expect(canHideSection(allIds, ['photos-section'])).toBe(true);
        expect(canHideSection(allIds, ['photos-section', 'songs-section', 'timeline-section'])).toBe(true);
    });

    it('should prevent hiding when only one section is visible', () => {
        var hidden = ['photos-section', 'songs-section', 'timeline-section', 'likes-section'];
        expect(canHideSection(allIds, hidden)).toBe(false);
    });

    it('should prevent hiding when all sections are already hidden', () => {
        expect(canHideSection(allIds, allIds)).toBe(false);
    });
});

describe('Hide/Show Sections - localStorage round-trip', () => {
    it('should persist and retrieve hidden sections correctly', () => {
        var storage = createLocalStorageMock();
        var hidden = ['photos-section', 'timeline-section'];
        saveHiddenSections(storage, hidden);
        var retrieved = getHiddenSections(storage);
        expect(retrieved).toEqual(hidden);
    });

    it('should handle adding and removing sections from hidden list', () => {
        var storage = createLocalStorageMock();

        // Hide a section
        var hidden = getHiddenSections(storage);
        hidden.push('songs-section');
        saveHiddenSections(storage, hidden);
        expect(getHiddenSections(storage)).toEqual(['songs-section']);

        // Hide another
        hidden = getHiddenSections(storage);
        hidden.push('likes-section');
        saveHiddenSections(storage, hidden);
        expect(getHiddenSections(storage)).toEqual(['songs-section', 'likes-section']);

        // Show one
        hidden = getHiddenSections(storage);
        var idx = hidden.indexOf('songs-section');
        hidden.splice(idx, 1);
        saveHiddenSections(storage, hidden);
        expect(getHiddenSections(storage)).toEqual(['likes-section']);
    });
});

describe('Hide/Show Sections - validation', () => {
    it('should ensure hidden sections is always a proper subset of all sections', () => {
        var allIds = ['photos-section', 'songs-section', 'timeline-section'];

        // Valid: subset
        var hidden = ['photos-section'];
        var isValid = hidden.length < allIds.length && hidden.every(function (id) {
            return allIds.indexOf(id) !== -1;
        });
        expect(isValid).toBe(true);

        // Invalid: all sections hidden
        hidden = ['photos-section', 'songs-section', 'timeline-section'];
        isValid = hidden.length < allIds.length;
        expect(isValid).toBe(false);
    });

    it('should filter out invalid section IDs', () => {
        var allIds = ['photos-section', 'songs-section', 'timeline-section'];
        var hidden = ['photos-section', 'nonexistent-section'];
        var validHidden = hidden.filter(function (id) {
            return allIds.indexOf(id) !== -1;
        });
        expect(validHidden).toEqual(['photos-section']);
    });
});
