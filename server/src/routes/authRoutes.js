import express from "express";
import {
  firebaseAuth,
  getCurrentUser,
  loginUser,
  registerUser
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/firebase", firebaseAuth);
router.get("/me", protect, getCurrentUser);

export default router;
