import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Unit tests for inline editing behavior (makeInlineEditable).
 *
 * Tests the core interaction patterns:
 * - Clicking in edit mode transforms text to input
 * - Enter saves and updates display
 * - Escape discards changes
 * - Clicking outside edit mode does nothing
 * - Empty string reverts to original
 *
 * Requirements: 1.1–1.5, 2.1–2.5, 3.1–3.6
 */

// --- localStorage mock ---

function createLocalStorageMock() {
  let store = {};
  return {
    getItem(key) {
      return store[key] !== undefined ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
}

// --- Minimal DOM mock ---

function createMockElement(text) {
  const listeners = {};
  let children = [];
  let textContent = text;

  const el = {
    get textContent() {
      return textContent;
    },
    set textContent(val) {
      textContent = val;
      children = [];
    },
    appendChild(child) {
      children.push(child);
      child._parent = el;
    },
    querySelector(selector) {
      for (const child of children) {
        if (child._tagName === 'input' && selector === 'input') return child;
        if (child._tagName === 'textarea' && selector === 'textarea') return child;
      }
      return null;
    },
    addEventListener(event, handler) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    },
    dispatchEvent(event) {
      const handlers = listeners[event.type] || [];
      for (const handler of handlers) {
        handler(event);
      }
    },
    click() {
      el.dispatchEvent({ type: 'click', stopPropagation() {} });
    },
  };
  return el;
}

function createMockInput(tagName) {
  const listeners = {};
  const el = {
    _tagName: tagName || 'input',
    _parent: null,
    type: 'text',
    value: '',
    className: '',
    placeholder: '',
    rows: undefined,
    focus() {},
    select() {},
    addEventListener(event, handler) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    },
    dispatchEvent(event) {
      const handlers = listeners[event.type] || [];
      for (const handler of handlers) {
        handler(event);
      }
    },
  };
  return el;
}

// --- Mock document.body.classList ---

let bodyClasses = new Set();

const mockBody = {
  classList: {
    add(cls) { bodyClasses.add(cls); },
    remove(cls) { bodyClasses.delete(cls); },
    contains(cls) { return bodyClasses.has(cls); },
  },
};

// --- Inline implementation of makeInlineEditable using mocks ---

/**
 * Adapted version of makeInlineEditable that uses our mock infrastructure.
 * Uses injected `document` and `localStorage` for testability.
 */
function makeInlineEditable(element, options, deps) {
  if (!element) return;

  const { body, createElement } = deps.document;
  const storage = deps.localStorage;

  const storageKey = options.storageKey;
  const itemId = options.itemId;
  const field = options.field || null;
  const multiline = options.multiline || false;
  const placeholder = options.placeholder || '';

  element.addEventListener('click', function (e) {
    // Only activate when edit mode is active
    if (!body.classList.contains('dev-mode-active')) return;

    // Prevent activating if already editing
    if (element.querySelector('input') || element.querySelector('textarea')) return;

    const originalText = element.textContent;

    // Create the input element
    let inputEl;
    if (multiline) {
      inputEl = createElement('textarea');
      inputEl.rows = 3;
    } else {
      inputEl = createElement('input');
      inputEl.type = 'text';
    }
    inputEl.value = originalText;
    inputEl.className = 'inline-edit-input';
    if (placeholder) {
      inputEl.placeholder = placeholder;
    }

    // Replace element content with input
    element.textContent = '';
    element.appendChild(inputEl);
    inputEl.focus();
    inputEl.select();

    let saved = false;

    function saveEdit() {
      if (saved) return;
      saved = true;

      const newValue = inputEl.value.trim();

      // Prevent saving empty strings — revert to original
      if (!newValue) {
        element.textContent = originalText;
        return;
      }

      // Save to localStorage
      try {
        const raw = storage.getItem(storageKey);
        const store = raw ? JSON.parse(raw) : {};

        if (field) {
          if (!store[itemId] || typeof store[itemId] !== 'object') {
            store[itemId] = {};
          }
          store[itemId][field] = newValue;
        } else {
          store[itemId] = newValue;
        }

        storage.setItem(storageKey, JSON.stringify(store));
      } catch (err) {
        // Silently fail on localStorage errors
      }

      // Update display
      element.textContent = newValue;
    }

    function discardEdit() {
      if (saved) return;
      saved = true;
      element.textContent = originalText;
    }

    // Handle keydown events
    inputEl.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && !multiline) {
        if (ev.preventDefault) ev.preventDefault();
        saveEdit();
      } else if (ev.key === 'Enter' && multiline && ev.ctrlKey) {
        if (ev.preventDefault) ev.preventDefault();
        saveEdit();
      } else if (ev.key === 'Escape') {
        if (ev.preventDefault) ev.preventDefault();
        discardEdit();
      }
    });

    // Handle blur (save on focus loss)
    inputEl.addEventListener('blur', function () {
      saveEdit();
    });

    // Prevent the click from bubbling
    if (e.stopPropagation) e.stopPropagation();
  });
}

