import mongoose from 'mongoose';

const galleryItemSchema = new mongoose.Schema({
	caption: { type: String, required: true },
	type: { type: String, enum: ['image', 'video'], default: 'image' },
	category: { type: String, default: 'general' },
	url: { type: String, required: true },
	fileName: String,
	fileSize: Number,
}, { timestamps: true });

export default mongoose.model('GalleryItem', galleryItemSchema);
