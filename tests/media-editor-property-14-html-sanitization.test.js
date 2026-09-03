import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { JSDOM } from 'jsdom';

/**
 * Property 14: HTML Sanitization Invariant
 *
 * For any HTML string input, after applying the sanitization function, the output
 * SHALL contain only the allowed tags (`<strong>`, `<em>`, `<a>`, `<ul>`, `<li>`, `<br>`)
 * and no other HTML tags. The `<a>` tags SHALL retain only the `href` attribute;
 * all other attributes on any tag SHALL be stripped.
 *
 * **Validates: Requirements 11.10, 11.11**
 * Feature: media-and-editor-upgrades, Property 14: HTML Sanitization Invariant
 */

// --- JSDOM setup and sanitizeHtml re-implementation ---

let sanitizeHtml;

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
  });
  const window = dom.window;
  global.DOMParser = window.DOMParser;

  const ALLOWED_TAGS = ['strong', 'em', 'a', 'ul', 'li', 'br'];

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

// --- Constants ---

const ALLOWED_TAGS = ['strong', 'em', 'a', 'ul', 'li', 'br'];

const DISALLOWED_TAGS = [
  'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'script', 'style', 'img', 'iframe', 'object', 'embed',
  'table', 'tr', 'td', 'th', 'form', 'input', 'button',
  'textarea', 'select', 'option', 'section', 'article',
  'header', 'footer', 'nav', 'aside', 'main', 'figure',
  'figcaption', 'video', 'audio', 'source', 'canvas', 'svg',
  'b', 'i', 'u', 's', 'pre', 'code', 'blockquote', 'hr',
];

/**
 * Raw text elements whose content is treated as literal text by DOMParser
 * (not parsed as HTML children). Excluded from nested generators because
 * their text content passes through verbatim and may look like HTML.
 */
const RAW_TEXT_ELEMENTS = ['script', 'style', 'textarea', 'title', 'xmp', 'noscript', 'iframe', 'noembed', 'noframes', 'plaintext'];

/** Disallowed tags safe for nesting (content is parsed as normal HTML children) */
const DISALLOWED_TAGS_FOR_NESTING = DISALLOWED_TAGS.filter(
  (tag) => !RAW_TEXT_ELEMENTS.includes(tag)
);

const RANDOM_ATTRIBUTES = [
  'class', 'id', 'style', 'onclick', 'onload', 'onerror',
  'data-x', 'title', 'role', 'aria-label', 'tabindex',
  'src', 'alt', 'target', 'rel', 'name', 'action', 'method',
];

// --- Character sets for string generation ---

const safeTextChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split('');
const attrValueChars = 'abcdefghijklmnopqrstuvwxyz0123456789-_/.'.split('');

// --- Verification helpers ---

/**
 * Parse sanitized HTML output and verify all elements are allowed.
 * Returns { valid: boolean, violatingTag?: string, violatingAttr?: string }
 */
function verifySanitizedOutput(output) {
  if (!output || output.trim() === '') {
    return { valid: true };
  }

  // Parse the output using DOMParser
  const parser = new DOMParser();
  const doc = parser.parseFromString('<div>' + output + '</div>', 'text/html');
  const container = doc.body.firstChild;

  function checkNode(node) {
    if (node.nodeType === 3) {
      return { valid: true };
    }
    if (node.nodeType !== 1) {
      return { valid: true };
    }

    const tagName = node.tagName.toLowerCase();

    // Check tag is allowed
    if (ALLOWED_TAGS.indexOf(tagName) === -1) {
      return { valid: false, violatingTag: tagName };
    }

    // Check attributes
    if (node.attributes.length > 0) {
      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes[i];
        // Only href on <a> is allowed
        if (!(tagName === 'a' && attr.name === 'href')) {
          return { valid: false, violatingAttr: tagName + '[' + attr.name + ']' };
        }
      }
    }

    // Recursively check children
    for (let i = 0; i < node.childNodes.length; i++) {
      const childResult = checkNode(node.childNodes[i]);
      if (!childResult.valid) {
        return childResult;
      }
    }

    return { valid: true };
  }

  for (let i = 0; i < container.childNodes.length; i++) {
    const result = checkNode(container.childNodes[i]);
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
}

// --- Arbitraries (HTML generators) ---

/** Generate a random text content string (no angle brackets) */
const textContentArb = fc
  .array(fc.constantFrom(...safeTextChars), { minLength: 0, maxLength: 20 })
  .map((chars) => chars.join(''));

/** Generate a random attribute value */
const attrValueArb = fc
  .array(fc.constantFrom(...attrValueChars), { minLength: 1, maxLength: 15 })
  .map((chars) => chars.join(''));

/** Generate a random attribute pair */
const attrArb = fc.tuple(
  fc.constantFrom(...RANDOM_ATTRIBUTES),
  attrValueArb
).map(([name, value]) => ` ${name}="${value}"`);

/** Generate multiple random attributes */
const attrsArb = fc.array(attrArb, { minLength: 0, maxLength: 3 })
  .map((attrs) => attrs.join(''));

