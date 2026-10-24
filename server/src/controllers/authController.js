import User from "../models/User.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { generateToken } from "../utils/generateToken.js";

const buildAuthResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  token: generateToken(user._id)
});

const normalizeEmail = (email) => (typeof email === "string" ? email.trim().toLowerCase() : "");
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, adminCode } = req.body;

  if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string" || !name.trim() || !email || !password) {
    res.status(400);
    throw new Error("Name, email, and password are required");
  }

  const normalizedEmail = normalizeEmail(email);

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    res.status(400);
    throw new Error("Please provide a valid email address");
  }

  if (password.length < MIN_PASSWORD_LENGTH || password.length > 128) {
    res.status(400);
    throw new Error(`Password must be between ${MIN_PASSWORD_LENGTH} and 128 characters`);
  }

  // Admin accounts can only be created with the server-side ADMIN_SIGNUP_CODE.
  // If the variable is not set, admin self-registration is disabled.
  if (role === "admin") {
    const expectedCode = process.env.ADMIN_SIGNUP_CODE;
    if (!expectedCode || typeof adminCode !== "string" || adminCode !== expectedCode) {
      res.status(403);
      throw new Error("A valid admin signup code is required to register as an admin");
    }
  }

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    res.status(400);
    throw new Error("User already exists");
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    role: role === "admin" ? "admin" : "user"
  });

  res.status(201).json(buildAuthResponse(user));
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email: normalizeEmail(email) });

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  res.json(buildAuthResponse(user));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  res.json(req.user);
});
