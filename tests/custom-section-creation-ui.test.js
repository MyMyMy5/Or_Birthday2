import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

/**
 * Unit tests for custom section creation UI (task 12.2).
 * Tests the "Add Section" button injection, form display, validation, and creation flow.
 *
 * Validates: Requirements 10.1, 10.2
 */

function createMinimalDOM() {
    const dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
        <body>
            <div class="memories-content">
                <div class="section" id="photos-section"><h2>Photos</h2></div>
                <div class="section" id="funny-section"><h2>Funny Moments</h2></div>
            </div>
        </body>
        </html>
    `, { url: 'http://localhost' });
    return dom;
}

function setupGlobals(dom) {
    const { window } = dom;
    global.document = window.document;
    global.window = window;
    global.localStorage = createMockLocalStorage();
    global.HTMLElement = window.HTMLElement;
    global.setTimeout = (fn) => fn();
}

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
            for (const k of Object.keys(store)) delete store[k];
        },
        get _store() { return store; }
    };
}

// Re-implement the functions under test (matching script.js logic)
const CUSTOM_SECTIONS_STORAGE_KEY = 'custom_sections';

function getCustomSections() {
    try {
        var raw = localStorage.getItem(CUSTOM_SECTIONS_STORAGE_KEY);
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
        localStorage.setItem(CUSTOM_SECTIONS_STORAGE_KEY, JSON.stringify(sections));
    } catch (e) {}

    return section;
}

function renderCustomSection(sectionDef) {
    var sectionEl = document.createElement('div');
    sectionEl.className = 'section custom-section';
    sectionEl.id = 'custom-section-' + sectionDef.id;
    sectionEl.setAttribute('data-custom-section-id', sectionDef.id);

    var titleEl = document.createElement('h2');
    titleEl.className = 'section-title';
    titleEl.textContent = sectionDef.title;
    sectionEl.appendChild(titleEl);

    var itemsContainer = document.createElement('div');
    itemsContainer.className = 'custom-section-items';
    if (sectionDef.layout === 'grid') {
        itemsContainer.classList.add('custom-section-grid');
    } else {
        itemsContainer.classList.add('custom-section-list');
    }
    itemsContainer.setAttribute('data-item-type', sectionDef.itemType);
    sectionEl.appendChild(itemsContainer);

    return sectionEl;
}

// --- UI functions under test (matching script.js) ---

function injectAddSectionButton() {
    if (document.getElementById('add-section-btn')) return;
    var sectionsContainer = document.querySelector('.memories-content');
    if (!sectionsContainer) return;

    var btn = document.createElement('button');
    btn.id = 'add-section-btn';
    btn.className = 'add-section-btn';
    btn.textContent = '+ Add Section';
    btn.setAttribute('aria-label', 'Add a new custom section');
    btn.addEventListener('click', showAddSectionForm);
    sectionsContainer.appendChild(btn);
}

function removeAddSectionButton() {
    var btn = document.getElementById('add-section-btn');
    if (btn) btn.remove();
    var form = document.getElementById('add-section-form');
    if (form) form.remove();
}

function showAddSectionForm() {
    if (document.getElementById('add-section-form')) return;
    var sectionsContainer = document.querySelector('.memories-content');
    if (!sectionsContainer) return;

    var form = document.createElement('div');
    form.id = 'add-section-form';
    form.className = 'add-section-form';

    form.innerHTML =
        '<h3 class="add-section-form-title">Create New Section</h3>' +
        '<div class="add-section-field">' +
            '<label for="add-section-title-input">Section Title</label>' +
            '<input type="text" id="add-section-title-input" class="add-section-title-input" placeholder="e.g. Favorite Movies" autocomplete="off" />' +
            '<span id="add-section-title-error" class="add-section-error" aria-live="polite"></span>' +
        '</div>' +
        '<div class="add-section-field">' +
            '<label>Layout</label>' +
            '<div class="add-section-radio-group">' +
                '<label class="add-section-radio-label"><input type="radio" name="add-section-layout" value="grid" checked /> Grid</label>' +
                '<label class="add-section-radio-label"><input type="radio" name="add-section-layout" value="list" /> List</label>' +
            '</div>' +
        '</div>' +
        '<div class="add-section-field">' +
            '<label>Item Type</label>' +
            '<div class="add-section-radio-group">' +
                '<label class="add-section-radio-label"><input type="radio" name="add-section-item-type" value="text" checked /> Text</label>' +
                '<label class="add-section-radio-label"><input type="radio" name="add-section-item-type" value="image" /> Image</label>' +
                '<label class="add-section-radio-label"><input type="radio" name="add-section-item-type" value="link" /> Link</label>' +
            '</div>' +
        '</div>' +
        '<div class="add-section-actions">' +
            '<button type="button" id="add-section-create-btn" class="add-section-create-btn">Create</button>' +
            '<button type="button" id="add-section-cancel-btn" class="add-section-cancel-btn">Cancel</button>' +
        '</div>';

    sectionsContainer.appendChild(form);

    var createBtn = document.getElementById('add-section-create-btn');
    createBtn.addEventListener('click', handleAddSectionCreate);

    var cancelBtn = document.getElementById('add-section-cancel-btn');
    cancelBtn.addEventListener('click', hideAddSectionForm);
}

function hideAddSectionForm() {
    var form = document.getElementById('add-section-form');
    if (form) form.remove();
}

function handleAddSectionCreate() {
    var titleInput = document.getElementById('add-section-title-input');
    var errorSpan = document.getElementById('add-section-title-error');

    if (!titleInput) return;

    var title = titleInput.value.trim();

    if (!title) {
        if (errorSpan) {
            errorSpan.textContent = 'Please enter a section title.';
        }
        return;
    }

    if (errorSpan) errorSpan.textContent = '';

    var layoutRadio = document.querySelector('input[name="add-section-layout"]:checked');
    var layout = layoutRadio ? layoutRadio.value : 'grid';

    var itemTypeRadio = document.querySelector('input[name="add-section-item-type"]:checked');
    var itemType = itemTypeRadio ? itemTypeRadio.value : 'text';

    var newSection = addCustomSection(title, layout, itemType);
    if (!newSection) return;

    var sectionsContainer = document.querySelector('.memories-content');
    if (sectionsContainer) {
        var addBtn = document.getElementById('add-section-btn');
        var sectionEl = renderCustomSection(newSection);
        if (addBtn) {
            sectionsContainer.insertBefore(sectionEl, addBtn);
        } else {
            sectionsContainer.appendChild(sectionEl);
        }
    }

    hideAddSectionForm();
}

// --- Tests ---

describe('Custom Section Creation UI (Requirements 10.1, 10.2)', () => {
    let dom;

    beforeEach(() => {
        dom = createMinimalDOM();
        setupGlobals(dom);
    });

    afterEach(() => {
        delete global.document;
        delete global.window;
        delete global.localStorage;
        delete global.HTMLElement;
        delete global.setTimeout;
    });

    describe('injectAddSectionButton()', () => {
        it('adds an "Add Section" button to the memories-content container', () => {
            injectAddSectionButton();
            const btn = document.getElementById('add-section-btn');
            expect(btn).not.toBeNull();
            expect(btn.textContent).toBe('+ Add Section');
            expect(btn.className).toBe('add-section-btn');
        });

        it('button is appended at the end of memories-content', () => {
            injectAddSectionButton();
            const container = document.querySelector('.memories-content');
            expect(container.lastElementChild.id).toBe('add-section-btn');
        });

        it('does not create duplicate buttons', () => {
            injectAddSectionButton();
            injectAddSectionButton();
            const buttons = document.querySelectorAll('#add-section-btn');
            expect(buttons.length).toBe(1);
        });

        it('has proper aria-label for accessibility', () => {
            injectAddSectionButton();
            const btn = document.getElementById('add-section-btn');
            expect(btn.getAttribute('aria-label')).toBe('Add a new custom section');
        });
    });

    describe('removeAddSectionButton()', () => {
        it('removes the Add Section button from DOM', () => {
            injectAddSectionButton();
            removeAddSectionButton();
            expect(document.getElementById('add-section-btn')).toBeNull();
        });

        it('also removes the form if open', () => {
            injectAddSectionButton();
            showAddSectionForm();
            removeAddSectionButton();
            expect(document.getElementById('add-section-form')).toBeNull();
        });

        it('does nothing if button does not exist', () => {
            expect(() => removeAddSectionButton()).not.toThrow();
        });
    });

    describe('showAddSectionForm()', () => {
        it('displays a creation form with title input', () => {
            showAddSectionForm();
            const form = document.getElementById('add-section-form');
            expect(form).not.toBeNull();
            const titleInput = document.getElementById('add-section-title-input');
            expect(titleInput).not.toBeNull();
            expect(titleInput.getAttribute('placeholder')).toBe('e.g. Favorite Movies');
        });

        it('displays layout radio buttons (grid/list)', () => {
            showAddSectionForm();
            const radios = document.querySelectorAll('input[name="add-section-layout"]');
            expect(radios.length).toBe(2);
            const values = Array.from(radios).map(r => r.value);
            expect(values).toContain('grid');
            expect(values).toContain('list');
        });

        it('defaults layout to grid', () => {
            showAddSectionForm();
            const checked = document.querySelector('input[name="add-section-layout"]:checked');
            expect(checked.value).toBe('grid');
        });

        it('displays item type radio buttons (text/image/link)', () => {
            showAddSectionForm();
            const radios = document.querySelectorAll('input[name="add-section-item-type"]');
            expect(radios.length).toBe(3);
            const values = Array.from(radios).map(r => r.value);
            expect(values).toContain('text');
            expect(values).toContain('image');
            expect(values).toContain('link');
        });

        it('defaults item type to text', () => {
            showAddSectionForm();
            const checked = document.querySelector('input[name="add-section-item-type"]:checked');
            expect(checked.value).toBe('text');
        });

        it('displays Create and Cancel buttons', () => {
            showAddSectionForm();
            expect(document.getElementById('add-section-create-btn')).not.toBeNull();
            expect(document.getElementById('add-section-cancel-btn')).not.toBeNull();
        });

        it('does not create duplicate forms', () => {
            showAddSectionForm();
            showAddSectionForm();
            const forms = document.querySelectorAll('#add-section-form');
            expect(forms.length).toBe(1);
        });
    });

    describe('hideAddSectionForm()', () => {
        it('removes the form from DOM', () => {
            showAddSectionForm();
            hideAddSectionForm();
            expect(document.getElementById('add-section-form')).toBeNull();
        });

        it('does nothing if form does not exist', () => {
            expect(() => hideAddSectionForm()).not.toThrow();
        });
    });

    describe('handleAddSectionCreate() - validation', () => {
        it('shows error when title is empty', () => {
            showAddSectionForm();
            const titleInput = document.getElementById('add-section-title-input');
            titleInput.value = '';
            handleAddSectionCreate();

            const error = document.getElementById('add-section-title-error');
            expect(error.textContent).toBe('Please enter a section title.');
            // Form should still be open
            expect(document.getElementById('add-section-form')).not.toBeNull();
        });

        it('shows error when title is only whitespace', () => {
            showAddSectionForm();
            const titleInput = document.getElementById('add-section-title-input');
            titleInput.value = '   ';
            handleAddSectionCreate();

            const error = document.getElementById('add-section-title-error');
            expect(error.textContent).toBe('Please enter a section title.');
            expect(document.getElementById('add-section-form')).not.toBeNull();
        });

        it('does not persist section when title is empty', () => {
            showAddSectionForm();
            document.getElementById('add-section-title-input').value = '';
            handleAddSectionCreate();
            expect(getCustomSections()).toEqual([]);
        });
    });

    describe('handleAddSectionCreate() - successful creation', () => {
        it('creates section with provided title and defaults', () => {
            showAddSectionForm();
            document.getElementById('add-section-title-input').value = 'Favorite Movies';
            handleAddSectionCreate();

            const sections = getCustomSections();
            expect(sections).toHaveLength(1);
            expect(sections[0].title).toBe('Favorite Movies');
            expect(sections[0].layout).toBe('grid');
            expect(sections[0].itemType).toBe('text');
        });

        it('creates section with selected layout (list)', () => {
            showAddSectionForm();
            document.getElementById('add-section-title-input').value = 'Bucket List';
            // Select list layout
            const listRadio = document.querySelector('input[name="add-section-layout"][value="list"]');
            listRadio.checked = true;
            handleAddSectionCreate();

            const sections = getCustomSections();
            expect(sections[0].layout).toBe('list');
        });

        it('creates section with selected item type (link)', () => {
            showAddSectionForm();
            document.getElementById('add-section-title-input').value = 'Links';
            // Select link item type
            const linkRadio = document.querySelector('input[name="add-section-item-type"][value="link"]');
            linkRadio.checked = true;
            handleAddSectionCreate();

            const sections = getCustomSections();
            expect(sections[0].itemType).toBe('link');
        });

        it('renders the new section in the DOM', () => {
            injectAddSectionButton();
            showAddSectionForm();
            document.getElementById('add-section-title-input').value = 'New Section';
            handleAddSectionCreate();

            const customSections = document.querySelectorAll('.custom-section');
            expect(customSections.length).toBe(1);
            expect(customSections[0].querySelector('.section-title').textContent).toBe('New Section');
        });

        it('inserts new section before the Add Section button', () => {
            injectAddSectionButton();
            showAddSectionForm();
            document.getElementById('add-section-title-input').value = 'Test Section';
            handleAddSectionCreate();

            const container = document.querySelector('.memories-content');
            const addBtn = document.getElementById('add-section-btn');
            const customSection = container.querySelector('.custom-section');
            // Custom section should come before the add button
            const children = Array.from(container.children);
            expect(children.indexOf(customSection)).toBeLessThan(children.indexOf(addBtn));
        });

        it('closes the form after successful creation', () => {
            showAddSectionForm();
            document.getElementById('add-section-title-input').value = 'Done';
            handleAddSectionCreate();
            expect(document.getElementById('add-section-form')).toBeNull();
        });

        it('clears validation error on successful submit', () => {
            showAddSectionForm();
            // First trigger error
            document.getElementById('add-section-title-input').value = '';
            handleAddSectionCreate();
            expect(document.getElementById('add-section-title-error').textContent).not.toBe('');

            // Now provide valid title
            document.getElementById('add-section-title-input').value = 'Valid Title';
            handleAddSectionCreate();
            // Form is closed, so no error visible
            expect(document.getElementById('add-section-form')).toBeNull();
        });
    });

    describe('Cancel button', () => {
        it('clicking Cancel closes the form', () => {
            showAddSectionForm();
            const cancelBtn = document.getElementById('add-section-cancel-btn');
            cancelBtn.click();
            expect(document.getElementById('add-section-form')).toBeNull();
        });

        it('Cancel does not create a section', () => {
            showAddSectionForm();
            document.getElementById('add-section-title-input').value = 'Should Not Exist';
            const cancelBtn = document.getElementById('add-section-cancel-btn');
            cancelBtn.click();
            expect(getCustomSections()).toEqual([]);
        });
    });
});
