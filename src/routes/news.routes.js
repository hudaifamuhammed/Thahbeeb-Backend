import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import News from '../models/News.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const uploadRoot = path.join(process.cwd(), 'uploads');
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => cb(null, Date.now() + '_' + Math.round(Math.random() * 1e9) + path.extname(file.originalname)),
});

const upload = multer({ storage });

const router = Router();

router.get('/', async (_req, res) => {
	const list = await News.find().sort({ createdAt: -1 });
	res.json(list);
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
	const doc = await News.create(req.body);
	res.status(201).json(doc);
});

// Upload image for news article
router.post('/:id/upload-image', requireAuth, requireAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Image file is required' });
  
  try {
    const news = await News.findByIdAndUpdate(
      req.params.id,
      { imageUrl: `/uploads/${req.file.filename}` },
      { new: true }
    );
    
    if (!news) return res.status(404).json({ error: 'News article not found' });
    
    res.json(news);
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
	const doc = await News.findByIdAndUpdate(req.params.id, req.body, { new: true });
	res.json(doc);
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
	await News.findByIdAndDelete(req.params.id);
	res.json({ ok: true });
});

export default router;
