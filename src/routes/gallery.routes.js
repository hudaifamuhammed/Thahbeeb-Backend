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
			const item = await GalleryItem.create({
				url: result.secure_url,
				type: req.body.type,
				category: req.body.category,
				caption: req.body.caption,
			});
			res.json(item);
		});
		stream.end(req.file.buffer);
	} catch (error) {
		console.error('Error uploading media:', error);
		res.status(500).json({ error: 'Failed to upload media' });
	}
});

// Add this route to return all gallery items
router.get('/', async (_req, res) => {
	try {
		const items = await GalleryItem.find().sort({ createdAt: -1 });
		res.json(items);
	} catch (error) {
		res.status(500).json({ error: 'Failed to fetch gallery items' });
	}
});

export default router;
