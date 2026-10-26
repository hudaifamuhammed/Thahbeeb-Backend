import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import GalleryItem from '../models/GalleryItem.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

dotenv.config({ path: process.cwd() + '/.env.cloudinary' });

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage for direct Cloudinary upload
const memoryStorage = multer.memoryStorage();
const cloudUpload = multer({ storage: memoryStorage });

const router = Router();

// Upload media to Cloudinary
router.post('/upload', requireAuth, requireAdmin, cloudUpload.single('media'), async (req, res) => {
	if (!req.file) return res.status(400).json({ error: 'Media file is required' });
	try {
		const resourceType = req.body.type === 'video' ? 'video' : 'image';
		const stream = cloudinary.uploader.upload_stream({ resource_type: resourceType }, async (error, result) => {
			if (error || !result) return res.status(500).json({ error: 'Cloudinary upload failed' });
			// Save to DB
			const year = req.body.year ? Number(req.body.year) : new Date().getFullYear();
			const item = await GalleryItem.create({
				url: result.secure_url,
				type: req.body.type,
				category: req.body.category,
				caption: req.body.caption,
				year
			});
			res.json(item);
		});
		stream.end(req.file.buffer);
	} catch (error) {
		console.error('Error uploading media:', error);
		res.status(500).json({ error: 'Failed to upload media' });
	}
});

// Return gallery items with optional year filtering
router.get('/', async (req, res) => {
	try {
		const filter = {};
		if (req.query.year) {
			filter.year = Number(req.query.year);
		}
		const items = await GalleryItem.find(filter).sort({ createdAt: -1 });
		res.json(items);
	} catch (error) {
		res.status(500).json({ error: 'Failed to fetch gallery items' });
	}
});

// Edit gallery item
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
	try {
		const payload = { ...req.body };
		if (payload.year) payload.year = Number(payload.year);
		const item = await GalleryItem.findByIdAndUpdate(req.params.id, payload, { new: true });
		res.json(item);
	} catch (error) {
		res.status(500).json({ error: 'Failed to update gallery item' });
	}
});

// Delete gallery item
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
	try {
		await GalleryItem.findByIdAndDelete(req.params.id);
		res.json({ ok: true });
	} catch (error) {
		res.status(500).json({ error: 'Failed to delete gallery item' });
	}
});

export default router;
