export const PORT = Number(process.env.PORT || 6200);

const rawOrigins = process.env.CORS_ORIGINS || "*";
export const CORS_ORIGINS = rawOrigins.split(",").map((s) => s.trim()).filter(Boolean);

export const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/monix";
export const SESSION_EXPIRES_IN = Number(process.env.SESSION_EXPIRES_IN || 21600); // default 6 hours
