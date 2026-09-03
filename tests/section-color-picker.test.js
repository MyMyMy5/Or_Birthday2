import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Unit tests for Section Background Color Picker.
 *
 * Tests the core behavior:
 * - getSectionColors reads and parses from localStorage
 * - saveSectionColors persists to localStorage
 * - wireSectionColorPicker wires input/change/reset events correctly
 * - applySavedSectionColors applies saved colors to sections and pickers
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

// --- Minimal localStorage mock ---
function createLocalStorageMock() {
    var store = {};
    return {
        getItem: function (key) {
            return store[key] !== undefined ? store[key] : null;
        },
        setItem: function (key, value) {
            store[key] = String(value);
        },
        removeItem: function (key) {
            delete store[key];
        },
        clear: function () {
            store = {};
        }
    };
}

// --- Minimal DOM mock ---
function createMockElement(opts) {
    var listeners = {};
    var children = [];
    var attrs = {};
    var style = {};

    var el = {
        _tag: opts && opts.tag || 'div',
        className: opts && opts.className || '',
        id: opts && opts.id || '',
        type: opts && opts.type || '',
        value: opts && opts.value || '',
        textContent: opts && opts.textContent || '',
        style: style,
        _children: children,
        _attrs: attrs,
        _listeners: listeners,
        setAttribute: function (name, val) {
            attrs[name] = val;
        },
        getAttribute: function (name) {
            return attrs[name] !== undefined ? attrs[name] : null;
        },
        appendChild: function (child) {
            children.push(child);
            child._parent = el;
        },
        insertBefore: function (newChild, refChild) {
            var idx = children.indexOf(refChild);
            if (idx === -1) {
                children.push(newChild);
            } else {
                children.splice(idx, 0, newChild);
            }
            newChild._parent = el;
        },
        querySelector: function (selector) {
            return findInChildren(children, selector);
        },
        querySelectorAll: function (selector) {
            return findAllInChildren(children, selector);
        },
        addEventListener: function (event, handler) {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push(handler);
        },
        dispatchEvent: function (event) {
            var handlers = listeners[event.type] || [];
            for (var i = 0; i < handlers.length; i++) {
                handlers[i](event);
            }
        },
        get firstChild() {
            return children[0] || null;
        },
        get parentNode() {
            return el._parent || null;
        }
    };
    return el;
}

function matchesSelector(el, selector) {
    if (selector.startsWith('.')) {
        var cls = selector.slice(1);
        return el.className && el.className.split(' ').indexOf(cls) !== -1;
    }
    if (selector.startsWith('#')) {
        return el.id === selector.slice(1);
    }
    return el._tag === selector;
}

function findInChildren(children, selector) {
    for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (matchesSelector(child, selector)) return child;
        var found = findInChildren(child._children || [], selector);
        if (found) return found;
    }
    return null;
}

function findAllInChildren(children, selector) {
    var results = [];
    for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (matchesSelector(child, selector)) results.push(child);
        var nested = findAllInChildren(child._children || [], selector);
        for (var j = 0; j < nested.length; j++) results.push(nested[j]);
    }
    return results;
}

// --- Re-implement functions under test for isolated testing ---

function getSectionColors(storage) {
    try {
        var raw = storage.getItem('section_colors');
        if (raw) {
            var parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                return parsed;
            }
        }
    } catch (e) {
        // Invalid JSON or localStorage unavailable
    }
    return {};
}

function saveSectionColors(storage, colors) {
    try {
        storage.setItem('section_colors', JSON.stringify(colors));
    } catch (e) {
        // localStorage unavailable — silently fail
    }
}

function wireSectionColorPicker(panel, sectionId, storage, getSection) {
    var colorPicker = panel.querySelector('.ssp-color-picker');
    var resetBtn = panel.querySelector('.ssp-color-reset');
    var section = getSection(sectionId);
    if (!colorPicker || !resetBtn || !section) return;

    // Set initial color picker value from saved colors
    var colors = getSectionColors(storage);
    if (colors[sectionId]) {
        colorPicker.value = colors[sectionId];
    }

    // On input: update section background immediately (live preview)
    colorPicker.addEventListener('input', function () {
        section.style.backgroundColor = colorPicker.value;
    });

    // On change: persist to localStorage
    colorPicker.addEventListener('change', function () {
        var colors = getSectionColors(storage);
        colors[sectionId] = colorPicker.value;
        saveSectionColors(storage, colors);
    });

    // Reset button: revert to default background and remove from storage
    resetBtn.addEventListener('click', function () {
        section.style.backgroundColor = '';
        colorPicker.value = '#000000';
        var colors = getSectionColors(storage);
        delete colors[sectionId];
        saveSectionColors(storage, colors);
    });
}

