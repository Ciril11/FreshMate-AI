import { Router } from "express";
import { pool } from "../db.js";
import { chatWithAssistant } from "../gemini.js";

const router = Router();

async function buildContext() {
  const [[timetable], [exams], [summary], [holidays]] = await Promise.all([
    pool.query(
      "SELECT day_of_week, start_time, end_time, subject, room FROM timetable_slots ORDER BY day_of_week, start_time"
    ),
    pool.query(
      "SELECT title, event_date, event_type, description FROM academic_events WHERE event_date >= CURDATE() ORDER BY event_date LIMIT 20"
    ),
    pool.query(
      "SELECT subject, total_classes, attended_classes FROM attendance_summary"
    ),
    pool.query(
      "SELECT reason AS title, holiday_date FROM holidays WHERE holiday_date >= CURDATE() ORDER BY holiday_date LIMIT 20"
    ),
  ]);

  const attendance = summary.map((s) => ({
    subject: s.subject,
    total_classes: s.total_classes,
    attended_classes: s.attended_classes,
    percentage:
      s.total_classes > 0
        ? Math.round((s.attended_classes / s.total_classes) * 1000) / 10
        : null,
  }));

  return {
    today: new Date().toISOString().slice(0, 10),
    timetable,
    upcoming_events: exams,
    attendance_summary: attendance,
    upcoming_holidays: holidays,
  };
}

// Chat with the AI assistant, grounded in the student's live data
router.post("/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "message is required" });
    }
    const context = await buildContext();
    const reply = await chatWithAssistant(message, context, history);

    await pool.query("INSERT INTO ai_messages (role, content) VALUES (?, ?)", [
      "user",
      message,
    ]);
    await pool.query("INSERT INTO ai_messages (role, content) VALUES (?, ?)", [
      "assistant",
      reply,
    ]);

    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Recent chat history
router.get("/history", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, role, content, created_at FROM ai_messages ORDER BY id DESC LIMIT 40"
    );
    res.json(rows.reverse());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Clear chat history
router.delete("/history", async (_req, res) => {
  try {
    await pool.query("DELETE FROM ai_messages");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
