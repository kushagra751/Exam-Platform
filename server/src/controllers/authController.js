import User from "../models/User.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { generateToken } from "../utils/generateToken.js";
import { verifyFirebaseIdToken } from "../utils/firebaseAdmin.js";

const buildAuthResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phoneNumber: user.phoneNumber,
  token: generateToken(user._id)
});

const normalizeEmail = (email) => email?.trim().toLowerCase();

const findUserForFirebaseIdentity = async ({ email, firebaseUid, phoneNumber }) => {
  if (firebaseUid) {
    const byFirebaseUid = await User.findOne({ firebaseUid });

    if (byFirebaseUid) {
      return byFirebaseUid;
    }
  }

  if (email) {
    const byEmail = await User.findOne({ email: normalizeEmail(email) });

    if (byEmail) {
      return byEmail;
    }
  }

  if (phoneNumber) {
    const byPhone = await User.findOne({ phoneNumber });

    if (byPhone) {
      return byPhone;
    }
  }

  return null;
};

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Name, email, and password are required");
  }

  const normalizedEmail = normalizeEmail(email);
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    res.status(400);
    throw new Error("User already exists");
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    role: role === "admin" ? "admin" : "user"
  });

  res.status(201).json(buildAuthResponse(user));
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: normalizeEmail(email) });

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  res.json(buildAuthResponse(user));
});

export const firebaseAuth = asyncHandler(async (req, res) => {
  const { idToken, role } = req.body;

  if (!idToken) {
    res.status(400);
    throw new Error("Firebase ID token is required");
  }

  const decoded = await verifyFirebaseIdToken(idToken);
  const email = normalizeEmail(decoded.email || "");
  const phoneNumber = decoded.phone_number || "";
  const firebaseUid = decoded.uid;

  let user = await findUserForFirebaseIdentity({ email, firebaseUid, phoneNumber });

  if (!user) {
    user = await User.create({
      name: decoded.name || phoneNumber || email || "Firebase User",
      email: email || `${firebaseUid}@firebase.local`,
      role: role === "admin" ? "admin" : "user",
      googleId: decoded.firebase?.sign_in_provider === "google.com" ? firebaseUid : "",
      phoneNumber,
      firebaseUid,
      password: undefined
    });
  } else {
    let shouldSave = false;

    if (!user.firebaseUid) {
      user.firebaseUid = firebaseUid;
      shouldSave = true;
    }

    if (decoded.firebase?.sign_in_provider === "google.com" && !user.googleId) {
      user.googleId = firebaseUid;
      shouldSave = true;
    }

    if (phoneNumber && user.phoneNumber !== phoneNumber) {
      user.phoneNumber = phoneNumber;
      shouldSave = true;
    }

    if (email && user.email !== email && !user.email.endsWith("@firebase.local")) {
      user.email = email;
      shouldSave = true;
    }

    if (!user.name && decoded.name) {
      user.name = decoded.name;
      shouldSave = true;
    }

    if (shouldSave) {
      await user.save();
    }
  }

  res.json(buildAuthResponse(user));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  res.json(req.user);
});
