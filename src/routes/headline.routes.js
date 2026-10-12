const express = require("express");
const {
  addHeadline,
  getHeadlines,
  getActiveHeadlines,
  getSingleHeadline,
  updateHeadline,
  toggleHeadline,
  deleteHeadline,
} = require("../controllers/headline.controller");

const router = express.Router();

router.get("/active", getActiveHeadlines);
router.get("/", getHeadlines);
router.get("/:id", getSingleHeadline);
router.post("/", addHeadline);
router.put("/:id", updateHeadline);
router.patch("/:id/toggle", toggleHeadline);
router.delete("/:id", deleteHeadline);

module.exports = router;
