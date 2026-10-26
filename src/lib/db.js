import mongoose from "mongoose";

export async function connectDB() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("❌ MONGO_URI is not set in environment variables");
    }

    // Recommended settings
    mongoose.set("strictQuery", true);

    await mongoose.connect(uri);

    const isLocal = uri.includes("localhost") || uri.includes("127.0.0.1");
    console.log(`✅ MongoDB connected to [${isLocal ? 'LOCAL DATABASE (127.0.0.1)' : 'LIVE CLOUD (MongoDB Atlas)'}]`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1); // stop the server if DB connection fails
  }
}
