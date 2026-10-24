import mongoose from "mongoose";

export const validateObjectIdParam = (req, res, next, value) => {
  if (!mongoose.isValidObjectId(value)) {
    return res.status(400).json({ message: "Invalid identifier" });
  }

  next();
};
