import 'dotenv/config';
import mongoose from 'mongoose';
import Team from '../models/Team.js';
import Score from '../models/Score.js';
import Item from '../models/Item.js';

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB for migration');

  // Tag all existing teams without a year as 2025
  const teamRes = await Team.updateMany({ year: { $exists: false } }, { $set: { year: 2025 } });
  console.log(`Updated teams without year: ${teamRes.modifiedCount}`);

  // Tag all existing scores without a year as 2025
  const scoreRes = await Score.updateMany({ year: { $exists: false } }, { $set: { year: 2025 } });
  console.log(`Updated scores without year: ${scoreRes.modifiedCount}`);

  // Tag all existing items without a year as 2025
  const itemRes = await Item.updateMany({ year: { $exists: false } }, { $set: { year: 2025 } });
  console.log(`Updated items without year: ${itemRes.modifiedCount}`);

  // News items
  const db = mongoose.connection.db;
  const newsDocs = await db.collection('news').find().toArray();
  for (const n of newsDocs) {
    let year = 2026;
    if (n.title?.includes('2025') || (n.createdAt && new Date(n.createdAt).getFullYear() === 2025)) {
      year = 2025;
    }
    if (n.title?.includes('2026')) {
      year = 2026;
    }
    await db.collection('news').updateOne({ _id: n._id }, { $set: { year } });
    console.log(`News: "${n.title}" -> ${year}`);
  }

  // Gallery items
  const galleryDocs = await db.collection('galleryitems').find().toArray();
  for (const g of galleryDocs) {
    let year = 2026;
    if (g.caption?.includes('2025') || (g.createdAt && new Date(g.createdAt).getFullYear() === 2025)) {
      year = 2025;
    }
    if (g.caption?.includes('2026')) {
      year = 2026;
    }
    await db.collection('galleryitems').updateOne({ _id: g._id }, { $set: { year } });
    console.log(`Gallery: "${g.caption}" -> ${year}`);
  }

  console.log('Migration completed successfully!');
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
