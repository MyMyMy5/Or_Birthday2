import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Unit tests for setupDragAndDrop guard logic.
 *
 * Since setupDragAndDrop is a global function in script.js (not a module),
 * we re-implement the core drag-and-drop logic here for isolated unit testing.
 *
 * Validates: Requirements 2.2, 2.3, 3.2, 3.3
 */

// --- Re-implementation of setupDragAndDrop core logic ---

/**
 * Mimics the setupDragAndDrop function's event handling logic.
 * Attaches dragenter, dragleave, dragend, and drop listeners to a mock element.
 */
function setupDragAndDrop(sectionElement) {
    let dragCounter = 0;

    sectionElement.addEventListener('dragenter', (e) => {
        e.preventDefault();
        if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes('Files')) return;
        dragCounter++;
        sectionElement.classList.add('drag-active');
    });

    sectionElement.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    sectionElement.addEventListener('dragleave', (e) => {
        e.preventDefault();
        if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes('Files')) return;
        dragCounter--;
        if (dragCounter <= 0) {
            dragCounter = 0;
            sectionElement.classList.remove('drag-active');
        }
    });

    sectionElement.addEventListener('dragend', (e) => {
        dragCounter = 0;
        sectionElement.classList.remove('drag-active');
    });

    sectionElement.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        sectionElement.classList.remove('drag-active');
    });
}

// --- Mock DOM helpers ---

function createMockElement() {
    const classes = new Set();
    const listeners = {};

    return {
        classList: {
            add(cls) { classes.add(cls); },
            remove(cls) { classes.delete(cls); },
            contains(cls) { return classes.has(cls); },
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
    };
}

function createDragEvent(type, dataTransferTypes) {
    return {
        type,
        preventDefault() {},
        dataTransfer: {
            types: dataTransferTypes,
        },
    };
}

// --- Tests ---

describe('setupDragAndDrop - drag-active guard logic', () => {
    let sectionElement;

    beforeEach(() => {
        sectionElement = createMockElement();
        setupDragAndDrop(sectionElement);
    });

    describe('3.1 - dragenter does NOT add drag-active for internal reorder drags', () => {
        it('should not add drag-active when dataTransfer.types is ["text/plain"] (internal drag)', () => {
            const event = createDragEvent('dragenter', ['text/plain']);
            sectionElement.dispatchEvent(event);

            expect(sectionElement.classList.contains('drag-active')).toBe(false);
        });

        it('should not add drag-active when dataTransfer.types is ["text/html", "text/plain"]', () => {
            const event = createDragEvent('dragenter', ['text/html', 'text/plain']);
            sectionElement.dispatchEvent(event);

            expect(sectionElement.classList.contains('drag-active')).toBe(false);
        });

        it('should not add drag-active when dataTransfer.types is empty', () => {
            const event = createDragEvent('dragenter', []);
            sectionElement.dispatchEvent(event);

            expect(sectionElement.classList.contains('drag-active')).toBe(false);
        });

        it('should not add drag-active when dataTransfer is null', () => {
            const event = {
                type: 'dragenter',
                preventDefault() {},
                dataTransfer: null,
            };
            sectionElement.dispatchEvent(event);

            expect(sectionElement.classList.contains('drag-active')).toBe(false);
        });
    });

    describe('3.2 - dragenter DOES add drag-active for external file drops', () => {
        it('should add drag-active when dataTransfer.types includes "Files"', () => {
            const event = createDragEvent('dragenter', ['Files']);
            sectionElement.dispatchEvent(event);

            expect(sectionElement.classList.contains('drag-active')).toBe(true);
        });

        it('should add drag-active when dataTransfer.types includes "Files" among other types', () => {
            const event = createDragEvent('dragenter', ['text/plain', 'Files']);
            sectionElement.dispatchEvent(event);

            expect(sectionElement.classList.contains('drag-active')).toBe(true);
        });
    });

    describe('3.3 - dragend resets dragCounter and removes drag-active', () => {
        it('should remove drag-active on dragend after a file dragenter', () => {
            // First, trigger a file dragenter to set drag-active
            const enterEvent = createDragEvent('dragenter', ['Files']);
            sectionElement.dispatchEvent(enterEvent);
            expect(sectionElement.classList.contains('drag-active')).toBe(true);

            // Then trigger dragend
            const endEvent = createDragEvent('dragend', []);
            sectionElement.dispatchEvent(endEvent);

            expect(sectionElement.classList.contains('drag-active')).toBe(false);
        });

        it('should reset dragCounter so subsequent file dragenter starts fresh', () => {
            // Simulate multiple file dragenter events (nested elements)
            sectionElement.dispatchEvent(createDragEvent('dragenter', ['Files']));
            sectionElement.dispatchEvent(createDragEvent('dragenter', ['Files']));
            expect(sectionElement.classList.contains('drag-active')).toBe(true);

            // dragend resets everything
            sectionElement.dispatchEvent(createDragEvent('dragend', []));
            expect(sectionElement.classList.contains('drag-active')).toBe(false);

            // A single dragleave after a new dragenter should remove drag-active
            // (proves dragCounter was reset to 0, not stuck at 2)
            sectionElement.dispatchEvent(createDragEvent('dragenter', ['Files']));
            expect(sectionElement.classList.contains('drag-active')).toBe(true);

            sectionElement.dispatchEvent(createDragEvent('dragleave', ['Files']));
            expect(sectionElement.classList.contains('drag-active')).toBe(false);
        });

        it('should handle dragend even when no dragenter occurred (no-op safety)', () => {
            // dragend without prior dragenter should not throw
            const endEvent = createDragEvent('dragend', []);
            sectionElement.dispatchEvent(endEvent);

            expect(sectionElement.classList.contains('drag-active')).toBe(false);
        });
    });
});
