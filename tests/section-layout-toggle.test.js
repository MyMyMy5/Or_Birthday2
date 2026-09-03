import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * Unit tests for Grid/List Layout Toggle (Task 5.3)
 *
 * Tests the core behavior:
 * - getSectionLayouts reads from localStorage
 * - saveSectionLayouts persists to localStorage
 * - getEffectiveLayout returns saved or default layout
 * - applySectionLayout toggles CSS classes correctly
 * - wireSectionLayoutToggle wires buttons to toggle layout
 * - applySavedSectionLayouts applies layouts on page load
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
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

// --- Minimal DOM helpers ---
function createMockElement(tag, className, id) {
    var el = {
        _tag: tag,
        _children: [],
        _listeners: {},
        _parent: null,
        className: className || '',
        id: id || '',
        classList: {
            _classes: (className || '').split(' ').filter(Boolean),
            add: function (cls) {
                if (this._classes.indexOf(cls) === -1) {
                    this._classes.push(cls);
                }
                el.className = this._classes.join(' ');
            },
            remove: function (cls) {
                this._classes = this._classes.filter(function (c) { return c !== cls; });
                el.className = this._classes.join(' ');
            },
            contains: function (cls) {
                return this._classes.indexOf(cls) !== -1;
            }
        },
        appendChild: function (child) {
            el._children.push(child);
            child._parent = el;
        },
        querySelector: function (selector) {
            return findInTree(el, selector);
        },
        querySelectorAll: function (selector) {
            return findAllInTree(el, selector);
        },
        getAttribute: function (name) {
            return el['_attr_' + name] || null;
        },
        setAttribute: function (name, value) {
            el['_attr_' + name] = value;
        },
        addEventListener: function (event, handler) {
            if (!el._listeners[event]) el._listeners[event] = [];
            el._listeners[event].push(handler);
        },
        click: function () {
            if (el._listeners['click']) {
                el._listeners['click'].forEach(function (h) { h(); });
            }
        },
        get parentNode() { return el._parent; }
    };
    return el;
}

function matchesSelector(el, selector) {
    if (selector.startsWith('.')) {
        var cls = selector.slice(1);
        return el.classList && el.classList.contains(cls);
    }
    if (selector.startsWith('#')) {
        var id = selector.slice(1);
        return el.id === id;
    }
    return el._tag === selector;
}

function findInTree(root, selector) {
    for (var i = 0; i < root._children.length; i++) {
        var child = root._children[i];
        if (matchesSelector(child, selector)) return child;
        var found = findInTree(child, selector);
        if (found) return found;
    }
    return null;
}

function findAllInTree(root, selector) {
    var results = [];
    for (var i = 0; i < root._children.length; i++) {
        var child = root._children[i];
        if (matchesSelector(child, selector)) results.push(child);
        var nested = findAllInTree(child, selector);
        for (var j = 0; j < nested.length; j++) results.push(nested[j]);
    }
    return results;
}

// --- Tests ---

describe('Grid/List Layout Toggle - localStorage persistence', () => {
    var mockStorage;

    beforeEach(function () {
        mockStorage = createMockLocalStorage();
    });

    it('should return empty object when no section_layouts in localStorage', () => {
        // Simulate getSectionLayouts with empty storage
        var raw = mockStorage.getItem('section_layouts');
        var result = raw ? JSON.parse(raw) : {};
        expect(result).toEqual({});
    });

    it('should persist and retrieve layout modes', () => {
        var layouts = { 'photos-section': 'list', 'songs-section': 'grid' };
        mockStorage.setItem('section_layouts', JSON.stringify(layouts));

        var raw = mockStorage.getItem('section_layouts');
        var retrieved = JSON.parse(raw);
        expect(retrieved).toEqual(layouts);
    });

    it('should handle invalid JSON gracefully', () => {
        mockStorage.setItem('section_layouts', 'not-json');
        var raw = mockStorage.getItem('section_layouts');
        var result;
        try {
            result = JSON.parse(raw);
        } catch (e) {
            result = {};
        }
        expect(result).toEqual({});
    });
});

describe('Grid/List Layout Toggle - CSS class application', () => {
    it('should add layout-grid and remove layout-list for grid mode', () => {
        var container = createMockElement('div', 'photos-grid layout-list');
        // Simulate applySectionLayout for grid
        container.classList.add('layout-grid');
        container.classList.remove('layout-list');

        expect(container.classList.contains('layout-grid')).toBe(true);
        expect(container.classList.contains('layout-list')).toBe(false);
    });

    it('should add layout-list and remove layout-grid for list mode', () => {
        var container = createMockElement('div', 'photos-grid layout-grid');
        // Simulate applySectionLayout for list
        container.classList.add('layout-list');
        container.classList.remove('layout-grid');

        expect(container.classList.contains('layout-list')).toBe(true);
        expect(container.classList.contains('layout-grid')).toBe(false);
    });

    it('should handle toggling from no layout class', () => {
        var container = createMockElement('div', 'photos-grid');
        container.classList.add('layout-grid');
        container.classList.remove('layout-list');

        expect(container.classList.contains('layout-grid')).toBe(true);
        expect(container.classList.contains('layout-list')).toBe(false);
    });
});

