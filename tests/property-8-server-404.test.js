import { describe, it, expect, beforeAll } from 'vitest';
import fc from 'fast-check';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/**
 * Property 8: Server returns 404 for non-existent files
 *
 * For any randomly generated filename that does not exist on disk,
 * a DELETE request to /api/media/:section/:filename SHALL return HTTP 404
 * with a response body containing a descriptive error message.
 *
 * Validates: Requirements 8.7
 * Feature: media-management, Property 8: Server returns 404 for non-existent files
 */

let app;
let request;

const SECTIONS = ['photos', 'thingsYouLike', 'funnyMoments', 'songs'];

beforeAll(async () => {
  app = require('../server.js');
  const supertest = (await import('supertest')).default;
  request = supertest(app);
});

// Arbitrary: generate a random section from the valid sections
const sectionArb = fc.constantFrom(...SECTIONS);

// Arbitrary: generate a random filename that cannot exist on disk.
// Uses a "nonexistent-pbt-" prefix to guarantee no collision with real files,
// followed by random alphanumeric characters and a common file extension.
const nonExistentFilenameArb = fc
  .tuple(
    fc.stringMatching(/^[a-zA-Z0-9]{1,20}$/),
    fc.constantFrom('.jpg', '.png', '.gif', '.webp', '.avif', '.mp3', '.wav', '.ogg')
  )
  .map(([name, ext]) => `nonexistent-pbt-${name}${ext}`);

describe('Feature: media-management, Property 8: Server returns 404 for non-existent files', () => {
  it('DELETE /api/media/:section/:filename returns 404 with descriptive error for non-existent files', async () => {
    /**
     * Validates: Requirements 8.7
     */
    await fc.assert(
      fc.asyncProperty(sectionArb, nonExistentFilenameArb, async (section, filename) => {
        const res = await request.delete(`/api/media/${section}/${filename}`);

        // Must return 404 status
        expect(res.status).toBe(404);

        // Must contain a descriptive error message
        expect(res.body).toHaveProperty('error', 'File not found');

        // Must contain a path field indicating which file was not found
        expect(res.body).toHaveProperty('path');
        expect(typeof res.body.path).toBe('string');
        expect(res.body.path.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});
