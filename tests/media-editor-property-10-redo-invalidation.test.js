import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

/**
 * Property 10: Redo Invalidation on New Operation
 *
 * For any HistoryStack state where one or more operations have been undone,
 * pushing a new operation SHALL clear the redo stack entirely, making
 * canRedo() return false.
 *
 * **Validates: Requirements 8.5**
 * Feature: media-and-editor-upgrades, Property 10: Redo Invalidation on New Operation
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

/** Generate a valid edit operation */
const operationArb = fc.record({
  type: fc.constantFrom('inline-edit', 'color-change', 'filter', 'frame'),
  target: fc.string({ minLength: 1 }),
  key: fc.string({ minLength: 1 }),
  oldValue: fc.string(),
  newValue: fc.string(),
  timestamp: fc.nat(),
});

/** Generate N (number of initial operations to push): 1..20 */
const initialCountArb = fc.integer({ min: 1, max: 20 });

// --- Property Tests ---

describe('Feature: media-and-editor-upgrades, Property 10: Redo Invalidation on New Operation', () => {
  it('pushing a new operation after undo clears the redo stack entirely', () => {
    /**
     * Validates: Requirements 8.5
     *
     * For any HistoryStack state where one or more operations have been undone,
     * pushing a new operation SHALL clear the redo stack entirely, making
     * canRedo() return false.
     *
     * Test approach:
     * 1. Push N operations
     * 2. Undo K of them (1 <= K <= N)
     * 3. Verify canRedo() is true
     * 4. Push a new operation
     * 5. Verify canRedo() is false and _redoStack is empty
     */
    fc.assert(
      fc.property(
        initialCountArb,
        fc.array(operationArb, { minLength: 1, maxLength: 20 }),
        operationArb,
        (n, ops, newOp) => {
          // Ensure we have at least n operations
          const operations = ops.slice(0, Math.max(n, ops.length));
          const actualN = operations.length;
          fc.pre(actualN >= 1);

          const stack = createHistoryStack();

          // Step 1: Push N operations
          for (let i = 0; i < actualN; i++) {
            stack.push(operations[i]);
          }

          // Derive K: undo between 1 and actualN operations
          const k = ((n - 1) % actualN) + 1; // ensures 1 <= k <= actualN

          // Step 2: Undo K operations
          for (let i = 0; i < k; i++) {
            stack.undo();
          }

          // Step 3: Verify canRedo() is true (we undid at least 1)
          expect(stack.canRedo()).toBe(true);
          expect(stack._redoStack.length).toBe(k);

          // Step 4: Push a new operation
          stack.push(newOp);

          // Step 5: Verify canRedo() is false and _redoStack is empty
          expect(stack.canRedo()).toBe(false);
          expect(stack._redoStack).toEqual([]);
          expect(stack._redoStack.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('redo stack is cleared regardless of how many operations were undone', () => {
    /**
     * Validates: Requirements 8.5
     *
     * For any number of undone operations (1 to N), pushing a single new
     * operation SHALL always result in an empty redo stack.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 1, max: 20 }),
        operationArb,
        (n, kRaw, newOp) => {
          const k = Math.min(kRaw, n); // ensure k <= n
          fc.pre(k >= 1);

          const stack = createHistoryStack();

          // Push n operations
          for (let i = 0; i < n; i++) {
            stack.push({
              type: 'inline-edit',
              target: 'item-' + i,
              key: 'section_titles',
              oldValue: 'old-' + i,
              newValue: 'new-' + i,
              timestamp: i,
            });
          }

          // Undo k operations
          for (let i = 0; i < k; i++) {
            stack.undo();
          }

          // Redo stack should have exactly k items
          expect(stack._redoStack.length).toBe(k);
          expect(stack.canRedo()).toBe(true);

          // Push new operation
          stack.push(newOp);

          // Redo stack must be completely empty
          expect(stack._redoStack.length).toBe(0);
          expect(stack.canRedo()).toBe(false);

          // Undo stack should have (n - k) remaining + 1 new = n - k + 1
          expect(stack._undoStack.length).toBe(n - k + 1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