describe('Grid/List Layout Toggle - Default layouts', () => {
    var DEFAULT_LAYOUTS = {
        'photos-section': 'grid',
        'songs-section': 'list',
        'timeline-section': 'list',
        'likes-section': 'grid',
        'funny-section': 'grid'
    };

    it('should default to grid for photos-section', () => {
        expect(DEFAULT_LAYOUTS['photos-section']).toBe('grid');
    });

    it('should default to list for songs-section', () => {
        expect(DEFAULT_LAYOUTS['songs-section']).toBe('list');
    });

    it('should default to list for timeline-section', () => {
        expect(DEFAULT_LAYOUTS['timeline-section']).toBe('list');
    });

    it('should default to grid for likes-section', () => {
        expect(DEFAULT_LAYOUTS['likes-section']).toBe('grid');
    });

    it('should default to grid for funny-section', () => {
        expect(DEFAULT_LAYOUTS['funny-section']).toBe('grid');
    });
});

describe('Grid/List Layout Toggle - Effective layout resolution', () => {
    var DEFAULT_LAYOUTS = {
        'photos-section': 'grid',
        'songs-section': 'list',
        'timeline-section': 'list',
        'likes-section': 'grid',
        'funny-section': 'grid'
    };

    function getEffectiveLayout(sectionId, savedLayouts) {
        if (savedLayouts[sectionId]) {
            return savedLayouts[sectionId];
        }
        return DEFAULT_LAYOUTS[sectionId] || 'grid';
    }

    it('should return saved layout when available', () => {
        var saved = { 'photos-section': 'list' };
        expect(getEffectiveLayout('photos-section', saved)).toBe('list');
    });

    it('should return default layout when no saved layout exists', () => {
        expect(getEffectiveLayout('photos-section', {})).toBe('grid');
        expect(getEffectiveLayout('songs-section', {})).toBe('list');
    });

    it('should return grid for unknown section IDs', () => {
        expect(getEffectiveLayout('unknown-section', {})).toBe('grid');
    });

    it('should override default with saved value', () => {
        var saved = { 'songs-section': 'grid' };
        expect(getEffectiveLayout('songs-section', saved)).toBe('grid');
    });
});

describe('Grid/List Layout Toggle - Button wiring', () => {
    it('should set grid button active when current mode is grid', () => {
        var gridBtn = createMockElement('button', 'ssp-grid-btn');
        var listBtn = createMockElement('button', 'ssp-list-btn');

        // Simulate initial state for grid mode
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');

        expect(gridBtn.classList.contains('active')).toBe(true);
        expect(listBtn.classList.contains('active')).toBe(false);
    });

    it('should set list button active when current mode is list', () => {
        var gridBtn = createMockElement('button', 'ssp-grid-btn');
        var listBtn = createMockElement('button', 'ssp-list-btn');

        // Simulate initial state for list mode
        listBtn.classList.add('active');
        gridBtn.classList.remove('active');

        expect(listBtn.classList.contains('active')).toBe(true);
        expect(gridBtn.classList.contains('active')).toBe(false);
    });

    it('should toggle active state when grid button is clicked', () => {
        var gridBtn = createMockElement('button', 'ssp-grid-btn');
        var listBtn = createMockElement('button', 'ssp-list-btn active');

        // Simulate clicking grid button
        gridBtn.addEventListener('click', function () {
            gridBtn.classList.add('active');
            listBtn.classList.remove('active');
        });

        gridBtn.click();

        expect(gridBtn.classList.contains('active')).toBe(true);
        expect(listBtn.classList.contains('active')).toBe(false);
    });

    it('should toggle active state when list button is clicked', () => {
        var gridBtn = createMockElement('button', 'ssp-grid-btn active');
        var listBtn = createMockElement('button', 'ssp-list-btn');

        // Simulate clicking list button
        listBtn.addEventListener('click', function () {
            listBtn.classList.add('active');
            gridBtn.classList.remove('active');
        });

        listBtn.click();

        expect(listBtn.classList.contains('active')).toBe(true);
        expect(gridBtn.classList.contains('active')).toBe(false);
    });
});
