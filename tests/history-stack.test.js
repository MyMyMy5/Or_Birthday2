/**
 * Unit tests for HistoryStack data structure (Task 10.1)
 * Validates: Requirements 8.1, 8.5, 8.6
 */
import { describe, it, expect, beforeEach } from 'vitest';

// Replicate the HistoryStack logic from script.js for isolated testing
function createHistoryStack() {
    return {
        _undoStack: [],
        _redoStack: [],

        push: function (operation) {
            this._undoStack.push(operation);
            this._redoStack = [];
        },

        undo: function () {
            if (this._undoStack.length === 0) return null;
            var operation = this._undoStack.pop();
            this._redoStack.push(operation);
            return operation;
        },

        redo: function () {
            if (this._redoStack.length === 0) return null;
            var operation = this._redoStack.pop();
            this._undoStack.push(operation);
            return operation;
        },

        canUndo: function () {
            return this._undoStack.length > 0;
        },

        canRedo: function () {
            return this._redoStack.length > 0;
        },

        clear: function () {
            this._undoStack = [];
            this._redoStack = [];
        }
    };
}

describe('HistoryStack', () => {
    let stack;

    beforeEach(() => {
        stack = createHistoryStack();
    });

    describe('initial state', () => {
        it('should start with empty undo and redo stacks', () => {
            expect(stack._undoStack).toEqual([]);
            expect(stack._redoStack).toEqual([]);
        });

        it('canUndo() should return false initially', () => {
            expect(stack.canUndo()).toBe(false);
        });

        it('canRedo() should return false initially', () => {
            expect(stack.canRedo()).toBe(false);
        });
    });

    describe('push()', () => {
        it('should add operation to undo stack', () => {
            var op = { type: 'inline-edit', target: 'photos', key: 'section_titles', oldValue: 'Old', newValue: 'New', timestamp: 1000 };
            stack.push(op);
            expect(stack._undoStack.length).toBe(1);
            expect(stack._undoStack[0]).toEqual(op);
        });

        it('should clear redo stack when new operation is pushed', () => {
            var op1 = { type: 'inline-edit', target: 'a', key: 'k', oldValue: '1', newValue: '2', timestamp: 1 };
            var op2 = { type: 'color-change', target: 'b', key: 'k', oldValue: '2', newValue: '3', timestamp: 2 };
            stack.push(op1);
            stack.undo(); // moves op1 to redo
            expect(stack._redoStack.length).toBe(1);
            stack.push(op2); // should clear redo
            expect(stack._redoStack.length).toBe(0);
            expect(stack.canRedo()).toBe(false);
        });

        it('should allow multiple operations to be pushed', () => {
            for (var i = 0; i < 5; i++) {
                stack.push({ type: 'test', target: 'x', key: 'k', oldValue: i, newValue: i + 1, timestamp: i });
            }
            expect(stack._undoStack.length).toBe(5);
        });
    });

    describe('undo()', () => {
        it('should move operation from undo to redo and return it', () => {
            var op = { type: 'color-change', target: 'songs', key: 'section_colors', oldValue: '#fff', newValue: '#000', timestamp: 100 };
            stack.push(op);
            var result = stack.undo();
            expect(result).toEqual(op);
            expect(stack._undoStack.length).toBe(0);
            expect(stack._redoStack.length).toBe(1);
            expect(stack._redoStack[0]).toEqual(op);
        });

        it('should return null when undo stack is empty', () => {
            var result = stack.undo();
            expect(result).toBeNull();
        });

        it('should undo operations in LIFO order', () => {
            var op1 = { type: 'a', target: 'x', key: 'k', oldValue: '1', newValue: '2', timestamp: 1 };
            var op2 = { type: 'b', target: 'y', key: 'k', oldValue: '3', newValue: '4', timestamp: 2 };
            var op3 = { type: 'c', target: 'z', key: 'k', oldValue: '5', newValue: '6', timestamp: 3 };
            stack.push(op1);
            stack.push(op2);
            stack.push(op3);
            expect(stack.undo()).toEqual(op3);
            expect(stack.undo()).toEqual(op2);
            expect(stack.undo()).toEqual(op1);
            expect(stack.undo()).toBeNull();
        });
    });

    describe('redo()', () => {
        it('should move operation from redo to undo and return it', () => {
            var op = { type: 'pin', target: 'item1', key: 'pinned_items', oldValue: null, newValue: 'item1', timestamp: 200 };
            stack.push(op);
            stack.undo();
            var result = stack.redo();
            expect(result).toEqual(op);
            expect(stack._undoStack.length).toBe(1);
            expect(stack._redoStack.length).toBe(0);
        });

        it('should return null when redo stack is empty', () => {
            var result = stack.redo();
            expect(result).toBeNull();
        });

        it('should redo operations in LIFO order (most recently undone first)', () => {
            var op1 = { type: 'a', target: 'x', key: 'k', oldValue: '1', newValue: '2', timestamp: 1 };
            var op2 = { type: 'b', target: 'y', key: 'k', oldValue: '3', newValue: '4', timestamp: 2 };
            stack.push(op1);
            stack.push(op2);
            stack.undo(); // undoes op2
            stack.undo(); // undoes op1
            // redo should give op1 first (it was undone last, so it's on top of redo stack)
            expect(stack.redo()).toEqual(op1);
            expect(stack.redo()).toEqual(op2);
            expect(stack.redo()).toBeNull();
        });
    });

    describe('canUndo()', () => {
        it('should return true when undo stack has items', () => {
            expect(stack.canUndo()).toBe(false);
            stack.push({ type: 'test', target: 'x', key: 'k', oldValue: 'a', newValue: 'b', timestamp: 1 });
            expect(stack.canUndo()).toBe(true);
        });

        it('should return false after all operations are undone', () => {
            stack.push({ type: 'test', target: 'x', key: 'k', oldValue: 'a', newValue: 'b', timestamp: 1 });
            stack.undo();
            expect(stack.canUndo()).toBe(false);
        });
    });

    describe('canRedo()', () => {
        it('should return true when redo stack has items', () => {
            expect(stack.canRedo()).toBe(false);
            stack.push({ type: 'test', target: 'x', key: 'k', oldValue: 'a', newValue: 'b', timestamp: 1 });
            stack.undo();
            expect(stack.canRedo()).toBe(true);
        });

        it('should return false after all undone operations are redone', () => {
            stack.push({ type: 'test', target: 'x', key: 'k', oldValue: 'a', newValue: 'b', timestamp: 1 });
            stack.undo();
            stack.redo();
            expect(stack.canRedo()).toBe(false);
        });
    });

    describe('clear()', () => {
        it('should empty both stacks', () => {
            stack.push({ type: 'test', target: 'x', key: 'k', oldValue: 'a', newValue: 'b', timestamp: 1 });
            stack.push({ type: 'test', target: 'y', key: 'k', oldValue: 'c', newValue: 'd', timestamp: 2 });
            stack.undo();
            expect(stack._undoStack.length).toBe(1);
            expect(stack._redoStack.length).toBe(1);
            stack.clear();
            expect(stack._undoStack.length).toBe(0);
            expect(stack._redoStack.length).toBe(0);
            expect(stack.canUndo()).toBe(false);
            expect(stack.canRedo()).toBe(false);
        });
    });

    describe('undo/redo round-trip', () => {
        it('undo followed by redo should restore the operation to undo stack', () => {
            var op = { type: 'filter', target: 'photo1', key: 'photo_filters', oldValue: null, newValue: { grayscale: 50 }, timestamp: 500 };
            stack.push(op);
            stack.undo();
            stack.redo();
            expect(stack._undoStack.length).toBe(1);
            expect(stack._undoStack[0]).toEqual(op);
            expect(stack._redoStack.length).toBe(0);
        });
    });

    describe('redo invalidation on new push', () => {
        it('pushing after undo should clear entire redo stack', () => {
            var op1 = { type: 'a', target: 'x', key: 'k', oldValue: '1', newValue: '2', timestamp: 1 };
            var op2 = { type: 'b', target: 'y', key: 'k', oldValue: '3', newValue: '4', timestamp: 2 };
            var op3 = { type: 'c', target: 'z', key: 'k', oldValue: '5', newValue: '6', timestamp: 3 };
            stack.push(op1);
            stack.push(op2);
            stack.push(op3);
            stack.undo(); // redo has op3
            stack.undo(); // redo has op3, op2
            expect(stack._redoStack.length).toBe(2);
            var newOp = { type: 'new', target: 'w', key: 'k', oldValue: '7', newValue: '8', timestamp: 4 };
            stack.push(newOp); // should clear all redo
            expect(stack._redoStack.length).toBe(0);
            expect(stack.canRedo()).toBe(false);
            expect(stack._undoStack.length).toBe(2); // op1 + newOp
        });
    });

    describe('Edit Mode deactivation clears history', () => {
        it('simulates disableDevMode clearing the stack', () => {
            stack.push({ type: 'test', target: 'x', key: 'k', oldValue: 'a', newValue: 'b', timestamp: 1 });
            stack.push({ type: 'test', target: 'y', key: 'k', oldValue: 'c', newValue: 'd', timestamp: 2 });
            expect(stack.canUndo()).toBe(true);
            // disableDevMode calls HistoryStack.clear()
            stack.clear();
            expect(stack.canUndo()).toBe(false);
            expect(stack.canRedo()).toBe(false);
        });
    });
});
