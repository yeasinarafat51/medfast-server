const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const invoiceRoutes = require("./routes/invoice.routes");
const testRoutes = require("./routes/test.routes");
const userRoutes = require("./routes/user.routes");
const medicineRoutes = require("./routes/medicine.routes");
const categoryRoutes = require("./routes/category.routes");
const orderRoutes = require("./routes/order.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const sliderRoutes = require("./routes/slider.routes");
const specialOfferRoutes = require("./routes/specialOfferRoutes");
const profitRoutes = require("./routes/profit.routes");

const app = express();

// =========================
// CORS (নিরাপদ ও ডায়নামিক)
// =========================
const allowedOrigins = [
  "https://novacarebd.com",
  "https://www.novacarebd.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // মোবাইল অ্যাপ বা Postman থেকে কল আসলে origin থাকে না
      if (!origin) return callback(null, true);

      // নির্দিষ্ট ডোমেইন অথবা যেকোনো vercel.app ডোমেইন এলাও করা
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        origin.includes("run.app")
      ) {
        return callback(null, true);
      }

      // অন্যান্য ক্ষেত্রেও যাতে ব্লক হয়ে হ্যাং না থাকে
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  }),
);

// =========================
// Middleware
// =========================
app.use(express.json());
app.use(cookieParser());

// =========================
// Health Check (Root)
// =========================
app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "MedPharm API Running smoothly on Vercel...",
    timestamp: new Date().toISOString(),
  });
});

// =========================
// Routes
// =========================
app.use("/api/users", userRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/test", testRoutes);
app.use("/api/sliders", sliderRoutes);
app.use("/api/special-offers", specialOfferRoutes);
app.use("/api/profit", profitRoutes);

// =========================
// 404 Route Handler
// =========================
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// =========================
// Error Handler
// =========================
app.use((err, req, res, next) => {
  console.error("❌ Express Global Error:", err);
  return res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

module.exports = app;
