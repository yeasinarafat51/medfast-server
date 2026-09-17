const express = require("express");
const router = express.Router();

const {
  createOrder,
  getOrders,
  getMyOrders,
  updateOrderStatus,
  getInvoiceByNumber,
  getOrderById,
  getSingleOrder,
  returnOrderItem, // <--- নতুন যুক্ত করা হয়েছে
} = require("../controllers/order.controller");

// Customer Order
router.post("/", createOrder);

// Admin All Orders
router.get("/", getOrders);

// Invoice Details
router.get("/invoice/:invoiceNo", getInvoiceByNumber);

// Customer My Orders
router.get("/my-orders/:email", getMyOrders);

// Return / Refund Item from Order & Restock
router.put("/:id/return-item", returnOrderItem); // <--- নতুন রিটার্ন এন্ডপয়েন্ট

// Single Order
router.get("/:id", getSingleOrder);

// Update Status
router.patch("/:id", updateOrderStatus);

module.exports = router;
