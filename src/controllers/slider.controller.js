const { client } = require("../config/db");
const { ObjectId } = require("mongodb");

// নিরাপদ কালেকশন হেল্পার ফাংশন
const getSliderCollection = () => {
  return client.db("medpharmDB").collection("sliders");
};

// =====================================================
// 1. ADD SLIDER
// =====================================================
const addSlider = async (req, res) => {
  try {
    const sliderCollection = getSliderCollection();
    const {
      title,
      description,
      image,
      buttonText,
      buttonLink,
      isActive,
      order,
    } = req.body;

    const slider = {
      title: title?.trim() || "",
      description: description?.trim() || "",
      image: image?.trim() || "",
      buttonText: buttonText?.trim() || "Shop Now",
      buttonLink: buttonLink?.trim() || "/all-medicines",
      isActive: isActive !== false,
      order: Number(order) || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await sliderCollection.insertOne(slider);

    return res.status(201).json({
      success: true,
      message: "Slider added successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Add Slider Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// 2. GET ALL SLIDERS
// =====================================================
const getSliders = async (req, res) => {
  try {
    const sliderCollection = getSliderCollection();
    const sliders = await sliderCollection
      .find({})
      .sort({
        order: 1,
        createdAt: -1,
      })
      .toArray();

    return res.status(200).json({
      success: true,
      sliders,
    });
  } catch (error) {
    console.error("Get Sliders Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// 3. GET ACTIVE SLIDERS
// =====================================================
const getActiveSliders = async (req, res) => {
  try {
    const sliderCollection = getSliderCollection();
    const sliders = await sliderCollection
      .find({
        isActive: true,
      })
      .sort({
        order: 1,
        createdAt: -1,
      })
      .toArray();

    return res.status(200).json({
      success: true,
      sliders,
    });
  } catch (error) {
    console.error("Get Active Sliders Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// 4. GET SINGLE SLIDER
// =====================================================
const getSingleSlider = async (req, res) => {
  try {
    const sliderCollection = getSliderCollection();
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid slider ID",
      });
    }

    const slider = await sliderCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!slider) {
      return res.status(404).json({
        success: false,
        message: "Slider not found",
      });
    }

    return res.status(200).json({
      success: true,
      slider,
    });
  } catch (error) {
    console.error("Get Single Slider Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// 5. UPDATE SLIDER
// =====================================================
const updateSlider = async (req, res) => {
  try {
    const sliderCollection = getSliderCollection();
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid slider ID",
      });
    }

    const {
      title,
      description,
      image,
      buttonText,
      buttonLink,
      isActive,
      order,
    } = req.body;

    const updateData = {
      title: title?.trim() || "",
      description: description?.trim() || "",
      image: image?.trim() || "",
      buttonText: buttonText?.trim() || "Shop Now",
      buttonLink: buttonLink?.trim() || "/all-medicines",
      isActive: Boolean(isActive),
      order: Number(order) || 0,
      updatedAt: new Date(),
    };

    const result = await sliderCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Slider not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Slider updated successfully",
    });
  } catch (error) {
    console.error("Update Slider Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// 6. TOGGLE ACTIVE / INACTIVE
// =====================================================
const toggleSlider = async (req, res) => {
  try {
    const sliderCollection = getSliderCollection();
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid slider ID",
      });
    }

    const slider = await sliderCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!slider) {
      return res.status(404).json({
        success: false,
        message: "Slider not found",
      });
    }

    const newStatus = !slider.isActive;

    const result = await sliderCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          isActive: newStatus,
          updatedAt: new Date(),
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: `Slider ${newStatus ? "activated" : "deactivated"} successfully`,
      isActive: newStatus,
      result,
    });
  } catch (error) {
    console.error("Toggle Slider Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// 7. DELETE SLIDER
// =====================================================
const deleteSlider = async (req, res) => {
  try {
    const sliderCollection = getSliderCollection();
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid slider ID",
      });
    }

    const result = await sliderCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Slider not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Slider deleted successfully",
    });
  } catch (error) {
    console.error("Delete Slider Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// EXPORT
// =====================================================
module.exports = {
  addSlider,
  getSliders,
  getActiveSliders,
  getSingleSlider,
  updateSlider,
  toggleSlider,
  deleteSlider,
};
