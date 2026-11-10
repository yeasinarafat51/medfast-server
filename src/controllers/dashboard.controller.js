const { client } = require("../config/db");

// নিরাপদ কালেকশন ফাংশন
const getCollections = () => {
  const db = client.db("medfast");
  return {
    medicineCollection: db.collection("medicines"),
    orderCollection: db.collection("orders"),
    userCollection: db.collection("users"),
  };
};

const getOrderRevenue = (order) => {
  const grandTotal = Number(order.grandTotal || 0);
  return Number.isFinite(grandTotal) ? grandTotal : 0;
};

// ==========================================
// 1. ADMIN STATS
// ==========================================
const getAdminStats = async (req, res) => {
  try {
    const { medicineCollection, orderCollection, userCollection } =
      getCollections();

    // দ্রুত রেসপন্সের জন্য Promise.all ব্যবহার করা হয়েছে
    const [
      totalMedicine,
      totalOrders,
      totalCustomers,
      lowStock,
      revenueResult,
    ] = await Promise.all([
      medicineCollection.countDocuments(),
      orderCollection.countDocuments(),
      userCollection.countDocuments({ role: "customer" }),
      medicineCollection.countDocuments({ stock: { $lt: 10 } }),
      // মেমরিতে সব অর্ডার না এনে MongoDB Engine-এই সরাসরি টোটাল রেভিনিউ হিসাব করা
      orderCollection
        .aggregate([
          { $match: { orderStatus: { $ne: "Cancelled" } } },
          { $group: { _id: null, total: { $sum: "$grandTotal" } } },
        ])
        .toArray(),
    ]);

    const totalRevenue =
      revenueResult.length > 0 ? Number(revenueResult[0].total || 0) : 0;

    return res.status(200).json({
      success: true,
      totalMedicine,
      totalOrders,
      totalCustomers,
      totalRevenue,
      lowStock,
    });
  } catch (error) {
    console.error("Admin Stats Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load admin dashboard statistics.",
    });
  }
};

// ==========================================
// 2. SALES REPORT
// ==========================================
const getSalesReport = async (req, res) => {
  try {
    const { orderCollection } = getCollections();

    // সাম্প্রতিক ৫০০টি ভ্যালিড অর্ডার নিয়ে দ্রুত রিপোর্ট তৈরি
    const orders = await orderCollection
      .find({
        orderStatus: { $ne: "Cancelled" },
      })
      .sort({
        orderDate: -1,
      })
      .limit(500)
      .toArray();

    let totalRevenue = 0;
    let todayRevenue = 0;
    let monthRevenue = 0;

    const now = new Date();
    const currentDate = now.toDateString();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    orders.forEach((order) => {
      const price = getOrderRevenue(order);
      totalRevenue += price;

      if (!order.orderDate) return;

      const orderDate = new Date(order.orderDate);
      if (Number.isNaN(orderDate.getTime())) return;

      if (orderDate.toDateString() === currentDate) {
        todayRevenue += price;
      }

      if (
        orderDate.getMonth() === currentMonth &&
        orderDate.getFullYear() === currentYear
      ) {
        monthRevenue += price;
      }
    });

    return res.status(200).json({
      success: true,
      totalRevenue,
      todayRevenue,
      monthRevenue,
      totalOrders: orders.length,
    });
  } catch (error) {
    console.error("Sales Report Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load sales report.",
    });
  }
};

// ==========================================
// 3. RECENT ORDERS
// ==========================================
const getRecentOrders = async (req, res) => {
  try {
    const { orderCollection } = getCollections();

    const orders = await orderCollection
      .find({})
      .sort({
        orderDate: -1,
      })
      .limit(10)
      .toArray();

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Recent Orders Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load recent orders.",
    });
  }
};

module.exports = {
  getAdminStats,
  getSalesReport,
  getRecentOrders,
};
