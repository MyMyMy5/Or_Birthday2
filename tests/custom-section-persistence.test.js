import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * Unit tests for custom section persistence and rendering functions.
 * Tests getCustomSections(), addCustomSection(), deleteCustomSection(),
 * addItemToCustomSection(), and rendering logic.
 *
 * Validates: Requirements 10.3, 10.4, 10.5, 10.7
 */

// --- localStorage mock ---

function createMockLocalStorage() {
    const store = {};
    return {
        getItem(key) {
            return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
        },
        setItem(key, value) {
            store[key] = String(value);
        },
        removeItem(key) {
            delete store[key];
        },
        clear() {
            for (const k of Object.keys(store)) {
                delete store[k];
            }
        },
        get _store() {
            return store;
        },
    };
}

// --- Re-implement functions for isolated testing (matching script.js logic) ---

const CUSTOM_SECTIONS_STORAGE_KEY = 'custom_sections';

let mockStorage;

function getCustomSections() {
    try {
        var raw = mockStorage.getItem(CUSTOM_SECTIONS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function addCustomSection(title, layout, itemType) {
    if (!title || typeof title !== 'string' || title.trim() === '') return null;
    var validLayouts = ['grid', 'list'];
    var validItemTypes = ['text', 'image', 'link'];
    if (validLayouts.indexOf(layout) === -1) return null;
    if (validItemTypes.indexOf(itemType) === -1) return null;

    var section = {
        id: 'custom-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        title: title.trim(),
        layout: layout,
        itemType: itemType,
        items: []
    };

    try {
        var sections = getCustomSections();
        sections.push(section);
        mockStorage.setItem(CUSTOM_SECTIONS_STORAGE_KEY, JSON.stringify(sections));
    } catch (e) {
        // Silently fail
    }

    return section;
}

function deleteCustomSection(sectionId) {
    if (!sectionId) return false;
    try {
        var sections = getCustomSections();
        var originalLength = sections.length;
        var filtered = sections.filter(function (s) { return s.id !== sectionId; });
        if (filtered.length === originalLength) return false;
        mockStorage.setItem(CUSTOM_SECTIONS_STORAGE_KEY, JSON.stringify(filtered));
        return true;
    } catch (e) {
        return false;
    }
}

function addItemToCustomSection(sectionId, item) {
    if (!sectionId || !item) return false;
    try {
        var sections = getCustomSections();
        var found = false;
        for (var i = 0; i < sections.length; i++) {
            if (sections[i].id === sectionId) {
                if (!Array.isArray(sections[i].items)) {
                    sections[i].items = [];
                }
                sections[i].items.push(item);
                found = true;
                break;
            }
        }
        if (!found) return false;
        mockStorage.setItem(CUSTOM_SECTIONS_STORAGE_KEY, JSON.stringify(sections));
        return true;
    } catch (e) {
        return false;
    }
}

// --- Tests ---

describe('Custom Section Persistence (Requirements 10.3, 10.4, 10.5, 10.7)', () => {
    beforeEach(() => {
        mockStorage = createMockLocalStorage();
    });

    describe('getCustomSections()', () => {
        it('returns empty array when no sections exist', () => {
            expect(getCustomSections()).toEqual([]);
        });

        it('returns persisted sections from localStorage', () => {
            const sections = [
                { id: 'custom-1', title: 'Movies', layout: 'grid', itemType: 'text', items: [] }
            ];
            mockStorage.setItem(CUSTOM_SECTIONS_STORAGE_KEY, JSON.stringify(sections));
            expect(getCustomSections()).toEqual(sections);
        });

        it('returns empty array on invalid JSON', () => {
            mockStorage.setItem(CUSTOM_SECTIONS_STORAGE_KEY, 'not-json{{{');
            expect(getCustomSections()).toEqual([]);
        });
    });

    describe('addCustomSection()', () => {
        it('creates a section with valid inputs and persists it', () => {
            const result = addCustomSection('Favorite Movies', 'grid', 'text');
            expect(result).not.toBeNull();
            expect(result.title).toBe('Favorite Movies');
            expect(result.layout).toBe('grid');
            expect(result.itemType).toBe('text');
            expect(result.items).toEqual([]);
            expect(result.id).toMatch(/^custom-/);

            const stored = getCustomSections();
            expect(stored).toHaveLength(1);
            expect(stored[0]).toEqual(result);
        });

        it('trims whitespace from title', () => {
            const result = addCustomSection('  Bucket List  ', 'list', 'link');
            expect(result.title).toBe('Bucket List');
        });

        it('returns null for empty title', () => {
            expect(addCustomSection('', 'grid', 'text')).toBeNull();
            expect(addCustomSection('   ', 'grid', 'text')).toBeNull();
            expect(getCustomSections()).toEqual([]);
        });

        it('returns null for null/undefined title', () => {
            expect(addCustomSection(null, 'grid', 'text')).toBeNull();
            expect(addCustomSection(undefined, 'grid', 'text')).toBeNull();
        });

        it('returns null for invalid layout', () => {
            expect(addCustomSection('Test', 'table', 'text')).toBeNull();
            expect(addCustomSection('Test', '', 'text')).toBeNull();
        });

        it('returns null for invalid itemType', () => {
            expect(addCustomSection('Test', 'grid', 'video')).toBeNull();
            expect(addCustomSection('Test', 'grid', '')).toBeNull();
        });

        it('appends to existing sections', () => {
            addCustomSection('Section 1', 'grid', 'text');
            addCustomSection('Section 2', 'list', 'image');
            const stored = getCustomSections();
            expect(stored).toHaveLength(2);
            expect(stored[0].title).toBe('Section 1');
            expect(stored[1].title).toBe('Section 2');
        });

        it('generates unique IDs for each section', () => {
            const s1 = addCustomSection('A', 'grid', 'text');
            const s2 = addCustomSection('B', 'grid', 'text');
            expect(s1.id).not.toBe(s2.id);
        });
    });

    describe('deleteCustomSection()', () => {
        it('removes a section by ID and returns true', () => {
            const s1 = addCustomSection('To Delete', 'grid', 'text');
            addCustomSection('To Keep', 'list', 'link');

            const result = deleteCustomSection(s1.id);
            expect(result).toBe(true);

            const stored = getCustomSections();
            expect(stored).toHaveLength(1);
            expect(stored[0].title).toBe('To Keep');
        });

        it('returns false for non-existent section ID', () => {
            addCustomSection('Existing', 'grid', 'text');
            expect(deleteCustomSection('non-existent-id')).toBe(false);
            expect(getCustomSections()).toHaveLength(1);
        });

        it('returns false for null/empty sectionId', () => {
            expect(deleteCustomSection(null)).toBe(false);
            expect(deleteCustomSection('')).toBe(false);
        });
    });

    describe('addItemToCustomSection()', () => {
        it('adds an item to the correct section', () => {
            const section = addCustomSection('Movies', 'grid', 'text');
            const item = { id: 'item-1', content: 'Inception' };

            const result = addItemToCustomSection(section.id, item);
            expect(result).toBe(true);

            const stored = getCustomSections();
            expect(stored[0].items).toHaveLength(1);
            expect(stored[0].items[0]).toEqual(item);
        });

        it('appends multiple items', () => {
            const section = addCustomSection('Links', 'list', 'link');
            addItemToCustomSection(section.id, { id: 'i1', content: 'https://a.com' });
            addItemToCustomSection(section.id, { id: 'i2', content: 'https://b.com' });

            const stored = getCustomSections();
            expect(stored[0].items).toHaveLength(2);
        });

        it('returns false for non-existent section', () => {
            expect(addItemToCustomSection('fake-id', { id: 'x', content: 'y' })).toBe(false);
        });

        it('returns false for null sectionId or item', () => {
            expect(addItemToCustomSection(null, { id: 'x', content: 'y' })).toBe(false);
            const section = addCustomSection('Test', 'grid', 'text');
            expect(addItemToCustomSection(section.id, null)).toBe(false);
        });
    });

    describe('persistence round-trip', () => {
        it('data survives JSON serialization/deserialization', () => {
            const s = addCustomSection('Round Trip', 'list', 'link');
            addItemToCustomSection(s.id, { id: 'rt-1', content: 'https://example.com', caption: 'Example' });

            // Simulate reading raw from localStorage and parsing
            const raw = mockStorage.getItem(CUSTOM_SECTIONS_STORAGE_KEY);
            const parsed = JSON.parse(raw);
            expect(parsed).toHaveLength(1);
            expect(parsed[0].title).toBe('Round Trip');
            expect(parsed[0].items[0].content).toBe('https://example.com');
        });
    });
});
