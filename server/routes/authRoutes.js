const express = require("express");
const router = express.Router();
const { registerUser, loginUser, logoutUser } = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.post("/signup", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;