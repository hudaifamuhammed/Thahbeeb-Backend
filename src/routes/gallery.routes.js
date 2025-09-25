import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config({ path: process.cwd() + '/.env.cloudinary' });

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});
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
// Multer memory storage for direct upload to Cloudinary
const memoryStorage = multer.memoryStorage();
const cloudUpload = multer({ storage: memoryStorage });

router.get('/', async (_req, res) => {
	const list = await GalleryItem.find().sort({ createdAt: -1 });
	res.json(list);
});

router.post('/', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
	router.post('/', requireAuth, requireAdmin, cloudUpload.single('file'), async (req, res) => {
		const file = req.file;
		const { caption, type, category } = req.body;
		if (!file) return res.status(400).json({ error: 'File is required' });
		try {
			// Upload to Cloudinary
			const result = await cloudinary.uploader.upload_stream({ resource_type: 'auto' }, async (error, result) => {
				if (error || !result) return res.status(500).json({ error: 'Cloudinary upload failed' });
				const doc = await GalleryItem.create({
					caption,
					type,
					category,
					url: result.secure_url,
					fileName: file.originalname,
					fileSize: file.size,
				});
				res.status(201).json(doc);
			});
			result.end(file.buffer);
		} catch (err) {
			res.status(500).json({ error: 'Upload error' });
		}
	});
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
