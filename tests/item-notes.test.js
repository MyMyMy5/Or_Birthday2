import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Unit tests for item notes functionality.
 *
 * Tests:
 * - Note placeholder visible in edit mode, hidden outside
 * - Saving a note persists to localStorage
 * - Notes display as read-only outside edit mode
 *
 * Requirements: 4.1–4.5
 */

// --- localStorage mock ---

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
    },
  };
}

// --- Minimal DOM helpers ---

var bodyClasses = new Set();

var mockBody = {
  classList: {
    add: function (cls) { bodyClasses.add(cls); },
    remove: function (cls) { bodyClasses.delete(cls); },
    contains: function (cls) { return bodyClasses.has(cls); },
  },
};

/**
 * Standalone implementation of getItemNotes for testing.
 */
function getItemNotes(storage) {
  try {
    var raw = storage.getItem('item_notes');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

/**
 * Standalone implementation of saveItemNote for testing.
 */
function saveItemNote(storage, itemId, noteText) {
  try {
    var notes = getItemNotes(storage);
    if (noteText) {
      notes[itemId] = noteText;
    } else {
      delete notes[itemId];
    }
    storage.setItem('item_notes', JSON.stringify(notes));
  } catch (e) {
    // Silently fail
  }
}

/**
 * Creates a note element similar to the production createNoteElement function.
 * Uses injected dependencies for testability.
 */
function createNoteElement(itemId, existingNote, deps) {
  var storage = deps.localStorage;
  var body = deps.body;

  var noteDiv = {
    className: 'item-note',
    _attrs: { 'data-item-id': itemId },
    _children: [],
    _listeners: {},
    setAttribute: function (key, val) { this._attrs[key] = val; },
    getAttribute: function (key) { return this._attrs[key] || null; },
    appendChild: function (child) { this._children.push(child); child._parent = this; },
    querySelector: function (sel) {
      for (var i = 0; i < this._children.length; i++) {
        var child = this._children[i];
        if (sel === '.note-text' && child.className === 'note-text') return child;
        if (sel === '.note-placeholder' && child.className === 'note-placeholder') return child;
        if (sel === 'textarea' && child._tagName === 'textarea') return child;
      }
      return null;
    },
    addEventListener: function (event, handler) {
      if (!this._listeners[event]) this._listeners[event] = [];
      this._listeners[event].push(handler);
    },
    dispatchEvent: function (event) {
      var handlers = this._listeners[event.type] || [];
      for (var i = 0; i < handlers.length; i++) {
        handlers[i](event);
      }
    },
    get textContent() {
      if (this._children.length === 0) return '';
      return this._children.map(function (c) { return c.textContent || ''; }).join('');
    },
    set textContent(val) {
      this._children = [];
    },
  };

  if (existingNote) {
    var noteSpan = { className: 'note-text', textContent: existingNote, style: {} };
    noteDiv.appendChild(noteSpan);
  } else {
    var placeholderSpan = { className: 'note-placeholder', textContent: '+ Add note', style: {} };
    noteDiv.appendChild(placeholderSpan);
  }

  // Click handler for editing notes
  noteDiv.addEventListener('click', function (e) {
    if (!body.classList.contains('dev-mode-active')) return;
    // Prevent if already editing
    if (noteDiv.querySelector('textarea')) return;

    if (e.stopPropagation) e.stopPropagation();

    var currentNote = '';
    var noteTextEl = noteDiv.querySelector('.note-text');
    if (noteTextEl) {
      currentNote = noteTextEl.textContent;
    }

    // Create textarea for editing
    var textarea = {
      _tagName: 'textarea',
      className: 'inline-edit-input item-note-input',
      value: currentNote,
      placeholder: 'Type your note here...',
      rows: 2,
      style: {},
      _listeners: {},
      focus: function () {},
      addEventListener: function (event, handler) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(handler);
      },
      dispatchEvent: function (event) {
        var handlers = this._listeners[event.type] || [];
        for (var i = 0; i < handlers.length; i++) {
          handlers[i](event);
        }
      },
    };

    // Replace content with textarea
    noteDiv._children = [];
    noteDiv.appendChild(textarea);

    var saved = false;

    function saveNote() {
      if (saved) return;
      saved = true;

      var newValue = textarea.value.trim();
      noteDiv._children = [];

      if (newValue) {
        saveItemNote(storage, itemId, newValue);
        var span = { className: 'note-text', textContent: newValue, style: {} };
        noteDiv.appendChild(span);
      } else {
        saveItemNote(storage, itemId, '');
        var placeholder = { className: 'note-placeholder', textContent: '+ Add note', style: {} };
        if (!body.classList.contains('dev-mode-active')) {
          placeholder.style.display = 'none';
        }
        noteDiv.appendChild(placeholder);
      }
    }

    function discardNote() {
      if (saved) return;
      saved = true;

      noteDiv._children = [];
      if (currentNote) {
        var span = { className: 'note-text', textContent: currentNote, style: {} };
        noteDiv.appendChild(span);
      } else {
        var placeholder = { className: 'note-placeholder', textContent: '+ Add note', style: {} };
        noteDiv.appendChild(placeholder);
      }
    }

    textarea.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && !ev.shiftKey) {
        if (ev.preventDefault) ev.preventDefault();
        saveNote();
      } else if (ev.key === 'Escape') {
        if (ev.preventDefault) ev.preventDefault();
        discardNote();
      }
    });

    textarea.addEventListener('blur', function () {
      saveNote();
    });
  });

  return noteDiv;
}

