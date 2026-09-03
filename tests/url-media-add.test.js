import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

/**
 * Tests for URL-based media add feature.
 *
 * Covers:
 * - YouTube URL parsing (_parseYouTubeUrl) — Requirement 3
 * - URL validation (_isValidUrl) — Requirement 11
 * - addMediaByUrl item creation — Requirements 3, 4, 5
 * - Integration: getMediaItems, delete, restore for URL-added items — Requirements 7, 8, 9
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

// ==================== Task 8.1: YouTube URL Parsing ====================

describe('YouTube URL parsing (_parseYouTubeUrl) — Requirement 3', () => {
  it('parses standard youtube.com/watch URL with www', () => {
    const result = globalThis.MediaManager._parseYouTubeUrl(
      'https://www.youtube.com/watch?v=ncxivHVBrC4'
    );
    expect(result).toEqual({ videoId: 'ncxivHVBrC4' });
  });

  it('parses youtube.com/watch URL without www', () => {
    const result = globalThis.MediaManager._parseYouTubeUrl(
      'https://youtube.com/watch?v=ncxivHVBrC4'
    );
    expect(result).toEqual({ videoId: 'ncxivHVBrC4' });
  });

  it('parses youtu.be short URL', () => {
    const result = globalThis.MediaManager._parseYouTubeUrl(
      'https://youtu.be/ncxivHVBrC4'
    );
    expect(result).toEqual({ videoId: 'ncxivHVBrC4' });
  });

  it('parses youtube.com/shorts URL with www', () => {
    const result = globalThis.MediaManager._parseYouTubeUrl(
      'https://www.youtube.com/shorts/ncxivHVBrC4'
    );
    expect(result).toEqual({ videoId: 'ncxivHVBrC4' });
  });

  it('parses youtube.com/shorts URL without www', () => {
    const result = globalThis.MediaManager._parseYouTubeUrl(
      'https://youtube.com/shorts/ncxivHVBrC4'
    );
    expect(result).toEqual({ videoId: 'ncxivHVBrC4' });
  });

  it('parses youtube.com/watch URL with extra query params', () => {
    const result = globalThis.MediaManager._parseYouTubeUrl(
      'https://www.youtube.com/watch?v=ncxivHVBrC4&t=120'
    );
    expect(result).toEqual({ videoId: 'ncxivHVBrC4' });
  });

  it('parses youtube.com/watch URL when v is not the first param', () => {
    const result = globalThis.MediaManager._parseYouTubeUrl(
      'https://www.youtube.com/watch?list=PLxyz&v=ncxivHVBrC4'
    );
    expect(result).toEqual({ videoId: 'ncxivHVBrC4' });
  });

  it('returns null for non-YouTube URL', () => {
    const result = globalThis.MediaManager._parseYouTubeUrl(
      'https://example.com/page'
    );
    expect(result).toBeNull();
  });

  it('returns null for YouTube URL with no video ID', () => {
    const result = globalThis.MediaManager._parseYouTubeUrl(
      'https://www.youtube.com/'
    );
    expect(result).toBeNull();
  });
});

// ==================== Task 8.2: URL Validation ====================

describe('URL validation (_isValidUrl) — Requirement 11', () => {
  it('accepts https:// URL', () => {
    expect(globalThis.MediaManager._isValidUrl('https://example.com')).toBe(true);
  });

  it('accepts http:// URL', () => {
    expect(globalThis.MediaManager._isValidUrl('http://example.com')).toBe(true);
  });

  it('accepts https URL with path and query', () => {
    expect(globalThis.MediaManager._isValidUrl('https://example.com/path?q=1')).toBe(true);
  });

  it('rejects ftp:// URL', () => {
    expect(globalThis.MediaManager._isValidUrl('ftp://example.com')).toBe(false);
  });

  it('rejects URL without protocol', () => {
    expect(globalThis.MediaManager._isValidUrl('example.com')).toBe(false);
  });

  it('rejects plain text', () => {
    expect(globalThis.MediaManager._isValidUrl('not a url')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(globalThis.MediaManager._isValidUrl('')).toBe(false);
  });

  it('rejects null', () => {
    expect(globalThis.MediaManager._isValidUrl(null)).toBe(false);
  });

  it('rejects undefined', () => {
    expect(globalThis.MediaManager._isValidUrl(undefined)).toBe(false);
  });

  it('rejects number', () => {
    expect(globalThis.MediaManager._isValidUrl(123)).toBe(false);
  });
});

// ==================== Task 8.3: addMediaByUrl ====================

describe('addMediaByUrl — Requirements 3, 4, 5', () => {
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

  it('image URL in photos section creates item with type image, origin url-added', async () => {
    await globalThis.MediaManager.init();

    const item = await globalThis.MediaManager.addMediaByUrl(
      'photos',
      'https://example.com/photo.jpg',
      'My Photo'
    );

    expect(item.type).toBe('image');
    expect(item.origin).toBe('url-added');
    expect(item.source).toBe('https://example.com/photo.jpg');
    expect(item.section).toBe('photos');
  });

  it('audio URL in songs section creates item with type audio, origin url-added, metadata.artist', async () => {
    await globalThis.MediaManager.init();

    const item = await globalThis.MediaManager.addMediaByUrl(
      'songs',
      'https://example.com/song.mp3',
      'My Song'
    );

    expect(item.type).toBe('audio');
    expect(item.origin).toBe('url-added');
    expect(item.source).toBe('https://example.com/song.mp3');
    expect(item.metadata.artist).toBe('URL Added');
  });

  it('YouTube URL in photos section creates item with type video and videoId metadata', async () => {
    await globalThis.MediaManager.init();

    const item = await globalThis.MediaManager.addMediaByUrl(
      'photos',
      'https://www.youtube.com/watch?v=ncxivHVBrC4',
      'Cool Video'
    );

    expect(item.type).toBe('video');
    expect(item.origin).toBe('url-added');
    expect(item.metadata.videoId).toBe('ncxivHVBrC4');
  });

  it('YouTube URL in songs section creates youtube-embed item', async () => {
    await globalThis.MediaManager.init();

    const item = await globalThis.MediaManager.addMediaByUrl(
      'songs',
      'https://www.youtube.com/watch?v=ncxivHVBrC4',
      'Song from YouTube'
    );

    expect(item.type).toBe('youtube-embed');
    expect(item.origin).toBe('url-added');
    expect(item.section).toBe('songs');
    expect(item.source).toBe('');
    expect(item.metadata.videoId).toBe('ncxivHVBrC4');
  });

  it('uses custom caption when provided', async () => {
    await globalThis.MediaManager.init();

    const item = await globalThis.MediaManager.addMediaByUrl(
      'photos',
      'https://example.com/photo.jpg',
      'Custom Caption'
    );

    expect(item.caption).toBe('Custom Caption');
  });

  it('auto-generates caption from URL filename when no caption provided', async () => {
    await globalThis.MediaManager.init();

    const item = await globalThis.MediaManager.addMediaByUrl(
      'photos',
      'https://example.com/my-photo.jpg'
    );

    expect(item.caption).toBe('my-photo');
  });

  it('YouTube URL without caption gets "YouTube Video" as caption', async () => {
    await globalThis.MediaManager.init();

    const item = await globalThis.MediaManager.addMediaByUrl(
      'photos',
      'https://www.youtube.com/watch?v=ncxivHVBrC4'
    );

    expect(item.caption).toBe('YouTube Video');
  });

  it('rejects invalid URL with Promise rejection', async () => {
    await globalThis.MediaManager.init();

    await expect(
      globalThis.MediaManager.addMediaByUrl('photos', 'not-a-url', 'caption')
    ).rejects.toBe('Invalid URL');
  });
});

// ==================== Task 8.4: Integration — getMediaItems, delete, restore ====================

describe('URL-added items integration: getMediaItems, delete, restore — Requirements 7, 8, 9', () => {
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

  it('URL-added item appears in getMediaItems results', async () => {
    await globalThis.MediaManager.init();

    await globalThis.MediaManager.addMediaByUrl(
      'photos',
      'https://example.com/photo.jpg',
      'URL Photo'
    );

    const items = await globalThis.MediaManager.getMediaItems('photos');
    const urlItem = items.find((i) => i.origin === 'url-added');

    expect(urlItem).toBeDefined();
    expect(urlItem.caption).toBe('URL Photo');
    expect(urlItem.source).toBe('https://example.com/photo.jpg');
  });

  it('URL-added item can be deleted (moves to trash, removed from active items)', async () => {
    await globalThis.MediaManager.init();

    const addedItem = await globalThis.MediaManager.addMediaByUrl(
      'photos',
      'https://example.com/photo.jpg',
      'URL Photo'
    );

    // Delete the item
    await globalThis.MediaManager.deleteMedia('photos', addedItem);

    // Should no longer appear in active items
    const items = await globalThis.MediaManager.getMediaItems('photos');
    const found = items.some((i) => i.id === addedItem.id);
    expect(found).toBe(false);

    // Should appear in trash
    const trashItems = await globalThis.MediaManager.getTrashItems();
    const trashEntry = trashItems.find((e) => e.id === addedItem.id);
    expect(trashEntry).toBeDefined();
    expect(trashEntry.deletedAt).toBeDefined();
    expect(trashEntry.origin).toBe('url-added');
  });

  it('deleted URL-added item can be restored (back in active items, removed from trash)', async () => {
    await globalThis.MediaManager.init();

    const addedItem = await globalThis.MediaManager.addMediaByUrl(
      'photos',
      'https://example.com/photo.jpg',
      'URL Photo'
    );

    // Delete then restore
    await globalThis.MediaManager.deleteMedia('photos', addedItem);

    const trashItems = await globalThis.MediaManager.getTrashItems();
    const trashEntry = trashItems.find((e) => e.id === addedItem.id);
    await globalThis.MediaManager.restoreMedia(trashEntry);

    // Should be back in active items
    const items = await globalThis.MediaManager.getMediaItems('photos');
    const restored = items.find((i) => i.id === addedItem.id);
    expect(restored).toBeDefined();
    expect(restored.caption).toBe('URL Photo');
    expect(restored.origin).toBe('url-added');

    // Should no longer be in trash
    const trashAfter = await globalThis.MediaManager.getTrashItems();
    const stillInTrash = trashAfter.some((e) => e.id === addedItem.id);
    expect(stillInTrash).toBe(false);
  });

  it('after delete + restore, item count is preserved', async () => {
    await globalThis.MediaManager.init();

    // Add two URL items
    await globalThis.MediaManager.addMediaByUrl(
      'photos',
      'https://example.com/photo1.jpg',
      'Photo 1'
    );
    await globalThis.MediaManager.addMediaByUrl(
      'photos',
      'https://example.com/photo2.jpg',
      'Photo 2'
    );

    const beforeItems = await globalThis.MediaManager.getMediaItems('photos');
    const countBefore = beforeItems.length;

    // Delete the first item
    const itemToDelete = beforeItems.find((i) => i.caption === 'Photo 1');
    await globalThis.MediaManager.deleteMedia('photos', itemToDelete);

    const duringItems = await globalThis.MediaManager.getMediaItems('photos');
    expect(duringItems.length).toBe(countBefore - 1);

    // Restore it
    const trashItems = await globalThis.MediaManager.getTrashItems();
    const trashEntry = trashItems.find((e) => e.id === itemToDelete.id);
    await globalThis.MediaManager.restoreMedia(trashEntry);

    const afterItems = await globalThis.MediaManager.getMediaItems('photos');
    expect(afterItems.length).toBe(countBefore);
  });
});
