const { client } = require("../config/db");
const { ObjectId } = require("mongodb");

// নিরাপদ কালেকশন ফাংশন
const getUserCollection = () => {
  return client.db("medpharmDB").collection("users");
};

// ======================================
// 1. Create User
// ======================================
const createUser = async (req, res) => {
  try {
    const userCollection = getUserCollection();
    const user = { ...req.body };

    if (!user.email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const existingUser = await userCollection.findOne({
      email: user.email,
    });

    if (existingUser) {
      return res.status(200).json({
        success: true,
        message: "User already exists",
        user: existingUser,
      });
    }

    user.role = user.role || "customer";
    user.createdAt = new Date();

    const result = await userCollection.insertOne(user);

    return res.status(201).json({
      success: true,
      insertedId: result.insertedId,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Create User Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// 2. Get All Users (Pagination + Search)
// ======================================
const getAllUsers = async (req, res) => {
  try {
    const userCollection = getUserCollection();

    const search = (req.query.search || "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const sort = req.query.sort || "asc";

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [total, users] = await Promise.all([
      userCollection.countDocuments(query),
      userCollection
        .find(query)
        .sort({ name: sort === "asc" ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
    ]);

    return res.status(200).json({
      success: true,
      users,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Get All Users Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// 3. Get Single User By ID
// ======================================
const getSingleUser = async (req, res) => {
  try {
    const userCollection = getUserCollection();
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID format",
      });
    }

    const user = await userCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get Single User Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// 4. Get User By Email
// ======================================
const getUserByEmail = async (req, res) => {
  try {
    const userCollection = getUserCollection();
    const email = req.params.email;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await userCollection.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get User By Email Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// 5. Update User By ID
// ======================================
const updateUser = async (req, res) => {
  try {
    const userCollection = getUserCollection();
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID format",
      });
    }

    const updatedData = { ...req.body };
    delete updatedData._id; // MongoDB _id কখনো আপডেট করা যাবে না

    const result = await userCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      result,
    });
  } catch (error) {
    console.error("Update User Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// 6. Update User Role
// ======================================
const updateUserRole = async (req, res) => {
  try {
    const userCollection = getUserCollection();
    const id = req.params.id;
    const { role } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID format",
      });
    }

    const allowedRoles = ["customer", "admin", "super-admin"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Role. Allowed roles: customer, admin, super-admin",
      });
    }

    const result = await userCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { role } },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User Role Updated Successfully",
      result,
    });
  } catch (error) {
    console.error("Update User Role Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// 7. Update User By Email (Address & Phone)
// ======================================
const updateUserByEmail = async (req, res) => {
  try {
    const userCollection = getUserCollection();
    const email = req.params.email;
    const { address, phone } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const result = await userCollection.updateOne(
      { email },
      {
        $set: {
          address: address || "",
          phone: phone || "",
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      result,
    });
  } catch (error) {
    console.error("Update User By Email Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// 8. Delete User
// ======================================
const deleteUser = async (req, res) => {
  try {
    const userCollection = getUserCollection();
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID format",
      });
    }

    const result = await userCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found to delete",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
      result,
    });
  } catch (error) {
    console.error("Delete User Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getSingleUser,
  getUserByEmail,
  updateUser,
  updateUserByEmail,
  updateUserRole,
  deleteUser,
};
