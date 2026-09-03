import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

let app;
let request;

beforeAll(async () => {
  app = require('../server.js');
  const supertest = (await import('supertest')).default;
  request = supertest(app);
});

// Track files and directories created during tests for cleanup
const createdFiles = [];
const createdDirs = [];

afterEach(() => {
  for (const filePath of createdFiles) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      // ignore cleanup errors
    }
  }
  createdFiles.length = 0;

  for (const dirPath of createdDirs.reverse()) {
    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
    } catch (e) {
      // ignore cleanup errors
    }
  }
  createdDirs.length = 0;
});

describe('POST /api/media/restore - Restore Endpoint', () => {
  it('should return 400 if section is missing', async () => {
    const res = await request
      .post('/api/media/restore')
      .send({ filename: 'photo.jpg' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing required field');
    expect(res.body.field).toBe('section');
  });

  it('should return 400 if filename is missing', async () => {
    const res = await request
      .post('/api/media/restore')
      .send({ section: 'photos' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing required field');
    expect(res.body.field).toBe('filename');
  });

  it('should return 404 for unknown section', async () => {
    const res = await request
      .post('/api/media/restore')
      .send({ section: 'unknownSection', filename: 'test.jpg' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Section not found');
    expect(res.body.section).toBe('unknownSection');
  });

  it('should return 404 if file is not found in Deleted directory', async () => {
    const res = await request
      .post('/api/media/restore')
      .send({ section: 'photos', filename: 'nonexistent.jpg' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('File not found');
    expect(res.body.path).toBeDefined();
  });

  it('should restore a photo from Deleted/Images/Memories/ back to Images/Memories/', async () => {
    const filename = `test-restore-${Date.now()}.jpg`;
    const deletedDir = path.join(projectRoot, 'Deleted/Images/Memories/');
    const deletedPath = path.join(deletedDir, filename);
    const restoredPath = path.join(projectRoot, 'Images/Memories/', filename);

    // Create the file in the Deleted directory
    fs.mkdirSync(deletedDir, { recursive: true });
    fs.writeFileSync(deletedPath, 'fake jpeg data');
    createdFiles.push(deletedPath);
    createdFiles.push(restoredPath);
    createdDirs.push(path.join(projectRoot, 'Deleted'));

    const res = await request
      .post('/api/media/restore')
      .send({ section: 'photos', filename });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.filename).toBe(filename);
    // File should no longer exist in Deleted directory
    expect(fs.existsSync(deletedPath)).toBe(false);
    // File should exist in original location
    expect(fs.existsSync(restoredPath)).toBe(true);
  });

  it('should restore a song from Deleted/Songs/ back to Songs/', async () => {
    const filename = `test-restore-${Date.now()}.mp3`;
    const deletedDir = path.join(projectRoot, 'Deleted/Songs/');
    const deletedPath = path.join(deletedDir, filename);
    const restoredPath = path.join(projectRoot, 'Songs/', filename);

    fs.mkdirSync(deletedDir, { recursive: true });
    fs.writeFileSync(deletedPath, 'fake mp3 data');
    createdFiles.push(deletedPath);
    createdFiles.push(restoredPath);
    createdDirs.push(path.join(projectRoot, 'Deleted'));

    const res = await request
      .post('/api/media/restore')
      .send({ section: 'songs', filename });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.filename).toBe(filename);
    expect(fs.existsSync(deletedPath)).toBe(false);
    expect(fs.existsSync(restoredPath)).toBe(true);
  });

  it('should restore from thingsYouLike section', async () => {
    const filename = `test-restore-liked-${Date.now()}.webp`;
    const deletedDir = path.join(projectRoot, 'Deleted/Images/Liked_Things/');
    const deletedPath = path.join(deletedDir, filename);
    const restoredPath = path.join(projectRoot, 'Images/Liked_Things/', filename);

    fs.mkdirSync(deletedDir, { recursive: true });
    fs.writeFileSync(deletedPath, 'fake webp data');
    createdFiles.push(deletedPath);
    createdFiles.push(restoredPath);
    createdDirs.push(path.join(projectRoot, 'Deleted'));

    const res = await request
      .post('/api/media/restore')
      .send({ section: 'thingsYouLike', filename });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(fs.existsSync(deletedPath)).toBe(false);
    expect(fs.existsSync(restoredPath)).toBe(true);
  });

  it('should restore from funnyMoments section', async () => {
    const filename = `test-restore-funny-${Date.now()}.gif`;
    const deletedDir = path.join(projectRoot, 'Deleted/Images/Funny_Moments/');
    const deletedPath = path.join(deletedDir, filename);
    const restoredPath = path.join(projectRoot, 'Images/Funny_Moments/', filename);

    fs.mkdirSync(deletedDir, { recursive: true });
    fs.writeFileSync(deletedPath, 'fake gif data');
    createdFiles.push(deletedPath);
    createdFiles.push(restoredPath);
    createdDirs.push(path.join(projectRoot, 'Deleted'));

    const res = await request
      .post('/api/media/restore')
      .send({ section: 'funnyMoments', filename });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(fs.existsSync(deletedPath)).toBe(false);
    expect(fs.existsSync(restoredPath)).toBe(true);
  });
});
