import mongoose from "mongoose";

export async function connectDB() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("❌ MONGO_URI is not set in environment variables");
    }

    // Recommended settings
    mongoose.set("strictQuery", true);

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: true, // keep your option
    });

    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1); // stop the server if DB connection fails
  }
}
