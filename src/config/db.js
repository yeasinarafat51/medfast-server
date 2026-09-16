const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("❌ MONGODB_URI is not defined in environment variables!");
}

let cachedClient = global._mongoClient;
let cachedPromise = global._mongoConnectionPromise;

if (!cachedClient) {
  cachedClient = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    maxPoolSize: 10,
    minPoolSize: 0,
    connectTimeoutMS: 15000, // পর্যাপ্ত সময় দেওয়া হয়েছে
    serverSelectionTimeoutMS: 15000, // কোল্ড স্টার্টে হ্যান্ডশেক ফেইল হবে না
    maxIdleTimeMS: 30000,
  });
  global._mongoClient = cachedClient;
}

async function connectDB() {
  if (cachedPromise) {
    return cachedPromise;
  }

  cachedPromise = cachedClient
    .connect()
    .then((client) => {
      console.log("✅ MongoDB Connected (Vercel Cached)");
      return client;
    })
    .catch((error) => {
      cachedPromise = null;
      global._mongoConnectionPromise = null;
      console.error("❌ MongoDB Connection Error:", error.message);
      throw error;
    });

  global._mongoConnectionPromise = cachedPromise;
  return cachedPromise;
}

function getCollection(collectionName) {
  return cachedClient.db("medpharmDB").collection(collectionName);
}

module.exports = connectDB;
module.exports.client = cachedClient;
module.exports.getCollection = getCollection;
