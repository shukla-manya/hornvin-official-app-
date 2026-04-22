const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { requireRoles } = require("../middleware/roleMiddleware");
const { ok } = require("../utils/apiResponse");

const router = express.Router();

router.use(protect, requireRoles("distributor"));

router.get("/ping", (req, res) => {
  ok(res, { message: "Distributor area OK", userId: String(req.user._id) });
});

module.exports = router;
