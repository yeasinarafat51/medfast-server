const { client } = require("../config/db");
const { ObjectId } = require("mongodb");

// MongoDB medpharmDB কালেকশন হেল্পার ফাংশন
const getHeadlineCollection = () => {
  return client.db("medpharmDB").collection("headlines");
};

// =====================================================
// 1. ADD HEADLINE (নতুন শিরোনাম যোগ)
// =====================================================
const addHeadline = async (req, res) => {
  try {
    const headlineCollection = getHeadlineCollection();
    const { text, tag, tagColor, link, linkLabel, isActive, isUrgent, order } =
      req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Headline text is required",
      });
    }

    const headline = {
      text: text.trim(),
      tag: tag?.trim() || "নোটিশ",
      tagColor: tagColor?.trim() || "rose",
      link: link?.trim() || "",
      linkLabel: linkLabel?.trim() || "",
      isActive: isActive !== false,
      isUrgent: Boolean(isUrgent),
      order: Number(order) || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await headlineCollection.insertOne(headline);

    return res.status(201).json({
      success: true,
      message: "Headline added successfully",
      insertedId: result.insertedId,
      headline,
    });
  } catch (error) {
    console.error("Add Headline Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to add headline",
    });
  }
};

// =====================================================
// 2. GET ALL HEADLINES (এডমিন ড্যাশবোর্ডের জন্য সব)
// =====================================================
const getHeadlines = async (req, res) => {
  try {
    const headlineCollection = getHeadlineCollection();
    const headlines = await headlineCollection
      .find({})
      .sort({
        isUrgent: -1,
        order: 1,
        createdAt: -1,
      })
      .toArray();

    return res.status(200).json({
      success: true,
      headlines,
    });
  } catch (error) {
    console.error("Get Headlines Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get headlines",
    });
  }
};

// =====================================================
// 3. GET ACTIVE HEADLINES (ওয়েবসাইট ফ্রন্টএন্ডের জন্য)
// =====================================================
const getActiveHeadlines = async (req, res) => {
  try {
    const headlineCollection = getHeadlineCollection();
    const headlines = await headlineCollection
      .find({
        isActive: true,
      })
      .sort({
        isUrgent: -1,
        order: 1,
        createdAt: -1,
      })
      .toArray();

    return res.status(200).json({
      success: true,
      headlines,
    });
  } catch (error) {
    console.error("Get Active Headlines Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get active headlines",
    });
  }
};

// =====================================================
// 4. GET SINGLE HEADLINE
// =====================================================
const getSingleHeadline = async (req, res) => {
  try {
    const headlineCollection = getHeadlineCollection();
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid headline ID",
      });
    }

    const headline = await headlineCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!headline) {
      return res.status(404).json({
        success: false,
        message: "Headline not found",
      });
    }

    return res.status(200).json({
      success: true,
      headline,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// 5. UPDATE HEADLINE (শিরোনাম এডিট)
// =====================================================
const updateHeadline = async (req, res) => {
  try {
    const headlineCollection = getHeadlineCollection();
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid headline ID",
      });
    }

    const { text, tag, tagColor, link, linkLabel, isActive, isUrgent, order } =
      req.body;

    const updateData = {
      text: text?.trim(),
      tag: tag?.trim() || "নোটিশ",
      tagColor: tagColor?.trim() || "rose",
      link: link?.trim() || "",
      linkLabel: linkLabel?.trim() || "",
      isActive: Boolean(isActive),
      isUrgent: Boolean(isUrgent),
      order: Number(order) || 0,
      updatedAt: new Date(),
    };

    const result = await headlineCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Headline not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Headline updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// 6. TOGGLE ACTIVE (লাইভ বা বন্ধ করার সুইচ)
// =====================================================
const toggleHeadline = async (req, res) => {
  try {
    const headlineCollection = getHeadlineCollection();
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid headline ID",
      });
    }

    const headline = await headlineCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!headline) {
      return res.status(404).json({
        success: false,
        message: "Headline not found",
      });
    }

    const newStatus = !headline.isActive;
    await headlineCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isActive: newStatus, updatedAt: new Date() } },
    );

    return res.status(200).json({
      success: true,
      message: "Headline status updated successfully",
      isActive: newStatus,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// 7. DELETE HEADLINE (শিরোনাম ডিলিট)
// =====================================================
const deleteHeadline = async (req, res) => {
  try {
    const headlineCollection = getHeadlineCollection();
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid headline ID",
      });
    }

    const result = await headlineCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Headline not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Headline deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  addHeadline,
  getHeadlines,
  getActiveHeadlines,
  getSingleHeadline,
  updateHeadline,
  toggleHeadline,
  deleteHeadline,
};