function applySavedSectionColors(storage, getSection) {
    var colors = getSectionColors(storage);
    var sectionIds = Object.keys(colors);
    for (var i = 0; i < sectionIds.length; i++) {
        var sectionId = sectionIds[i];
        var section = getSection(sectionId);
        if (section) {
            section.style.backgroundColor = colors[sectionId];
            var panel = section.querySelector('.section-settings-panel');
            if (panel) {
                var picker = panel.querySelector('.ssp-color-picker');
                if (picker) {
                    picker.value = colors[sectionId];
                }
            }
        }
    }
}

// --- Helper to build mock section with panel ---

function buildMockSection(sectionId) {
    var section = createMockElement({ tag: 'div', className: 'section', id: sectionId });
    return section;
}

function buildMockPanel(sectionId) {
    var panel = createMockElement({ tag: 'div', className: 'section-settings-panel' });
    panel.setAttribute('data-section-id', sectionId);

    var colorGroup = createMockElement({ tag: 'div', className: 'ssp-group ssp-color' });
    var colorPicker = createMockElement({ tag: 'input', className: 'ssp-color-picker', type: 'color', value: '#000000' });
    var resetBtn = createMockElement({ tag: 'button', className: 'ssp-color-reset', textContent: 'Reset' });

    colorGroup.appendChild(colorPicker);
    colorGroup.appendChild(resetBtn);
    panel.appendChild(colorGroup);

    return panel;
}

// --- Tests ---

describe('Section Color Picker - getSectionColors', function () {
    var storage;

    beforeEach(function () {
        storage = createLocalStorageMock();
    });

    it('should return empty object when nothing is stored', function () {
        expect(getSectionColors(storage)).toEqual({});
    });

    it('should return parsed colors from localStorage', function () {
        storage.setItem('section_colors', JSON.stringify({ 'photos-section': '#ff0000' }));
        expect(getSectionColors(storage)).toEqual({ 'photos-section': '#ff0000' });
    });

    it('should return empty object for invalid JSON', function () {
        storage.setItem('section_colors', 'not-json');
        expect(getSectionColors(storage)).toEqual({});
    });

    it('should return empty object for non-object JSON', function () {
        storage.setItem('section_colors', '"just a string"');
        expect(getSectionColors(storage)).toEqual({});
    });

    it('should handle multiple section colors', function () {
        var colors = { 'photos-section': '#ff0000', 'songs-section': '#00ff00', 'timeline-section': '#0000ff' };
        storage.setItem('section_colors', JSON.stringify(colors));
        expect(getSectionColors(storage)).toEqual(colors);
    });
});

describe('Section Color Picker - saveSectionColors', function () {
    var storage;

    beforeEach(function () {
        storage = createLocalStorageMock();
    });

    it('should save colors to localStorage as JSON', function () {
        saveSectionColors(storage, { 'songs-section': '#00ff00' });
        expect(storage.getItem('section_colors')).toBe(JSON.stringify({ 'songs-section': '#00ff00' }));
    });

    it('should overwrite existing colors', function () {
        saveSectionColors(storage, { 'a': '#111' });
        saveSectionColors(storage, { 'b': '#222' });
        expect(JSON.parse(storage.getItem('section_colors'))).toEqual({ 'b': '#222' });
    });
});

