import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

/**
 * Song Thumbnail Property-Based Tests
 *
 * Feature: song-thumbnail
 */

// --- MIME type validation logic (replicates the inline check in openThumbnailEditor) ---

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];

function isValidMimeType(mimeType) {
    return ALLOWED_IMAGE_TYPES.indexOf(mimeType) !== -1;
}

// --- URL validation logic (replicates MediaManager._isValidUrl) ---

function isValidUrl(str) {
    if (typeof str !== 'string') return false;
    if (str.indexOf('http://') !== 0 && str.indexOf('https://') !== 0) return false;
    try { new URL(str); return true; } catch (e) { return false; }
}

// --- Property 1: MIME type validation ---

describe('Feature: song-thumbnail, Property 1: MIME type validation', () => {
    /**
     * Validates: Requirements 2.1, 2.3
     *
     * For any file MIME type string, the thumbnail upload validation SHALL accept it
     * if and only if it is one of: image/jpeg, image/png, image/gif, image/webp, image/avif.
     */

    it('accepts a MIME type if and only if it is in the allowed list', () => {
        fc.assert(
            fc.property(fc.string(), (mimeType) => {
                const result = isValidMimeType(mimeType);
                const expected = ALLOWED_IMAGE_TYPES.includes(mimeType);
                expect(result).toBe(expected);
            }),
            { numRuns: 100 }
        );
    });

    it('all allowed MIME types are accepted', () => {
        fc.assert(
            fc.property(fc.constantFrom(...ALLOWED_IMAGE_TYPES), (mimeType) => {
                expect(isValidMimeType(mimeType)).toBe(true);
            }),
            { numRuns: 100 }
        );
    });

    it('random non-image MIME types are rejected', () => {
        fc.assert(
            fc.property(
                fc.string().filter((s) => !ALLOWED_IMAGE_TYPES.includes(s)),
                (mimeType) => {
                    expect(isValidMimeType(mimeType)).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });
});


// --- Property 2: URL validation rejects invalid URLs ---

describe('Feature: song-thumbnail, Property 2: URL validation rejects invalid URLs', () => {
    /**
     * Validates: Requirements 3.2, 3.3
     *
     * For any string that does not start with "http://" or "https://" (or is not a parseable URL),
     * the thumbnail URL validation SHALL reject it and not store it.
     */

    it('rejects strings that do not start with http:// or https://', () => {
        fc.assert(
            fc.property(
                fc.string().filter((s) => s.indexOf('http://') !== 0 && s.indexOf('https://') !== 0),
                (str) => {
                    expect(isValidUrl(str)).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('accepts valid http/https URLs', () => {
        fc.assert(
            fc.property(
                fc.webUrl(),
                (url) => {
                    expect(isValidUrl(url)).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });
});


// --- Property 3: Thumbnail persistence round-trip ---

// Mock localStorage for thumbnail store tests
function createMockLocalStorage() {
    let store = {};
    return {
        getItem(key) { return store[key] !== undefined ? store[key] : null; },
        setItem(key, value) { store[key] = String(value); },
        removeItem(key) { delete store[key]; },
        clear() { store = {}; },
    };
}

// Replicate thumbnail store functions using a provided localStorage mock
const THUMBNAIL_STORAGE_KEY = 'song_thumbnails';

function getCustomThumbnail(storage, songId) {
    try {
        var raw = storage.getItem(THUMBNAIL_STORAGE_KEY);
        var storeObj = raw ? JSON.parse(raw) : {};
        return Object.prototype.hasOwnProperty.call(storeObj, songId) ? storeObj[songId] : null;
    } catch (e) {
        return null;
    }
}

function setCustomThumbnail(storage, songId, imageSource) {
    try {
        var raw = storage.getItem(THUMBNAIL_STORAGE_KEY);
        var storeObj = raw ? JSON.parse(raw) : {};
        storeObj[songId] = imageSource;
        storage.setItem(THUMBNAIL_STORAGE_KEY, JSON.stringify(storeObj));
    } catch (e) {
        // Silently fail on localStorage errors
    }
}

describe('Feature: song-thumbnail, Property 3: Thumbnail persistence round-trip', () => {
    /**
     * Validates: Requirements 2.2, 3.2, 4.1
     *
     * For any song ID and any valid image source (a data URL starting with "data:image/"
     * or a valid http/https URL), after setting the custom thumbnail, reading it back
     * from localStorage SHALL return the exact same image source string.
     */

    let mockStorage;

    beforeEach(() => {
        mockStorage = createMockLocalStorage();
    });

    it('round-trips any song ID and valid image source through localStorage', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1 }),
                fc.oneof(
                    fc.string().map(s => 'data:image/' + s),
                    fc.webUrl()
                ),
                (songId, imageSource) => {
                    // Clear storage before each iteration
                    mockStorage.clear();

                    // Set the custom thumbnail
                    setCustomThumbnail(mockStorage, songId, imageSource);

                    // Read it back
                    const result = getCustomThumbnail(mockStorage, songId);

                    // Verify round-trip
                    expect(result).toBe(imageSource);
                }
            ),
            { numRuns: 100 }
        );
    });
});


function getAllCustomThumbnails(storage) {
    try {
        var raw = storage.getItem(THUMBNAIL_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

// --- Property 4: Custom thumbnail overrides default on render ---

function removeCustomThumbnail(storage, songId) {
    try {
        var raw = storage.getItem(THUMBNAIL_STORAGE_KEY);
        var storeObj = raw ? JSON.parse(raw) : {};
        delete storeObj[songId];
        storage.setItem(THUMBNAIL_STORAGE_KEY, JSON.stringify(storeObj));
    } catch (e) {
        // Silently fail on localStorage errors
    }
}

describe('Feature: song-thumbnail, Property 4: Custom thumbnail overrides default on render', () => {
    /**
     * Validates: Requirements 4.2, 5.1
     *
     * For any song that has a custom thumbnail stored in localStorage, when the song card
     * is rendered, the cover image source SHALL equal the stored custom thumbnail rather
     * than the song's original default coverImage.
     */

    let mockStorage;

    beforeEach(() => {
        mockStorage = createMockLocalStorage();
    });

    it('resolved cover equals the custom thumbnail when one is stored', () => {
        fc.assert(
            fc.property(
                fc.record({
                    id: fc.string({ minLength: 1 }),
                    defaultCover: fc.webUrl()
                }),
                fc.oneof(
                    fc.string().map(s => 'data:image/' + s),
                    fc.webUrl()
                ),
                (song, customThumbnail) => {
                    // Clear storage before each iteration
                    mockStorage.clear();

                    // Store a custom thumbnail for this song
                    setCustomThumbnail(mockStorage, song.id, customThumbnail);

                    // Simulate the render logic from populateSongs:
                    // const customThumb = getCustomThumbnail(song._mediaItem.id);
                    // const coverSrc = customThumb || song.coverImage;
                    const resolved = getCustomThumbnail(mockStorage, song.id) || song.defaultCover;

                    // The resolved cover must equal the custom thumbnail
                    expect(resolved).toBe(customThumbnail);
                }
            ),
            { numRuns: 100 }
        );
    });
});


// --- Property 5: Reset restores default ---

describe('Feature: song-thumbnail, Property 5: Reset restores default', () => {
    /**
     * Validates: Requirements 6.2, 6.3
     *
     * For any song ID that has a custom thumbnail in localStorage, after resetting,
     * the localStorage SHALL no longer contain an entry for that song ID, and
     * getCustomThumbnail SHALL return null.
     */

    let mockStorage;

    beforeEach(() => {
        mockStorage = createMockLocalStorage();
    });

    it('after removeCustomThumbnail, getCustomThumbnail returns null', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1 }),
                fc.oneof(
                    fc.string().map(s => 'data:image/' + s),
                    fc.webUrl()
                ),
                (songId, imageSource) => {
                    // Clear storage before each iteration
                    mockStorage.clear();

                    // Set a custom thumbnail
                    setCustomThumbnail(mockStorage, songId, imageSource);

                    // Verify it was stored
                    expect(getCustomThumbnail(mockStorage, songId)).toBe(imageSource);

                    // Remove the custom thumbnail
                    removeCustomThumbnail(mockStorage, songId);

                    // Verify getCustomThumbnail returns null
                    expect(getCustomThumbnail(mockStorage, songId)).toBeNull();
                }
            ),
            { numRuns: 100 }
        );
    });
});


// --- Example-based unit tests ---

describe('Thumbnail Store - Example-based tests', () => {
    let mockStorage;

    beforeEach(() => {
        mockStorage = createMockLocalStorage();
    });

    // --- CRUD operations ---

    it('getCustomThumbnail returns null for non-existent song ID', () => {
        const result = getCustomThumbnail(mockStorage, 'Songs/nonexistent.mp3');
        expect(result).toBeNull();
    });

    it('setCustomThumbnail stores and getCustomThumbnail retrieves the value', () => {
        const songId = 'Songs/my-song.mp3';
        const imageSource = 'data:image/png;base64,iVBORw0KGgo=';

        setCustomThumbnail(mockStorage, songId, imageSource);
        const result = getCustomThumbnail(mockStorage, songId);

        expect(result).toBe(imageSource);
    });

    it('setCustomThumbnail overwrites existing value', () => {
        const songId = 'Songs/my-song.mp3';
        const firstImage = 'https://example.com/cover1.jpg';
        const secondImage = 'https://example.com/cover2.jpg';

        setCustomThumbnail(mockStorage, songId, firstImage);
        setCustomThumbnail(mockStorage, songId, secondImage);
        const result = getCustomThumbnail(mockStorage, songId);

        expect(result).toBe(secondImage);
    });

    it('removeCustomThumbnail removes the entry', () => {
        const songId = 'Songs/my-song.mp3';
        const imageSource = 'https://example.com/cover.jpg';

        setCustomThumbnail(mockStorage, songId, imageSource);
        expect(getCustomThumbnail(mockStorage, songId)).toBe(imageSource);

        removeCustomThumbnail(mockStorage, songId);
        expect(getCustomThumbnail(mockStorage, songId)).toBeNull();
    });

    it('removeCustomThumbnail does nothing for non-existent song ID', () => {
        const songId = 'Songs/existing.mp3';
        const imageSource = 'https://example.com/cover.jpg';

        setCustomThumbnail(mockStorage, songId, imageSource);

        // Remove a different song ID that doesn't exist
        removeCustomThumbnail(mockStorage, 'Songs/nonexistent.mp3');

        // Original entry should still be there
        expect(getCustomThumbnail(mockStorage, songId)).toBe(imageSource);
    });

    // --- localStorage error handling ---

    it('getCustomThumbnail returns null when localStorage throws', () => {
        const errorStorage = {
            getItem() { throw new Error('localStorage unavailable'); },
            setItem() { throw new Error('localStorage unavailable'); },
            removeItem() { throw new Error('localStorage unavailable'); },
        };

        const result = getCustomThumbnail(errorStorage, 'Songs/any.mp3');
        expect(result).toBeNull();
    });

    it('setCustomThumbnail silently fails when localStorage throws', () => {
        const errorStorage = {
            getItem() { throw new Error('localStorage unavailable'); },
            setItem() { throw new Error('localStorage unavailable'); },
            removeItem() { throw new Error('localStorage unavailable'); },
        };

        // Should not throw
        expect(() => {
            setCustomThumbnail(errorStorage, 'Songs/any.mp3', 'https://example.com/img.jpg');
        }).not.toThrow();
    });

    it('removeCustomThumbnail silently fails when localStorage throws', () => {
        const errorStorage = {
            getItem() { throw new Error('localStorage unavailable'); },
            setItem() { throw new Error('localStorage unavailable'); },
            removeItem() { throw new Error('localStorage unavailable'); },
        };

        // Should not throw
        expect(() => {
            removeCustomThumbnail(errorStorage, 'Songs/any.mp3');
        }).not.toThrow();
    });

    // --- getAllCustomThumbnails ---

    it('getAllCustomThumbnails returns empty object when no thumbnails stored', () => {
        const result = getAllCustomThumbnails(mockStorage);
        expect(result).toEqual({});
    });

    it('getAllCustomThumbnails returns all stored thumbnails', () => {
        const song1 = 'Songs/song1.mp3';
        const song2 = 'Songs/song2.mp3';
        const img1 = 'https://example.com/cover1.jpg';
        const img2 = 'data:image/png;base64,abc123';

        setCustomThumbnail(mockStorage, song1, img1);
        setCustomThumbnail(mockStorage, song2, img2);

        const result = getAllCustomThumbnails(mockStorage);
        expect(result).toEqual({
            [song1]: img1,
            [song2]: img2,
        });
    });

    it('getAllCustomThumbnails returns empty object when localStorage throws', () => {
        const errorStorage = {
            getItem() { throw new Error('localStorage unavailable'); },
            setItem() { throw new Error('localStorage unavailable'); },
            removeItem() { throw new Error('localStorage unavailable'); },
        };

        const result = getAllCustomThumbnails(errorStorage);
        expect(result).toEqual({});
    });
});


// --- Validation Example-based tests ---

describe('Validation - Example-based tests', () => {
    describe('MIME type validation', () => {
        it('accepts image/jpeg', () => {
            expect(isValidMimeType('image/jpeg')).toBe(true);
        });

        it('accepts image/png', () => {
            expect(isValidMimeType('image/png')).toBe(true);
        });

        it('accepts image/gif', () => {
            expect(isValidMimeType('image/gif')).toBe(true);
        });

        it('accepts image/webp', () => {
            expect(isValidMimeType('image/webp')).toBe(true);
        });

        it('accepts image/avif', () => {
            expect(isValidMimeType('image/avif')).toBe(true);
        });

        it('rejects text/plain', () => {
            expect(isValidMimeType('text/plain')).toBe(false);
        });

        it('rejects application/pdf', () => {
            expect(isValidMimeType('application/pdf')).toBe(false);
        });

        it('rejects image/svg+xml', () => {
            expect(isValidMimeType('image/svg+xml')).toBe(false);
        });

        it('rejects image/bmp', () => {
            expect(isValidMimeType('image/bmp')).toBe(false);
        });

        it('rejects empty string', () => {
            expect(isValidMimeType('')).toBe(false);
        });
    });

    describe('URL validation', () => {
        it('accepts https://example.com/image.jpg', () => {
            expect(isValidUrl('https://example.com/image.jpg')).toBe(true);
        });

        it('accepts http://example.com/image.png', () => {
            expect(isValidUrl('http://example.com/image.png')).toBe(true);
        });

        it('accepts https://cdn.example.com/path/to/image.webp', () => {
            expect(isValidUrl('https://cdn.example.com/path/to/image.webp')).toBe(true);
        });

        it('rejects ftp://example.com/image.jpg', () => {
            expect(isValidUrl('ftp://example.com/image.jpg')).toBe(false);
        });

        it('rejects just a domain name without protocol', () => {
            expect(isValidUrl('example.com/image.jpg')).toBe(false);
        });

        it('rejects empty string', () => {
            expect(isValidUrl('')).toBe(false);
        });

        it('rejects null', () => {
            expect(isValidUrl(null)).toBe(false);
        });

        it('rejects undefined', () => {
            expect(isValidUrl(undefined)).toBe(false);
        });

        it('rejects a relative path', () => {
            expect(isValidUrl('/images/photo.jpg')).toBe(false);
        });

        it('rejects javascript: protocol', () => {
            expect(isValidUrl('javascript:alert(1)')).toBe(false);
        });
    });
});
