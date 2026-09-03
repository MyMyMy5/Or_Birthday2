import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

/**
 * Integration tests for MediaManager module behavior.
 *
 * Tests cover:
 * - Health check success → server mode (Requirement 9.1, 9.2)
 * - Health check failure → local mode (Requirement 9.3)
 * - Health check timeout → local mode (Requirement 9.4)
 * - addMedia with valid files adds items to localStorage (Requirements 4.1–4.3, 5.1)
 * - deleteMedia removes items from getMediaItems (Requirements 1.1–1.4, 2.1, 2.2)
 *
 * Validates: Requirements 1.1–1.4, 2.1, 2.2, 4.1–4.3, 5.1, 9.1–9.4
 */

// --- localStorage mock ---

function createMockLocalStorage() {
  const store = {};
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      for (const k of Object.keys(store)) {
        delete store[k];
      }
    },
  };
}

let mockLocalStorage;

// --- Set up globals before loading the IIFE ---

beforeAll(async () => {
  mockLocalStorage = createMockLocalStorage();

  globalThis.window = globalThis;
  globalThis.localStorage = mockLocalStorage;
  globalThis.photos = [];
  globalThis.songs = [];
  globalThis.thingsYouLike = [];
  globalThis.funnyMoments = [];

  // Load the IIFE module once — it attaches MediaManager to window/globalThis
  await import('../media-manager.js');
});

// ==================== Health Check Tests ====================

describe('Health check → mode detection (Requirements 9.1–9.4)', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    // Reset fetch mock before each test
    vi.restoreAllMocks();
  });

  it('sets server mode when /api/health returns 200', async () => {
    // Mock fetch to return a successful response
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok' }),
    });

    await globalThis.MediaManager.init();

    expect(globalThis.MediaManager.getMode()).toBe('server');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/health',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('sets local mode when /api/health returns non-ok status', async () => {
    // Mock fetch to return a non-ok response (e.g., 500)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    await globalThis.MediaManager.init();

    expect(globalThis.MediaManager.getMode()).toBe('local');
  });

  it('sets local mode when fetch rejects (network error)', async () => {
    // Mock fetch to reject (server not running)
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await globalThis.MediaManager.init();

    expect(globalThis.MediaManager.getMode()).toBe('local');
  });

  it('sets local mode when fetch times out (never resolves)', async () => {
    // Mock fetch to return a promise that never resolves.
    // The init() method uses AbortController with a 2s timeout.
    // We use fake timers to advance past the timeout.
    vi.useFakeTimers();

    globalThis.fetch = vi.fn().mockImplementation((_url, options) => {
      return new Promise((_resolve, reject) => {
        // Listen for abort signal to reject like a real fetch would
        if (options && options.signal) {
          options.signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }
      });
    });

    const initPromise = globalThis.MediaManager.init();

    // Advance timers past the 2-second timeout
    await vi.advanceTimersByTimeAsync(2500);

    await initPromise;

    expect(globalThis.MediaManager.getMode()).toBe('local');

    vi.useRealTimers();
  });
});

// ==================== Legacy Presentation Compatibility ====================

describe('server mode preserves the legacy presentation baseline', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    globalThis.photos = [];
    globalThis.songs = [];
    globalThis.thingsYouLike = [];
    globalThis.funnyMoments = [];
    vi.restoreAllMocks();
  });

  it('keeps hardcoded photo order/captions, omits legacy unlisted assets, and appends new files', async () => {
    globalThis.photos = [
      { url: 'Images/Memories/Study_Memories.jfif', caption: 'Study sessions' },
      { url: 'Images/Memories/Birthday_Girl.png', caption: 'Birthday Girl' },
    ];

    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/health') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
      }
      if (url === '/api/media/photos') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            'new-upload.png',
            'Girl_Crown.jpg',
            'Study_Memories.jpg',
            'Birthday_Girl.png',
            'Study_Memories.jfif',
          ]),
        });
      }
      return Promise.reject(new Error('Unexpected URL: ' + url));
    });

    await globalThis.MediaManager.init();
    const items = await globalThis.MediaManager.getMediaItems('photos');

    expect(items.map((item) => item.id)).toEqual([
      'Study_Memories.jfif',
      'Birthday_Girl.png',
      'new-upload.png',
    ]);
    expect(items.map((item) => item.caption)).toEqual([
      'Study sessions',
      'Birthday Girl',
      'new-upload',
    ]);
    expect(items.find((item) => item.id === 'Girl_Crown.jpg')).toBeUndefined();
    expect(items.find((item) => item.id === 'Study_Memories.jpg')).toBeUndefined();
  });

  it('preserves hardcoded song order, artist, and cover metadata', async () => {
    globalThis.songs = [
      {
        songName: 'Tonight and Always',
        artist: 'Selena Gomez & ZAYN',
        audioSrc: encodeURI('Songs/Selena Gomez & ZAYN - Tonight and Always.mp3'),
        coverImage: 'Images/Singer_Images/Zayn.jpg',
      },
      {
        songName: 'External Song',
        artist: 'External Artist',
        audioSrc: 'https://example.com/external.mp3',
        coverImage: 'https://example.com/cover.jpg',
      },
    ];

    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/health') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
      }
      if (url === '/api/media/songs') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(['new-song.mp3', 'Selena Gomez & ZAYN - Tonight and Always.mp3']),
        });
      }
      return Promise.reject(new Error('Unexpected URL: ' + url));
    });

    await globalThis.MediaManager.init();
    const items = await globalThis.MediaManager.getMediaItems('songs');

    expect(items.map((item) => item.caption)).toEqual([
      'Tonight and Always',
      'External Song',
      'new-song',
    ]);
    expect(items[0].metadata).toEqual({
      artist: 'Selena Gomez & ZAYN',
      coverImage: 'Images/Singer_Images/Zayn.jpg',
    });
    expect(items[0].id).toBe('Selena Gomez & ZAYN - Tonight and Always.mp3');
  });
});