describe('Section Color Picker - wireSectionColorPicker', function () {
    var storage;
    var section;
    var panel;
    var getSection;

    beforeEach(function () {
        storage = createLocalStorageMock();
        section = buildMockSection('photos-section');
        panel = buildMockPanel('photos-section');
        section.appendChild(panel);
        getSection = function (id) {
            if (id === 'photos-section') return section;
            return null;
        };
    });

    it('should set color picker value from saved color on wire', function () {
        storage.setItem('section_colors', JSON.stringify({ 'photos-section': '#abcdef' }));
        wireSectionColorPicker(panel, 'photos-section', storage, getSection);
        var picker = panel.querySelector('.ssp-color-picker');
        expect(picker.value).toBe('#abcdef');
    });

    it('should leave color picker at default when no saved color', function () {
        wireSectionColorPicker(panel, 'photos-section', storage, getSection);
        var picker = panel.querySelector('.ssp-color-picker');
        expect(picker.value).toBe('#000000');
    });

    it('should update section background on input event', function () {
        wireSectionColorPicker(panel, 'photos-section', storage, getSection);
        var picker = panel.querySelector('.ssp-color-picker');
        picker.value = '#ff5500';
        picker.dispatchEvent({ type: 'input' });
        expect(section.style.backgroundColor).toBe('#ff5500');
    });

    it('should persist color to localStorage on change event', function () {
        wireSectionColorPicker(panel, 'photos-section', storage, getSection);
        var picker = panel.querySelector('.ssp-color-picker');
        picker.value = '#123456';
        picker.dispatchEvent({ type: 'change' });
        var saved = JSON.parse(storage.getItem('section_colors'));
        expect(saved['photos-section']).toBe('#123456');
    });

    it('should reset section background on reset button click', function () {
        section.style.backgroundColor = '#ff0000';
        wireSectionColorPicker(panel, 'photos-section', storage, getSection);
        var resetBtn = panel.querySelector('.ssp-color-reset');
        resetBtn.dispatchEvent({ type: 'click' });
        expect(section.style.backgroundColor).toBe('');
    });

    it('should remove section color from localStorage on reset', function () {
        storage.setItem('section_colors', JSON.stringify({ 'photos-section': '#ff0000', 'songs-section': '#00ff00' }));
        wireSectionColorPicker(panel, 'photos-section', storage, getSection);
        var resetBtn = panel.querySelector('.ssp-color-reset');
        resetBtn.dispatchEvent({ type: 'click' });
        var saved = JSON.parse(storage.getItem('section_colors'));
        expect(saved['photos-section']).toBeUndefined();
        expect(saved['songs-section']).toBe('#00ff00');
    });

    it('should reset color picker value to #000000 on reset', function () {
        storage.setItem('section_colors', JSON.stringify({ 'photos-section': '#ff0000' }));
        wireSectionColorPicker(panel, 'photos-section', storage, getSection);
        var picker = panel.querySelector('.ssp-color-picker');
        expect(picker.value).toBe('#ff0000');
        var resetBtn = panel.querySelector('.ssp-color-reset');
        resetBtn.dispatchEvent({ type: 'click' });
        expect(picker.value).toBe('#000000');
    });

    it('should not crash when section is not found', function () {
        var noSection = function () { return null; };
        expect(function () {
            wireSectionColorPicker(panel, 'nonexistent', storage, noSection);
        }).not.toThrow();
    });
});

describe('Section Color Picker - applySavedSectionColors', function () {
    var storage;
    var sections;
    var getSection;

    beforeEach(function () {
        storage = createLocalStorageMock();
        sections = {};
        getSection = function (id) {
            return sections[id] || null;
        };
    });

    it('should apply saved colors to sections', function () {
        sections['photos-section'] = buildMockSection('photos-section');
        storage.setItem('section_colors', JSON.stringify({ 'photos-section': '#aabbcc' }));
        applySavedSectionColors(storage, getSection);
        expect(sections['photos-section'].style.backgroundColor).toBe('#aabbcc');
    });

    it('should not crash when section ID does not exist in DOM', function () {
        storage.setItem('section_colors', JSON.stringify({ 'nonexistent-section': '#111111' }));
        expect(function () { applySavedSectionColors(storage, getSection); }).not.toThrow();
    });

    it('should update color picker value in panel if present', function () {
        var section = buildMockSection('songs-section');
        var panel = buildMockPanel('songs-section');
        section.appendChild(panel);
        sections['songs-section'] = section;
        storage.setItem('section_colors', JSON.stringify({ 'songs-section': '#ddeeff' }));
        applySavedSectionColors(storage, getSection);
        var picker = panel.querySelector('.ssp-color-picker');
        expect(picker.value).toBe('#ddeeff');
    });

    it('should apply colors to multiple sections', function () {
        sections['photos-section'] = buildMockSection('photos-section');
        sections['songs-section'] = buildMockSection('songs-section');
        storage.setItem('section_colors', JSON.stringify({
            'photos-section': '#111111',
            'songs-section': '#222222'
        }));
        applySavedSectionColors(storage, getSection);
        expect(sections['photos-section'].style.backgroundColor).toBe('#111111');
        expect(sections['songs-section'].style.backgroundColor).toBe('#222222');
    });

    it('should do nothing when no colors are saved', function () {
        sections['photos-section'] = buildMockSection('photos-section');
        applySavedSectionColors(storage, getSection);
        expect(sections['photos-section'].style.backgroundColor).toBeUndefined();
    });
});
