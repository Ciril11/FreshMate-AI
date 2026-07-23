import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initDb } from "./db.js";
import { authRequired } from "./middleware.js";
import authRouter from "./routes/auth.js";
import documentsRouter from "./routes/documents.js";
import holidaysRouter from "./routes/holidays.js";
import attendanceRouter from "./routes/attendance.js";
import assistantRouter from "./routes/assistant.js";
import communityRouter from "./routes/community.js";
import campusRouter from "./routes/campus.js";
import placementsRouter from "./routes/placements.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Auth routes are public
app.use("/api/auth", authRouter);

// All other API routes require a valid JWT
app.use("/api", authRequired);
app.use("/api", documentsRouter);
app.use("/api/holidays", holidaysRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/assistant", assistantRouter);
app.use("/api", communityRouter);
app.use("/api", campusRouter);
app.use("/api", placementsRouter);

app.use((err, _req, res, _next) => {
  console.error("[server] error", err);
  res.status(500).json({ error: err.message || "Server error" });
});

const PORT = Number(process.env.PORT || 8800);

initDb()
  .then(() => {
    app.listen(PORT, () =>
      console.log(`[server] FreshMate AI API on http://localhost:${PORT}`)
    );
  })
  .catch((e) => {
    console.error("[server] DB init failed:", e.message);
    console.error(
      "[server] Make sure MySQL is running and credentials in server/.env are correct."
    );
    process.exit(1);
  });
