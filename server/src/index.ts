import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routes/auth";
import marketRouter from "./routes/market";
import { connectDB } from "./db";

dotenv.config();

const PORT = Number(process.env.PORT || 6200);
const rawOrigins = process.env.CORS_ORIGINS || "*";
const CORS_ORIGINS = rawOrigins.split(",").map((s) => s.trim()).filter(Boolean);
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/monix";
const app = express();
app.use(express.json());

// Configure CORS: allow all if '*' present, otherwise only listed origins.
if (CORS_ORIGINS.includes("*")) {
  app.use(cors());
} else {
  app.use(
    cors({
      origin: (origin, callback) => {
        // allow non-browser tools (curl, server-to-server) with no origin
        if (!origin) return callback(null, true);
        if (CORS_ORIGINS.indexOf(origin) !== -1) return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
      },
    })
  );
}

app.use("/api/auth", authRouter);
app.use("/api/market", marketRouter);

async function start() {
  await connectDB(MONGO_URI);
  app.listen(PORT, () => {
    console.log(`Starting server on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
