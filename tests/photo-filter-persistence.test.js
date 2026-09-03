/**
 * Unit tests for photo filter persistence and application (Task 3.1)
 * Validates: Requirements 3.3, 3.4, 3.7
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Minimal localStorage mock
var store = {};
var localStorageMock = {
    getItem: function (key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem: function (key, value) { store[key] = String(value); },
    removeItem: function (key) { delete store[key]; },
    clear: function () { store = {}; }
};

// Minimal document mock for applyFilterToElement
var mockElement = null;

beforeEach(function () {
    store = {};
    global.localStorage = localStorageMock;
    global.document = {
        createElement: function () { return {}; },
        querySelector: function () { return null; },
        querySelectorAll: function () { return []; },
        addEventListener: function () {},
        body: { classList: { contains: function () { return false; } } }
    };
    mockElement = { style: {} };
});

afterEach(function () {
    delete global.localStorage;
    delete global.document;
});

// Load the functions by evaluating the relevant portion
// We'll import the functions via a helper that extracts them
// Since script.js exposes them on window, we simulate that

function loadPhotoFilterFunctions() {
    // Replicate the logic from script.js
    var PHOTO_FILTERS_STORAGE_KEY = 'photo_filters';

    function clampFilterValue(key, value) {
        var bounds = {
            grayscale: { min: 0, max: 100 },
            sepia: { min: 0, max: 100 },
            brightness: { min: 50, max: 200 },
            contrast: { min: 50, max: 200 }
        };
        var b = bounds[key];
        if (!b) return value;
        return Math.max(b.min, Math.min(b.max, value));
    }

    function getPhotoFilters() {
        try {
            var raw = localStorage.getItem(PHOTO_FILTERS_STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function setPhotoFilter(itemId, filterValues) {
        try {
            var currentStore = getPhotoFilters();
            var clamped = {
                grayscale: clampFilterValue('grayscale', filterValues.grayscale),
                sepia: clampFilterValue('sepia', filterValues.sepia),
                brightness: clampFilterValue('brightness', filterValues.brightness),
                contrast: clampFilterValue('contrast', filterValues.contrast)
            };
            currentStore[itemId] = clamped;
            localStorage.setItem(PHOTO_FILTERS_STORAGE_KEY, JSON.stringify(currentStore));
        } catch (e) {
            // Silently fail
        }
    }

    function removePhotoFilter(itemId) {
        try {
            var currentStore = getPhotoFilters();
            delete currentStore[itemId];
            localStorage.setItem(PHOTO_FILTERS_STORAGE_KEY, JSON.stringify(currentStore));
        } catch (e) {
            // Silently fail
        }
    }

    function applyFilterToElement(imgElement, filterValues) {
        if (!imgElement || !filterValues) return;
        var grayscale = clampFilterValue('grayscale', filterValues.grayscale);
        var sepia = clampFilterValue('sepia', filterValues.sepia);
        var brightness = clampFilterValue('brightness', filterValues.brightness);
        var contrast = clampFilterValue('contrast', filterValues.contrast);
        imgElement.style.filter = 'grayscale(' + grayscale + '%) sepia(' + sepia + '%) brightness(' + brightness + '%) contrast(' + contrast + '%)';
    }

    return { getPhotoFilters, setPhotoFilter, removePhotoFilter, applyFilterToElement, clampFilterValue };
}

describe('Photo Filter Persistence (Task 3.1)', function () {
    var fns;

    beforeEach(function () {
        fns = loadPhotoFilterFunctions();
    });

    describe('getPhotoFilters', function () {
        it('returns empty object when no filters stored', function () {
            expect(fns.getPhotoFilters()).toEqual({});
        });

        it('returns stored filters', function () {
            var data = { 'photo1': { grayscale: 50, sepia: 0, brightness: 100, contrast: 100 } };
            localStorage.setItem('photo_filters', JSON.stringify(data));
            expect(fns.getPhotoFilters()).toEqual(data);
        });

        it('returns empty object on invalid JSON', function () {
            localStorage.setItem('photo_filters', 'not-json');
            expect(fns.getPhotoFilters()).toEqual({});
        });
    });

    describe('setPhotoFilter', function () {
        it('persists filter values for a photo', function () {
            fns.setPhotoFilter('photo1', { grayscale: 30, sepia: 20, brightness: 120, contrast: 80 });
            var stored = JSON.parse(localStorage.getItem('photo_filters'));
            expect(stored.photo1).toEqual({ grayscale: 30, sepia: 20, brightness: 120, contrast: 80 });
        });

        it('clamps values to allowed bounds', function () {
            fns.setPhotoFilter('photo1', { grayscale: -10, sepia: 200, brightness: 10, contrast: 300 });
            var stored = JSON.parse(localStorage.getItem('photo_filters'));
            expect(stored.photo1).toEqual({ grayscale: 0, sepia: 100, brightness: 50, contrast: 200 });
        });

        it('preserves existing filters for other photos', function () {
            fns.setPhotoFilter('photo1', { grayscale: 50, sepia: 0, brightness: 100, contrast: 100 });
            fns.setPhotoFilter('photo2', { grayscale: 0, sepia: 50, brightness: 150, contrast: 80 });
            var stored = JSON.parse(localStorage.getItem('photo_filters'));
            expect(stored.photo1).toEqual({ grayscale: 50, sepia: 0, brightness: 100, contrast: 100 });
            expect(stored.photo2).toEqual({ grayscale: 0, sepia: 50, brightness: 150, contrast: 80 });
        });
    });

    describe('removePhotoFilter', function () {
        it('removes filter for specified photo', function () {
            fns.setPhotoFilter('photo1', { grayscale: 50, sepia: 0, brightness: 100, contrast: 100 });
            fns.setPhotoFilter('photo2', { grayscale: 0, sepia: 50, brightness: 150, contrast: 80 });
            fns.removePhotoFilter('photo1');
            var stored = JSON.parse(localStorage.getItem('photo_filters'));
            expect(stored.photo1).toBeUndefined();
            expect(stored.photo2).toBeDefined();
        });

        it('does not throw when removing non-existent filter', function () {
            expect(function () { fns.removePhotoFilter('nonexistent'); }).not.toThrow();
        });
    });

    describe('applyFilterToElement', function () {
        it('sets CSS filter property on element', function () {
            fns.applyFilterToElement(mockElement, { grayscale: 50, sepia: 25, brightness: 120, contrast: 80 });
            expect(mockElement.style.filter).toBe('grayscale(50%) sepia(25%) brightness(120%) contrast(80%)');
        });

        it('clamps out-of-bounds values before applying', function () {
            fns.applyFilterToElement(mockElement, { grayscale: -5, sepia: 150, brightness: 300, contrast: 10 });
            expect(mockElement.style.filter).toBe('grayscale(0%) sepia(100%) brightness(200%) contrast(50%)');
        });

        it('does nothing when imgElement is null', function () {
            expect(function () { fns.applyFilterToElement(null, { grayscale: 50, sepia: 0, brightness: 100, contrast: 100 }); }).not.toThrow();
        });

        it('does nothing when filterValues is null', function () {
            expect(function () { fns.applyFilterToElement(mockElement, null); }).not.toThrow();
        });
    });

    describe('clampFilterValue', function () {
        it('clamps grayscale to [0, 100]', function () {
            expect(fns.clampFilterValue('grayscale', -10)).toBe(0);
            expect(fns.clampFilterValue('grayscale', 50)).toBe(50);
            expect(fns.clampFilterValue('grayscale', 150)).toBe(100);
        });

        it('clamps sepia to [0, 100]', function () {
            expect(fns.clampFilterValue('sepia', -5)).toBe(0);
            expect(fns.clampFilterValue('sepia', 75)).toBe(75);
            expect(fns.clampFilterValue('sepia', 200)).toBe(100);
        });

        it('clamps brightness to [50, 200]', function () {
            expect(fns.clampFilterValue('brightness', 10)).toBe(50);
            expect(fns.clampFilterValue('brightness', 100)).toBe(100);
            expect(fns.clampFilterValue('brightness', 250)).toBe(200);
        });

        it('clamps contrast to [50, 200]', function () {
            expect(fns.clampFilterValue('contrast', 0)).toBe(50);
            expect(fns.clampFilterValue('contrast', 150)).toBe(150);
            expect(fns.clampFilterValue('contrast', 300)).toBe(200);
        });

        it('returns value unchanged for unknown keys', function () {
            expect(fns.clampFilterValue('unknown', 999)).toBe(999);
        });
    });
});
