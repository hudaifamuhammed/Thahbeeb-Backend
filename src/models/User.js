import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
	email: { type: String, required: true, unique: true, lowercase: true, trim: true },
	passwordHash: { type: String, required: true },
	name: { type: String },
	role: { type: String, enum: ['admin', 'user'], default: 'admin' },
}, { timestamps: true });

userSchema.methods.comparePassword = function(password) {
	return bcrypt.compare(password, this.passwordHash);
};

userSchema.statics.hashPassword = async function(password) {
	const salt = await bcrypt.genSalt(10);
	return bcrypt.hash(password, salt);
};

export default mongoose.model('User', userSchema);
