const { client } = require("../config/db");

// নিরাপদ কালেকশন হেল্পার ফাংশন
const getCollections = () => {
  const db = client.db("medpharmDB");
  return {
    orderCollection: db.collection("orders"),
    medicineCollection: db.collection("medicines"),
  };
};

const getProfitReport = async (req, res) => {
  try {
    const { orderCollection, medicineCollection } = getCollections();
    const { from, to, search } = req.query;

    // ১. বাতিল বা রিফান্ড হওয়া অর্ডার বাদ দেওয়া (কেস-ইনসেনসিটিভ)
    const query = {
      orderStatus: { $nin: ["Cancelled", "cancelled", "Refunded", "refunded"] },
    };

    // ২. নির্ভরযোগ্য ডেট ফিল্টারিং (Date অবজেক্ট ও স্ট্রিং উভয় ফরম্যাট হ্যান্ডেল করে)
    if (from || to) {
      const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : null;
      const toDate = to ? new Date(`${to}T23:59:59.999Z`) : null;

      const dateConditions = [];

      // Date অবজেক্ট হিসেবে থাকলে
      const objCondition = {};
      if (fromDate) objCondition.$gte = fromDate;
      if (toDate) objCondition.$lte = toDate;
      dateConditions.push({ orderDate: objCondition });

      // স্ট্রিং ফরম্যাটে সেভ থাকলে
      const strCondition = {};
      if (from) strCondition.$gte = `${from}T00:00:00`;
      if (to) strCondition.$lte = `${to}T23:59:59`;
      dateConditions.push({ orderDate: strCondition });

      query.$or = dateConditions;
    }

    // ৩. সমান্তরালে দ্রুত ফেচ করা (Projection সহ)
    const [orders, medicines] = await Promise.all([
      orderCollection.find(query).sort({ orderDate: -1 }).limit(2000).toArray(),
      medicineCollection
        .find(
          {},
          {
            projection: {
              _id: 1,
              medicineName: 1,
              company: 1,
              purchasePrice: 1,
              sellingPrice: 1,
            },
          },
        )
        .toArray(),
    ]);

    // ওষুধের কেনা দামের দ্রুত লুকআপের জন্য Map
    const medicineMap = new Map();
    medicines.forEach((medicine) => {
      medicineMap.set(String(medicine._id), {
        purchasePrice: Number(medicine.purchasePrice || 0),
        medicineName: medicine.medicineName || "",
        company: medicine.company || "",
        sellingPrice: Number(medicine.sellingPrice || 0),
      });
    });

    let totalPurchaseAmount = 0;
    let totalSalesAmount = 0;
    let totalProfit = 0;
    let totalQuantity = 0;

    const medicineReports = new Map();

    // ৪. প্রতিটি অর্ডারের আইটেম বিশ্লেষণ
    for (const order of orders) {
      const items = order.items || order.medicines || [];
      if (!Array.isArray(items)) {
        continue;
      }

      for (const item of items) {
        const medicineId = String(item.medicineId || item._id || "");
        const fallbackInfo = medicineMap.get(medicineId) || {};

        const medicineName =
          item.medicineName ||
          item.name ||
          fallbackInfo.medicineName ||
          "Unknown Medicine";
        const company = item.company || fallbackInfo.company || "N/A";
        const quantity = Number(item.quantity || 0);

        if (quantity <= 0) {
          continue;
        }

        // ক্রয়মূল্য নির্ণয় (অর্ডারে না থাকলে মেডিসিন কালেকশন থেকে নেওয়া)
        let purchasePrice = Number(item.purchasePrice);
        if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) {
          purchasePrice = fallbackInfo.purchasePrice || 0;
        }

        // বিক্রয়মূল্য নির্ণয়
        let sellingPrice = Number(
          item.unitPrice || item.sellingPrice || fallbackInfo.sellingPrice || 0,
        );

        const purchaseAmount = purchasePrice * quantity;
        const salesAmount = Number(
          item.totalPrice || item.total || sellingPrice * quantity,
        );
        const profit = salesAmount - purchaseAmount;

        // সার্বিক যোগফল
        totalPurchaseAmount += purchaseAmount;
        totalSalesAmount += salesAmount;
        totalProfit += profit;
        totalQuantity += quantity;

        // প্রতিটি মেডিসিনের আলাদা রিপোর্ট
        if (!medicineReports.has(medicineId)) {
          medicineReports.set(medicineId, {
            medicineId,
            medicineName,
            company,
            purchasePrice,
            sellingPrice,
            soldQuantity: 0,
            purchaseAmount: 0,
            salesAmount: 0,
            profit: 0,
          });
        }

        const report = medicineReports.get(medicineId);
        report.soldQuantity += quantity;
        report.purchaseAmount += purchaseAmount;
        report.salesAmount += salesAmount;
        report.profit += profit;
      }
    }

    let reports = Array.from(medicineReports.values());

    // ৫. সার্চ ফিল্টার (মেডিসিন বা কোম্পানির নাম)
    if (search) {
      const searchText = search.trim().toLowerCase();
      reports = reports.filter((item) => {
        return (
          item.medicineName.toLowerCase().includes(searchText) ||
          item.company.toLowerCase().includes(searchText)
        );
      });
    }

    // সর্বোচ্চ লাভজনক মেডিসিনগুলো আগে দেখাবে
    reports.sort((a, b) => b.profit - a.profit);

    return res.status(200).json({
      success: true,
      summary: {
        totalPurchaseAmount: Number(totalPurchaseAmount.toFixed(2)),
        totalSalesAmount: Number(totalSalesAmount.toFixed(2)),
        totalProfit: Number(totalProfit.toFixed(2)),
        totalQuantity,
        totalMedicines: reports.length,
      },
      reports,
    });
  } catch (error) {
    console.error("Profit Report Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load profit report.",
    });
  }
};

module.exports = {
  getProfitReport,
};
