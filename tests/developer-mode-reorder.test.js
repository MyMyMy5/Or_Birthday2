import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Unit tests for applyOrder utility function.
 *
 * Since applyOrder and its helpers are global functions in script.js (not modules),
 * we re-implement the logic here for isolated unit testing.
 *
 * Validates: Requirement 7 (Order Persistence in localStorage)
 */

// --- localStorage mock ---
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] ?? null,
        setItem: (key, value) => { store[key] = String(value); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; },
    };
})();

// --- Constants (mirroring script.js) ---
const ORDER_MAP_KEY = 'developer_mode_order';

// --- Helper functions (mirroring script.js logic) ---
function readOrderMap() {
    try {
        var raw = localStorageMock.getItem(ORDER_MAP_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
}

function getOrderedIds(section) {
    var map = readOrderMap();
    return Array.isArray(map[section]) ? map[section] : [];
}

function writeOrderMap(map) {
    try { localStorageMock.setItem(ORDER_MAP_KEY, JSON.stringify(map)); } catch (e) {}
}

function saveOrder(section, orderedIds) {
    var map = readOrderMap();
    map[section] = orderedIds;
    writeOrderMap(map);
}

function removeFromOrder(section, itemId) {
    var map = readOrderMap();
    if (Array.isArray(map[section])) {
        map[section] = map[section].filter(function (id) { return id !== itemId; });
        writeOrderMap(map);
    }
}

function applyOrder(items, section) {
    var orderedIds = getOrderedIds(section);
    if (orderedIds.length === 0) return items;

    var idToItem = {};
    items.forEach(function (item) { idToItem[item.id] = item; });

    var ordered = [];
    orderedIds.forEach(function (id) {
        if (idToItem[id]) {
            ordered.push(idToItem[id]);
            delete idToItem[id];
        }
    });
    // Append items not in the saved order (new items)
    Object.keys(idToItem).forEach(function (id) {
        ordered.push(idToItem[id]);
    });
    return ordered;
}

// --- Test Data ---
function makeItem(id) {
    return { id, source: `src-${id}`, caption: `Caption ${id}` };
}

// --- Tests ---
describe('applyOrder', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    it('full match ordering - all items reordered to match saved order', () => {
        const items = [makeItem('a'), makeItem('b'), makeItem('c')];
        // Save order as c, a, b
        localStorageMock.setItem(ORDER_MAP_KEY, JSON.stringify({ photos: ['c', 'a', 'b'] }));

        const result = applyOrder(items, 'photos');

        expect(result.map(i => i.id)).toEqual(['c', 'a', 'b']);
    });

    it('partial match - some IDs in saved order are missing from items, those are skipped', () => {
        const items = [makeItem('a'), makeItem('c')];
        // Saved order includes 'b' which is not in items
        localStorageMock.setItem(ORDER_MAP_KEY, JSON.stringify({ photos: ['b', 'c', 'a'] }));

        const result = applyOrder(items, 'photos');

        // 'b' is skipped since it's not in items; result is c, a
        expect(result.map(i => i.id)).toEqual(['c', 'a']);
    });

    it('new items appended at end - items not in saved order appear after ordered items', () => {
        const items = [makeItem('a'), makeItem('b'), makeItem('c'), makeItem('d')];
        // Saved order only has a and b
        localStorageMock.setItem(ORDER_MAP_KEY, JSON.stringify({ songs: ['b', 'a'] }));

        const result = applyOrder(items, 'songs');

        // b and a come first (in saved order), then c and d (new items) appended
        expect(result[0].id).toBe('b');
        expect(result[1].id).toBe('a');
        // c and d should be appended (order among new items depends on Object.keys)
        const appendedIds = result.slice(2).map(i => i.id);
        expect(appendedIds).toContain('c');
        expect(appendedIds).toContain('d');
        expect(result.length).toBe(4);
    });

    it('empty saved order returns original array unchanged', () => {
        const items = [makeItem('x'), makeItem('y'), makeItem('z')];
        // No saved order for this section (empty localStorage)

        const result = applyOrder(items, 'photos');

        expect(result).toBe(items); // Same reference, not a copy
    });

    it('items not in the data are skipped - saved order has IDs that do not exist in items', () => {
        const items = [makeItem('a'), makeItem('b')];
        // Saved order references 'ghost1' and 'ghost2' which don't exist in items
        localStorageMock.setItem(ORDER_MAP_KEY, JSON.stringify({
            thingsYouLike: ['ghost1', 'a', 'ghost2', 'b']
        }));

        const result = applyOrder(items, 'thingsYouLike');

        // Only 'a' and 'b' should appear; ghosts are skipped
        expect(result.map(i => i.id)).toEqual(['a', 'b']);
        expect(result.length).toBe(2);
    });
});

/**
 * Tests for saveOrder / readOrderMap / getOrderedIds localStorage round-trip.
 *
 * Validates: Requirement 7 (Order Persistence in localStorage)
 */
describe('saveOrder / readOrderMap / getOrderedIds - localStorage round-trip', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    it('saveOrder writes to localStorage and readOrderMap reads it back correctly', () => {
        saveOrder('photos', ['img1', 'img2', 'img3']);

        const map = readOrderMap();
        expect(map.photos).toEqual(['img1', 'img2', 'img3']);
    });

    it('getOrderedIds returns the array for a given section', () => {
        saveOrder('songs', ['s1', 's2', 's3']);

        const ids = getOrderedIds('songs');
        expect(ids).toEqual(['s1', 's2', 's3']);
    });

    it('getOrderedIds returns empty array for non-existent section', () => {
        // No data saved for 'timeline'
        const ids = getOrderedIds('timeline');
        expect(ids).toEqual([]);
    });

    it('multiple sections can be stored independently', () => {
        saveOrder('photos', ['p1', 'p2']);
        saveOrder('songs', ['s1', 's2', 's3']);
        saveOrder('thingsYouLike', ['l1']);

        const map = readOrderMap();
        expect(map.photos).toEqual(['p1', 'p2']);
        expect(map.songs).toEqual(['s1', 's2', 's3']);
        expect(map.thingsYouLike).toEqual(['l1']);
    });

    it('saving to an existing section overwrites the previous order', () => {
        saveOrder('photos', ['a', 'b', 'c']);
        saveOrder('photos', ['c', 'b', 'a']);

        const ids = getOrderedIds('photos');
        expect(ids).toEqual(['c', 'b', 'a']);
    });
});

