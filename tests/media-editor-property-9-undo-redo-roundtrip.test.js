import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

/**
 * Property 9: Undo/Redo Round-Trip
 *
 * For any sequence of edit operations pushed to the HistoryStack, performing an
 * undo followed by a redo SHALL restore the state to the value it had immediately
 * after the original operation was pushed (undo then redo is identity).
 *
 * **Validates: Requirements 8.3, 8.4, 8.9**
 * Feature: media-and-editor-upgrades, Property 9: Undo/Redo Round-Trip
 */

// --- Replicate the HistoryStack logic from script.js for isolated testing ---

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
    },
  };
}

// --- Arbitraries ---

/** Generate a valid edit operation type */
const operationTypeArb = fc.constantFrom(
  'inline-edit',
  'color-change',
  'layout-change',
  'pin',
  'hide',
  'reorder',
  'filter',
  'frame',
  'tag-add',
  'tag-delete'
);

/** Generate a single edit operation */
const operationArb = fc.record({
  type: operationTypeArb,
  target: fc.string({ minLength: 1, maxLength: 20 }),
  key: fc.string({ minLength: 1, maxLength: 30 }),
  oldValue: fc.string(),
  newValue: fc.string(),
  timestamp: fc.nat(),
});

/** Generate a non-empty sequence of operations */
const operationSequenceArb = fc.array(operationArb, { minLength: 1, maxLength: 20 });

// --- Property Tests ---

describe('Feature: media-and-editor-upgrades, Property 9: Undo/Redo Round-Trip', () => {
  let stack;

  beforeEach(() => {
    stack = createHistoryStack();
  });

  it('undo followed by redo restores the operation to the undo stack (single operation)', () => {
    /**
     * Validates: Requirements 8.3, 8.4, 8.9
     *
     * For any single edit operation pushed to the HistoryStack, performing undo
     * then redo SHALL restore the undo stack to contain that operation.
     */
    fc.assert(
      fc.property(operationArb, (op) => {
        stack = createHistoryStack();
        stack.push(op);

        // Capture state after push
        const stateAfterPush = [...stack._undoStack];

        // Undo then redo
        const undoneOp = stack.undo();
        expect(undoneOp).toEqual(op);

        const redoneOp = stack.redo();
        expect(redoneOp).toEqual(op);

        // State should be restored to what it was after push
        expect(stack._undoStack).toEqual(stateAfterPush);
        expect(stack._redoStack).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });

  it('undo followed by redo restores state for the last operation in a sequence', () => {
    /**
     * Validates: Requirements 8.3, 8.4, 8.9
     *
     * For any sequence of N operations pushed to the HistoryStack, undoing the
     * last operation and then redoing it SHALL restore the undo stack to its
     * state immediately after all N operations were pushed.
     */
    fc.assert(
      fc.property(operationSequenceArb, (ops) => {
        stack = createHistoryStack();

        // Push all operations
        for (const op of ops) {
          stack.push(op);
        }

        // Capture state after all pushes
        const stateAfterPushes = [...stack._undoStack];

        // Undo the last operation
        const undoneOp = stack.undo();
        expect(undoneOp).toEqual(ops[ops.length - 1]);

        // Redo it
        const redoneOp = stack.redo();
        expect(redoneOp).toEqual(ops[ops.length - 1]);

        // State should be fully restored
        expect(stack._undoStack).toEqual(stateAfterPushes);
        expect(stack._redoStack).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });

  it('undo then redo at any depth in the stack restores the undo stack state', () => {
    /**
     * Validates: Requirements 8.3, 8.4, 8.9
     *
     * For any sequence of N operations and any valid undo depth K (1..N),
     * undoing K operations and then redoing the last undone operation SHALL
     * restore the undo stack to have K-1 fewer items than the original, plus
     * the redone operation on top.
     */
    fc.assert(
      fc.property(
        operationSequenceArb,
        fc.integer({ min: 1, max: 20 }),
        (ops, undoDepth) => {
          stack = createHistoryStack();

          // Push all operations
          for (const op of ops) {
            stack.push(op);
          }

          // Limit undo depth to actual stack size
          const actualDepth = Math.min(undoDepth, ops.length);

          // Undo actualDepth times
          const undoneOps = [];
          for (let i = 0; i < actualDepth; i++) {
            undoneOps.push(stack.undo());
          }

          // Capture state after undos
          const undoStackAfterUndos = [...stack._undoStack];
          const redoStackAfterUndos = [...stack._redoStack];

          // Redo once - should restore the most recently undone operation
          const redoneOp = stack.redo();
          expect(redoneOp).toEqual(undoneOps[undoneOps.length - 1]);

          // Undo stack should have one more item than before redo
          expect(stack._undoStack).toHaveLength(undoStackAfterUndos.length + 1);
          expect(stack._undoStack[stack._undoStack.length - 1]).toEqual(redoneOp);

          // Redo stack should have one fewer item than before redo
          expect(stack._redoStack).toHaveLength(redoStackAfterUndos.length - 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('undo N times then redo N times restores original full state', () => {
    /**
     * Validates: Requirements 8.3, 8.4, 8.9
     *
     * For any sequence of N operations, undoing all N operations and then
     * redoing all N operations SHALL restore the undo stack to its original
     * state (all operations in original order).
     */
    fc.assert(
      fc.property(operationSequenceArb, (ops) => {
        stack = createHistoryStack();

        // Push all operations
        for (const op of ops) {
          stack.push(op);
        }

        // Capture original state
        const originalUndoStack = [...stack._undoStack];

        // Undo all
        for (let i = 0; i < ops.length; i++) {
          stack.undo();
        }

        expect(stack._undoStack).toHaveLength(0);
        expect(stack._redoStack).toHaveLength(ops.length);
        expect(stack.canUndo()).toBe(false);
        expect(stack.canRedo()).toBe(true);

        // Redo all
        for (let i = 0; i < ops.length; i++) {
          stack.redo();
        }

        // State fully restored
        expect(stack._undoStack).toEqual(originalUndoStack);
        expect(stack._redoStack).toHaveLength(0);
        expect(stack.canUndo()).toBe(true);
        expect(stack.canRedo()).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('the operation returned by redo equals the operation that was undone', () => {
    /**
     * Validates: Requirements 8.3, 8.4, 8.9
     *
     * For any sequence of operations and any number of undos, each redo SHALL
     * return the exact same operation object that was returned by the
     * corresponding undo (undo and redo are symmetric).
     */
    fc.assert(
      fc.property(
        operationSequenceArb,
        fc.integer({ min: 1, max: 20 }),
        (ops, undoCount) => {
          stack = createHistoryStack();

          for (const op of ops) {
            stack.push(op);
          }

          // Limit undo count to actual stack size
          const actualUndoCount = Math.min(undoCount, ops.length);

          // Undo N operations, collecting what was undone
          const undoneOps = [];
          for (let i = 0; i < actualUndoCount; i++) {
            undoneOps.push(stack.undo());
          }

          // Redo N operations, each should match the corresponding undo (in reverse)
          for (let i = actualUndoCount - 1; i >= 0; i--) {
            const redoneOp = stack.redo();
            expect(redoneOp).toEqual(undoneOps[i]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
