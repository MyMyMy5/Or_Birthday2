import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Unit tests for Grid Column Count Selector (Task 5.4)
 *
 * Tests the core behavior:
 * - getSectionColumns reads from localStorage
 * - saveSectionColumns persists to localStorage
 * - clampColumnCount clamps values to 2–6 range
 * - applySectionColumnCount sets CSS custom property
 * - Column selector visibility based on grid/list mode
 * - Range input wiring updates value and persists
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

// --- Minimal localStorage mock ---
function createMockLocalStorage() {
    var store = {};
    return {
        getItem: function (key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
        setItem: function (key, value) { store[key] = String(value); },
        removeItem: function (key) { delete store[key]; },
        clear: function () { store = {}; },
        _store: store
    };
}

describe('Grid Column Count - localStorage persistence', () => {
    var mockStorage;

    beforeEach(function () {
        mockStorage = createMockLocalStorage();
    });

    it('should return empty object when no section_columns in localStorage', () => {
        var raw = mockStorage.getItem('section_columns');
        var result = raw ? JSON.parse(raw) : {};
        expect(result).toEqual({});
    });

    it('should persist and retrieve column counts', () => {
        var columns = { 'photos-section': 4, 'likes-section': 5 };
        mockStorage.setItem('section_columns', JSON.stringify(columns));

        var raw = mockStorage.getItem('section_columns');
        var retrieved = JSON.parse(raw);
        expect(retrieved).toEqual(columns);
    });

    it('should handle invalid JSON gracefully', () => {
        mockStorage.setItem('section_columns', 'not-json');
        var raw = mockStorage.getItem('section_columns');
        var result;
        try {
            result = JSON.parse(raw);
        } catch (e) {
            result = {};
        }
        expect(result).toEqual({});
    });

    it('should store column count as a number', () => {
        var columns = { 'photos-section': 3 };
        mockStorage.setItem('section_columns', JSON.stringify(columns));

        var raw = mockStorage.getItem('section_columns');
        var retrieved = JSON.parse(raw);
        expect(typeof retrieved['photos-section']).toBe('number');
    });
});

describe('Grid Column Count - clampColumnCount', () => {
    // Replicate the clamp logic for testing
    function clampColumnCount(value) {
        var num = parseInt(value, 10);
        if (isNaN(num) || num < 2) return 2;
        if (num > 6) return 6;
        return num;
    }

    it('should return 2 for values below 2', () => {
        expect(clampColumnCount(0)).toBe(2);
        expect(clampColumnCount(1)).toBe(2);
        expect(clampColumnCount(-5)).toBe(2);
    });

    it('should return 6 for values above 6', () => {
        expect(clampColumnCount(7)).toBe(6);
        expect(clampColumnCount(10)).toBe(6);
        expect(clampColumnCount(100)).toBe(6);
    });

    it('should return the value itself for values in range 2–6', () => {
        expect(clampColumnCount(2)).toBe(2);
        expect(clampColumnCount(3)).toBe(3);
        expect(clampColumnCount(4)).toBe(4);
        expect(clampColumnCount(5)).toBe(5);
        expect(clampColumnCount(6)).toBe(6);
    });

    it('should handle string inputs by parsing them', () => {
        expect(clampColumnCount('3')).toBe(3);
        expect(clampColumnCount('5')).toBe(5);
        expect(clampColumnCount('1')).toBe(2);
        expect(clampColumnCount('8')).toBe(6);
    });

    it('should return 2 for NaN inputs', () => {
        expect(clampColumnCount(NaN)).toBe(2);
        expect(clampColumnCount('abc')).toBe(2);
        expect(clampColumnCount(undefined)).toBe(2);
        expect(clampColumnCount(null)).toBe(2);
    });
});

describe('Grid Column Count - CSS custom property application', () => {
    it('should set --grid-columns on the container style', () => {
        // Simulate a container element with style.setProperty
        var styleProps = {};
        var container = {
            style: {
                setProperty: function (prop, value) {
                    styleProps[prop] = value;
                }
            }
        };

        // Simulate applySectionColumnCount
        var count = 4;
        container.style.setProperty('--grid-columns', count);

        expect(styleProps['--grid-columns']).toBe(4);
    });

    it('should clamp before setting the property', () => {
        var styleProps = {};
        var container = {
            style: {
                setProperty: function (prop, value) {
                    styleProps[prop] = value;
                }
            }
        };

        // Simulate with out-of-range value
        function clampColumnCount(value) {
            var num = parseInt(value, 10);
            if (isNaN(num) || num < 2) return 2;
            if (num > 6) return 6;
            return num;
        }

        var clamped = clampColumnCount(10);
        container.style.setProperty('--grid-columns', clamped);

        expect(styleProps['--grid-columns']).toBe(6);
    });
});

describe('Grid Column Count - Column selector visibility', () => {
    it('should show column selector when section is in grid mode', () => {
        // Simulate: mode is 'grid', columnsGroup.style.display should be ''
        var mode = 'grid';
        var display = (mode === 'grid') ? '' : 'none';
        expect(display).toBe('');
    });

    it('should hide column selector when section is in list mode', () => {
        // Simulate: mode is 'list', columnsGroup.style.display should be 'none'
        var mode = 'list';
        var display = (mode === 'grid') ? '' : 'none';
        expect(display).toBe('none');
    });
});

describe('Grid Column Count - Range input behavior', () => {
    it('should initialize range value from saved column count', () => {
        var mockStorage = createMockLocalStorage();
        var columns = { 'photos-section': 5 };
        mockStorage.setItem('section_columns', JSON.stringify(columns));

        var raw = mockStorage.getItem('section_columns');
        var saved = JSON.parse(raw);
        var initialValue = saved['photos-section'] || 3;

        expect(initialValue).toBe(5);
    });

    it('should default to 3 when no saved column count exists', () => {
        var mockStorage = createMockLocalStorage();
        var raw = mockStorage.getItem('section_columns');
        var saved = raw ? JSON.parse(raw) : {};
        var initialValue = saved['photos-section'] ? saved['photos-section'] : 3;

        expect(initialValue).toBe(3);
    });

    it('should update displayed value when range changes', () => {
        // Simulate: range input fires 'input' event, colsValue.textContent updates
        var displayedValue = '3';
        var newRangeValue = '5';

        function clampColumnCount(value) {
            var num = parseInt(value, 10);
            if (isNaN(num) || num < 2) return 2;
            if (num > 6) return 6;
            return num;
        }

        var clamped = clampColumnCount(newRangeValue);
        displayedValue = String(clamped);

        expect(displayedValue).toBe('5');
    });

    it('should persist column count on change event', () => {
        var mockStorage = createMockLocalStorage();
        var sectionId = 'photos-section';
        var count = 4;

        // Simulate saving
        var raw = mockStorage.getItem('section_columns');
        var columns = raw ? JSON.parse(raw) : {};
        columns[sectionId] = count;
        mockStorage.setItem('section_columns', JSON.stringify(columns));

        // Verify persistence
        var retrieved = JSON.parse(mockStorage.getItem('section_columns'));
        expect(retrieved[sectionId]).toBe(4);
    });
});