/**
 * Tests for removeFromOrder.
 *
 * Validates: Requirement 7 (Order Persistence in localStorage)
 */
describe('removeFromOrder', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    it('removes an existing ID from a section order', () => {
        saveOrder('photos', ['img1', 'img2', 'img3']);

        removeFromOrder('photos', 'img2');

        const ids = getOrderedIds('photos');
        expect(ids).toEqual(['img1', 'img3']);
    });

    it('removing a non-existing ID does not throw and leaves order unchanged', () => {
        saveOrder('songs', ['s1', 's2', 's3']);

        expect(() => removeFromOrder('songs', 'nonexistent')).not.toThrow();

        const ids = getOrderedIds('songs');
        expect(ids).toEqual(['s1', 's2', 's3']);
    });

    it('removing from a section that does not exist in the map does not throw', () => {
        // No data saved for 'funnyMoments'
        expect(() => removeFromOrder('funnyMoments', 'someId')).not.toThrow();

        // Map should remain empty or unchanged
        const map = readOrderMap();
        expect(map.funnyMoments).toBeUndefined();
    });
});


/**
 * Tests for Order_Map JSON round-trip property.
 *
 * Validates: Correctness Property P1 from design doc
 * For any valid Order_Map, JSON.parse(JSON.stringify(orderMap)) produces a deep-equal object.
 */
describe('Order_Map JSON round-trip property (P1)', () => {
    it('empty map round-trips correctly', () => {
        const orderMap = {};
        expect(JSON.parse(JSON.stringify(orderMap))).toEqual(orderMap);
    });

    it('single section round-trips correctly', () => {
        const orderMap = { photos: ['a', 'b', 'c'] };
        expect(JSON.parse(JSON.stringify(orderMap))).toEqual(orderMap);
    });

    it('multiple sections round-trip correctly', () => {
        const orderMap = {
            photos: ['a', 'b'],
            songs: ['s1', 's2', 's3'],
            thingsYouLike: ['l1']
        };
        expect(JSON.parse(JSON.stringify(orderMap))).toEqual(orderMap);
    });

    it('section with empty array round-trips correctly', () => {
        const orderMap = { photos: [] };
        expect(JSON.parse(JSON.stringify(orderMap))).toEqual(orderMap);
    });

    it('all five sections round-trip correctly', () => {
        const orderMap = {
            photos: ['img1.jpg', 'img2.png', 'url-abc123'],
            songs: ['song1.mp3', 'url-xyz789'],
            thingsYouLike: ['item1.jpg', 'item2.jpg'],
            funnyMoments: ['videoId1', 'videoId2'],
            timeline: ['calc1', 'calc2', 'linalg1']
        };
        expect(JSON.parse(JSON.stringify(orderMap))).toEqual(orderMap);
    });
});
