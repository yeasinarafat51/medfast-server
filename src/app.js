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

// =======================================================
// 1. BULLETPROOF CORS HEADERS (Vercel Serverless Optimized)
// =======================================================
const allowedOrigins = [
  "https://novacarebd.com",
  "https://www.novacarebd.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin) || !origin) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  } else if (origin.endsWith(".vercel.app") || origin.includes("run.app")) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "https://novacarebd.com");
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie",
  );

  // ব্রাউজারের প্রি-ফ্লাইট OPTIONS রিকোয়েস্টে সাথে সাথে 200 OK রিটার্ন করা
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});

// লাইব্রেরি CORS ও ব্যাকআপ হিসেবে চালু রাখা
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  }),
);

// =======================================================
// 2. BODY PARSERS
// =======================================================
app.use(express.json());
app.use(cookieParser());

// =======================================================
// 3. ROOT HEALTH CHECK
// =======================================================
app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "MedPharm API Running smoothly on Vercel...",
    timestamp: new Date().toISOString(),
  });
});

// =======================================================
// 4. API ROUTES
// =======================================================
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

// =======================================================
// 5. 404 HANDLER
// =======================================================
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// =======================================================
// 6. GLOBAL ERROR HANDLER
// =======================================================
app.use((err, req, res, next) => {
  console.error("❌ Express Global Error:", err);
  return res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

module.exports = app;