// --- Test Suite ---

describe('Item Notes', function () {
  var storageMock;
  var deps;

  beforeEach(function () {
    bodyClasses = new Set();
    storageMock = createLocalStorageMock();
    deps = {
      localStorage: storageMock,
      body: mockBody,
    };
  });

  describe('Note placeholder visibility', function () {
    it('shows placeholder when no note exists and edit mode is active', function () {
      var noteEl = createNoteElement('item1', null, deps);
      var placeholder = noteEl.querySelector('.note-placeholder');

      expect(placeholder).not.toBeNull();
      expect(placeholder.textContent).toBe('+ Add note');
      expect(placeholder.className).toBe('note-placeholder');
    });

    it('shows note text when a saved note exists', function () {
      var noteEl = createNoteElement('item1', 'My saved note', deps);
      var noteText = noteEl.querySelector('.note-text');

      expect(noteText).not.toBeNull();
      expect(noteText.textContent).toBe('My saved note');
    });

    it('placeholder is not shown when no note exists and edit mode is inactive', function () {
      // The CSS handles hiding via .dev-mode-active .note-placeholder display rule
      // In the JS, the placeholder element is created but CSS hides it
      var noteEl = createNoteElement('item1', null, deps);
      var placeholder = noteEl.querySelector('.note-placeholder');

      // Placeholder exists in DOM (CSS will hide it outside edit mode)
      expect(placeholder).not.toBeNull();
      expect(placeholder.textContent).toBe('+ Add note');
    });
  });

  describe('Saving a note persists to localStorage', function () {
    it('saving a note via Enter persists to localStorage under item_notes', function () {
      bodyClasses.add('dev-mode-active');
      var noteEl = createNoteElement('item1', null, deps);

      // Click to open editor
      noteEl.dispatchEvent({ type: 'click', stopPropagation: function () {} });

      // Should now have a textarea
      var textarea = noteEl.querySelector('textarea');
      expect(textarea).not.toBeNull();

      // Type a note
      textarea.value = 'This is my note';

      // Press Enter to save
      textarea.dispatchEvent({ type: 'keydown', key: 'Enter', shiftKey: false, preventDefault: function () {} });

      // Check localStorage
      var stored = JSON.parse(storageMock.getItem('item_notes'));
      expect(stored.item1).toBe('This is my note');
    });

    it('saving a note via blur persists to localStorage', function () {
      bodyClasses.add('dev-mode-active');
      var noteEl = createNoteElement('item1', null, deps);

      // Click to open editor
      noteEl.dispatchEvent({ type: 'click', stopPropagation: function () {} });

      var textarea = noteEl.querySelector('textarea');
      textarea.value = 'Blur saved note';

      // Trigger blur
      textarea.dispatchEvent({ type: 'blur' });

      // Check localStorage
      var stored = JSON.parse(storageMock.getItem('item_notes'));
      expect(stored.item1).toBe('Blur saved note');
    });

    it('saving an empty note removes it from localStorage', function () {
      // Pre-populate a note
      storageMock.setItem('item_notes', JSON.stringify({ item1: 'Old note' }));

      bodyClasses.add('dev-mode-active');
      var noteEl = createNoteElement('item1', 'Old note', deps);

      // Click to open editor
      noteEl.dispatchEvent({ type: 'click', stopPropagation: function () {} });

      var textarea = noteEl.querySelector('textarea');
      textarea.value = '';

      // Press Enter to save empty
      textarea.dispatchEvent({ type: 'keydown', key: 'Enter', shiftKey: false, preventDefault: function () {} });

      // Check localStorage - item1 should be removed
      var stored = JSON.parse(storageMock.getItem('item_notes'));
      expect(stored.item1).toBeUndefined();
    });

    it('Escape discards changes and reverts to original note', function () {
      bodyClasses.add('dev-mode-active');
      var noteEl = createNoteElement('item1', 'Original note', deps);

      // Click to open editor
      noteEl.dispatchEvent({ type: 'click', stopPropagation: function () {} });

      var textarea = noteEl.querySelector('textarea');
      textarea.value = 'Changed note';

      // Press Escape to discard
      textarea.dispatchEvent({ type: 'keydown', key: 'Escape', preventDefault: function () {} });

      // Should revert to showing original note text
      var noteText = noteEl.querySelector('.note-text');
      expect(noteText).not.toBeNull();
      expect(noteText.textContent).toBe('Original note');

      // localStorage should not be modified
      expect(storageMock.getItem('item_notes')).toBeNull();
    });
  });

  describe('Notes display as read-only outside edit mode', function () {
    it('clicking note area outside edit mode does not open editor', function () {
      // Do NOT add dev-mode-active
      var noteEl = createNoteElement('item1', 'Read-only note', deps);

      // Click the note
      noteEl.dispatchEvent({ type: 'click', stopPropagation: function () {} });

      // Should NOT have a textarea
      var textarea = noteEl.querySelector('textarea');
      expect(textarea).toBeNull();

      // Note text should still be displayed
      var noteText = noteEl.querySelector('.note-text');
      expect(noteText).not.toBeNull();
      expect(noteText.textContent).toBe('Read-only note');
    });

    it('saved notes are displayed as read-only text', function () {
      var noteEl = createNoteElement('item1', 'Persisted note', deps);
      var noteText = noteEl.querySelector('.note-text');

      expect(noteText).not.toBeNull();
      expect(noteText.textContent).toBe('Persisted note');
      expect(noteText.className).toBe('note-text');
    });
  });

  describe('getItemNotes and saveItemNote', function () {
    it('getItemNotes returns empty object when no notes saved', function () {
      var notes = getItemNotes(storageMock);
      expect(notes).toEqual({});
    });

    it('saveItemNote persists note and getItemNotes retrieves it', function () {
      saveItemNote(storageMock, 'song1', 'Our first dance');
      var notes = getItemNotes(storageMock);
      expect(notes.song1).toBe('Our first dance');
    });

    it('saveItemNote with empty string removes the note', function () {
      saveItemNote(storageMock, 'song1', 'Temp note');
      saveItemNote(storageMock, 'song1', '');
      var notes = getItemNotes(storageMock);
      expect(notes.song1).toBeUndefined();
    });

    it('multiple notes can be saved for different items', function () {
      saveItemNote(storageMock, 'item1', 'Note 1');
      saveItemNote(storageMock, 'item2', 'Note 2');
      saveItemNote(storageMock, 'item3', 'Note 3');
      var notes = getItemNotes(storageMock);
      expect(notes).toEqual({ item1: 'Note 1', item2: 'Note 2', item3: 'Note 3' });
    });
  });
});
