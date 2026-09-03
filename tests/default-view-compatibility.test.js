import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const projectRoot = resolve(import.meta.dirname, '..');
const css = readFileSync(resolve(projectRoot, 'styles.css'), 'utf8');
const script = readFileSync(resolve(projectRoot, 'script.js'), 'utf8');

function createStyledDom() {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>
    <div class="add-btn-card add-btn-card-song">+</div>
    <button class="delete-btn">×</button>
    <div class="item-note item-note-empty"><span class="note-placeholder">+ Add note</span></div>
    <div class="item-note item-note-saved"><span class="note-text">Saved note</span></div>
  </body></html>`);
  const style = dom.window.document.createElement('style');
  style.textContent = css;
  dom.window.document.head.appendChild(style);
  return dom;
}

describe('default view compatibility', () => {
  it('removes editor-only controls and empty notes from normal layout flow', () => {
    const dom = createStyledDom();
    const { document } = dom.window;

    expect(dom.window.getComputedStyle(document.querySelector('.add-btn-card')).display).toBe('none');
    expect(dom.window.getComputedStyle(document.querySelector('.delete-btn')).display).toBe('none');
    expect(dom.window.getComputedStyle(document.querySelector('.item-note-empty')).display).toBe('none');
    expect(dom.window.getComputedStyle(document.querySelector('.item-note-saved')).display).not.toBe('none');
  });

  it('restores editor controls when Edit Mode is enabled', () => {
    const dom = createStyledDom();
    const { document } = dom.window;
    document.body.classList.add('dev-mode-active');

    expect(dom.window.getComputedStyle(document.querySelector('.add-btn-card')).display).toBe('flex');
    expect(dom.window.getComputedStyle(document.querySelector('.item-note-empty')).display).not.toBe('none');
  });

  it('does not force customizable grid/list classes when no layout was saved', () => {
    expect(script).toContain("var mode = layouts[sectionId] || null;");
    expect(script).toContain("container.classList.remove('layout-grid');");
    expect(script).toContain("container.classList.remove('layout-list');");
  });
});
