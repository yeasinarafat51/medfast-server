const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined in environment variables");
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
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000,
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
      console.log("✅ MongoDB Connected (Vercel Serverless Cached)");
      return client;
    })
    .catch((error) => {
      cachedPromise = null;
      global._mongoConnectionPromise = null;
      console.error("❌ MongoDB Error:", error.message);
      throw error;
    });

  global._mongoConnectionPromise = cachedPromise;
  return cachedPromise;
}

// কালেকশন পাওয়ার নিরাপদ হেল্পার ফাংশন
function getCollection(collectionName) {
  return cachedClient.db("medpharmDB").collection(collectionName);
}

module.exports = connectDB;
module.exports.client = cachedClient;
module.exports.getCollection = getCollection;
