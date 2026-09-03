import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// We need to use dynamic import or require for the express app
let app;
let request;

beforeAll(async () => {
  // Import supertest-like functionality using native fetch against a running server
  app = require('../server.js');
  const supertest = (await import('supertest')).default;
  request = supertest(app);
});

// Track files created during tests for cleanup
const createdFiles = [];

afterEach(() => {
  // Clean up any files created during tests
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
});

describe('POST /api/media/:section - File Upload Endpoint', () => {
  it('should return 404 for unknown section', async () => {
    const res = await request
      .post('/api/media/unknownSection')
      .attach('file', Buffer.from('fake image data'), {
        filename: 'test.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Section not found');
    expect(res.body.section).toBe('unknownSection');
  });

  it('should return 400 for invalid MIME type on image section', async () => {
    const res = await request
      .post('/api/media/photos')
      .attach('file', Buffer.from('fake audio data'), {
        filename: 'test.mp3',
        contentType: 'audio/mpeg',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('File type not allowed');
    expect(res.body.mimeType).toBe('audio/mpeg');
  });

  it('should return 400 for invalid MIME type on songs section', async () => {
    const res = await request
      .post('/api/media/songs')
      .attach('file', Buffer.from('fake image data'), {
        filename: 'test.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('File type not allowed');
    expect(res.body.mimeType).toBe('image/png');
  });

  it('should return 400 when no file is provided', async () => {
    const res = await request
      .post('/api/media/photos');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing required field');
    expect(res.body.field).toBe('file');
  });

  it('should upload a valid image file to photos section', async () => {
    const filename = `test-upload-${Date.now()}.jpg`;
    const destPath = path.join(projectRoot, 'Images/Memories/', filename);
    createdFiles.push(destPath);

    const res = await request
      .post('/api/media/photos')
      .attach('file', Buffer.from('fake jpeg data'), {
        filename,
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.filename).toBe(filename);
    expect(fs.existsSync(destPath)).toBe(true);
  });

  it('should upload a valid audio file to songs section', async () => {
    const filename = `test-upload-${Date.now()}.mp3`;
    const destPath = path.join(projectRoot, 'Songs/', filename);
    createdFiles.push(destPath);

    const res = await request
      .post('/api/media/songs')
      .attach('file', Buffer.from('fake mp3 data'), {
        filename,
        contentType: 'audio/mpeg',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.filename).toBe(filename);
    expect(fs.existsSync(destPath)).toBe(true);
  });

  it('should return 409 if file already exists', async () => {
    const filename = `test-duplicate-${Date.now()}.png`;
    const destPath = path.join(projectRoot, 'Images/Memories/', filename);
    createdFiles.push(destPath);

    // First upload should succeed
    const res1 = await request
      .post('/api/media/photos')
      .attach('file', Buffer.from('first upload'), {
        filename,
        contentType: 'image/png',
      });
    expect(res1.status).toBe(200);

    // Second upload with same filename should return 409
    const res2 = await request
      .post('/api/media/photos')
      .attach('file', Buffer.from('second upload'), {
        filename,
        contentType: 'image/png',
      });
    expect(res2.status).toBe(409);
    expect(res2.body.error).toBe('File already exists');
    expect(res2.body.filename).toBe(filename);
  });

  it('should accept all allowed image MIME types', async () => {
    const allowedImageTypes = [
      { mime: 'image/jpeg', ext: 'jpg' },
      { mime: 'image/png', ext: 'png' },
      { mime: 'image/gif', ext: 'gif' },
      { mime: 'image/webp', ext: 'webp' },
      { mime: 'image/avif', ext: 'avif' },
    ];

    for (const { mime, ext } of allowedImageTypes) {
      const filename = `test-mime-${Date.now()}-${ext}.${ext}`;
      const destPath = path.join(projectRoot, 'Images/Memories/', filename);
      createdFiles.push(destPath);

      const res = await request
        .post('/api/media/photos')
        .attach('file', Buffer.from('fake data'), {
          filename,
          contentType: mime,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }
  });

  it('should accept all allowed audio MIME types', async () => {
    const allowedAudioTypes = [
      { mime: 'audio/mpeg', ext: 'mp3' },
      { mime: 'audio/wav', ext: 'wav' },
      { mime: 'audio/ogg', ext: 'ogg' },
      { mime: 'audio/mp4', ext: 'mp4' },
      { mime: 'audio/x-m4a', ext: 'm4a' },
    ];

    for (const { mime, ext } of allowedAudioTypes) {
      const filename = `test-mime-${Date.now()}-${ext}.${ext}`;
      const destPath = path.join(projectRoot, 'Songs/', filename);
      createdFiles.push(destPath);

      const res = await request
        .post('/api/media/songs')
        .attach('file', Buffer.from('fake data'), {
          filename,
          contentType: mime,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }
  });

  it('should upload to thingsYouLike section', async () => {
    const filename = `test-liked-${Date.now()}.webp`;
    const destPath = path.join(projectRoot, 'Images/Liked_Things/', filename);
    createdFiles.push(destPath);

    const res = await request
      .post('/api/media/thingsYouLike')
      .attach('file', Buffer.from('fake webp data'), {
        filename,
        contentType: 'image/webp',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);
  });

  it('should upload to funnyMoments section', async () => {
    const filename = `test-funny-${Date.now()}.gif`;
    const destPath = path.join(projectRoot, 'Images/Funny_Moments/', filename);
    createdFiles.push(destPath);

    const res = await request
      .post('/api/media/funnyMoments')
      .attach('file', Buffer.from('fake gif data'), {
        filename,
        contentType: 'image/gif',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);
  });

  it('should accept video/mp4 uploads in image sections (photos, funnyMoments)', async () => {
    const filename = `test-video-${Date.now()}.mp4`;
    const destPath = path.join(projectRoot, 'Images/Memories/', filename);
    createdFiles.push(destPath);

    const res = await request
      .post('/api/media/photos')
      .attach('file', Buffer.from('fake mp4 data'), {
        filename,
        contentType: 'video/mp4',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.filename).toBe(filename);
    expect(fs.existsSync(destPath)).toBe(true);
  });

  it('should accept video/webm uploads in image sections', async () => {
    const filename = `test-video-${Date.now()}.webm`;
    const destPath = path.join(projectRoot, 'Images/Funny_Moments/', filename);
    createdFiles.push(destPath);

    const res = await request
      .post('/api/media/funnyMoments')
      .attach('file', Buffer.from('fake webm data'), {
        filename,
        contentType: 'video/webm',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.filename).toBe(filename);
    expect(fs.existsSync(destPath)).toBe(true);
  });

  it('should reject video MIME types in songs section', async () => {
    const res = await request
      .post('/api/media/songs')
      .attach('file', Buffer.from('fake mp4 data'), {
        filename: 'test-video.mp4',
        contentType: 'video/mp4',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('File type not allowed');
    expect(res.body.mimeType).toBe('video/mp4');
  });
});