// ==================== Add Media Tests ====================

describe('addMedia stores items in localStorage (Requirements 4.1–4.3, 5.1)', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    globalThis.photos = [];
    globalThis.songs = [];
    globalThis.thingsYouLike = [];
    globalThis.funnyMoments = [];
    vi.restoreAllMocks();

    // Ensure we're in local mode for these tests
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
  });

  it('addMedia with a valid image file adds an item to localStorage for photos', async () => {
    await globalThis.MediaManager.init();
    expect(globalThis.MediaManager.getMode()).toBe('local');

    // Create a mock File with a valid image MIME type
    const file = new File(['fake-image-data'], 'vacation.png', { type: 'image/png' });

    // Mock FileReader to return a data URL
    const originalFileReader = globalThis.FileReader;
    globalThis.FileReader = class MockFileReader {
      readAsDataURL() {
        setTimeout(() => {
          this.onload({ target: { result: 'data:image/png;base64,fakedata' } });
        }, 0);
      }
    };

    await globalThis.MediaManager.addMedia('photos', [file]);

    // Restore FileReader
    globalThis.FileReader = originalFileReader;

    // Verify item was added to localStorage
    const raw = mockLocalStorage.getItem('media_manager_added');
    expect(raw).not.toBeNull();
    const added = JSON.parse(raw);
    expect(added).toHaveLength(1);
    expect(added[0].section).toBe('photos');
    expect(added[0].caption).toBe('vacation');
    expect(added[0].source).toBe('data:image/png;base64,fakedata');
    expect(added[0].type).toBe('image');
  });

  it('addMedia with a valid audio file adds an item to localStorage for songs', async () => {
    await globalThis.MediaManager.init();

    const file = new File(['fake-audio-data'], 'my-song.mp3', { type: 'audio/mpeg' });

    const originalFileReader = globalThis.FileReader;
    globalThis.FileReader = class MockFileReader {
      readAsDataURL() {
        setTimeout(() => {
          this.onload({ target: { result: 'data:audio/mpeg;base64,fakeaudio' } });
        }, 0);
      }
    };

    await globalThis.MediaManager.addMedia('songs', [file]);

    globalThis.FileReader = originalFileReader;

    const raw = mockLocalStorage.getItem('media_manager_added');
    const added = JSON.parse(raw);
    expect(added).toHaveLength(1);
    expect(added[0].section).toBe('songs');
    expect(added[0].caption).toBe('my-song');
    expect(added[0].type).toBe('audio');
    expect(added[0].metadata.artist).toBe('User Added');
  });

  it('addMedia silently rejects files with invalid MIME types', async () => {
    await globalThis.MediaManager.init();

    // A text file should be rejected for an image section
    const file = new File(['not-an-image'], 'readme.txt', { type: 'text/plain' });

    await globalThis.MediaManager.addMedia('photos', [file]);

    // Nothing should be added
    const raw = mockLocalStorage.getItem('media_manager_added');
    expect(raw).toBeNull();
  });
});

// ==================== Delete Media Tests ====================

describe('deleteMedia removes items from getMediaItems (Requirements 1.5, 2.2, 2.3)', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    globalThis.photos = [];
    globalThis.songs = [];
    globalThis.thingsYouLike = [];
    globalThis.funnyMoments = [];
    vi.restoreAllMocks();

    // Ensure local mode
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
  });

  it('deleteMedia removes a hardcoded photo from getMediaItems', async () => {
    await globalThis.MediaManager.init();

    // Set up hardcoded photos
    globalThis.photos = [
      { url: 'Images/Memories/photo1.jpg', caption: 'Photo 1' },
      { url: 'Images/Memories/photo2.jpg', caption: 'Photo 2' },
    ];

    const beforeItems = await globalThis.MediaManager.getMediaItems('photos');
    expect(beforeItems).toHaveLength(2);

    // Delete the first photo
    const itemToDelete = beforeItems[0];
    await globalThis.MediaManager.deleteMedia('photos', itemToDelete);

    const afterItems = await globalThis.MediaManager.getMediaItems('photos');
    expect(afterItems).toHaveLength(1);
    expect(afterItems[0].id).toBe('Images/Memories/photo2.jpg');
  });

  it('deleteMedia adds the item to the trash store', async () => {
    await globalThis.MediaManager.init();

    globalThis.photos = [
      { url: 'Images/Memories/photo1.jpg', caption: 'Photo 1' },
    ];

    const items = await globalThis.MediaManager.getMediaItems('photos');
    await globalThis.MediaManager.deleteMedia('photos', items[0]);

    const trashItems = await globalThis.MediaManager.getTrashItems();
    expect(trashItems).toHaveLength(1);
    expect(trashItems[0].id).toBe('Images/Memories/photo1.jpg');
    expect(trashItems[0].section).toBe('photos');
    expect(trashItems[0].deletedAt).toBeDefined();
  });

  it('deleteMedia on a song removes it from getMediaItems', async () => {
    await globalThis.MediaManager.init();

    globalThis.songs = [
      {
        songName: 'Test Song',
        artist: 'Test Artist',
        audioSrc: 'Songs/test.mp3',
        coverImage: 'cover.jpg',
      },
    ];

    const beforeItems = await globalThis.MediaManager.getMediaItems('songs');
    expect(beforeItems).toHaveLength(1);

    await globalThis.MediaManager.deleteMedia('songs', beforeItems[0]);

    const afterItems = await globalThis.MediaManager.getMediaItems('songs');
    expect(afterItems).toHaveLength(0);
  });
});
