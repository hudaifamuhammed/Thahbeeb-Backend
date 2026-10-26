import 'dotenv/config';
import mongoose from 'mongoose';

const LIVE_URI = 'mongodb+srv://hudaifamuhammed121_db_user:TrG0uVlAyIYfkFZI@thahbeebdb.fxe63k6.mongodb.net/';
const LOCAL_URI = 'mongodb://127.0.0.1:27017/arts_fest';

async function clone() {
  console.log('Connecting to Live MongoDB Atlas...');
  const liveConn = await mongoose.createConnection(LIVE_URI).asPromise();
  console.log('Connected to Live Atlas!');

  console.log('Connecting to Local MongoDB...');
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  console.log('Connected to Local MongoDB!');

  const collections = ['teams', 'scores', 'items', 'news', 'galleryitems', 'users'];

  for (const collName of collections) {
    try {
      const liveDocs = await liveConn.db.collection(collName).find().toArray();
      console.log(`Found ${liveDocs.length} documents in live "${collName}"`);
      
      if (liveDocs.length > 0) {
        // Drop local collection to ensure a clean replica
        await localConn.db.collection(collName).deleteMany({});
        await localConn.db.collection(collName).insertMany(liveDocs);
        console.log(` Cloned ${liveDocs.length} documents to local "${collName}"`);
      }
    } catch (err) {
      console.warn(`Warning copying ${collName}:`, err.message);
    }
  }

  await liveConn.close();
  await localConn.close();
  console.log('\n Clone completed! Your local MongoDB now has the exact data from live.');
}

clone().catch(err => {
  console.error('Clone failed:', err);
  process.exit(1);
});
