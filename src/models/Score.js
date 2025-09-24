import mongoose from 'mongoose';

const scoreSchema = new mongoose.Schema({
	teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
	itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
	category: { type: String, enum: ['Sub-Junior', 'Junior', 'Senior', 'Group'], default: 'Junior' },
	isGroupEvent: { type: Boolean, default: false },
	positions: [{
		teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
		participantName: String,
		position: { type: Number, required: true },
		points: { type: Number, default: 0 }
	}],
	totalPoints: { type: Number, default: 0 },
	remarks: String,
}, { timestamps: true });

export default mongoose.model('Score', scoreSchema);
