import dotenv from "dotenv";
import app from "./app.js";
import { connectDatabase } from "./config/db.js";
import Result from "./models/Result.js";

dotenv.config();

if (!process.env.JWT_SECRET || !process.env.MONGO_URI) {
  console.error("Missing required environment variables: JWT_SECRET and MONGO_URI must be set (see server/.env.example).");
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

connectDatabase().then(() => {
  Result.syncIndexes().catch((error) => {
    console.error("Failed to sync result indexes:", error.message);
  });

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Stop the running server or change PORT in server/.env.`);
      process.exit(1);
    }

    throw error;
  });
});
