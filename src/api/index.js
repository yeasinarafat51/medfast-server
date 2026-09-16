require("dotenv").config();
const app = require("../src/app");
const connectDB = require("../src/config/db");

// ⚡ Vercel Serverless Middleware: প্রতিটি রিকোয়েস্টের আগে কানেকশন নিশ্চিত করা
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("Vercel DB Connect Error:", err.message);
    return res.status(503).json({
      success: false,
      message: "Database connection failed",
      error: err.message,
    });
  }
});

// Vercel Serverless-এর আসল এক্সপোর্ট নিয়ম (কোনো async র্যাপার লাগবে না)
module.exports = app;
