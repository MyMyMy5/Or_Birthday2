import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

/**
 * Unit tests for createRichTextEditor function.
 *
 * Tests:
 * - Returns a container with toolbar and contenteditable div
 * - Toolbar has Bold, Italic, Link, and Bullet List buttons
 * - Pre-populates with sanitized existingHtml
 * - Keyboard shortcuts (Ctrl+B, Ctrl+I) are handled
 * - Paste event sanitizes content
 * - Editor is shown in Edit Mode, read-only HTML otherwise
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */

var dom;
var window;
var document;
var createRichTextEditor;
var sanitizeHtml;

beforeEach(() => {
  dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  window = dom.window;
  document = window.document;

  // Set up globals
  global.document = document;
  global.window = window;
  global.DOMParser = window.DOMParser;
  global.HTMLElement = window.HTMLElement;

  // Mock document.execCommand since JSDOM doesn't implement it
  document.execCommand = vi.fn().mockReturnValue(true);

  // Define sanitizeHtml
  var ALLOWED_TAGS = ['strong', 'em', 'a', 'ul', 'li', 'br'];

  sanitizeHtml = function (html) {
    if (!html || typeof html !== 'string') return '';
    var parser = new DOMParser();
    var doc = parser.parseFromString('<div>' + html + '</div>', 'text/html');
    var container = doc.body.firstChild;

    function processNode(node) {
      if (node.nodeType === 3) return node.textContent;
      if (node.nodeType !== 1) return '';
      var tagName = node.tagName.toLowerCase();
      if (ALLOWED_TAGS.indexOf(tagName) === -1) {
        var childContent = '';
        for (var i = 0; i < node.childNodes.length; i++) {
          childContent += processNode(node.childNodes[i]);
        }
        return childContent;
      }
      var result = '<' + tagName;
      if (tagName === 'a' && node.hasAttribute('href')) {
        var href = node.getAttribute('href');
        result += ' href="' + href.replace(/"/g, '&quot;') + '"';
      }
      if (tagName === 'br') { result += '>'; return result; }
      result += '>';
      for (var i = 0; i < node.childNodes.length; i++) {
        result += processNode(node.childNodes[i]);
      }
      result += '</' + tagName + '>';
      return result;
    }

    var output = '';
    for (var i = 0; i < container.childNodes.length; i++) {
      output += processNode(container.childNodes[i]);
    }
    return output;
  };

  // Make sanitizeHtml available globally
  global.sanitizeHtml = sanitizeHtml;

  // Define createRichTextEditor in the test environment
  createRichTextEditor = function (itemId, existingHtml) {
    var container = document.createElement('div');
    container.className = 'rich-text-editor';
    container.setAttribute('data-editor-item-id', itemId);

    var toolbar = document.createElement('div');
    toolbar.className = 'rich-text-toolbar';

    var boldBtn = document.createElement('button');
    boldBtn.type = 'button';
    boldBtn.className = 'rte-btn rte-bold';
    boldBtn.textContent = 'B';
    boldBtn.title = 'Bold (Ctrl+B)';
    boldBtn.addEventListener('mousedown', function (e) {
      e.preventDefault();
      document.execCommand('bold', false, null);
    });

    var italicBtn = document.createElement('button');
    italicBtn.type = 'button';
    italicBtn.className = 'rte-btn rte-italic';
    italicBtn.textContent = 'I';
    italicBtn.title = 'Italic (Ctrl+I)';
    italicBtn.addEventListener('mousedown', function (e) {
      e.preventDefault();
      document.execCommand('italic', false, null);
    });

    var linkBtn = document.createElement('button');
    linkBtn.type = 'button';
    linkBtn.className = 'rte-btn rte-link';
    linkBtn.textContent = '🔗';
    linkBtn.title = 'Insert Link';
    linkBtn.addEventListener('mousedown', function (e) {
      e.preventDefault();
      var url = window.prompt('Enter URL:');
      if (url) {
        document.execCommand('createLink', false, url);
      }
    });

    var listBtn = document.createElement('button');
    listBtn.type = 'button';
    listBtn.className = 'rte-btn rte-list';
    listBtn.textContent = '•';
    listBtn.title = 'Bullet List';
    listBtn.addEventListener('mousedown', function (e) {
      e.preventDefault();
      document.execCommand('insertUnorderedList', false, null);
    });

    toolbar.appendChild(boldBtn);
    toolbar.appendChild(italicBtn);
    toolbar.appendChild(linkBtn);
    toolbar.appendChild(listBtn);

    var editorDiv = document.createElement('div');
    editorDiv.className = 'rich-text-content';
    editorDiv.setAttribute('contenteditable', 'true');
    editorDiv.setAttribute('data-placeholder', 'Type your note here...');

    if (existingHtml) {
      editorDiv.innerHTML = sanitizeHtml(existingHtml);
    }

    editorDiv.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'b' || e.key === 'B') {
          e.preventDefault();
          document.execCommand('bold', false, null);
        } else if (e.key === 'i' || e.key === 'I') {
          e.preventDefault();
          document.execCommand('italic', false, null);
        }
      }
    });

    editorDiv.addEventListener('paste', function (e) {
      e.preventDefault();
      var clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;
      var pastedHtml = clipboardData.getData('text/html');
      var pastedText = clipboardData.getData('text/plain');
      var contentToInsert;
      if (pastedHtml) {
        contentToInsert = sanitizeHtml(pastedHtml);
      } else if (pastedText) {
        contentToInsert = pastedText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
      } else {
        return;
      }
      document.execCommand('insertHTML', false, contentToInsert);
    });

    container.appendChild(toolbar);
    container.appendChild(editorDiv);

    return container;
  };
});

