// ==================== MEDIA MANAGER ====================
// Central module for managing media items across all sections.
// Supports hybrid storage: server-based file I/O or localStorage fallback.

(function () {
  'use strict';

  // ==================== SECTION CONSTANTS ====================

  /**
   * Section identifiers for the four media areas.
   */
  var Section = Object.freeze({
    PHOTOS: 'photos',
    THINGS_YOU_LIKE: 'thingsYouLike',
    FUNNY_MOMENTS: 'funnyMoments',
    SONGS: 'songs'
  });

  // ==================== SECTION-TO-DIRECTORY MAPPING ====================

  /**
   * Maps each section to its corresponding file system directory.
   */
  var SECTION_DIRECTORIES = Object.freeze({
    photos: 'Images/Memories/',
    thingsYouLike: 'Images/Liked_Things/',
    funnyMoments: 'Images/Funny_Moments/',
    songs: 'Songs/'
  });

  /**
   * Files that intentionally exist in the legacy asset folders but were not
   * part of the original page's displayed media arrays. Keeping this small
   * compatibility list lets future files uploaded through Edit Mode continue
   * to appear while preserving the Or_Before default presentation.
   */
  var DEFAULT_UNLISTED_FILES = Object.freeze({
    photos: Object.freeze({
      'Girl_Crown.jpg': true,
      'Study_Memories.jpg': true
    })
  });

  // ==================== MIME TYPE ALLOW-LISTS ====================

  /**
   * Allowed MIME types for image uploads.
   */
  var ALLOWED_IMAGE_TYPES = Object.freeze([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif'
  ]);

  /**
   * Allowed MIME types for video uploads.
   */
  var ALLOWED_VIDEO_TYPES = Object.freeze([
    'video/mp4',
    'video/webm'
  ]);

  /**
   * Allowed MIME types for audio uploads.
   */
  var ALLOWED_AUDIO_TYPES = Object.freeze([
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/mp4',
    'audio/x-m4a'
  ]);

  // ==================== LOCALSTORAGE KEY CONSTANTS ====================

  /**
   * localStorage keys used by the Media Manager.
   */
  var STORAGE_KEYS = Object.freeze({
    ADDED: 'media_manager_added',
    TRASH: 'media_manager_trash'
  });

  // ==================== DATA STRUCTURES ====================

  /**
   * MediaItem shape:
   * {
   *   id: string,           - Unique identifier (filename or generated UUID)
   *   section: string,      - 'photos' | 'thingsYouLike' | 'funnyMoments' | 'songs'
   *   source: string,       - File path (server mode) or Data URL (local mode)
   *   caption: string,      - Display name / caption
   *   type: string,         - 'image' | 'audio' | 'video'
   *   origin: string,       - 'hardcoded' | 'user-added'
   *   metadata: {           - Section-specific metadata
   *     artist?: string,    - For songs
   *     coverImage?: string,- For songs
   *     videoId?: string    - For funny moments YouTube videos
   *   }
   * }
   */

  /**
   * TrashEntry shape:
   * {
   *   id: string,           - Same id as the original MediaItem
   *   section: string,      - Original section
   *   source: string,       - Original file path or Data URL
   *   caption: string,      - Original caption
   *   type: string,         - 'image' | 'audio' | 'video'
   *   origin: string,       - Original origin ('hardcoded' | 'user-added' | 'url-added')
   *   metadata: object,     - Original metadata
   *   deletedAt: string     - ISO 8601 timestamp
   * }
   */

  // ==================== INTERNAL STATE ====================

  var _mode = 'local'; // 'server' | 'local'
  var _sectionCallbacks = {}; // { [section]: [callback, ...] }

  // ==================== CALLBACK HELPERS ====================

  /**
   * Fire all registered callbacks for a given section.
   * Each callback receives the updated items list for the section.
   * @param {string} section - The section whose callbacks to invoke
   */
  function _fireSectionCallbacks(section) {
    var callbacks = _sectionCallbacks[section];
    if (!callbacks || callbacks.length === 0) {
      return;
    }
    // We don't pass items here — callbacks are responsible for
    // fetching fresh data via getMediaItems if needed.
    callbacks.forEach(function (cb) {
      try {
        cb();
      } catch (e) {
        // Swallow callback errors to avoid breaking the delete flow
      }
    });
  }

  // ==================== LOCALSTORAGE HELPERS ====================

  /**
   * Read user-added items from localStorage.
   * @returns {Array} Array of MediaItem objects, or [] on any error.
   */
  function _readAdded() {
    try {
      var raw = localStorage.getItem(STORAGE_KEYS.ADDED);
      if (raw === null) {
        return [];
      }
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Write user-added items to localStorage.
   * @param {Array} items - Array of MediaItem objects to persist.
   */
  function _writeAdded(items) {
    try {
      localStorage.setItem(STORAGE_KEYS.ADDED, JSON.stringify(items));
    } catch (e) {
      // localStorage unavailable or quota exceeded — silently ignore
    }
  }

  /**
   * Read trash entries from localStorage.
   * @returns {Array} Array of TrashEntry objects, or [] on any error.
   */
  function _readTrash() {
    try {
      var raw = localStorage.getItem(STORAGE_KEYS.TRASH);
      if (raw === null) {
        return [];
      }
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Write trash entries to localStorage.
   * @param {Array} items - Array of TrashEntry objects to persist.
   */
  function _writeTrash(items) {
    try {
      localStorage.setItem(STORAGE_KEYS.TRASH, JSON.stringify(items));
    } catch (e) {
      // localStorage unavailable or quota exceeded — silently ignore
    }
  }

  // ==================== HARDCODED CONVERSION HELPER ====================

  /**
   * Convert the global hardcoded arrays to MediaItem format for a given section.
   * Reads from the global variables: photos, songs, thingsYouLike, funnyMoments.
   * @param {string} section - The section to convert
   * @returns {Array} Array of MediaItem objects
   */
  function _convertHardcodedToMediaItems(section) {
    var items = [];

    if (section === Section.PHOTOS && typeof photos !== 'undefined' && Array.isArray(photos)) {
      items = photos.map(function (photo) {
        return {
          id: photo.url,
          section: Section.PHOTOS,
          source: photo.url,
          caption: photo.caption || '',
          type: 'image',
          origin: 'hardcoded',
          metadata: {}
        };
      });
    } else if (section === Section.SONGS && typeof songs !== 'undefined' && Array.isArray(songs)) {
      items = songs.map(function (song) {
        return {
          id: song.audioSrc,
          section: Section.SONGS,
          source: song.audioSrc,
          caption: song.songName || '',
          type: 'audio',
          origin: 'hardcoded',
          metadata: {
            artist: song.artist || '',
            coverImage: song.coverImage || ''
          }
        };
      });
    } else if (section === Section.THINGS_YOU_LIKE && typeof thingsYouLike !== 'undefined' && Array.isArray(thingsYouLike)) {
      items = thingsYouLike.map(function (item) {
        return {
          id: item.image,
          section: Section.THINGS_YOU_LIKE,
          source: item.image,
          caption: item.caption || '',
          type: 'image',
          origin: 'hardcoded',
          metadata: {}
        };
      });
    } else if (section === Section.FUNNY_MOMENTS && typeof funnyMoments !== 'undefined' && Array.isArray(funnyMoments)) {
      items = funnyMoments.map(function (moment) {
        return {
          id: moment.videoId || moment.src || '',
          section: Section.FUNNY_MOMENTS,
          source: moment.src || '',
          caption: moment.title || '',
          type: moment.type || 'video',
          origin: 'hardcoded',
          metadata: {
            videoId: moment.videoId || ''
          }
        };
      });
    }

    return items;
  }

  /**
   * Extract a decoded filename from a local media source.
   * Song paths are URI-encoded in script.js, so decoding is required before
   * matching them to the filenames returned by the server.
   * @param {string} source
   * @returns {string}
   */
  function _getSourceFilename(source) {
    if (typeof source !== 'string' || source.length === 0) return '';
    var decoded = source;
    try { decoded = decodeURI(source); } catch (e) { /* keep original */ }
    decoded = decoded.split('#')[0].split('?')[0];
    var parts = decoded.split('/');
    return parts[parts.length - 1] || '';
  }

  /**
   * Return whether a hardcoded item points at the local directory for the
   * requested section rather than an external URL/embed.
   * @param {object} item
   * @param {string} section
   * @returns {boolean}
   */
  function _isLocalSectionItem(item, section) {
    if (!item || typeof item.source !== 'string') return false;
    var source = item.source;
    try { source = decodeURI(source); } catch (e) { /* keep original */ }
    var directory = SECTION_DIRECTORIES[section] || '';
    return directory.length > 0 && source.indexOf(directory) === 0;
  }

  /**
   * Combine a server file's stable filename/source with the caption and
   * metadata from its matching legacy hardcoded item.
   * @param {object} hardcodedItem
   * @param {object} serverItem
   * @returns {object}
   */
  function _mergeHardcodedWithServerItem(hardcodedItem, serverItem) {
    return {
      id: serverItem.id,
      section: hardcodedItem.section,
      source: serverItem.source,
      caption: hardcodedItem.caption,
      type: hardcodedItem.type,
      origin: 'hardcoded',
      metadata: hardcodedItem.metadata || {}
    };
  }

  // ==================== URL UTILITY HELPERS ====================

  /**
   * Check whether a string is a valid http:// or https:// URL.
   * @param {string} str - The string to validate
   * @returns {boolean} true if valid URL with http(s) scheme
   */
  function _isValidUrl(str) {
    if (typeof str !== 'string') return false;
    if (str.indexOf('http://') !== 0 && str.indexOf('https://') !== 0) return false;
    try { new URL(str); return true; } catch (e) { return false; }
  }

  /**
   * Extract a YouTube video ID from a supported URL format.
   * Supports youtube.com/watch?v=, youtu.be/, and youtube.com/shorts/.
   * @param {string} url - The URL to parse
   * @returns {{ videoId: string } | null} Object with videoId or null
   */
  function _parseYouTubeUrl(url) {
    var match = url.match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/)|youtu\.be\/)([\w-]{11})/);
    return match ? { videoId: match[1] } : null;
  }

  /**
   * Extract a Spotify track ID from a Spotify URL.
   * Supports URLs matching: https://open.spotify.com/track/{TRACK_ID}[?...]
   * Track IDs are 22 alphanumeric characters.
   * @param {string} url - The URL to parse
   * @returns {{ trackId: string } | null} Object with trackId, or null if invalid
   */
  function parseSpotifyUrl(url) {
    if (typeof url !== 'string') return null;
    var match = url.match(/^https:\/\/open\.spotify\.com\/track\/([A-Za-z0-9]{22})(?:\?.*)?$/);
    return match ? { trackId: match[1] } : null;
  }

  /**
   * Check if a URL is from the Spotify domain (open.spotify.com).
   * Used to distinguish "invalid Spotify URL" from "not a Spotify URL at all".
   * @param {string} url - The URL to check
   * @returns {boolean}
   */
  function _isSpotifyDomain(url) {
    if (typeof url !== 'string') return false;
    return /^https:\/\/open\.spotify\.com\//i.test(url);
  }

  // ==================== MEDIA MANAGER PUBLIC API ====================

  var MediaManager = {
    // Constants exposed for external use
    Section: Section,
    SECTION_DIRECTORIES: SECTION_DIRECTORIES,
    ALLOWED_IMAGE_TYPES: ALLOWED_IMAGE_TYPES,
    ALLOWED_VIDEO_TYPES: ALLOWED_VIDEO_TYPES,
    ALLOWED_AUDIO_TYPES: ALLOWED_AUDIO_TYPES,
    STORAGE_KEYS: STORAGE_KEYS,

    // Internal helpers exposed for testing
    _isValidUrl: _isValidUrl,
    _parseYouTubeUrl: _parseYouTubeUrl,
    parseSpotifyUrl: parseSpotifyUrl,

    /**
     * Initialize the Media Manager.
     * Performs a health check to determine storage mode.
     * Always resolves so the page can continue loading regardless of outcome.
     * @returns {Promise<void>}
     */
    init: function () {
      var controller = new AbortController();
      var timeoutId = setTimeout(function () {
        controller.abort();
      }, 2000);

      return fetch('/api/health', { signal: controller.signal })
        .then(function (response) {
          clearTimeout(timeoutId);
          if (response.ok) {
            _mode = 'server';
          } else {
            _mode = 'local';
          }
        })
        .catch(function () {
          clearTimeout(timeoutId);
          _mode = 'local';
        });
    },

    /**
     * Get the current storage mode.
     * @returns {'server' | 'local'}
     */
    getMode: function () {
      return _mode;
    },

    /**
     * Add media files to a section.
     * Validates MIME types before processing; silently skips invalid files.
     * In server mode: uploads each file via POST /api/media/:section using FormData.
     * In local mode: converts each file to Data URL via FileReader, stores in localStorage.
     * Triggers section re-render after all files are processed.
     * @param {string} section - The target section
     * @param {FileList|Array} files - Files to add
     * @returns {Promise<void>}
     */
    addMedia: function (section, files) {
      if (!files || files.length === 0) {
        return Promise.resolve();
      }

      // Determine allowed MIME types based on section
      var allowedTypes = (section === Section.SONGS)
        ? ALLOWED_AUDIO_TYPES
        : ALLOWED_IMAGE_TYPES.concat(ALLOWED_VIDEO_TYPES);

      // Filter to only valid files
      var validFiles = [];
      for (var i = 0; i < files.length; i++) {
        if (allowedTypes.indexOf(files[i].type) !== -1) {
          validFiles.push(files[i]);
        }
      }

      if (validFiles.length === 0) {
        return Promise.resolve();
      }

      if (_mode === 'server') {
        // Server mode: upload each file sequentially via FormData
        var uploadChain = Promise.resolve();
        validFiles.forEach(function (file) {
          uploadChain = uploadChain.then(function () {
            var formData = new FormData();
            formData.append('file', file);
            return fetch('/api/media/' + section, {
              method: 'POST',
              body: formData
            }).then(function (response) {
              // Silently ignore upload failures per file
              return response;
            }).catch(function () {
              // Network error — skip this file
            });
          });
        });

        return uploadChain.then(function () {
          _fireSectionCallbacks(section);
        });
      }

      // Local mode: convert each file to Data URL and store in localStorage
      var readPromises = validFiles.map(function (file) {
        return new Promise(function (resolve) {
          var reader = new FileReader();
          reader.onload = function (e) {
            // Strip extension from filename for caption
            var filename = file.name;
            var dotIndex = filename.lastIndexOf('.');
            var caption = dotIndex > 0 ? filename.substring(0, dotIndex) : filename;

            var isSongs = (section === Section.SONGS);
            var isVideo = ALLOWED_VIDEO_TYPES.indexOf(file.type) !== -1;
            var mediaType;
            if (isSongs) {
              mediaType = 'audio';
            } else if (isVideo) {
              mediaType = 'video';
            } else {
              mediaType = 'image';
            }

            var mediaItem = {
              id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
              section: section,
              source: e.target.result,
              caption: caption,
              type: mediaType,
              origin: 'user-added',
              metadata: isSongs ? { artist: 'User Added' } : {}
            };

            resolve(mediaItem);
          };
          reader.onerror = function () {
            // Skip files that fail to read
            resolve(null);
          };
          reader.readAsDataURL(file);
        });
      });

      return Promise.all(readPromises).then(function (items) {
        var added = _readAdded();
        items.forEach(function (item) {
          if (item !== null) {
            added.push(item);
          }
        });
        _writeAdded(added);
        _fireSectionCallbacks(section);
      });
    },

    /**
     * Add media to a section by URL.
     * Validates the URL, detects YouTube URLs for image sections,
     * creates a MediaItem with origin 'url-added', stores it in
     * the localStorage added-items store, and fires section callbacks.
     * @param {string} section - The target section
     * @param {string} url - The media URL
     * @param {string} [caption] - Optional caption
     * @returns {Promise<object>} Resolves with the created MediaItem
     */
    addMediaByUrl: function (section, url, caption) {
      // 1. Validate URL
      if (!_isValidUrl(url)) return Promise.reject('Invalid URL');

      // 2. Determine media type
      var youtubeInfo = _parseYouTubeUrl(url);
      var isSongs = (section === Section.SONGS);
      var type, source, metadata, id;

      // 2a. Check for Spotify URL in Songs section
      if (isSongs && _isSpotifyDomain(url)) {
        var spotifyInfo = parseSpotifyUrl(url);
        if (!spotifyInfo) {
          // Matches Spotify domain but not a valid track URL
          return Promise.reject('Invalid Spotify URL format. Expected: https://open.spotify.com/track/{TRACK_ID}');
        }
        type = 'spotify-embed';
        source = '';
        id = 'url-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        metadata = { trackId: spotifyInfo.trackId };
        caption = caption || 'Spotify Track';

        var mediaItem = {
          id: id,
          section: section,
          source: source,
          caption: caption,
          type: type,
          origin: 'url-added',
          metadata: metadata
        };

        var added = _readAdded();
        added.push(mediaItem);
        _writeAdded(added);
        _fireSectionCallbacks(section);
        return Promise.resolve(mediaItem);
      }

      if (youtubeInfo && isSongs) {
        // YouTube URL in Songs section → youtube-embed item
        type = 'youtube-embed';
        source = '';
        id = 'url-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        metadata = { videoId: youtubeInfo.videoId };
      } else if (youtubeInfo && !isSongs) {
        type = 'video';
        source = '';
        id = youtubeInfo.videoId;
        metadata = { videoId: youtubeInfo.videoId };
      } else if (isSongs) {
        type = 'audio';
        source = url;
        id = 'url-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        metadata = { artist: 'URL Added' };
      } else {
        type = 'image';
        source = url;
        id = 'url-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        metadata = {};
      }

      // 3. Build caption
      if (!caption) {
        if (youtubeInfo) {
          caption = 'YouTube Video';
        } else {
          var pathParts = url.split('/');
          var lastPart = pathParts[pathParts.length - 1].split('?')[0];
          var dotIdx = lastPart.lastIndexOf('.');
          caption = dotIdx > 0 ? lastPart.substring(0, dotIdx) : lastPart || 'Untitled';
        }
      }

      // 4. Create MediaItem
      var mediaItem = {
        id: id,
        section: section,
        source: source,
        caption: caption,
        type: type,
        origin: 'url-added',
        metadata: metadata
      };

      // 5. Store in localStorage (both modes)
      var added = _readAdded();
      added.push(mediaItem);
      _writeAdded(added);

      // 6. Fire callbacks
      _fireSectionCallbacks(section);
      return Promise.resolve(mediaItem);
    },

    /**
     * Delete a media item from a section.
     * In server mode: sends DELETE /api/media/:section/:filename.
     * In local mode: adds the item to the localStorage trash store.
     * After deletion, triggers registered section update callbacks.
     * @param {string} section - The section containing the item
     * @param {object} item - The MediaItem to delete
     * @returns {Promise<void>}
     */
    deleteMedia: function (section, item) {
      if (_mode === 'server' && item.origin !== 'url-added') {
        // Server mode for non-URL items: send DELETE to server
        var source = item.source || '';
        var parts = source.split('/');
        var filename = parts[parts.length - 1];

        return fetch('/api/media/' + section + '/' + encodeURIComponent(filename), {
          method: 'DELETE'
        }).then(function (response) {
          if (!response.ok) {
            return response.json().then(function (body) {
              throw new Error(body.error || 'Delete failed');
            });
          }
          _fireSectionCallbacks(section);
        });
      }

      // Local mode OR url-added items: use localStorage trash
      // For url-added items, also remove from the added store
      if (item.origin === 'url-added') {
        var added = _readAdded();
        var updatedAdded = added.filter(function (a) { return a.id !== item.id; });
        _writeAdded(updatedAdded);
      }

      // Add item to trash store with deletedAt timestamp
      var trashEntry = {
        id: item.id,
        section: item.section || section,
        source: item.source,
        caption: item.caption,
        type: item.type,
        origin: item.origin || '',
        metadata: item.metadata || {},
        deletedAt: new Date().toISOString()
      };

      var trash = _readTrash();
      trash.push(trashEntry);
      _writeTrash(trash);

      _fireSectionCallbacks(section);
      return Promise.resolve();
    },

    /**
     * Restore a previously deleted item from the trash.
     * In server mode: sends POST /api/media/restore with section and filename.
     * In local mode: removes entry from trash store, re-adds to added items
     * if the item was user-added, and fires section callbacks.
     * @param {object} trashEntry - The TrashEntry to restore
     * @returns {Promise<void>}
     */
    restoreMedia: function (trashEntry) {
      var section = trashEntry.section;

      if (_mode === 'server' && trashEntry.origin !== 'url-added') {
        // Server mode for non-URL items: send POST restore to server
        var filename;
        if (trashEntry.filename) {
          filename = trashEntry.filename;
        } else {
          var source = trashEntry.source || '';
          var parts = source.split('/');
          filename = decodeURIComponent(parts[parts.length - 1]);
        }

        return fetch('/api/media/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: section, filename: filename })
        }).then(function (response) {
          if (!response.ok) {
            return response.json().then(function (body) {
              throw new Error(body.error || 'Restore failed');
            });
          }
          _fireSectionCallbacks(section);
        });
      }

      // Local mode OR url-added items: use localStorage restore
      var trash = _readTrash();
      var updatedTrash = trash.filter(function (entry) {
        return entry.id !== trashEntry.id;
      });
      _writeTrash(updatedTrash);

      // Re-add to added items if the original item was user-added OR url-added
      var isUserAdded = trashEntry.origin === 'user-added' ||
        trashEntry.origin === 'url-added' ||
        (trashEntry.source && trashEntry.source.indexOf('data:') === 0);

      if (isUserAdded) {
        var restoredItem = {
          id: trashEntry.id,
          section: trashEntry.section,
          source: trashEntry.source,
          caption: trashEntry.caption,
          type: trashEntry.type,
          origin: trashEntry.origin || 'user-added',
          metadata: trashEntry.metadata || {}
        };
        var added = _readAdded();
        added.push(restoredItem);
        _writeAdded(added);
      }

      _fireSectionCallbacks(section);
      return Promise.resolve();
    },

    /**
     * Get all media items for a section (merged hardcoded + user-added, minus trashed).
     * @param {string} section - The section to query
     * @returns {Promise<Array>} Array of MediaItem objects
     */
    getMediaItems: function (section) {
      if (_mode === 'local') {
        // 1. Convert hardcoded items to MediaItem format
        var hardcodedItems = _convertHardcodedToMediaItems(section);

        // 2. Read user-added items from localStorage, filtered by section
        var allAdded = _readAdded();
        var sectionAdded = allAdded.filter(function (item) {
          return item.section === section;
        });

        // 3. Merge hardcoded + user-added
        var merged = hardcodedItems.concat(sectionAdded);

        // 4. Read trash and build a set of trashed IDs
        var trashItems = _readTrash();
        var trashedIds = {};
        trashItems.forEach(function (entry) {
          trashedIds[entry.id] = true;
        });

        // 5. Filter out trashed items
        var filtered = merged.filter(function (item) {
          return !trashedIds[item.id];
        });

        return Promise.resolve(filtered);
      }

      // Server mode: use the hardcoded arrays as the presentation baseline
      // (order, captions, artists, covers), while using the server listing to
      // determine which local files currently exist. Newly uploaded files are
      // appended after the baseline items.
      var hardcodedItems = _convertHardcodedToMediaItems(section);

      return fetch('/api/media/' + section)
        .then(function (response) {
          if (!response.ok) {
            return [];
          }
          return response.json();
        })
        .then(function (filenames) {
          if (!Array.isArray(filenames)) {
            filenames = [];
          }
          var isSongs = (section === Section.SONGS);

          // Convert server filenames to MediaItem objects
          var serverItems = filenames.map(function (filename) {
            // Strip extension for caption
            var dotIndex = filename.lastIndexOf('.');
            var caption = dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
            var dirPath = SECTION_DIRECTORIES[section] || '';
            var source = isSongs
              ? encodeURI(dirPath + filename)
              : dirPath + filename;
            var lowerFilename = filename.toLowerCase();
            var isVideo = /\.(mp4|webm)$/.test(lowerFilename);
            return {
              id: filename,
              section: section,
              source: source,
              caption: caption,
              type: isSongs ? 'audio' : (isVideo ? 'video' : 'image'),
              origin: 'hardcoded',
              metadata: isSongs ? { artist: '', coverImage: '' } : {}
            };
          });

          var serverByFilename = {};
          serverItems.forEach(function (item) {
            serverByFilename[item.id] = item;
          });

          var consumedFilenames = {};
          var mergedItems = [];

          // Preserve the exact legacy display order and metadata. Local files
          // only appear when they still exist on the server; external items and
          // embeds remain available without a local file.
          hardcodedItems.forEach(function (item) {
            if (_isLocalSectionItem(item, section)) {
              var filename = _getSourceFilename(item.source);
              var matchingServerItem = serverByFilename[filename];
              if (matchingServerItem) {
                mergedItems.push(_mergeHardcodedWithServerItem(item, matchingServerItem));
                consumedFilenames[filename] = true;
              }
              return;
            }
            mergedItems.push(item);
          });

          // Files added later through Edit Mode are not in the hardcoded arrays,
          // so append them after the legacy defaults. The one legacy asset that
          // existed on disk but was intentionally not displayed stays omitted.
          var unlistedForSection = DEFAULT_UNLISTED_FILES[section] || {};
          serverItems.forEach(function (item) {
            if (!consumedFilenames[item.id] && !unlistedForSection[item.id]) {
              mergedItems.push(item);
            }
          });

          // Include URL-added items from localStorage.
          var urlAdded = _readAdded().filter(function (item) {
            return item.section === section && item.origin === 'url-added';
          });
          return mergedItems.concat(urlAdded);
        })
        .catch(function () {
          // On error, fall back to hardcoded items only
          return hardcodedItems;
        });
    },

    /**
     * Get all items currently in the trash.
     * In server mode: fetches from GET /api/trash.
     * In local mode: reads from localStorage trash store.
     * @returns {Promise<Array>} Array of TrashEntry objects
     */
    getTrashItems: function () {
      if (_mode === 'server') {
        return fetch('/api/trash')
          .then(function (response) {
            if (!response.ok) {
              return [];
            }
            return response.json();
          })
          .then(function (entries) {
            return Array.isArray(entries) ? entries : [];
          })
          .catch(function () {
            return [];
          });
      }

      // Local mode: read from localStorage trash store
      return Promise.resolve(_readTrash());
    },

    /**
     * Register a callback to be invoked when a section is updated
     * (e.g., after a delete, add, or restore operation).
     * @param {string} section - The section to listen for updates on
     * @param {Function} callback - The callback to invoke on update
     */
    onSectionUpdated: function (section, callback) {
      if (!_sectionCallbacks[section]) {
        _sectionCallbacks[section] = [];
      }
      _sectionCallbacks[section].push(callback);
    }
  };

  // ==================== EXPOSE GLOBALLY ====================

  window.MediaManager = MediaManager;
})();
