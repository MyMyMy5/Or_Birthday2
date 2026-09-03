import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const deletedRoot = path.join(projectRoot, 'Deleted');

let app;
let request;

beforeAll(async () => {
  app = require('../server.js');
  const supertest = (await import('supertest')).default;
  request = supertest(app);
});

// Clean Deleted/ before and after each test for isolation
beforeEach(() => {
  if (fs.existsSync(deletedRoot)) {
    fs.rmSync(deletedRoot, { recursive: true, force: true });
  }
});

afterEach(() => {
  if (fs.existsSync(deletedRoot)) {
    fs.rmSync(deletedRoot, { recursive: true, force: true });
  }
});

describe('GET /api/trash - Trash Listing Endpoint', () => {
  it('should return an empty array when Deleted/ directory does not exist', async () => {
    const res = await request.get('/api/trash');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('should return an empty array when Deleted/ directory is empty', async () => {
    fs.mkdirSync(deletedRoot, { recursive: true });

    const res = await request.get('/api/trash');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('should list a deleted photo with correct section mapping', async () => {
    const deletedPhotosDir = path.join(deletedRoot, 'Images', 'Memories');
    fs.mkdirSync(deletedPhotosDir, { recursive: true });

    const filename = `trash-test-${Date.now()}.jpg`;
    fs.writeFileSync(path.join(deletedPhotosDir, filename), 'fake data');

    const res = await request.get('/api/trash');

    expect(res.status).toBe(200);
    const entry = res.body.find(e => e.filename === filename);
    expect(entry).toBeDefined();
    expect(entry.section).toBe('photos');
    expect(entry.path).toBe(`Images/Memories/${filename}`);
  });

  it('should list a deleted song with correct section mapping', async () => {
    const deletedSongsDir = path.join(deletedRoot, 'Songs');
    fs.mkdirSync(deletedSongsDir, { recursive: true });

    const filename = `trash-song-${Date.now()}.mp3`;
    fs.writeFileSync(path.join(deletedSongsDir, filename), 'fake audio');

    const res = await request.get('/api/trash');

    expect(res.status).toBe(200);
    const entry = res.body.find(e => e.filename === filename);
    expect(entry).toBeDefined();
    expect(entry.section).toBe('songs');
    expect(entry.path).toBe(`Songs/${filename}`);
  });

  it('should list files from multiple sections', async () => {
    const sections = [
      { dir: 'Images/Memories', section: 'photos' },
      { dir: 'Images/Liked_Things', section: 'thingsYouLike' },
      { dir: 'Images/Funny_Moments', section: 'funnyMoments' },
      { dir: 'Songs', section: 'songs' }
    ];

    const timestamp = Date.now();
    for (const s of sections) {
      const dirPath = path.join(deletedRoot, s.dir);
      fs.mkdirSync(dirPath, { recursive: true });
      fs.writeFileSync(path.join(dirPath, `file-${timestamp}.test`), 'data');
    }

    const res = await request.get('/api/trash');

    expect(res.status).toBe(200);
    // Verify each section's file is present with correct mapping
    for (const s of sections) {
      const entry = res.body.find(e => e.filename === `file-${timestamp}.test` && e.section === s.section);
      expect(entry).toBeDefined();
      expect(entry.path).toBe(`${s.dir}/file-${timestamp}.test`);
    }
    // Verify we have at least 4 entries (our files)
    expect(res.body.length).toBeGreaterThanOrEqual(4);
  });

  it('should set section to null for files in unrecognized subdirectories', async () => {
    const unknownDir = path.join(deletedRoot, 'Unknown', 'Stuff');
    fs.mkdirSync(unknownDir, { recursive: true });

    const filename = `unknown-${Date.now()}.txt`;
    fs.writeFileSync(path.join(unknownDir, filename), 'data');

    const res = await request.get('/api/trash');

    expect(res.status).toBe(200);
    const entry = res.body.find(e => e.filename === filename);
    expect(entry).toBeDefined();
    expect(entry.section).toBeNull();
    expect(entry.path).toBe(`Unknown/Stuff/${filename}`);
  });
});
