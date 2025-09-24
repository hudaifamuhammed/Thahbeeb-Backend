import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
	name: { type: String, required: true },
	category: { type: String, required: true },
	type: { type: String, enum: ['solo', 'group'], default: 'solo' },
	stage: String,
	stageType: { type: String, enum: ['Stage', 'Off-stage'], default: 'Stage' },
	date: Date,
	time: { type: String, default: '' },
	description: String,
	rules: String,
	prizes: String,
}, { timestamps: true });

export default mongoose.model('Item', itemSchema);
