const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { requireRoles } = require("../middleware/roleMiddleware");
const {
  listUsers,
  approveUser,
  createDistributor,
} = require("../controllers/adminController");

const router = express.Router();

router.use(protect, requireRoles("admin"));

router.get("/users", listUsers);
router.patch("/users/:id/approve", approveUser);
router.post("/distributors", createDistributor);

module.exports = router;
