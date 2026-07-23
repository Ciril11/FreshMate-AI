import { Router } from "express";
import crypto from "crypto";
import QRCode from "qrcode";
import { pool } from "../db.js";

const router = Router();

// Teacher creates a QR attendance session for a subject (today)
router.post("/session", async (req, res) => {
  const { subject } = req.body;
  if (!subject) return res.status(400).json({ error: "subject required" });
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min validity
  try {
    const [result] = await pool.query(
      "INSERT INTO attendance_sessions (subject, session_date, qr_token, expires_at) VALUES (?, CURDATE(), ?, ?)",
      [String(subject).slice(0, 120), token, expiresAt]
    );
    const sessionId = result.insertId;
    // Generate QR data URL containing a verification token
    const payload = JSON.stringify({
      sid: sessionId,
      token,
      subject,
      date: new Date().toISOString().slice(0, 10),
    });
    const qrDataUrl = await QRCode.toDataURL(payload, { width: 320 });
    res.json({
      session_id: sessionId,
      token,
      expires_at: expiresAt,
      qr_data_url: qrDataUrl,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get active session by id (for displaying QR)
router.get("/session/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM attendance_sessions WHERE id = ?",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Session not found" });
    const s = rows[0];
    const payload = JSON.stringify({
      sid: s.id,
      token: s.qr_token,
      subject: s.subject,
      date: s.session_date,
    });
    const qrDataUrl = await QRCode.toDataURL(payload, { width: 320 });
    res.json({ ...s, qr_data_url: qrDataUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Student scans QR and submits attendance
router.post("/mark", async (req, res) => {
  const { token, student_id, student_name } = req.body;
  if (!token || !student_id || !student_name)
    return res
      .status(400)
      .json({ error: "token, student_id, student_name required" });
  try {
    const [rows] = await pool.query(
      "SELECT * FROM attendance_sessions WHERE qr_token = ?",
      [token]
    );
    if (!rows.length) return res.status(404).json({ error: "Invalid QR token" });
    const session = rows[0];
    if (new Date() > new Date(session.expires_at))
      return res.status(410).json({ error: "QR session expired" });

    // Insert (unique on session+student prevents double marking)
    try {
      await pool.query(
        "INSERT INTO attendance_records (session_id, student_id, student_name) VALUES (?, ?, ?)",
        [session.id, String(student_id).slice(0, 80), String(student_name).slice(0, 160)]
      );
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY")
        return res.status(409).json({ error: "Already marked present" });
      throw err;
    }

    // Update summary: total_classes++ for subject, attended_classes++
    await pool.query(
      `INSERT INTO attendance_summary (subject, total_classes, attended_classes)
       VALUES (?, 1, 1)
       ON DUPLICATE KEY UPDATE
         total_classes = total_classes + 1,
         attended_classes = attended_classes + 1`,
      [session.subject]
    );

    res.json({ ok: true, subject: session.subject, session_date: session.session_date });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List attendance summary per subject
router.get("/summary", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM attendance_summary ORDER BY subject"
    );
    const overall = rows.reduce(
      (acc, r) => {
        acc.total += r.total_classes;
        acc.attended += r.attended_classes;
        return acc;
      },
      { total: 0, attended: 0 }
    );
    const pct =
      overall.total > 0 ? Math.round((overall.attended / overall.total) * 100) : 0;
    res.json({ subjects: rows, overall: { ...overall, percentage: pct } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List records for a session
router.get("/records/:sessionId", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM attendance_records WHERE session_id = ? ORDER BY marked_at",
      [req.params.sessionId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
