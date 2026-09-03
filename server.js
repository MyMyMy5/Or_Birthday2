const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Section-to-directory mapping
const SECTION_DIRECTORIES = {
  photos: 'Images/Memories/',
  thingsYouLike: 'Images/Liked_Things/',
  funnyMoments: 'Images/Funny_Moments/',
  songs: 'Songs/'
};

// Allowed MIME types per section category
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const ALLOWED_AUDIO_MIMES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'];

const IMAGE_SECTIONS = ['photos', 'thingsYouLike', 'funnyMoments'];

function getAllowedMimes(section) {
  if (IMAGE_SECTIONS.includes(section)) {
    return [...ALLOWED_IMAGE_MIMES, ...ALLOWED_VIDEO_TYPES];
  }
  if (section === 'songs') {
    return ALLOWED_AUDIO_MIMES;
  }
  return [];
}

// Serve static files from the project root directory
app.use(express.static(path.join(__dirname)));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// File listing endpoint
app.get('/api/media/:section', (req, res) => {
  const section = req.params.section;
  const directory = SECTION_DIRECTORIES[section];

  if (!directory) {
    return res.status(404).json({ error: 'Section not found', section });
  }

  const dirPath = path.join(__dirname, directory);

  fs.readdir(dirPath, (err, files) => {
    if (err) {
      // If the directory doesn't exist, return an empty array
      if (err.code === 'ENOENT') {
        return res.json([]);
      }
      return res.status(500).json({ error: 'Failed to read directory', details: err.message });
    }
    res.json(files);
  });
});

// Parse JSON request bodies (for restore endpoint)
app.use(express.json());

// Restore endpoint - moves file from Deleted/<section-path>/ back to original directory
// NOTE: This must be registered BEFORE the parameterized POST /api/media/:section route
// so that /api/media/restore is not captured as :section = "restore"
app.post('/api/media/restore', (req, res) => {
  const { section, filename } = req.body;

  // Validate required fields
  if (!section) {
    return res.status(400).json({ error: 'Missing required field', field: 'section' });
  }
  if (!filename) {
    return res.status(400).json({ error: 'Missing required field', field: 'filename' });
  }

  // Validate section
  const directory = SECTION_DIRECTORIES[section];
  if (!directory) {
    return res.status(404).json({ error: 'Section not found', section });
  }

  // Check if the file exists in the Deleted directory
  const deletedPath = path.join(__dirname, 'Deleted', directory, filename);
  if (!fs.existsSync(deletedPath)) {
    return res.status(404).json({ error: 'File not found', path: path.join('Deleted', directory, filename).split(path.sep).join('/') });
  }

  // Ensure the original section directory exists
  const destDir = path.join(__dirname, directory);
  fs.mkdirSync(destDir, { recursive: true });

  // Move the file back to the original section directory
  const destPath = path.join(destDir, filename);
  try {
    fs.renameSync(deletedPath, destPath);
    res.status(200).json({ success: true, filename });
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore file', details: err.message });
  }
});

// File upload endpoint using multer with memory storage
// We use memory storage so we can check for file existence before writing to disk
const upload = multer({ storage: multer.memoryStorage() }).single('file');

app.post('/api/media/:section', (req, res) => {
  const section = req.params.section;
  const directory = SECTION_DIRECTORIES[section];

  if (!directory) {
    return res.status(404).json({ error: 'Section not found', section });
  }

  upload(req, res, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to save file', details: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Missing required field', field: 'file' });
    }

    // Validate MIME type
    const allowedMimes = getAllowedMimes(section);
    if (!allowedMimes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'File type not allowed', mimeType: req.file.mimetype });
    }

    const destDir = path.join(__dirname, directory);
    const destPath = path.join(destDir, req.file.originalname);

    // Check if file already exists
    if (fs.existsSync(destPath)) {
      return res.status(409).json({ error: 'File already exists', filename: req.file.originalname });
    }

    // Ensure the directory exists, then write the file
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFile(destPath, req.file.buffer, (writeErr) => {
      if (writeErr) {
        return res.status(500).json({ error: 'Failed to save file', details: writeErr.message });
      }
      res.status(200).json({ success: true, filename: req.file.originalname });
    });
  });
});

// Delete endpoint - moves file to Deleted/<section-path>/
app.delete('/api/media/:section/:filename', (req, res) => {
  const section = req.params.section;
  const filename = req.params.filename;
  const directory = SECTION_DIRECTORIES[section];

  if (!directory) {
    return res.status(404).json({ error: 'Section not found', section });
  }

  const sourcePath = path.join(__dirname, directory, filename);

  // Check if the file exists
  if (!fs.existsSync(sourcePath)) {
    return res.status(404).json({ error: 'File not found', path: path.join(directory, filename) });
  }

  // Create the Deleted/<section-directory>/ structure if it doesn't exist
  const deletedDir = path.join(__dirname, 'Deleted', directory);
  fs.mkdirSync(deletedDir, { recursive: true });

  // Move the file to the Deleted directory
  const destPath = path.join(deletedDir, filename);
  try {
    fs.renameSync(sourcePath, destPath);
    res.status(200).json({ success: true, filename });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete file', details: err.message });
  }
});

// Reverse mapping from directory path (inside Deleted/) to section name
const DIR_TO_SECTION = {};
for (const [section, dir] of Object.entries(SECTION_DIRECTORIES)) {
  DIR_TO_SECTION[dir.replace(/\/$/, '')] = section;
}

// Trash listing endpoint - recursively lists all files in Deleted/
app.get('/api/trash', (req, res) => {
  const deletedRoot = path.join(__dirname, 'Deleted');

  if (!fs.existsSync(deletedRoot)) {
    return res.json([]);
  }

  const results = [];

  function walkDir(currentPath) {
    let entries;
    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch (err) {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile()) {
        // Get the path relative to the Deleted/ directory
        const relativePath = path.relative(deletedRoot, fullPath).split(path.sep).join('/');
        // Get the directory portion relative to Deleted/ (e.g. "Images/Memories")
        const relativeDir = path.relative(deletedRoot, currentPath).split(path.sep).join('/');

        // Look up the section from the directory path
        let section = null;
        for (const [dirKey, sectionName] of Object.entries(DIR_TO_SECTION)) {
          if (relativeDir === dirKey) {
            section = sectionName;
            break;
          }
        }

        results.push({
          section: section,
          filename: entry.name,
          path: relativePath
        });
      }
    }
  }

  walkDir(deletedRoot);
  res.json(results);
});

// Start the server only when this file is run directly (not imported for testing)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