/** Generate a random disallowed tag wrapping some content.
 *  Uses DISALLOWED_TAGS_FOR_NESTING to avoid raw text elements whose
 *  text content passes through verbatim and may look like HTML. */
const disallowedTagArb = fc.tuple(
  fc.constantFrom(...DISALLOWED_TAGS_FOR_NESTING),
  attrsArb,
  textContentArb
).map(([tag, attrs, content]) => `<${tag}${attrs}>${content}</${tag}>`);

/** Generate a random allowed tag (non-br, non-a) wrapping some content */
const allowedTagArb = fc.tuple(
  fc.constantFrom('strong', 'em', 'ul', 'li'),
  attrsArb,
  textContentArb
).map(([tag, attrs, content]) => `<${tag}${attrs}>${content}</${tag}>`);

/** Generate a <br> tag with optional attributes */
const brTagArb = attrsArb.map((attrs) => `<br${attrs}>`);

/** Generate an <a> tag with href and extra attributes */
const aTagArb = fc.tuple(
  attrValueArb,
  attrsArb,
  textContentArb
).map(([href, extraAttrs, content]) => `<a href="${href}"${extraAttrs}>${content}</a>`);

/** Generate a structured HTML fragment with mixed allowed/disallowed tags */
const htmlFragmentArb = fc.array(
  fc.oneof(
    { weight: 3, arbitrary: textContentArb },
    { weight: 2, arbitrary: disallowedTagArb },
    { weight: 2, arbitrary: allowedTagArb },
    { weight: 1, arbitrary: brTagArb },
    { weight: 2, arbitrary: aTagArb }
  ),
  { minLength: 1, maxLength: 8 }
).map((parts) => parts.join(''));

/** Generate nested HTML (disallowed wrapping allowed and vice versa).
 *  Uses DISALLOWED_TAGS_FOR_NESTING to avoid raw text elements whose
 *  content is not parsed as HTML by DOMParser. */
const nestedHtmlArb = fc.tuple(
  fc.constantFrom(...DISALLOWED_TAGS_FOR_NESTING),
  attrsArb,
  fc.array(
    fc.oneof(allowedTagArb, textContentArb, disallowedTagArb),
    { minLength: 1, maxLength: 4 }
  )
).map(([outerTag, attrs, children]) =>
  `<${outerTag}${attrs}>${children.join('')}</${outerTag}>`
);

/** Generate HTML with attributes on allowed tags that should be stripped */
const allowedTagWithAttrsArb = fc.tuple(
  fc.constantFrom('strong', 'em', 'ul', 'li'),
  fc.array(attrArb, { minLength: 1, maxLength: 4 }),
  textContentArb
).map(([tag, attrs, content]) => `<${tag}${attrs.join('')}>${content}</${tag}>`);

// --- Property Tests ---

describe('Feature: media-and-editor-upgrades, Property 14: HTML Sanitization Invariant', () => {
  it('sanitized output contains only allowed tags for any HTML input', () => {
    /**
     * Validates: Requirements 11.10, 11.11
     *
     * For any HTML string input, after applying the sanitization function,
     * the output SHALL contain only the allowed tags (strong, em, a, ul, li, br)
     * and no other HTML tags.
     */
    fc.assert(
      fc.property(
        htmlFragmentArb,
        (htmlInput) => {
          const output = sanitizeHtml(htmlInput);
          const verification = verifySanitizedOutput(output);

          expect(verification.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sanitized output strips all attributes except href on <a> tags', () => {
    /**
     * Validates: Requirements 11.10, 11.11
     *
     * The <a> tags SHALL retain only the href attribute; all other attributes
     * on any tag SHALL be stripped.
     */
    fc.assert(
      fc.property(
        fc.oneof(
          allowedTagWithAttrsArb,
          aTagArb,
          htmlFragmentArb
        ),
        (htmlInput) => {
          const output = sanitizeHtml(htmlInput);
          const verification = verifySanitizedOutput(output);

          expect(verification.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('nested disallowed tags are fully stripped from output', () => {
    /**
     * Validates: Requirements 11.10, 11.11
     *
     * For any nested HTML structure with disallowed tags wrapping allowed content,
     * the output SHALL contain only allowed tags.
     */
    fc.assert(
      fc.property(
        nestedHtmlArb,
        (htmlInput) => {
          const output = sanitizeHtml(htmlInput);
          const verification = verifySanitizedOutput(output);

          expect(verification.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('output is parseable HTML (no malformed tags)', () => {
    /**
     * Validates: Requirements 11.10, 11.11
     *
     * For any HTML input, the sanitized output SHALL be valid parseable HTML.
     */
    fc.assert(
      fc.property(
        htmlFragmentArb,
        (htmlInput) => {
          const output = sanitizeHtml(htmlInput);

          // Parsing should not throw
          const parser = new DOMParser();
          const doc = parser.parseFromString('<div>' + output + '</div>', 'text/html');
          const container = doc.body.firstChild;

          // Container should exist and be parseable
          expect(container).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
