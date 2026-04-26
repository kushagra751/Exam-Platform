import express from "express";
import {
  createCurrentAffairsExam,
  getCurrentAffairsOptions
} from "../controllers/currentAffairController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/options", protect, authorize("user", "admin"), getCurrentAffairsOptions);
router.post("/generate", protect, authorize("user", "admin"), createCurrentAffairsExam);

export default router;
