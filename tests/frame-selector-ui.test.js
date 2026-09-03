/**
 * Unit tests for frame selector UI in filter panel (Task 4.2)
 * Validates: Requirements 4.1, 4.6
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Photo frame persistence logic (replicated from script.js for isolated testing)
var PHOTO_FRAMES_STORAGE_KEY = 'photo_frames';
var VALID_FRAME_NAMES = ['confetti', 'balloons', 'hearts', 'stars', 'cake'];

function getPhotoFrames() {
    try {
        var raw = localStorage.getItem(PHOTO_FRAMES_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function setPhotoFrame(itemId, frameName) {
    try {
        if (VALID_FRAME_NAMES.indexOf(frameName) === -1) return;
        var store = getPhotoFrames();
        store[itemId] = frameName;
        localStorage.setItem(PHOTO_FRAMES_STORAGE_KEY, JSON.stringify(store));
    } catch (e) {}
}

function removePhotoFrame(itemId) {
    try {
        var store = getPhotoFrames();
        delete store[itemId];
        localStorage.setItem(PHOTO_FRAMES_STORAGE_KEY, JSON.stringify(store));
    } catch (e) {}
}

/**
 * Simulate the frame selector UI creation logic from openFilterPanel.
 * Returns the frame selector container element.
 */
function createFrameSelector(itemId, photoCard) {
    var frameContainer = document.createElement('div');
    frameContainer.className = 'frame-selector-container';

    var frameOptions = [
        { name: null, label: 'No Frame', emoji: '✖' },
        { name: 'confetti', label: 'Confetti', emoji: '🎊' },
        { name: 'balloons', label: 'Balloons', emoji: '🎈' },
        { name: 'hearts', label: 'Hearts', emoji: '💕' },
        { name: 'stars', label: 'Stars', emoji: '⭐' },
        { name: 'cake', label: 'Cake', emoji: '🎂' }
    ];

    var currentFrames = getPhotoFrames();
    var currentFrame = currentFrames[itemId] || null;

    frameOptions.forEach(function (opt) {
        var btn = document.createElement('button');
        btn.className = 'frame-option-btn';
        btn.setAttribute('data-frame', opt.name || '');
        btn.setAttribute('title', opt.label);
        btn.setAttribute('aria-label', opt.label + ' frame');
        btn.textContent = opt.emoji;

        if (opt.name === currentFrame) {
            btn.classList.add('frame-option-active');
        }

        btn.addEventListener('click', function () {
            var allBtns = frameContainer.querySelectorAll('.frame-option-btn');
            for (var b = 0; b < allBtns.length; b++) {
                allBtns[b].classList.remove('frame-option-active');
            }
            btn.classList.add('frame-option-active');

            VALID_FRAME_NAMES.forEach(function (name) {
                photoCard.classList.remove('frame-' + name);
            });

            if (opt.name) {
                setPhotoFrame(itemId, opt.name);
                photoCard.classList.add('frame-' + opt.name);
            } else {
                removePhotoFrame(itemId);
            }
        });

        frameContainer.appendChild(btn);
    });

    return frameContainer;
}

