import express from "express";
import {
  getCurrentUser,
  googleAuthPlaceholder,
  loginUser,
  registerUser
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google", googleAuthPlaceholder);
router.get("/me", protect, getCurrentUser);

export default router;
