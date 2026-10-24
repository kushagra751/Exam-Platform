import express from "express";
import { getAllResults, getMyResults, getResultById } from "../controllers/resultController.js";
import { validateObjectIdParam } from "../middleware/validateObjectId.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.param("id", validateObjectIdParam);

router.get("/me", protect, authorize("user", "admin"), getMyResults);
router.get("/all", protect, authorize("admin"), getAllResults);
router.get("/:id", protect, getResultById);

export default router;
