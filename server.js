const express = require('express');
const multer = require('multer');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB per file — adjust to taste
});

fs.mkdirSync('uploads', { recursive: true });
fs.mkdirSync('outputs', { recursive: true });

app.use(express.static('public'));
app.use(express.json());

// Very basic in-memory rate limiting per IP so one customer can't hog the server.
// For real production traffic, replace with Redis-backed limiting.
const lastRequestAt = new Map();
const MIN_GAP_MS = 5000;

app.post('/process', upload.single('video'), (req, res) => {
  const ip = req.ip;
  const now = Date.now();
  if (lastRequestAt.has(ip) && now - lastRequestAt.get(ip) < MIN_GAP_MS) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(429).json({ error: 'Please wait a few seconds between uploads.' });
  }
  lastRequestAt.set(ip, now);

  if (!req.file) return res.status(400).json({ error: 'No video file uploaded.' });

  const bitrate = Math.min(Math.max(parseInt(req.body.bitrate, 10) || 20, 6), 50);
  const maxrate = Math.round(bitrate * 1.5);
  const bufsize = Math.round(bitrate * 2);

  const inputPath = req.file.path;
  const outputName = crypto.randomUUID() + '.mp4';
  const outputPath = path.join('outputs', outputName);

  const args = [
    '-y', '-i', inputPath,
    '-c:v', 'libx264', '-preset', 'medium', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-b:v', `${bitrate}M`, '-maxrate', `${maxrate}M`, '-bufsize', `${bufsize}M`,
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    outputPath,
  ];

  const started = Date.now();
  execFile('ffmpeg', args, { maxBuffer: 1024 * 1024 * 50 }, (err, _stdout, stderr) => {
    fs.unlink(inputPath, () => {});
    if (err) {
      console.error('ffmpeg failed:', stderr?.slice(-2000));
      return res.status(500).json({ error: 'Processing failed. The file may be corrupt or an unsupported format.' });
    }
    console.log(`Processed ${req.file.originalname} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
    res.download(outputPath, 'optimized.mp4', (dlErr) => {
      if (dlErr) console.error(dlErr);
      fs.unlink(outputPath, () => {}); // clean up — don't keep customer videos around
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on :${PORT}`));
