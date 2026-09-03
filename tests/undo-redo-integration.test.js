/**
 * Unit tests for undo/redo integration with edit operations (Task 10.2)
 * Validates: Requirements 8.1, 8.3, 8.4
 *
 * Tests that recordEditOperation, applyUndoOperation, and applyRedoOperation
 * correctly record operations and restore localStorage state.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
function createMockLocalStorage() {
    let store = {};
    return {
        getItem: function (key) { return store[key] || null; },
        setItem: function (key, value) { store[key] = String(value); },
        removeItem: function (key) { delete store[key]; },
        clear: function () { store = {}; },
        _store: store,
        get _data() { return store; }
    };
}

// Replicate HistoryStack for isolated testing
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
        canUndo: function () { return this._undoStack.length > 0; },
        canRedo: function () { return this._redoStack.length > 0; },
        clear: function () { this._undoStack = []; this._redoStack = []; }
    };
}

describe('Undo/Redo Integration Helpers', () => {
    let mockStorage;
    let historyStack;
    let devModeActive;

    // Replicate the helper functions from script.js for isolated testing
    function recordEditOperation(type, target, key, oldValue, newValue) {
        if (!devModeActive) return;
        historyStack.push({
            type: type,
            target: target,
            key: key,
            oldValue: oldValue,
            newValue: newValue,
            timestamp: Date.now()
        });
    }

    function applyUndoOperation(operation) {
        if (!operation) return;
        _applyOperationValue(operation.key, operation.target, operation.oldValue, operation.type);
    }

    function applyRedoOperation(operation) {
        if (!operation) return;
        _applyOperationValue(operation.key, operation.target, operation.newValue, operation.type);
    }

    function _applyOperationValue(key, target, value, type) {
        try {
            if (type === 'hide') {
                mockStorage.setItem(key, JSON.stringify(value));
            } else if (type === 'pin') {
                mockStorage.setItem(key, JSON.stringify(value));
            } else if (type === 'reorder') {
                var orderMap = {};
                try {
                    orderMap = JSON.parse(mockStorage.getItem(key) || '{}');
                } catch (e) { /* ignore */ }
                if (value === null || value === undefined) {
                    delete orderMap[target];
                } else {
                    orderMap[target] = value;
                }
                mockStorage.setItem(key, JSON.stringify(orderMap));
            } else {
                var raw = mockStorage.getItem(key);
                var store = raw ? JSON.parse(raw) : {};
                if (value === null || value === undefined) {
                    delete store[target];
                } else {
                    store[target] = value;
                }
                mockStorage.setItem(key, JSON.stringify(store));
            }
        } catch (e) {
            // Silently fail
        }
    }

    beforeEach(() => {
        mockStorage = createMockLocalStorage();
        historyStack = createHistoryStack();
        devModeActive = true;
    });

    describe('recordEditOperation', () => {
        it('should push operation to HistoryStack when edit mode is active', () => {
            recordEditOperation('inline-edit', 'photos-section', 'section_titles', 'Old Title', 'New Title');
            expect(historyStack.canUndo()).toBe(true);
            expect(historyStack._undoStack.length).toBe(1);
            expect(historyStack._undoStack[0].type).toBe('inline-edit');
            expect(historyStack._undoStack[0].target).toBe('photos-section');
            expect(historyStack._undoStack[0].key).toBe('section_titles');
            expect(historyStack._undoStack[0].oldValue).toBe('Old Title');
            expect(historyStack._undoStack[0].newValue).toBe('New Title');
        });

        it('should not push operation when edit mode is not active', () => {
            devModeActive = false;
            recordEditOperation('inline-edit', 'photos-section', 'section_titles', 'Old', 'New');
            expect(historyStack.canUndo()).toBe(false);
            expect(historyStack._undoStack.length).toBe(0);
        });

        it('should include a timestamp', () => {
            var before = Date.now();
            recordEditOperation('color-change', 'songs-section', 'section_colors', null, '#ff0000');
            var after = Date.now();
            var op = historyStack._undoStack[0];
            expect(op.timestamp).toBeGreaterThanOrEqual(before);
            expect(op.timestamp).toBeLessThanOrEqual(after);
        });
    });

    describe('applyUndoOperation - map-style keys', () => {
        it('should restore oldValue to localStorage for inline-edit', () => {
            // Setup: simulate a title change
            mockStorage.setItem('section_titles', JSON.stringify({ 'photos-section': 'New Title' }));

            var operation = {
                type: 'inline-edit',
                target: 'photos-section',
                key: 'section_titles',
                oldValue: 'Old Title',
                newValue: 'New Title',
                timestamp: 1000
            };

            applyUndoOperation(operation);

            var stored = JSON.parse(mockStorage.getItem('section_titles'));
            expect(stored['photos-section']).toBe('Old Title');
        });

        it('should remove entry when oldValue is null', () => {
            mockStorage.setItem('section_colors', JSON.stringify({ 'songs-section': '#ff0000' }));

            var operation = {
                type: 'color-change',
                target: 'songs-section',
                key: 'section_colors',
                oldValue: null,
                newValue: '#ff0000',
                timestamp: 1000
            };

            applyUndoOperation(operation);

            var stored = JSON.parse(mockStorage.getItem('section_colors'));
            expect(stored['songs-section']).toBeUndefined();
        });

        it('should restore filter values on undo', () => {
            var newFilter = { grayscale: 50, sepia: 0, brightness: 100, contrast: 100 };
            mockStorage.setItem('photo_filters', JSON.stringify({ 'photo1': newFilter }));

            var operation = {
                type: 'filter',
                target: 'photo1',
                key: 'photo_filters',
                oldValue: null,
                newValue: newFilter,
                timestamp: 1000
            };

            applyUndoOperation(operation);

            var stored = JSON.parse(mockStorage.getItem('photo_filters'));
            expect(stored['photo1']).toBeUndefined();
        });

        it('should restore frame values on undo', () => {
            mockStorage.setItem('photo_frames', JSON.stringify({ 'photo1': 'confetti' }));

            var operation = {
                type: 'frame',
                target: 'photo1',
                key: 'photo_frames',
                oldValue: null,
                newValue: 'confetti',
                timestamp: 1000
            };

            applyUndoOperation(operation);

            var stored = JSON.parse(mockStorage.getItem('photo_frames'));
            expect(stored['photo1']).toBeUndefined();
        });

        it('should restore tag arrays on undo', () => {
            var newTags = [{ x: 50, y: 50, name: 'Alice' }];
            mockStorage.setItem('photo_tags', JSON.stringify({ 'photo1': newTags }));

            var operation = {
                type: 'tag-add',
                target: 'photo1',
                key: 'photo_tags',
                oldValue: [],
                newValue: newTags,
                timestamp: 1000
            };

            applyUndoOperation(operation);

            var stored = JSON.parse(mockStorage.getItem('photo_tags'));
            expect(stored['photo1']).toEqual([]);
        });
    });

    describe('applyUndoOperation - array-style keys (hide)', () => {
        it('should restore old hidden sections array on undo', () => {
            mockStorage.setItem('hidden_sections', JSON.stringify(['photos-section', 'songs-section']));

            var operation = {
                type: 'hide',
                target: 'songs-section',
                key: 'hidden_sections',
                oldValue: ['photos-section'],
                newValue: ['photos-section', 'songs-section'],
                timestamp: 1000
            };

            applyUndoOperation(operation);

            var stored = JSON.parse(mockStorage.getItem('hidden_sections'));
            expect(stored).toEqual(['photos-section']);
        });
    });

    describe('applyUndoOperation - pin (full object)', () => {
        it('should restore old pinned items map on undo', () => {
            mockStorage.setItem('pinned_items', JSON.stringify({ 'photos-section': 'item2' }));

            var operation = {
                type: 'pin',
                target: 'photos-section',
                key: 'pinned_items',
                oldValue: { 'photos-section': 'item1' },
                newValue: { 'photos-section': 'item2' },
                timestamp: 1000
            };

            applyUndoOperation(operation);

            var stored = JSON.parse(mockStorage.getItem('pinned_items'));
            expect(stored).toEqual({ 'photos-section': 'item1' });
        });
    });

    describe('applyUndoOperation - reorder', () => {
        it('should restore old order array for a section on undo', () => {
            mockStorage.setItem('developer_mode_order', JSON.stringify({ 'photos-section': ['b', 'a', 'c'] }));

            var operation = {
                type: 'reorder',
                target: 'photos-section',
                key: 'developer_mode_order',
                oldValue: ['a', 'b', 'c'],
                newValue: ['b', 'a', 'c'],
                timestamp: 1000
            };

            applyUndoOperation(operation);

            var stored = JSON.parse(mockStorage.getItem('developer_mode_order'));
            expect(stored['photos-section']).toEqual(['a', 'b', 'c']);
        });
    });

    describe('applyRedoOperation', () => {
        it('should restore newValue to localStorage for inline-edit', () => {
            mockStorage.setItem('section_titles', JSON.stringify({ 'photos-section': 'Old Title' }));

            var operation = {
                type: 'inline-edit',
                target: 'photos-section',
                key: 'section_titles',
                oldValue: 'Old Title',
                newValue: 'New Title',
                timestamp: 1000
            };

            applyRedoOperation(operation);

            var stored = JSON.parse(mockStorage.getItem('section_titles'));
            expect(stored['photos-section']).toBe('New Title');
        });

        it('should restore newValue for color-change', () => {
            mockStorage.setItem('section_colors', JSON.stringify({}));

            var operation = {
                type: 'color-change',
                target: 'songs-section',
                key: 'section_colors',
                oldValue: null,
                newValue: '#ff0000',
                timestamp: 1000
            };

            applyRedoOperation(operation);

            var stored = JSON.parse(mockStorage.getItem('section_colors'));
            expect(stored['songs-section']).toBe('#ff0000');
        });

        it('should restore hidden sections array on redo', () => {
            mockStorage.setItem('hidden_sections', JSON.stringify(['photos-section']));

            var operation = {
                type: 'hide',
                target: 'songs-section',
                key: 'hidden_sections',
                oldValue: ['photos-section'],
                newValue: ['photos-section', 'songs-section'],
                timestamp: 1000
            };

            applyRedoOperation(operation);

            var stored = JSON.parse(mockStorage.getItem('hidden_sections'));
            expect(stored).toEqual(['photos-section', 'songs-section']);
        });

        it('should restore pinned items map on redo', () => {
            mockStorage.setItem('pinned_items', JSON.stringify({ 'photos-section': 'item1' }));

            var operation = {
                type: 'pin',
                target: 'photos-section',
                key: 'pinned_items',
                oldValue: { 'photos-section': 'item1' },
                newValue: { 'photos-section': 'item2' },
                timestamp: 1000
            };

            applyRedoOperation(operation);

            var stored = JSON.parse(mockStorage.getItem('pinned_items'));
            expect(stored).toEqual({ 'photos-section': 'item2' });
        });

        it('should restore reorder on redo', () => {
            mockStorage.setItem('developer_mode_order', JSON.stringify({ 'photos-section': ['a', 'b', 'c'] }));

            var operation = {
                type: 'reorder',
                target: 'photos-section',
                key: 'developer_mode_order',
                oldValue: ['a', 'b', 'c'],
                newValue: ['b', 'a', 'c'],
                timestamp: 1000
            };

            applyRedoOperation(operation);

            var stored = JSON.parse(mockStorage.getItem('developer_mode_order'));
            expect(stored['photos-section']).toEqual(['b', 'a', 'c']);
        });
    });

    describe('undo/redo round-trip with HistoryStack', () => {
        it('undo then redo should restore localStorage to post-operation state', () => {
            // Initial state
            mockStorage.setItem('section_colors', JSON.stringify({}));

            // Record a color change
            recordEditOperation('color-change', 'photos-section', 'section_colors', null, '#ff0000');

            // Simulate the operation was applied (newValue in storage)
            mockStorage.setItem('section_colors', JSON.stringify({ 'photos-section': '#ff0000' }));

            // Undo
            var undoneOp = historyStack.undo();
            applyUndoOperation(undoneOp);
            var afterUndo = JSON.parse(mockStorage.getItem('section_colors'));
            expect(afterUndo['photos-section']).toBeUndefined();

            // Redo
            var redoneOp = historyStack.redo();
            applyRedoOperation(redoneOp);
            var afterRedo = JSON.parse(mockStorage.getItem('section_colors'));
            expect(afterRedo['photos-section']).toBe('#ff0000');
        });

        it('multiple operations: undo all then redo all', () => {
            mockStorage.setItem('section_titles', JSON.stringify({}));

            // Record two operations
            recordEditOperation('inline-edit', 'photos-section', 'section_titles', null, 'Title 1');
            mockStorage.setItem('section_titles', JSON.stringify({ 'photos-section': 'Title 1' }));

            recordEditOperation('inline-edit', 'photos-section', 'section_titles', 'Title 1', 'Title 2');
            mockStorage.setItem('section_titles', JSON.stringify({ 'photos-section': 'Title 2' }));

            // Undo second operation
            var op2 = historyStack.undo();
            applyUndoOperation(op2);
            expect(JSON.parse(mockStorage.getItem('section_titles'))['photos-section']).toBe('Title 1');

            // Undo first operation
            var op1 = historyStack.undo();
            applyUndoOperation(op1);
            expect(JSON.parse(mockStorage.getItem('section_titles'))['photos-section']).toBeUndefined();

            // Redo first operation
            var redo1 = historyStack.redo();
            applyRedoOperation(redo1);
            expect(JSON.parse(mockStorage.getItem('section_titles'))['photos-section']).toBe('Title 1');

            // Redo second operation
            var redo2 = historyStack.redo();
            applyRedoOperation(redo2);
            expect(JSON.parse(mockStorage.getItem('section_titles'))['photos-section']).toBe('Title 2');
        });
    });

    describe('applyUndoOperation with null operation', () => {
        it('should do nothing when operation is null', () => {
            mockStorage.setItem('section_colors', JSON.stringify({ 'test': '#000' }));
            applyUndoOperation(null);
            expect(JSON.parse(mockStorage.getItem('section_colors'))).toEqual({ 'test': '#000' });
        });
    });

    describe('applyRedoOperation with null operation', () => {
        it('should do nothing when operation is null', () => {
            mockStorage.setItem('section_colors', JSON.stringify({ 'test': '#000' }));
            applyRedoOperation(null);
            expect(JSON.parse(mockStorage.getItem('section_colors'))).toEqual({ 'test': '#000' });
        });
    });
});
