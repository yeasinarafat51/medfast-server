require("dotenv").config();
const app = require("../src/app");
const connectDB = require("../src/config/db");

module.exports = async (req, res) => {
  try {
    // প্রতি রিকোয়েস্টে কানেকশন রেডি আছে কিনা নিশ্চিত করা (ক্যাশ থাকায় দেরি হবে না)
    await connectDB();
    return app(req, res);
  } catch (err) {
    console.error("Serverless Entry Error:", err);
    return res.status(500).json({
      success: false,
      message: "Database connection failed: " + err.message,
    });
  }
};