describe('Frame Selector UI (Task 4.2)', function () {
    var photoCard;

    beforeEach(function () {
        localStorage.clear();
        photoCard = document.createElement('div');
        photoCard.className = 'photo-card';
        photoCard.setAttribute('data-id', 'test-photo-1');
        document.body.appendChild(photoCard);
    });

    afterEach(function () {
        localStorage.clear();
        document.body.innerHTML = '';
    });

    describe('frame selector rendering', function () {
        it('renders 6 frame option buttons (5 frames + No Frame)', function () {
            var container = createFrameSelector('test-photo-1', photoCard);
            var buttons = container.querySelectorAll('.frame-option-btn');
            expect(buttons.length).toBe(6);
        });

        it('first option is "No Frame"', function () {
            var container = createFrameSelector('test-photo-1', photoCard);
            var firstBtn = container.querySelector('.frame-option-btn');
            expect(firstBtn.getAttribute('data-frame')).toBe('');
            expect(firstBtn.getAttribute('title')).toBe('No Frame');
        });

        it('includes all 5 birthday-themed frame options', function () {
            var container = createFrameSelector('test-photo-1', photoCard);
            var buttons = container.querySelectorAll('.frame-option-btn');
            var frameNames = [];
            for (var i = 1; i < buttons.length; i++) {
                frameNames.push(buttons[i].getAttribute('data-frame'));
            }
            expect(frameNames).toEqual(['confetti', 'balloons', 'hearts', 'stars', 'cake']);
        });

        it('each button has an aria-label for accessibility', function () {
            var container = createFrameSelector('test-photo-1', photoCard);
            var buttons = container.querySelectorAll('.frame-option-btn');
            for (var i = 0; i < buttons.length; i++) {
                expect(buttons[i].getAttribute('aria-label')).toBeTruthy();
            }
        });

        it('highlights the currently active frame on render', function () {
            setPhotoFrame('test-photo-1', 'hearts');
            var container = createFrameSelector('test-photo-1', photoCard);
            var activeBtn = container.querySelector('.frame-option-active');
            expect(activeBtn).not.toBeNull();
            expect(activeBtn.getAttribute('data-frame')).toBe('hearts');
        });

        it('highlights "No Frame" button when no frame is set', function () {
            var container = createFrameSelector('test-photo-1', photoCard);
            var activeBtn = container.querySelector('.frame-option-active');
            expect(activeBtn.getAttribute('data-frame')).toBe('');
        });
    });

    describe('frame selection behavior', function () {
        it('applies frame class to photo card on selection', function () {
            var container = createFrameSelector('test-photo-1', photoCard);
            var confettiBtn = container.querySelector('[data-frame="confetti"]');
            confettiBtn.click();
            expect(photoCard.classList.contains('frame-confetti')).toBe(true);
        });

        it('persists frame to localStorage on selection', function () {
            var container = createFrameSelector('test-photo-1', photoCard);
            var starsBtn = container.querySelector('[data-frame="stars"]');
            starsBtn.click();
            var stored = getPhotoFrames();
            expect(stored['test-photo-1']).toBe('stars');
        });

        it('removes frame class on "No Frame" selection', function () {
            setPhotoFrame('test-photo-1', 'balloons');
            photoCard.classList.add('frame-balloons');

            var container = createFrameSelector('test-photo-1', photoCard);
            var noFrameBtn = container.querySelector('[data-frame=""]');
            noFrameBtn.click();

            expect(photoCard.classList.contains('frame-balloons')).toBe(false);
            VALID_FRAME_NAMES.forEach(function (name) {
                expect(photoCard.classList.contains('frame-' + name)).toBe(false);
            });
        });

        it('removes persisted frame on "No Frame" selection', function () {
            setPhotoFrame('test-photo-1', 'cake');
            var container = createFrameSelector('test-photo-1', photoCard);
            var noFrameBtn = container.querySelector('[data-frame=""]');
            noFrameBtn.click();
            var stored = getPhotoFrames();
            expect(stored['test-photo-1']).toBeUndefined();
        });

        it('switches frame class when selecting a different frame', function () {
            var container = createFrameSelector('test-photo-1', photoCard);
            var heartsBtn = container.querySelector('[data-frame="hearts"]');
            heartsBtn.click();
            expect(photoCard.classList.contains('frame-hearts')).toBe(true);

            var cakeBtn = container.querySelector('[data-frame="cake"]');
            cakeBtn.click();
            expect(photoCard.classList.contains('frame-hearts')).toBe(false);
            expect(photoCard.classList.contains('frame-cake')).toBe(true);
        });

        it('updates active button highlight on selection', function () {
            var container = createFrameSelector('test-photo-1', photoCard);
            var confettiBtn = container.querySelector('[data-frame="confetti"]');
            confettiBtn.click();

            expect(confettiBtn.classList.contains('frame-option-active')).toBe(true);
            var allBtns = container.querySelectorAll('.frame-option-btn');
            for (var i = 0; i < allBtns.length; i++) {
                if (allBtns[i] !== confettiBtn) {
                    expect(allBtns[i].classList.contains('frame-option-active')).toBe(false);
                }
            }
        });
    });
});
