const { client } = require("../config/db");
const { ObjectId } = require("mongodb");

// নিরাপদ কালেকশন ফাংশন
const getCategoryCollection = () => {
  return client.db("medfast").collection("categories");
};

// ======================================
// 1. Add Category
// ======================================
const addCategory = async (req, res) => {
  try {
    const categoryCollection = getCategoryCollection();
    const category = { ...req.body };

    if (!category.categoryName || !category.categoryName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const trimmedName = category.categoryName.trim();

    // কেস-ইনসেনসিটিভ চেক (যেমন: "Syrup" এবং "syrup" একই মনে করবে)
    const exist = await categoryCollection.findOne({
      categoryName: { $regex: `^${trimmedName}$`, $options: "i" },
    });

    if (exist) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    category.categoryName = trimmedName;
    category.createdAt = new Date();

    const result = await categoryCollection.insertOne(category);

    return res.status(201).json({
      success: true,
      message: "Category added successfully",
      insertedId: result.insertedId,
      result,
    });
  } catch (error) {
    console.error("Add Category Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// 2. Get All Categories
// ======================================
const getCategories = async (req, res) => {
  try {
    const categoryCollection = getCategoryCollection();

    const categories = await categoryCollection
      .find()
      .sort({ categoryName: 1 })
      .toArray();

    return res.status(200).json(categories);
  } catch (error) {
    console.error("Get Categories Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// 3. Get Single Category
// ======================================
const getSingleCategory = async (req, res) => {
  try {
    const categoryCollection = getCategoryCollection();
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Category ID format",
      });
    }

    const category = await categoryCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json(category);
  } catch (error) {
    console.error("Get Single Category Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// 4. Update Category
// ======================================
const updateCategory = async (req, res) => {
  try {
    const categoryCollection = getCategoryCollection();
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Category ID format",
      });
    }

    const data = { ...req.body };
    delete data._id; // MongoDB _id কখনো আপডেট করা যাবে না

    if (data.categoryName) {
      data.categoryName = data.categoryName.trim();
    }

    const result = await categoryCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: data },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      result,
    });
  } catch (error) {
    console.error("Update Category Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// 5. Delete Category
// ======================================
const deleteCategory = async (req, res) => {
  try {
    const categoryCollection = getCategoryCollection();
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Category ID format",
      });
    }

    const result = await categoryCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found to delete",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      result,
    });
  } catch (error) {
    console.error("Delete Category Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  addCategory,
  getCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory,
};
