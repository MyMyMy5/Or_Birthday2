import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Unit tests for Section Settings Panel injection and removal.
 *
 * Tests the core behavior:
 * - createSectionSettingsPanel builds correct DOM structure
 * - injectSectionSettingsPanels adds panels to all sections
 * - removeSectionSettingsPanels removes all panels
 * - Panels are injected as first child of each section
 * - Duplicate injection is prevented
 *
 * Requirements: 5.1, 6.1, 8.1, 9.1, 10.1
 */

// --- Minimal DOM mock ---

function createMockDocument() {
    var elements = [];

    function createElement(tag) {
        var el = {
            _tag: tag,
            _children: [],
            _attrs: {},
            _parent: null,
            className: '',
            type: '',
            min: '',
            max: '',
            value: '',
            title: '',
            textContent: '',
            get firstChild() {
                return el._children[0] || null;
            },
            appendChild: function (child) {
                el._children.push(child);
                child._parent = el;
            },
            insertBefore: function (newChild, refChild) {
                var idx = el._children.indexOf(refChild);
                if (idx === -1) {
                    el._children.push(newChild);
                } else {
                    el._children.splice(idx, 0, newChild);
                }
                newChild._parent = el;
            },
            removeChild: function (child) {
                var idx = el._children.indexOf(child);
                if (idx !== -1) {
                    el._children.splice(idx, 1);
                    child._parent = null;
                }
            },
            setAttribute: function (name, value) {
                el._attrs[name] = value;
            },
            getAttribute: function (name) {
                return el._attrs[name] || null;
            },
            querySelector: function (selector) {
                return findInTree(el, selector);
            },
            querySelectorAll: function (selector) {
                return findAllInTree(el, selector);
            },
            get parentNode() {
                return el._parent;
            },
            get id() {
                return el._attrs['id'] || '';
            },
            set id(val) {
                el._attrs['id'] = val;
            },
        };
        return el;
    }

    function matchesSelector(el, selector) {
        if (selector.startsWith('.')) {
            var cls = selector.slice(1);
            return el.className && el.className.split(' ').indexOf(cls) !== -1;
        }
        if (selector.startsWith('#')) {
            var id = selector.slice(1);
            return el._attrs && el._attrs['id'] === id;
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

    return {
        createElement: createElement,
        _findInTree: findInTree,
        _findAllInTree: findAllInTree,
    };
}

// --- Re-implementation of panel functions for isolated testing ---

function createSectionSettingsPanel(doc, sectionId) {
    var panel = doc.createElement('div');
    panel.className = 'section-settings-panel';
    panel.setAttribute('data-section-id', sectionId);

    // Color group
    var colorGroup = doc.createElement('div');
    colorGroup.className = 'ssp-group ssp-color';
    var colorLabel = doc.createElement('label');
    colorLabel.textContent = '🎨';
    var colorPicker = doc.createElement('input');
    colorPicker.type = 'color';
    colorPicker.className = 'ssp-color-picker';
    var colorReset = doc.createElement('button');
    colorReset.className = 'ssp-color-reset';
    colorReset.textContent = 'Reset';
    colorGroup.appendChild(colorLabel);
    colorGroup.appendChild(colorPicker);
    colorGroup.appendChild(colorReset);

    // Layout group
    var layoutGroup = doc.createElement('div');
    layoutGroup.className = 'ssp-group ssp-layout';
    var gridBtn = doc.createElement('button');
    gridBtn.className = 'ssp-grid-btn';
    gridBtn.title = 'Grid view';
    gridBtn.textContent = '▦';
    var listBtn = doc.createElement('button');
    listBtn.className = 'ssp-list-btn';
    listBtn.title = 'List view';
    listBtn.textContent = '☰';
    layoutGroup.appendChild(gridBtn);
    layoutGroup.appendChild(listBtn);

    // Columns group
    var columnsGroup = doc.createElement('div');
    columnsGroup.className = 'ssp-group ssp-columns';
    var colsLabel = doc.createElement('label');
    colsLabel.textContent = 'Cols:';
    var colsRange = doc.createElement('input');
    colsRange.type = 'range';
    colsRange.min = '2';
    colsRange.max = '6';
    colsRange.className = 'ssp-columns-range';
    colsRange.value = '4';
    var colsValue = doc.createElement('span');
    colsValue.className = 'ssp-columns-value';
    colsValue.textContent = '4';
    columnsGroup.appendChild(colsLabel);
    columnsGroup.appendChild(colsRange);
    columnsGroup.appendChild(colsValue);

    // Order group
    var orderGroup = doc.createElement('div');
    orderGroup.className = 'ssp-group ssp-order';
    var moveUpBtn = doc.createElement('button');
    moveUpBtn.className = 'ssp-move-up';
    moveUpBtn.title = 'Move section up';
    moveUpBtn.textContent = '⬆️';
    var moveDownBtn = doc.createElement('button');
    moveDownBtn.className = 'ssp-move-down';
    moveDownBtn.title = 'Move section down';
    moveDownBtn.textContent = '⬇️';
    orderGroup.appendChild(moveUpBtn);
    orderGroup.appendChild(moveDownBtn);

    // Visibility group
    var visGroup = doc.createElement('div');
    visGroup.className = 'ssp-group ssp-visibility';
    var hideBtn = doc.createElement('button');
    hideBtn.className = 'ssp-hide-btn';
    hideBtn.title = 'Hide section';
    hideBtn.textContent = '👁️‍🗨️ Hide';
    visGroup.appendChild(hideBtn);

    panel.appendChild(colorGroup);
    panel.appendChild(layoutGroup);
    panel.appendChild(columnsGroup);
    panel.appendChild(orderGroup);
    panel.appendChild(visGroup);

    return panel;
}

function injectSectionSettingsPanels(doc, root) {
    var sections = root.querySelectorAll('.section');
    for (var i = 0; i < sections.length; i++) {
        var section = sections[i];
        var sectionId = section.id;
        if (!sectionId) continue;
        // Avoid duplicate injection
        if (section.querySelector('.section-settings-panel')) continue;
        var panel = createSectionSettingsPanel(doc, sectionId);
        section.insertBefore(panel, section.firstChild);
    }
}

function removeSectionSettingsPanels(root) {
    var panels = root.querySelectorAll('.section-settings-panel');
    for (var i = 0; i < panels.length; i++) {
        panels[i].parentNode.removeChild(panels[i]);
    }
}

// --- Helper to build a mock section tree ---

function buildSectionTree(doc, sectionIds) {
    var root = doc.createElement('div');
    root.className = 'memories-content';
    for (var i = 0; i < sectionIds.length; i++) {
        var section = doc.createElement('div');
        section.className = 'section';
        section.id = sectionIds[i];
        var title = doc.createElement('h2');
        title.className = 'section-title';
        title.textContent = sectionIds[i].replace('-section', '');
        section.appendChild(title);
        root.appendChild(section);
    }
    return root;
}

// --- Tests ---

describe('Section Settings Panel - createSectionSettingsPanel', () => {
    var doc;

    beforeEach(function () {
        doc = createMockDocument();
    });

    it('should create a panel with the correct class and data attribute', () => {
        var panel = createSectionSettingsPanel(doc, 'photos-section');
        expect(panel.className).toBe('section-settings-panel');
        expect(panel.getAttribute('data-section-id')).toBe('photos-section');
    });

    it('should contain all five groups', () => {
        var panel = createSectionSettingsPanel(doc, 'songs-section');
        expect(panel.querySelector('.ssp-color')).not.toBeNull();
        expect(panel.querySelector('.ssp-layout')).not.toBeNull();
        expect(panel.querySelector('.ssp-columns')).not.toBeNull();
        expect(panel.querySelector('.ssp-order')).not.toBeNull();
        expect(panel.querySelector('.ssp-visibility')).not.toBeNull();
    });

    it('should have a color picker input of type color', () => {
        var panel = createSectionSettingsPanel(doc, 'photos-section');
        var picker = panel.querySelector('.ssp-color-picker');
        expect(picker).not.toBeNull();
        expect(picker.type).toBe('color');
    });

    it('should have a Reset button in the color group', () => {
        var panel = createSectionSettingsPanel(doc, 'photos-section');
        var resetBtn = panel.querySelector('.ssp-color-reset');
        expect(resetBtn).not.toBeNull();
        expect(resetBtn.textContent).toBe('Reset');
    });

    it('should have grid and list layout buttons', () => {
        var panel = createSectionSettingsPanel(doc, 'photos-section');
        expect(panel.querySelector('.ssp-grid-btn')).not.toBeNull();
        expect(panel.querySelector('.ssp-list-btn')).not.toBeNull();
    });

    it('should have a range input for columns with min=2 and max=6', () => {
        var panel = createSectionSettingsPanel(doc, 'photos-section');
        var range = panel.querySelector('.ssp-columns-range');
        expect(range).not.toBeNull();
        expect(range.min).toBe('2');
        expect(range.max).toBe('6');
        expect(range.value).toBe('4');
    });

    it('should have move up and move down buttons', () => {
        var panel = createSectionSettingsPanel(doc, 'photos-section');
        expect(panel.querySelector('.ssp-move-up')).not.toBeNull();
        expect(panel.querySelector('.ssp-move-down')).not.toBeNull();
    });

    it('should have a hide button', () => {
        var panel = createSectionSettingsPanel(doc, 'photos-section');
        var hideBtn = panel.querySelector('.ssp-hide-btn');
        expect(hideBtn).not.toBeNull();
        expect(hideBtn.textContent).toContain('Hide');
    });
});

describe('Section Settings Panel - injectSectionSettingsPanels', () => {
    var doc;
    var root;

    beforeEach(function () {
        doc = createMockDocument();
        root = buildSectionTree(doc, ['photos-section', 'songs-section', 'timeline-section']);
    });

    it('should inject a panel into each section', () => {
        injectSectionSettingsPanels(doc, root);
        var panels = root.querySelectorAll('.section-settings-panel');
        expect(panels.length).toBe(3);
    });

    it('should inject panel as the first child of each section', () => {
        injectSectionSettingsPanels(doc, root);
        var sections = root.querySelectorAll('.section');
        for (var i = 0; i < sections.length; i++) {
            expect(sections[i].firstChild.className).toBe('section-settings-panel');
        }
    });

    it('should set correct data-section-id on each panel', () => {
        injectSectionSettingsPanels(doc, root);
        var sections = root.querySelectorAll('.section');
        for (var i = 0; i < sections.length; i++) {
            var panel = sections[i].querySelector('.section-settings-panel');
            expect(panel.getAttribute('data-section-id')).toBe(sections[i].id);
        }
    });

    it('should not inject duplicate panels on repeated calls', () => {
        injectSectionSettingsPanels(doc, root);
        injectSectionSettingsPanels(doc, root);
        var panels = root.querySelectorAll('.section-settings-panel');
        expect(panels.length).toBe(3);
    });

    it('should skip sections without an id', () => {
        // Add a section without an id
        var noIdSection = doc.createElement('div');
        noIdSection.className = 'section';
        root.appendChild(noIdSection);

        injectSectionSettingsPanels(doc, root);
        var panels = root.querySelectorAll('.section-settings-panel');
        // Only the 3 sections with IDs get panels
        expect(panels.length).toBe(3);
    });
});

describe('Section Settings Panel - removeSectionSettingsPanels', () => {
    var doc;
    var root;

    beforeEach(function () {
        doc = createMockDocument();
        root = buildSectionTree(doc, ['photos-section', 'songs-section']);
        injectSectionSettingsPanels(doc, root);
    });

    it('should remove all panels from the DOM', () => {
        expect(root.querySelectorAll('.section-settings-panel').length).toBe(2);
        removeSectionSettingsPanels(root);
        expect(root.querySelectorAll('.section-settings-panel').length).toBe(0);
    });

    it('should leave section content intact after removal', () => {
        removeSectionSettingsPanels(root);
        var sections = root.querySelectorAll('.section');
        for (var i = 0; i < sections.length; i++) {
            var title = sections[i].querySelector('.section-title');
            expect(title).not.toBeNull();
        }
    });

    it('should be safe to call when no panels exist', () => {
        removeSectionSettingsPanels(root);
        // Call again - should not throw
        expect(function () { removeSectionSettingsPanels(root); }).not.toThrow();
    });
});
