import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
	name: { type: String, required: true },
	captainName: String,
	captainEmail: String,
	captainPhone: String,
	description: String,
	membersFileUrl: String,
	participants: [{
		name: { type: String, required: true },
		category: { type: String, enum: ['Sub-Junior', 'Junior', 'Senior'], required: true },
		chestNumber: { type: String },
	}]
}, { timestamps: true });

export default mongoose.model('Team', teamSchema);
