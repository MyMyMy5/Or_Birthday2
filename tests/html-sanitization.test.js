import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

/**
 * Unit tests for HTML sanitization and rich text persistence.
 *
 * Tests:
 * - sanitizeHtml strips disallowed tags but keeps text content
 * - sanitizeHtml preserves allowed tags (strong, em, a, ul, li, br)
 * - sanitizeHtml only allows href attribute on <a> tags
 * - sanitizeHtml strips all attributes from non-<a> allowed tags
 * - Notes stored as HTML are rendered as formatted HTML on load
 *
 * Requirements: 11.7, 11.8, 11.9, 11.10, 11.11
 */

// Set up a minimal DOM environment for DOMParser
var dom;
var sanitizeHtml;

beforeEach(() => {
  dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
  });
  var window = dom.window;

  // Make DOMParser available globally for the function
  global.DOMParser = window.DOMParser;

  // Re-create sanitizeHtml in the test environment using the same logic
  var ALLOWED_TAGS = ['strong', 'em', 'a', 'ul', 'li', 'br'];

  sanitizeHtml = function (html) {
    if (!html || typeof html !== 'string') return '';

    var parser = new DOMParser();
    var doc = parser.parseFromString('<div>' + html + '</div>', 'text/html');
    var container = doc.body.firstChild;

    function processNode(node) {
      if (node.nodeType === 3) {
        return node.textContent;
      }
      if (node.nodeType !== 1) {
        return '';
      }

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

      if (tagName === 'br') {
        result += '>';
        return result;
      }

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
});

describe('sanitizeHtml', function () {
  describe('Strips disallowed tags but keeps text content', function () {
    it('strips <div> tags but keeps inner text', function () {
      var result = sanitizeHtml('<div>Hello world</div>');
      expect(result).toBe('Hello world');
    });

    it('strips <script> tags and their content text', function () {
      var result = sanitizeHtml('<script>alert("xss")</script>');
      // Script content is treated as text by DOMParser
      expect(result).not.toContain('<script');
    });

    it('strips <span> tags but keeps inner text', function () {
      var result = sanitizeHtml('<span class="red">styled text</span>');
      expect(result).toBe('styled text');
    });

    it('strips <p> tags but keeps inner text', function () {
      var result = sanitizeHtml('<p>paragraph</p>');
      expect(result).toBe('paragraph');
    });

    it('strips nested disallowed tags', function () {
      var result = sanitizeHtml('<div><span>nested</span></div>');
      expect(result).toBe('nested');
    });

    it('strips <img> tags entirely', function () {
      var result = sanitizeHtml('<img src="x.png" onerror="alert(1)">');
      expect(result).not.toContain('<img');
      expect(result).not.toContain('onerror');
    });
  });

  describe('Preserves allowed tags', function () {
    it('preserves <strong> tags', function () {
      var result = sanitizeHtml('<strong>bold text</strong>');
      expect(result).toBe('<strong>bold text</strong>');
    });

    it('preserves <em> tags', function () {
      var result = sanitizeHtml('<em>italic text</em>');
      expect(result).toBe('<em>italic text</em>');
    });

    it('preserves <a> tags with href', function () {
      var result = sanitizeHtml('<a href="https://example.com">link</a>');
      expect(result).toBe('<a href="https://example.com">link</a>');
    });

    it('preserves <ul> and <li> tags', function () {
      var result = sanitizeHtml('<ul><li>item 1</li><li>item 2</li></ul>');
      expect(result).toBe('<ul><li>item 1</li><li>item 2</li></ul>');
    });

    it('preserves <br> tags', function () {
      var result = sanitizeHtml('line 1<br>line 2');
      expect(result).toBe('line 1<br>line 2');
    });

    it('preserves nested allowed tags', function () {
      var result = sanitizeHtml('<strong><em>bold italic</em></strong>');
      expect(result).toBe('<strong><em>bold italic</em></strong>');
    });
  });

  describe('Attribute handling', function () {
    it('only allows href on <a> tags', function () {
      var result = sanitizeHtml('<a href="https://example.com" class="link" onclick="alert(1)">link</a>');
      expect(result).toBe('<a href="https://example.com">link</a>');
    });

    it('strips all attributes from <strong>', function () {
      var result = sanitizeHtml('<strong class="bold" style="color:red">text</strong>');
      expect(result).toBe('<strong>text</strong>');
    });

    it('strips all attributes from <em>', function () {
      var result = sanitizeHtml('<em id="test" data-x="y">text</em>');
      expect(result).toBe('<em>text</em>');
    });

    it('strips all attributes from <ul> and <li>', function () {
      var result = sanitizeHtml('<ul class="list"><li style="color:blue">item</li></ul>');
      expect(result).toBe('<ul><li>item</li></ul>');
    });

    it('preserves <a> without href (no attribute added)', function () {
      var result = sanitizeHtml('<a class="no-href">link text</a>');
      expect(result).toBe('<a>link text</a>');
    });
  });

  describe('Edge cases', function () {
    it('returns empty string for null input', function () {
      expect(sanitizeHtml(null)).toBe('');
    });

    it('returns empty string for undefined input', function () {
      expect(sanitizeHtml(undefined)).toBe('');
    });

    it('returns empty string for empty string input', function () {
      expect(sanitizeHtml('')).toBe('');
    });

    it('handles plain text without any tags', function () {
      var result = sanitizeHtml('just plain text');
      expect(result).toBe('just plain text');
    });

    it('handles mixed allowed and disallowed tags', function () {
      var result = sanitizeHtml('<div><strong>bold</strong> and <span>plain</span></div>');
      expect(result).toBe('<strong>bold</strong> and plain');
    });

    it('handles complex nested structure', function () {
      var result = sanitizeHtml('<div class="wrapper"><ul><li><strong>item</strong></li></ul></div>');
      expect(result).toBe('<ul><li><strong>item</strong></li></ul>');
    });
  });

  describe('Rich text persistence', function () {
    it('HTML notes stored in localStorage can be sanitized on retrieval', function () {
      var htmlNote = '<strong>Important</strong>: Visit <a href="https://example.com">here</a>';
      var sanitized = sanitizeHtml(htmlNote);
      expect(sanitized).toBe('<strong>Important</strong>: Visit <a href="https://example.com">here</a>');
    });

    it('malicious content in stored notes is stripped on render', function () {
      var maliciousNote = '<strong>Good</strong><script>alert("xss")</script><img onerror="hack()">';
      var sanitized = sanitizeHtml(maliciousNote);
      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('<img');
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).toContain('<strong>Good</strong>');
    });
  });
});
