const { client } = require("../config/db");

const verifyRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.email) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized access",
        });
      }

      // MongoDB থেকে রোল চেক
      const db = client.db("medpharmDB");
      const user = await db
        .collection("users")
        .findOne({ email: req.user.email });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User account not found",
        });
      }

      const userRole = user.role;

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access. Only Super Admin can view this report.",
        });
      }

      req.user.role = userRole;
      next();
    } catch (error) {
      console.error("Verify Role Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to verify user role",
      });
    }
  };
};

module.exports = verifyRole;