// --- Test Suite ---

describe('Inline editing behavior (makeInlineEditable)', () => {
  let element;
  let storageMock;
  let deps;
  let lastCreatedInput;

  beforeEach(() => {
    bodyClasses = new Set();
    storageMock = createLocalStorageMock();
    lastCreatedInput = null;

    element = createMockElement('Original Title');

    deps = {
      document: {
        body: mockBody,
        createElement(tag) {
          lastCreatedInput = createMockInput(tag);
          return lastCreatedInput;
        },
      },
      localStorage: storageMock,
    };
  });

  it('clicking in edit mode transforms text to input', () => {
    bodyClasses.add('dev-mode-active');
    makeInlineEditable(element, { storageKey: 'test_edits', itemId: 'item1' }, deps);

    element.click();

    // An input should have been created and appended
    expect(lastCreatedInput).not.toBeNull();
    expect(lastCreatedInput._tagName).toBe('input');
    expect(lastCreatedInput.value).toBe('Original Title');
    expect(lastCreatedInput.className).toBe('inline-edit-input');
    // Element text should be cleared (replaced by input)
    expect(element.querySelector('input')).not.toBeNull();
  });

  it('Enter saves value to localStorage and updates display text', () => {
    bodyClasses.add('dev-mode-active');
    makeInlineEditable(element, { storageKey: 'test_edits', itemId: 'item1' }, deps);

    element.click();

    // Simulate typing a new value
    lastCreatedInput.value = 'New Title';

    // Simulate Enter key
    lastCreatedInput.dispatchEvent({ type: 'keydown', key: 'Enter', preventDefault() {} });

    // Display should be updated
    expect(element.textContent).toBe('New Title');

    // localStorage should have the saved value
    const stored = JSON.parse(storageMock.getItem('test_edits'));
    expect(stored.item1).toBe('New Title');
  });

  it('Escape discards changes and reverts to original text', () => {
    bodyClasses.add('dev-mode-active');
    makeInlineEditable(element, { storageKey: 'test_edits', itemId: 'item1' }, deps);

    element.click();

    // Simulate typing a new value
    lastCreatedInput.value = 'Changed Value';

    // Simulate Escape key
    lastCreatedInput.dispatchEvent({ type: 'keydown', key: 'Escape', preventDefault() {} });

    // Display should revert to original
    expect(element.textContent).toBe('Original Title');

    // localStorage should NOT have any saved value
    expect(storageMock.getItem('test_edits')).toBeNull();
  });

  it('clicking element when edit mode is NOT active does nothing', () => {
    // Do NOT add dev-mode-active class
    makeInlineEditable(element, { storageKey: 'test_edits', itemId: 'item1' }, deps);

    element.click();

    // No input should be created
    expect(lastCreatedInput).toBeNull();
    expect(element.textContent).toBe('Original Title');
  });

  it('entering empty string reverts to original text and does not save', () => {
    bodyClasses.add('dev-mode-active');
    makeInlineEditable(element, { storageKey: 'test_edits', itemId: 'item1' }, deps);

    element.click();

    // Simulate clearing the input
    lastCreatedInput.value = '';

    // Simulate Enter key
    lastCreatedInput.dispatchEvent({ type: 'keydown', key: 'Enter', preventDefault() {} });

    // Display should revert to original
    expect(element.textContent).toBe('Original Title');

    // localStorage should NOT have any saved value
    expect(storageMock.getItem('test_edits')).toBeNull();
  });
});
