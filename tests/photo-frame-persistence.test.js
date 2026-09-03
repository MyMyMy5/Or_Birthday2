/**
 * Unit tests for photo frame persistence and application (Task 4.1)
 * Validates: Requirements 4.2, 4.3, 4.4, 4.5
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
function loadPhotoFrameFunctions() {
    var PHOTO_FRAMES_STORAGE_KEY = 'photo_frames';
    var VALID_FRAME_NAMES = ['confetti', 'balloons', 'hearts', 'stars', 'cake'];

    function getPhotoFrames() {
        try {
            var raw = localStorage.getItem(PHOTO_FRAMES_STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function setPhotoFrame(itemId, frameName) {
        try {
            if (VALID_FRAME_NAMES.indexOf(frameName) === -1) return;
            var currentStore = getPhotoFrames();
            currentStore[itemId] = frameName;
            localStorage.setItem(PHOTO_FRAMES_STORAGE_KEY, JSON.stringify(currentStore));
        } catch (e) {
            // Silently fail
        }
    }

    function removePhotoFrame(itemId) {
        try {
            var currentStore = getPhotoFrames();
            delete currentStore[itemId];
            localStorage.setItem(PHOTO_FRAMES_STORAGE_KEY, JSON.stringify(currentStore));
        } catch (e) {
            // Silently fail
        }
    }

    return { getPhotoFrames, setPhotoFrame, removePhotoFrame, VALID_FRAME_NAMES };
}

describe('Photo Frame Persistence (Task 4.1)', function () {
    var fns;

    beforeEach(function () {
        fns = loadPhotoFrameFunctions();
    });

    describe('getPhotoFrames', function () {
        it('returns empty object when no frames stored', function () {
            expect(fns.getPhotoFrames()).toEqual({});
        });

        it('returns stored frames', function () {
            var data = { 'photo1': 'confetti', 'photo2': 'hearts' };
            localStorage.setItem('photo_frames', JSON.stringify(data));
            expect(fns.getPhotoFrames()).toEqual(data);
        });

        it('returns empty object on invalid JSON', function () {
            localStorage.setItem('photo_frames', 'not-json');
            expect(fns.getPhotoFrames()).toEqual({});
        });
    });

    describe('setPhotoFrame', function () {
        it('persists frame name for a photo', function () {
            fns.setPhotoFrame('photo1', 'confetti');
            var stored = JSON.parse(localStorage.getItem('photo_frames'));
            expect(stored.photo1).toBe('confetti');
        });

        it('accepts all valid frame names', function () {
            fns.VALID_FRAME_NAMES.forEach(function (name, i) {
                fns.setPhotoFrame('photo' + i, name);
            });
            var stored = JSON.parse(localStorage.getItem('photo_frames'));
            expect(stored.photo0).toBe('confetti');
            expect(stored.photo1).toBe('balloons');
            expect(stored.photo2).toBe('hearts');
            expect(stored.photo3).toBe('stars');
            expect(stored.photo4).toBe('cake');
        });

        it('rejects invalid frame names', function () {
            fns.setPhotoFrame('photo1', 'invalid-frame');
            var raw = localStorage.getItem('photo_frames');
            // Should not store anything
            expect(raw).toBeNull();
        });

        it('preserves existing frames for other photos', function () {
            fns.setPhotoFrame('photo1', 'confetti');
            fns.setPhotoFrame('photo2', 'hearts');
            var stored = JSON.parse(localStorage.getItem('photo_frames'));
            expect(stored.photo1).toBe('confetti');
            expect(stored.photo2).toBe('hearts');
        });

        it('overwrites existing frame for same photo', function () {
            fns.setPhotoFrame('photo1', 'confetti');
            fns.setPhotoFrame('photo1', 'stars');
            var stored = JSON.parse(localStorage.getItem('photo_frames'));
            expect(stored.photo1).toBe('stars');
        });
    });

    describe('removePhotoFrame', function () {
        it('removes frame for specified photo', function () {
            fns.setPhotoFrame('photo1', 'confetti');
            fns.setPhotoFrame('photo2', 'hearts');
            fns.removePhotoFrame('photo1');
            var stored = JSON.parse(localStorage.getItem('photo_frames'));
            expect(stored.photo1).toBeUndefined();
            expect(stored.photo2).toBe('hearts');
        });

        it('does not throw when removing non-existent frame', function () {
            expect(function () { fns.removePhotoFrame('nonexistent'); }).not.toThrow();
        });
    });

    describe('round-trip persistence', function () {
        it('set then get returns same frame name', function () {
            fns.setPhotoFrame('photo1', 'balloons');
            var frames = fns.getPhotoFrames();
            expect(frames.photo1).toBe('balloons');
        });

        it('JSON serialization round-trip preserves data', function () {
            fns.setPhotoFrame('photo1', 'cake');
            fns.setPhotoFrame('photo2', 'stars');
            var raw = localStorage.getItem('photo_frames');
            var parsed = JSON.parse(raw);
            var reserialized = JSON.stringify(parsed);
            expect(JSON.parse(reserialized)).toEqual({ photo1: 'cake', photo2: 'stars' });
        });
    });
});
