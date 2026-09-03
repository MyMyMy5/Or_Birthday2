import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
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
  // Clean up created files
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

  // Clean up created directories (in reverse order for nested dirs)
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

describe('DELETE /api/media/:section/:filename - Delete Endpoint', () => {
  it('should return 404 for unknown section', async () => {
    const res = await request.delete('/api/media/unknownSection/test.jpg');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Section not found');
    expect(res.body.section).toBe('unknownSection');
  });

  it('should return 404 if file does not exist', async () => {
    const res = await request.delete('/api/media/photos/nonexistent-file.jpg');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('File not found');
    expect(res.body.path).toBeDefined();
  });

  it('should delete a photo by moving it to Deleted/Images/Memories/', async () => {
    // Create a temporary file to delete
    const filename = `test-delete-${Date.now()}.jpg`;
    const sourcePath = path.join(projectRoot, 'Images/Memories/', filename);
    const deletedPath = path.join(projectRoot, 'Deleted/Images/Memories/', filename);

    fs.writeFileSync(sourcePath, 'fake jpeg data');
    createdFiles.push(sourcePath);
    createdFiles.push(deletedPath);
    createdDirs.push(path.join(projectRoot, 'Deleted'));

    const res = await request.delete(`/api/media/photos/${filename}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.filename).toBe(filename);
    // File should no longer exist in original location
    expect(fs.existsSync(sourcePath)).toBe(false);
    // File should exist in Deleted directory
    expect(fs.existsSync(deletedPath)).toBe(true);
  });

  it('should delete a song by moving it to Deleted/Songs/', async () => {
    const filename = `test-delete-${Date.now()}.mp3`;
    const sourcePath = path.join(projectRoot, 'Songs/', filename);
    const deletedPath = path.join(projectRoot, 'Deleted/Songs/', filename);

    fs.writeFileSync(sourcePath, 'fake mp3 data');
    createdFiles.push(sourcePath);
    createdFiles.push(deletedPath);
    createdDirs.push(path.join(projectRoot, 'Deleted'));

    const res = await request.delete(`/api/media/songs/${filename}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.filename).toBe(filename);
    expect(fs.existsSync(sourcePath)).toBe(false);
    expect(fs.existsSync(deletedPath)).toBe(true);
  });

  it('should delete from thingsYouLike section', async () => {
    const filename = `test-delete-liked-${Date.now()}.webp`;
    const sourcePath = path.join(projectRoot, 'Images/Liked_Things/', filename);
    const deletedPath = path.join(projectRoot, 'Deleted/Images/Liked_Things/', filename);

    fs.writeFileSync(sourcePath, 'fake webp data');
    createdFiles.push(sourcePath);
    createdFiles.push(deletedPath);
    createdDirs.push(path.join(projectRoot, 'Deleted'));

    const res = await request.delete(`/api/media/thingsYouLike/${filename}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(fs.existsSync(sourcePath)).toBe(false);
    expect(fs.existsSync(deletedPath)).toBe(true);
  });

  it('should delete from funnyMoments section', async () => {
    const filename = `test-delete-funny-${Date.now()}.gif`;
    const sourcePath = path.join(projectRoot, 'Images/Funny_Moments/', filename);
    const deletedPath = path.join(projectRoot, 'Deleted/Images/Funny_Moments/', filename);

    fs.writeFileSync(sourcePath, 'fake gif data');
    createdFiles.push(sourcePath);
    createdFiles.push(deletedPath);
    createdDirs.push(path.join(projectRoot, 'Deleted'));

    const res = await request.delete(`/api/media/funnyMoments/${filename}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(fs.existsSync(sourcePath)).toBe(false);
    expect(fs.existsSync(deletedPath)).toBe(true);
  });

  it('should create the Deleted subdirectory structure if it does not exist', async () => {
    const filename = `test-delete-mkdir-${Date.now()}.png`;
    const sourcePath = path.join(projectRoot, 'Images/Memories/', filename);
    const deletedDir = path.join(projectRoot, 'Deleted/Images/Memories/');

    // Ensure the Deleted directory doesn't exist before the test
    const deletedRoot = path.join(projectRoot, 'Deleted');
    if (fs.existsSync(deletedRoot)) {
      fs.rmSync(deletedRoot, { recursive: true, force: true });
    }

    fs.writeFileSync(sourcePath, 'fake png data');
    createdFiles.push(sourcePath);
    createdFiles.push(path.join(deletedDir, filename));
    createdDirs.push(deletedRoot);

    const res = await request.delete(`/api/media/photos/${filename}`);

    expect(res.status).toBe(200);
    expect(fs.existsSync(deletedDir)).toBe(true);
    expect(fs.existsSync(path.join(deletedDir, filename))).toBe(true);
  });
});
