const { client } = require("../config/db");
const { ObjectId } = require("mongodb");

// নিরাপদভাবে কালেকশন পাওয়ার হেল্পার ফাংশন
const getMedicineCollection = () => {
  return client.db("medfast").collection("medicines");
};

// ==========================================
// 1. ADD MEDICINE
// ==========================================
const addMedicine = async (req, res) => {
  try {
    const medicineCollection = getMedicineCollection();
    const medicine = { ...req.body };

    // Convert to Number
    medicine.purchasePrice = Number(medicine.purchasePrice) || 0;
    medicine.profitPercent = Number(medicine.profitPercent) || 0;
    medicine.mrpePrice = Number(medicine.mrpePrice) || 0;
    medicine.bikriPercent = Number(medicine.bikriPercent) || 0;
    medicine.stock = Number(medicine.stock) || 0;
    medicine.boxQuantity = Number(medicine.boxQuantity) || 0;

    // Calculate Selling Price
    medicine.sellingPrice = Number(
      (
        medicine.mrpePrice -
        (medicine.mrpePrice * medicine.bikriPercent) / 100
      ).toFixed(2),
    );

    // Created Date
    medicine.createdAt = new Date();

    // Save Medicine
    const result = await medicineCollection.insertOne(medicine);

    return res.status(201).json({
      success: true,
      insertedId: result.insertedId,
      message: "Medicine Added Successfully",
    });
  } catch (error) {
    console.error("Add Medicine Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// 2. GET ALL MEDICINES (Search & Filter - ⚡ UNLIMITED)
// ==========================================
const getMedicines = async (req, res) => {
  try {
    const medicineCollection = getMedicineCollection();

    const search = (req.query.search || "").trim();
    const company = (req.query.company || "").trim();
    const sort = req.query.sort || "asc";

    // Base Query
    const query = {};

    // Search Filter (Case-insensitive)
    if (search) {
      query.$or = [
        { medicineName: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
        { genericName: { $regex: search, $options: "i" } },
      ];
    }

    // Company Filter
    if (company) {
      query.company = {
        $regex: `^${company}$`,
        $options: "i",
      };
    }

    // Sort Option
    const sortOption = {
      medicineName: sort === "asc" ? 1 : -1,
    };

    // ⚡ UNLIMITED: .limit(300) সম্পূর্ণ বাদ দেওয়া হলো
    // যদি রিকোয়েস্টে কোনো স্পেসিফিক limit চাওয়া হয় কেবল তখনই limit হবে, অন্যথায় ডাটাবেজের সব মেডিসিন আসবে!
    let cursor = medicineCollection.find(query).sort(sortOption);

    if (
      req.query.limit &&
      !isNaN(Number(req.query.limit)) &&
      Number(req.query.limit) > 0
    ) {
      cursor = cursor.limit(Number(req.query.limit));
    }

    const medicines = await cursor.toArray();

    return res.status(200).json({
      success: true,
      count: medicines.length,
      medicines,
    });
  } catch (error) {
    console.error("Get Medicines Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// 3. GET SINGLE MEDICINE BY ID
// ==========================================
const getSingleMedicine = async (req, res) => {
  try {
    const medicineCollection = getMedicineCollection();
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Medicine ID format",
      });
    }

    const medicine = await medicineCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    return res.status(200).json(medicine);
  } catch (error) {
    console.error("Get Single Medicine Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// 4. UPDATE MEDICINE
// ==========================================
const updateMedicine = async (req, res) => {
  try {
    const medicineCollection = getMedicineCollection();
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Medicine ID format",
      });
    }

    const medicine = { ...req.body };
    delete medicine._id; // _id কখনই মডিফাই করা যাবে না

    // Number Conversion
    const purchasePrice = Number(medicine.purchasePrice) || 0;
    const profitPercent = Number(medicine.profitPercent) || 0;
    const mrpePrice = Number(medicine.mrpePrice) || 0;
    const bikriPercent = Number(medicine.bikriPercent) || 0;
    const stock = Number(medicine.stock) || 0;
    const boxQuantity = Number(medicine.boxQuantity) || 0;

    // Selling Price Calculation
    const sellingPrice = mrpePrice - (mrpePrice * bikriPercent) / 100;

    medicine.purchasePrice = purchasePrice;
    medicine.profitPercent = profitPercent;
    medicine.mrpePrice = mrpePrice;
    medicine.bikriPercent = bikriPercent;
    medicine.stock = stock;
    medicine.boxQuantity = boxQuantity;
    medicine.sellingPrice = Number(sellingPrice.toFixed(2));
    medicine.updatedAt = new Date();

    const result = await medicineCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: medicine },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Medicine updated successfully",
      sellingPrice: medicine.sellingPrice,
      result,
    });
  } catch (error) {
    console.error("Update Medicine Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// 5. DELETE MEDICINE
// ==========================================
const deleteMedicine = async (req, res) => {
  try {
    const medicineCollection = getMedicineCollection();
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Medicine ID format",
      });
    }

    const result = await medicineCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found to delete",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Medicine deleted successfully",
      result,
    });
  } catch (error) {
    console.error("Delete Medicine Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  addMedicine,
  getMedicines,
  getSingleMedicine,
  updateMedicine,
  deleteMedicine,
};
