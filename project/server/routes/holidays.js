import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// List all holidays
router.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM holidays ORDER BY holiday_date"
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add a single holiday manually
router.post("/", async (req, res) => {
  const { holiday_date, reason } = req.body;
  if (!holiday_date || !reason)
    return res.status(400).json({ error: "holiday_date and reason required" });
  try {
    await pool.query(
      "INSERT IGNORE INTO holidays (holiday_date, reason) VALUES (?, ?)",
      [holiday_date, String(reason).slice(0, 160)]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete a holiday
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM holidays WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Attendance impact analysis.
 * Given a contiguous holiday range (start_date..end_date inclusive), compute:
 *  - which scheduled classes are skipped (from timetable_slots by day_of_week)
 *  - new attendance % if those classes are removed from denominator
 *  - recommendation text
 */
router.get("/impact", async (req, res) => {
  const { start_date, end_date } = req.query;
  if (!start_date || !end_date)
    return res
      .status(400)
      .json({ error: "start_date and end_date query params required" });

  try {
    const [summaryRows] = await pool.query(
      "SELECT * FROM attendance_summary"
    );
    const totalClasses = summaryRows.reduce((a, s) => a + s.total_classes, 0);
    const attended = summaryRows.reduce(
      (a, s) => a + s.attended_classes,
      0
    );
    const currentPct =
      totalClasses > 0 ? Math.round((attended / totalClasses) * 100) : 0;

    // Count skipped classes per subject across the holiday range
    const start = new Date(start_date);
    const end = new Date(end_date);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return res.status(400).json({ error: "Invalid date range" });
    }

    const skippedBySubject = {};
    let totalSkipped = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
      const dow = cursor.getDay();
      const [slots] = await pool.query(
        "SELECT subject FROM timetable_slots WHERE day_of_week = ?",
        [dow]
      );
      for (const s of slots) {
        skippedBySubject[s.subject] = (skippedBySubject[s.subject] || 0) + 1;
        totalSkipped++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    // If those skipped classes are NOT counted in denominator (typical when holidays are official),
    // attendance % stays same or improves because attended stays, total drops.
    const newTotal = Math.max(totalClasses - totalSkipped, 0);
    const newPct = newTotal > 0 ? Math.round((attended / newTotal) * 100) : 0;

    // If skipped classes WOULD have been counted as absent (unofficial), attendance drops:
    const worstTotal = totalClasses + totalSkipped;
    const worstPct = worstTotal > 0 ? Math.round((attended / worstTotal) * 100) : 0;

    res.json({
      range: { start_date, end_date },
      current_attendance_pct: currentPct,
      skipped_classes: totalSkipped,
      skipped_by_subject: skippedBySubject,
      if_holidays_official: {
        new_total_classes: newTotal,
        new_attendance_pct: newPct,
        delta: newPct - currentPct,
      },
      if_treated_as_absent: {
        new_total_classes: worstTotal,
        new_attendance_pct: worstPct,
        delta: worstPct - currentPct,
      },
      recommendation:
        totalSkipped === 0
          ? "No scheduled classes fall in this holiday range."
          : `You would miss ${totalSkipped} class(es). If the holidays are official, your attendance % ${
              newPct >= currentPct ? "stays safe" : "drops slightly"
            } to ${newPct}%. If treated as absent, it drops to ${worstPct}%.`,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