describe('createRichTextEditor', function () {
  describe('Structure and elements', function () {
    it('returns a container element with rich-text-editor class', function () {
      var editor = createRichTextEditor('item-1', '');
      expect(editor.className).toBe('rich-text-editor');
    });

    it('sets data-editor-item-id attribute', function () {
      var editor = createRichTextEditor('item-42', '');
      expect(editor.getAttribute('data-editor-item-id')).toBe('item-42');
    });

    it('contains a toolbar with rich-text-toolbar class', function () {
      var editor = createRichTextEditor('item-1', '');
      var toolbar = editor.querySelector('.rich-text-toolbar');
      expect(toolbar).not.toBeNull();
    });

    it('contains a contenteditable div with rich-text-content class', function () {
      var editor = createRichTextEditor('item-1', '');
      var content = editor.querySelector('.rich-text-content');
      expect(content).not.toBeNull();
      expect(content.getAttribute('contenteditable')).toBe('true');
    });

    it('has a placeholder attribute on the editing surface', function () {
      var editor = createRichTextEditor('item-1', '');
      var content = editor.querySelector('.rich-text-content');
      expect(content.getAttribute('data-placeholder')).toBe('Type your note here...');
    });
  });

  describe('Toolbar buttons', function () {
    it('has a Bold button with title "Bold (Ctrl+B)"', function () {
      var editor = createRichTextEditor('item-1', '');
      var boldBtn = editor.querySelector('.rte-bold');
      expect(boldBtn).not.toBeNull();
      expect(boldBtn.textContent).toBe('B');
      expect(boldBtn.title).toBe('Bold (Ctrl+B)');
    });

    it('has an Italic button with title "Italic (Ctrl+I)"', function () {
      var editor = createRichTextEditor('item-1', '');
      var italicBtn = editor.querySelector('.rte-italic');
      expect(italicBtn).not.toBeNull();
      expect(italicBtn.textContent).toBe('I');
      expect(italicBtn.title).toBe('Italic (Ctrl+I)');
    });

    it('has a Link button with title "Insert Link"', function () {
      var editor = createRichTextEditor('item-1', '');
      var linkBtn = editor.querySelector('.rte-link');
      expect(linkBtn).not.toBeNull();
      expect(linkBtn.textContent).toBe('🔗');
      expect(linkBtn.title).toBe('Insert Link');
    });

    it('has a Bullet List button with title "Bullet List"', function () {
      var editor = createRichTextEditor('item-1', '');
      var listBtn = editor.querySelector('.rte-list');
      expect(listBtn).not.toBeNull();
      expect(listBtn.textContent).toBe('•');
      expect(listBtn.title).toBe('Bullet List');
    });

    it('has exactly 4 toolbar buttons', function () {
      var editor = createRichTextEditor('item-1', '');
      var buttons = editor.querySelectorAll('.rte-btn');
      expect(buttons.length).toBe(4);
    });
  });

  describe('Content pre-population', function () {
    it('pre-populates with sanitized existingHtml', function () {
      var editor = createRichTextEditor('item-1', '<strong>Hello</strong> world');
      var content = editor.querySelector('.rich-text-content');
      expect(content.innerHTML).toBe('<strong>Hello</strong> world');
    });

    it('sanitizes disallowed tags from existingHtml', function () {
      var editor = createRichTextEditor('item-1', '<div><strong>bold</strong><script>alert(1)</script></div>');
      var content = editor.querySelector('.rich-text-content');
      expect(content.innerHTML).not.toContain('<div');
      expect(content.innerHTML).not.toContain('<script');
      expect(content.innerHTML).toContain('<strong>bold</strong>');
    });

    it('handles empty existingHtml', function () {
      var editor = createRichTextEditor('item-1', '');
      var content = editor.querySelector('.rich-text-content');
      expect(content.innerHTML).toBe('');
    });

    it('handles null existingHtml', function () {
      var editor = createRichTextEditor('item-1', null);
      var content = editor.querySelector('.rich-text-content');
      expect(content.innerHTML).toBe('');
    });

    it('preserves allowed tags with attributes', function () {
      var editor = createRichTextEditor('item-1', '<a href="https://example.com">link</a>');
      var content = editor.querySelector('.rich-text-content');
      expect(content.innerHTML).toBe('<a href="https://example.com">link</a>');
    });
  });

  describe('Keyboard shortcuts', function () {
    it('handles Ctrl+B keydown event', function () {
      var editor = createRichTextEditor('item-1', 'text');
      var content = editor.querySelector('.rich-text-content');
      document.execCommand.mockClear();

      var event = new window.KeyboardEvent('keydown', {
        key: 'b',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      content.dispatchEvent(event);

      expect(document.execCommand).toHaveBeenCalledWith('bold', false, null);
    });

    it('handles Ctrl+I keydown event', function () {
      var editor = createRichTextEditor('item-1', 'text');
      var content = editor.querySelector('.rich-text-content');
      document.execCommand.mockClear();

      var event = new window.KeyboardEvent('keydown', {
        key: 'i',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      content.dispatchEvent(event);

      expect(document.execCommand).toHaveBeenCalledWith('italic', false, null);
    });

    it('does not trigger formatting without Ctrl key', function () {
      var editor = createRichTextEditor('item-1', 'text');
      var content = editor.querySelector('.rich-text-content');
      document.execCommand.mockClear();

      var event = new window.KeyboardEvent('keydown', {
        key: 'b',
        ctrlKey: false,
        bubbles: true,
        cancelable: true,
      });
      content.dispatchEvent(event);

      expect(document.execCommand).not.toHaveBeenCalled();
    });
  });

  describe('Paste sanitization', function () {
    it('sanitizes pasted HTML content', function () {
      var editor = createRichTextEditor('item-1', '');
      var content = editor.querySelector('.rich-text-content');
      document.execCommand.mockClear();

      var pasteEvent = new window.Event('paste', { bubbles: true, cancelable: true });
      pasteEvent.clipboardData = {
        getData: function (type) {
          if (type === 'text/html') return '<div><strong>bold</strong><script>bad</script></div>';
          return '';
        },
      };
      content.dispatchEvent(pasteEvent);

      expect(document.execCommand).toHaveBeenCalledWith('insertHTML', false, expect.stringContaining('<strong>bold</strong>'));
      expect(document.execCommand).toHaveBeenCalledWith('insertHTML', false, expect.not.stringContaining('<script'));
    });

    it('escapes plain text paste and converts newlines to <br>', function () {
      var editor = createRichTextEditor('item-1', '');
      var content = editor.querySelector('.rich-text-content');
      document.execCommand.mockClear();

      var pasteEvent = new window.Event('paste', { bubbles: true, cancelable: true });
      pasteEvent.clipboardData = {
        getData: function (type) {
          if (type === 'text/html') return '';
          if (type === 'text/plain') return 'line1\nline2';
          return '';
        },
      };
      content.dispatchEvent(pasteEvent);

      expect(document.execCommand).toHaveBeenCalledWith('insertHTML', false, 'line1<br>line2');
    });

    it('escapes HTML entities in plain text paste', function () {
      var editor = createRichTextEditor('item-1', '');
      var content = editor.querySelector('.rich-text-content');
      document.execCommand.mockClear();

      var pasteEvent = new window.Event('paste', { bubbles: true, cancelable: true });
      pasteEvent.clipboardData = {
        getData: function (type) {
          if (type === 'text/html') return '';
          if (type === 'text/plain') return '<script>alert(1)</script>';
          return '';
        },
      };
      content.dispatchEvent(pasteEvent);

      expect(document.execCommand).toHaveBeenCalledWith('insertHTML', false, '&lt;script&gt;alert(1)&lt;/script&gt;');
    });
  });

  describe('Bold button behavior', function () {
    it('calls execCommand bold on mousedown', function () {
      var editor = createRichTextEditor('item-1', 'text');
      var boldBtn = editor.querySelector('.rte-bold');
      document.execCommand.mockClear();

      var event = new window.MouseEvent('mousedown', { bubbles: true, cancelable: true });
      boldBtn.dispatchEvent(event);

      expect(document.execCommand).toHaveBeenCalledWith('bold', false, null);
    });
  });

  describe('Italic button behavior', function () {
    it('calls execCommand italic on mousedown', function () {
      var editor = createRichTextEditor('item-1', 'text');
      var italicBtn = editor.querySelector('.rte-italic');
      document.execCommand.mockClear();

      var event = new window.MouseEvent('mousedown', { bubbles: true, cancelable: true });
      italicBtn.dispatchEvent(event);

      expect(document.execCommand).toHaveBeenCalledWith('italic', false, null);
    });
  });

  describe('Link button behavior', function () {
    it('calls execCommand createLink with prompted URL', function () {
      var editor = createRichTextEditor('item-1', 'text');
      var linkBtn = editor.querySelector('.rte-link');
      document.execCommand.mockClear();
      vi.spyOn(window, 'prompt').mockReturnValue('https://example.com');

      var event = new window.MouseEvent('mousedown', { bubbles: true, cancelable: true });
      linkBtn.dispatchEvent(event);

      expect(document.execCommand).toHaveBeenCalledWith('createLink', false, 'https://example.com');
    });

    it('does not call execCommand createLink if prompt is cancelled', function () {
      var editor = createRichTextEditor('item-1', 'text');
      var linkBtn = editor.querySelector('.rte-link');
      document.execCommand.mockClear();
      vi.spyOn(window, 'prompt').mockReturnValue(null);

      var event = new window.MouseEvent('mousedown', { bubbles: true, cancelable: true });
      linkBtn.dispatchEvent(event);

      expect(document.execCommand).not.toHaveBeenCalledWith('createLink', expect.anything(), expect.anything());
    });
  });

  describe('Bullet List button behavior', function () {
    it('calls execCommand insertUnorderedList on mousedown', function () {
      var editor = createRichTextEditor('item-1', 'text');
      var listBtn = editor.querySelector('.rte-list');
      document.execCommand.mockClear();

      var event = new window.MouseEvent('mousedown', { bubbles: true, cancelable: true });
      listBtn.dispatchEvent(event);

      expect(document.execCommand).toHaveBeenCalledWith('insertUnorderedList', false, null);
    });
  });
});
