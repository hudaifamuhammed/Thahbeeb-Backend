import mongoose from 'mongoose';

const newsSchema = new mongoose.Schema({
	title: { type: String, required: true },
	content: { type: String, required: true },
	category: { type: String, default: 'general' },
	priority: { type: String, enum: ['low', 'normal', 'medium', 'high'], default: 'normal' },
	imageUrl: { type: String },
	publishedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('News', newsSchema);
