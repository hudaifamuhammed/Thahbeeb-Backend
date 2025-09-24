import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import GalleryItem from '../models/GalleryItem.js';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadRoot = path.join(__dirname, '..', '..', (process.env.UPLOAD_DIR || 'uploads'));
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, uploadRoot),
	filename: (_req, file, cb) => {
		const unique = Date.now() + '_' + Math.round(Math.random() * 1e9);
		cb(null, unique + path.extname(file.originalname));
	},
});

const upload = multer({ storage });

router.get('/', async (_req, res) => {
	const list = await GalleryItem.find().sort({ createdAt: -1 });
	res.json(list);
});

router.post('/', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
	const file = req.file;
	const { caption, type, category } = req.body;
	if (!file) return res.status(400).json({ error: 'File is required' });
	const doc = await GalleryItem.create({
		caption,
		type,
		category,
		url: `/uploads/${file.filename}`,
		fileName: file.originalname,
		fileSize: file.size,
	});
	res.status(201).json(doc);
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
	const { caption, type, category } = req.body;
	const doc = await GalleryItem.findByIdAndUpdate(
		req.params.id,
		{ caption, type, category },
		{ new: true }
	);
	res.json(doc);
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
	const doc = await GalleryItem.findByIdAndDelete(req.params.id);
	res.json({ ok: true, id: doc?._id });
});

export default router;
