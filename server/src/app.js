import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import currentAffairRoutes from "./routes/currentAffairRoutes.js";
import examRoutes from "./routes/examRoutes.js";
import resultRoutes from "./routes/resultRoutes.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";

dotenv.config();

const app = express();
app.disable("x-powered-by");
const allowedOrigins = new Set([
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:5174"
].filter(Boolean));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests and local Vite fallback ports during development.
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(
  morgan("dev", {
    skip: (req) => req.path === "/health" || req.path === "/api/health" || req.method === "HEAD"
  })
);

app.get("/", (req, res) => {
  res.json({ message: "Exam Platform API is running" });
});

app.get("/health", (req, res) => {
  res.json({ message: "API is healthy" });
});

app.get("/api/health", (req, res) => {
  res.json({ message: "API is healthy" });
});

app.use("/api/auth", authRoutes);
app.use("/api/current-affairs", currentAffairRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/results", resultRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
