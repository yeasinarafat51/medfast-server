const { client } = require("../config/db");
const { ObjectId } = require("mongodb");

// নিরাপদ কালেকশন হেল্পার ফাংশন
const getCollections = () => {
  const db = client.db("medpharmDB");
  return {
    specialOfferCollection: db.collection("specialOffers"),
    medicineCollection: db.collection("medicines"),
  };
};

// ======================================================
// 1. GET ALL SPECIAL OFFERS
// ======================================================
const getAllSpecialOffers = async (req, res) => {
  try {
    const { specialOfferCollection } = getCollections();

    const offers = await specialOfferCollection
      .aggregate([
        {
          $lookup: {
            from: "medicines",
            localField: "medicineId",
            foreignField: "_id",
            as: "medicine",
          },
        },
        {
          $unwind: "$medicine",
        },
        {
          $sort: {
            order: 1,
            createdAt: -1,
          },
        },
      ])
      .toArray();

    return res.status(200).json({
      success: true,
      offers,
    });
  } catch (error) {
    console.error("Get All Special Offers Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================================
// 2. GET ACTIVE SPECIAL OFFERS
// ======================================================
const getActiveSpecialOffers = async (req, res) => {
  try {
    const { specialOfferCollection } = getCollections();
    const now = new Date();

    const offers = await specialOfferCollection
      .aggregate([
        {
          $match: {
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
          },
        },
        {
          $lookup: {
            from: "medicines",
            localField: "medicineId",
            foreignField: "_id",
            as: "medicine",
          },
        },
        {
          $unwind: "$medicine",
        },
        {
          $match: {
            "medicine.stock": { $gt: 0 },
          },
        },
        {
          $sort: {
            order: 1,
            createdAt: -1,
          },
        },
      ])
      .toArray();

    const formattedOffers = offers.map((offer) => {
      const regularPrice = Number(offer.medicine?.sellingPrice) || 0;
      const offerPrice = Number(offer.offerPrice) || 0;

      let discountPercent = 0;
      if (regularPrice > 0 && offerPrice < regularPrice) {
        discountPercent = Number(
          (((regularPrice - offerPrice) / regularPrice) * 100).toFixed(2),
        );
      }

      return {
        _id: offer._id,
        medicineId: offer.medicineId,
        offerPrice,
        regularPrice,
        discountPercent,
        startDate: offer.startDate,
        endDate: offer.endDate,
        isActive: offer.isActive,
        order: offer.order,
        medicine: {
          _id: offer.medicine?._id,
          medicineName: offer.medicine?.medicineName || "",
          genericName: offer.medicine?.genericName || "",
          company: offer.medicine?.company || "",
          image: offer.medicine?.image || "",
          stock: Number(offer.medicine?.stock) || 0,
          mrpePrice: Number(offer.medicine?.mrpePrice) || 0,
          sellingPrice: Number(offer.medicine?.sellingPrice) || 0,
        },
      };
    });

    return res.status(200).json({
      success: true,
      offers: formattedOffers,
    });
  } catch (error) {
    console.error("Get Active Special Offers Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================================
// 3. ADD SPECIAL OFFER
// ======================================================
const addSpecialOffer = async (req, res) => {
  try {
    const { specialOfferCollection, medicineCollection } = getCollections();
    const { medicineId, offerPrice, startDate, endDate, isActive, order } =
      req.body;

    if (!medicineId || !ObjectId.isValid(medicineId)) {
      return res.status(400).json({
        success: false,
        message: "A valid medicine ID is required",
      });
    }

    if (offerPrice === undefined || offerPrice === "") {
      return res.status(400).json({
        success: false,
        message: "Offer price is required",
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    const medicine = await medicineCollection.findOne({
      _id: new ObjectId(medicineId),
    });

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    const regularPrice = Number(medicine.sellingPrice) || 0;
    const finalOfferPrice = Number(offerPrice);

    if (!Number.isFinite(finalOfferPrice) || finalOfferPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid offer price",
      });
    }

    if (regularPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Medicine regular selling price is invalid",
      });
    }

    if (finalOfferPrice >= regularPrice) {
      return res.status(400).json({
        success: false,
        message: "Offer price must be less than regular selling price",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    const existingOffer = await specialOfferCollection.findOne({
      medicineId: new ObjectId(medicineId),
      isActive: true,
      endDate: { $gte: new Date() },
    });

    if (existingOffer) {
      return res.status(400).json({
        success: false,
        message: "This medicine already has an active special offer",
      });
    }

    const discountPercent = Number(
      (((regularPrice - finalOfferPrice) / regularPrice) * 100).toFixed(2),
    );

    const newOffer = {
      medicineId: new ObjectId(medicineId),
      offerPrice: finalOfferPrice,
      discountPercent,
      startDate: start,
      endDate: end,
      isActive: isActive !== false,
      order: Number(order) || 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await specialOfferCollection.insertOne(newOffer);

    return res.status(201).json({
      success: true,
      insertedId: result.insertedId,
      message: "Special offer added successfully",
    });
  } catch (error) {
    console.error("Add Special Offer Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================================
// 4. UPDATE SPECIAL OFFER
// ======================================================
const updateSpecialOffer = async (req, res) => {
  try {
    const { specialOfferCollection, medicineCollection } = getCollections();
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid offer ID",
      });
    }

    const { medicineId, offerPrice, startDate, endDate, isActive, order } =
      req.body;

    if (!medicineId || !ObjectId.isValid(medicineId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid medicine ID",
      });
    }

    const medicine = await medicineCollection.findOne({
      _id: new ObjectId(medicineId),
    });

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    const regularPrice = Number(medicine.sellingPrice) || 0;
    const finalOfferPrice = Number(offerPrice);

    if (!Number.isFinite(finalOfferPrice) || finalOfferPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid offer price",
      });
    }

    if (finalOfferPrice >= regularPrice) {
      return res.status(400).json({
        success: false,
        message: "Offer price must be less than regular selling price",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    const discountPercent = Number(
      (((regularPrice - finalOfferPrice) / regularPrice) * 100).toFixed(2),
    );

    const updateData = {
      medicineId: new ObjectId(medicineId),
      offerPrice: finalOfferPrice,
      discountPercent,
      startDate: start,
      endDate: end,
      isActive: isActive !== false,
      order: Number(order) || 1,
      updatedAt: new Date(),
    };

    const result = await specialOfferCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Special offer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Special offer updated successfully",
    });
  } catch (error) {
    console.error("Update Special Offer Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================================
// 5. DELETE SPECIAL OFFER
// ======================================================
const deleteSpecialOffer = async (req, res) => {
  try {
    const { specialOfferCollection } = getCollections();
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid offer ID",
      });
    }

    const result = await specialOfferCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Special offer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Special offer deleted successfully",
    });
  } catch (error) {
    console.error("Delete Special Offer Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================================
// 6. TOGGLE SPECIAL OFFER
// ======================================================
const toggleSpecialOffer = async (req, res) => {
  try {
    const { specialOfferCollection } = getCollections();
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid offer ID",
      });
    }

    const offer = await specialOfferCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Special offer not found",
      });
    }

    const newStatus = !offer.isActive;

    await specialOfferCollection.updateOne(
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
      message: newStatus
        ? "Special offer activated"
        : "Special offer deactivated",
      isActive: newStatus,
    });
  } catch (error) {
    console.error("Toggle Special Offer Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getAllSpecialOffers,
  getActiveSpecialOffers,
  addSpecialOffer,
  updateSpecialOffer,
  deleteSpecialOffer,
  toggleSpecialOffer,
};
