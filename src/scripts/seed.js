import 'dotenv/config';
import { connectDB } from '../lib/db.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
import Item from '../models/Item.js';
import News from '../models/News.js';

async function run() {
	try {
		await connectDB();

		// 1) Admin user
		const adminEmail = process.env.SEED_ADMIN_EMAIL || 'thahbeeb@nsu.com';
		const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Artsfest@2025';
		let admin = await User.findOne({ email: adminEmail });
		if (!admin) {
			const passwordHash = await User.hashPassword(adminPassword);
			admin = await User.create({ email: adminEmail, passwordHash, name: 'Admin', role: 'admin' });
			console.log(`Created admin: ${adminEmail}`);
		} else {
			console.log(`Admin already exists: ${adminEmail}`);
		}

		// 2) Minimal sample data if empty
		const teamsCount = await Team.countDocuments();
		if (teamsCount === 0) {
			await Team.insertMany([
				{ name: 'Team Aurora', captainName: 'Alice', captainEmail: 'alice@example.com', captainPhone: '111-111-1111' },
				{ name: 'Team Blaze', captainName: 'Bob', captainEmail: 'bob@example.com', captainPhone: '222-222-2222' }
			]);
			console.log('Inserted sample teams');
		}

		const itemsCount = await Item.countDocuments();
		if (itemsCount === 0) {
			await Item.insertMany([
				{ name: 'Solo Singing', category: 'music', type: 'solo', venue: 'Auditorium', date: new Date(), time: '10:00' },
				{ name: 'Group Dance', category: 'dance', type: 'group', venue: 'Open Stage', date: new Date(), time: '14:00' }
			]);
			console.log('Inserted sample items');
		}

		const newsCount = await News.countDocuments();
		if (newsCount === 0) {
			await News.create({ title: 'Welcome to Arts Fest!', content: 'Get ready for an amazing celebration of art and talent.', priority: 'high' });
			console.log('Inserted sample news');
		}

		console.log('Seed completed.');
	} catch (e) {
		console.error('Seed failed:', e);
	} finally {
		process.exit(0);
	}
}

run();
