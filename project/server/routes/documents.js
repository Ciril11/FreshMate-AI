import fs from "fs";
import path from "path";
import { Router } from "express";
import { pool } from "../db.js";
import { upload, cleanupFile } from "../middleware.js";
import {
  parseTimetableFromText,
  parsePlannerFromText,
  parseImageParts,
} from "../gemini.js";

const router = Router();

function fileToInlineBase64(filePath, mimeType) {
  const buf = fs.readFileSync(filePath);
  return buf.toString("base64");
}

// Upload timetable (PDF or image)
router.post(
  "/timetable/upload",
  upload.single("file"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const filePath = req.file.path;
    try {
      const mime = req.file.mimetype;
      let parsed = [];
      if (mime.startsWith("image/")) {
        const b64 = fileToInlineBase64(filePath, mime);
        parsed = await parseImageParts(b64, mime, "timetable");
      } else if (mime === "application/pdf") {
        // Gemini 1.5 supports PDF inlineData
        const b64 = fileToInlineBase64(filePath, "application/pdf");
        parsed = await parseImageParts(b64, "application/pdf", "timetable");
      } else {
        // try as text
        const txt = fs.readFileSync(filePath, "utf8").toString();
        parsed = await parseTimetableFromText(txt);
      }

      if (!parsed.length) {
        return res
          .status(422)
          .json({ error: "Could not extract a timetable from this file." });
      }

      // wipe old slots, insert new
      const conn = await pool.getConnection();
      try {
        await conn.query("TRUNCATE TABLE timetable_slots");
        const values = parsed
          .filter((s) => s.day_of_week != null && s.start_time && s.end_time && s.subject)
          .map((s) => [
            Number(s.day_of_week),
            s.start_time,
            s.end_time,
            String(s.subject).slice(0, 120),
            s.room ? String(s.room).slice(0, 80) : null,
          ]);
        if (values.length) {
          await conn.query(
            "INSERT INTO timetable_slots (day_of_week, start_time, end_time, subject, room) VALUES ?",
            [values]
          );
        }
        res.json({ inserted: values.length, slots: parsed });
      } finally {
        conn.release();
      }
    } catch (e) {
      console.error("timetable upload error", e);
      res.status(500).json({ error: e.message || "Upload failed" });
    } finally {
      cleanupFile(filePath);
    }
  }
);

// Get full timetable
router.get("/timetable", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM timetable_slots ORDER BY day_of_week, start_time"
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Today's classes
router.get("/timetable/today", async (_req, res) => {
  const dow = new Date().getDay();
  try {
    const [rows] = await pool.query(
      "SELECT * FROM timetable_slots WHERE day_of_week = ? ORDER BY start_time",
      [dow]
    );
    res.json({ day_of_week: dow, slots: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Upload academic planner (PDF or image)
router.post("/planner/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const filePath = req.file.path;
  try {
    const mime = req.file.mimetype;
    let parsed = [];
    if (mime.startsWith("image/")) {
      const b64 = fileToInlineBase64(filePath, mime);
      parsed = await parseImageParts(b64, mime, "planner");
    } else if (mime === "application/pdf") {
      const b64 = fileToInlineBase64(filePath, "application/pdf");
      parsed = await parseImageParts(b64, "application/pdf", "planner");
    } else {
      const txt = fs.readFileSync(filePath, "utf8").toString();
      parsed = await parsePlannerFromText(txt);
    }

    if (!parsed.length) {
      return res
        .status(422)
        .json({ error: "Could not extract academic events from this file." });
    }

    const conn = await pool.getConnection();
    try {
      // Separate holidays (type=holiday) into holidays table; rest into academic_events
      const events = parsed.filter((e) => e.event_type !== "holiday");
      const holidays = parsed.filter((e) => e.event_type === "holiday");

      if (events.length) {
        const ev = events
          .filter((e) => e.title && e.event_date)
          .map((e) => [
            String(e.title).slice(0, 160),
            e.event_date,
            ["exam", "assignment", "holiday", "deadline"].includes(e.event_type)
              ? e.event_type
              : "exam",
            e.description ? String(e.description) : null,
          ]);
        if (ev.length) {
          await conn.query(
            "INSERT INTO academic_events (title, event_date, event_type, description) VALUES ?",
            [ev]
          );
        }
      }
      if (holidays.length) {
        for (const h of holidays) {
          if (!h.event_date) continue;
          await conn.query(
            "INSERT IGNORE INTO holidays (holiday_date, reason) VALUES (?, ?)",
            [h.event_date, String(h.title || "Holiday").slice(0, 160)]
          );
        }
      }
      res.json({
        inserted_events: events.length,
        inserted_holidays: holidays.length,
        items: parsed,
      });
    } finally {
      conn.release();
    }
  } catch (e) {
    console.error("planner upload error", e);
    res.status(500).json({ error: e.message || "Upload failed" });
  } finally {
    cleanupFile(filePath);
  }
});

// List academic events
router.get("/planner", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM academic_events WHERE event_date >= CURDATE() ORDER BY event_date"
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Upcoming exams (next 14 days)
router.get("/planner/upcoming-exams", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM academic_events
       WHERE event_type = 'exam' AND event_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 14 DAY)
       ORDER BY event_date`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete an academic event
router.delete("/planner/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM academic_events WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
