/**
 * Unit tests for photo tag persistence (Task 8.1)
 * Validates: Requirements 7.3, 7.7
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

beforeEach(function () {
    store = {};
    global.localStorage = localStorageMock;
});

afterEach(function () {
    delete global.localStorage;
});

// Replicate the logic from script.js for isolated testing
function loadPhotoTagFunctions() {
    var PHOTO_TAGS_STORAGE_KEY = 'photo_tags';

    function clampCoordinate(value) {
        return Math.max(0, Math.min(100, value));
    }

    function getPhotoTags() {
        try {
            var raw = localStorage.getItem(PHOTO_TAGS_STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function setPhotoTags(itemId, tags) {
        try {
            var currentStore = getPhotoTags();
            currentStore[itemId] = tags.map(function (tag) {
                return {
                    x: clampCoordinate(tag.x),
                    y: clampCoordinate(tag.y),
                    name: tag.name
                };
            });
            localStorage.setItem(PHOTO_TAGS_STORAGE_KEY, JSON.stringify(currentStore));
        } catch (e) {
            // Silently fail
        }
    }

    function addPhotoTag(itemId, tag) {
        try {
            var currentStore = getPhotoTags();
            if (!currentStore[itemId]) {
                currentStore[itemId] = [];
            }
            currentStore[itemId].push({
                x: clampCoordinate(tag.x),
                y: clampCoordinate(tag.y),
                name: tag.name
            });
            localStorage.setItem(PHOTO_TAGS_STORAGE_KEY, JSON.stringify(currentStore));
        } catch (e) {
            // Silently fail
        }
    }

    function removePhotoTag(itemId, tagIndex) {
        try {
            var currentStore = getPhotoTags();
            if (!currentStore[itemId] || tagIndex < 0 || tagIndex >= currentStore[itemId].length) return;
            currentStore[itemId].splice(tagIndex, 1);
            localStorage.setItem(PHOTO_TAGS_STORAGE_KEY, JSON.stringify(currentStore));
        } catch (e) {
            // Silently fail
        }
    }

    return { getPhotoTags, setPhotoTags, addPhotoTag, removePhotoTag, clampCoordinate };
}

describe('Photo Tag Persistence (Task 8.1)', function () {
    var fns;

    beforeEach(function () {
        fns = loadPhotoTagFunctions();
    });

    describe('clampCoordinate', function () {
        it('returns value unchanged when within [0, 100]', function () {
            expect(fns.clampCoordinate(50)).toBe(50);
            expect(fns.clampCoordinate(0)).toBe(0);
            expect(fns.clampCoordinate(100)).toBe(100);
        });

        it('clamps negative values to 0', function () {
            expect(fns.clampCoordinate(-10)).toBe(0);
            expect(fns.clampCoordinate(-999)).toBe(0);
        });

        it('clamps values above 100 to 100', function () {
            expect(fns.clampCoordinate(150)).toBe(100);
            expect(fns.clampCoordinate(999)).toBe(100);
        });
    });

    describe('getPhotoTags', function () {
        it('returns empty object when no tags stored', function () {
            expect(fns.getPhotoTags()).toEqual({});
        });

        it('returns stored tags', function () {
            var data = { 'photo1': [{ x: 10, y: 20, name: 'Alice' }] };
            localStorage.setItem('photo_tags', JSON.stringify(data));
            expect(fns.getPhotoTags()).toEqual(data);
        });

        it('returns empty object on invalid JSON', function () {
            localStorage.setItem('photo_tags', 'not-json');
            expect(fns.getPhotoTags()).toEqual({});
        });
    });

    describe('setPhotoTags', function () {
        it('persists tags for a photo', function () {
            var tags = [{ x: 25, y: 75, name: 'Bob' }];
            fns.setPhotoTags('photo1', tags);
            var stored = JSON.parse(localStorage.getItem('photo_tags'));
            expect(stored.photo1).toEqual([{ x: 25, y: 75, name: 'Bob' }]);
        });

        it('clamps coordinates to [0, 100]', function () {
            var tags = [{ x: -5, y: 150, name: 'Clamped' }];
            fns.setPhotoTags('photo1', tags);
            var stored = JSON.parse(localStorage.getItem('photo_tags'));
            expect(stored.photo1[0].x).toBe(0);
            expect(stored.photo1[0].y).toBe(100);
        });

        it('replaces all tags for a photo', function () {
            fns.setPhotoTags('photo1', [{ x: 10, y: 20, name: 'First' }]);
            fns.setPhotoTags('photo1', [{ x: 30, y: 40, name: 'Second' }]);
            var stored = JSON.parse(localStorage.getItem('photo_tags'));
            expect(stored.photo1).toEqual([{ x: 30, y: 40, name: 'Second' }]);
        });

        it('preserves tags for other photos', function () {
            fns.setPhotoTags('photo1', [{ x: 10, y: 20, name: 'A' }]);
            fns.setPhotoTags('photo2', [{ x: 30, y: 40, name: 'B' }]);
            var stored = JSON.parse(localStorage.getItem('photo_tags'));
            expect(stored.photo1).toEqual([{ x: 10, y: 20, name: 'A' }]);
            expect(stored.photo2).toEqual([{ x: 30, y: 40, name: 'B' }]);
        });
    });

    describe('addPhotoTag', function () {
        it('adds a tag to a photo with no existing tags', function () {
            fns.addPhotoTag('photo1', { x: 50, y: 60, name: 'New' });
            var stored = JSON.parse(localStorage.getItem('photo_tags'));
            expect(stored.photo1).toEqual([{ x: 50, y: 60, name: 'New' }]);
        });

        it('appends to existing tags', function () {
            fns.addPhotoTag('photo1', { x: 10, y: 20, name: 'First' });
            fns.addPhotoTag('photo1', { x: 30, y: 40, name: 'Second' });
            var stored = JSON.parse(localStorage.getItem('photo_tags'));
            expect(stored.photo1.length).toBe(2);
            expect(stored.photo1[1].name).toBe('Second');
        });

        it('clamps coordinates to [0, 100]', function () {
            fns.addPhotoTag('photo1', { x: -20, y: 200, name: 'Clamped' });
            var stored = JSON.parse(localStorage.getItem('photo_tags'));
            expect(stored.photo1[0].x).toBe(0);
            expect(stored.photo1[0].y).toBe(100);
        });
    });

    describe('removePhotoTag', function () {
        it('removes tag at specified index', function () {
            fns.setPhotoTags('photo1', [
                { x: 10, y: 20, name: 'A' },
                { x: 30, y: 40, name: 'B' },
                { x: 50, y: 60, name: 'C' }
            ]);
            fns.removePhotoTag('photo1', 1);
            var stored = JSON.parse(localStorage.getItem('photo_tags'));
            expect(stored.photo1.length).toBe(2);
            expect(stored.photo1[0].name).toBe('A');
            expect(stored.photo1[1].name).toBe('C');
        });

        it('does not throw for non-existent photo', function () {
            expect(function () { fns.removePhotoTag('nonexistent', 0); }).not.toThrow();
        });

        it('does not throw for out-of-bounds index', function () {
            fns.setPhotoTags('photo1', [{ x: 10, y: 20, name: 'A' }]);
            expect(function () { fns.removePhotoTag('photo1', 5); }).not.toThrow();
            var stored = JSON.parse(localStorage.getItem('photo_tags'));
            expect(stored.photo1.length).toBe(1);
        });

        it('does not throw for negative index', function () {
            fns.setPhotoTags('photo1', [{ x: 10, y: 20, name: 'A' }]);
            expect(function () { fns.removePhotoTag('photo1', -1); }).not.toThrow();
            var stored = JSON.parse(localStorage.getItem('photo_tags'));
            expect(stored.photo1.length).toBe(1);
        });
    });

    describe('round-trip persistence', function () {
        it('setPhotoTags then getPhotoTags returns equivalent data', function () {
            var tags = [
                { x: 10, y: 20, name: 'Alice' },
                { x: 80, y: 90, name: 'Bob' }
            ];
            fns.setPhotoTags('photo1', tags);
            var result = fns.getPhotoTags();
            expect(result.photo1).toEqual(tags);
        });

        it('JSON serialization round-trip preserves data', function () {
            fns.setPhotoTags('photo1', [{ x: 25, y: 75, name: 'Test' }]);
            fns.addPhotoTag('photo2', { x: 50, y: 50, name: 'Center' });
            var raw = localStorage.getItem('photo_tags');
            var parsed = JSON.parse(raw);
            var reserialized = JSON.stringify(parsed);
            expect(JSON.parse(reserialized)).toEqual(parsed);
        });
    });
});
