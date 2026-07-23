import fs from "fs";
import { Router } from "express";
import { pool } from "../db.js";
import { upload, cleanupFile } from "../middleware.js";
import { analyzeResumeFile } from "../gemini.js";

const router = Router();

/* ---------------- Companies ---------------- */

router.get("/placements", async (req, res) => {
  try {
    const { status, q } = req.query;
    const clauses = [];
    const params = [];
    if (status === "open" || status === "closed") {
      clauses.push("status = ?");
      params.push(status);
    }
    if (q) {
      clauses.push("(name LIKE ? OR role LIKE ? OR required_skills LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const [rows] = await pool.query(
      `SELECT * FROM placement_companies ${where} ORDER BY deadline IS NULL, deadline ASC`,
      params
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Recommended companies — ranked by overlap with the student's most
// recent resume's detected skills, falling back to nearest deadline.
router.get("/placements/recommended", async (req, res) => {
  try {
    const { student_contact } = req.query;
    const [companies] = await pool.query(
      "SELECT * FROM placement_companies WHERE status = 'open' ORDER BY deadline IS NULL, deadline ASC"
    );

    let detectedSkills = [];
    if (student_contact) {
      const [resumeRows] = await pool.query(
        `SELECT analysis FROM resumes WHERE student_contact = ?
         ORDER BY created_at DESC LIMIT 1`,
        [student_contact]
      );
      if (resumeRows.length && resumeRows[0].analysis) {
        const analysis =
          typeof resumeRows[0].analysis === "string"
            ? JSON.parse(resumeRows[0].analysis)
            : resumeRows[0].analysis;
        detectedSkills = (analysis.detected_skills || []).map((s) =>
          String(s).toLowerCase()
        );
      }
    }

    const ranked = companies
      .map((c) => {
        const required = (c.required_skills || "")
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        const matchCount = detectedSkills.length
          ? required.filter((s) => detectedSkills.some((d) => d.includes(s) || s.includes(d))).length
          : 0;
        return { ...c, match_score: matchCount };
      })
      .sort((a, b) => b.match_score - a.match_score);

    res.json(ranked);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add a company (open posting)
router.post("/placements", async (req, res) => {
  try {
    const {
      name,
      role,
      package_lpa,
      required_skills,
      eligibility,
      deadline,
      description,
    } = req.body;
    if (!name || !role)
      return res.status(400).json({ error: "name and role are required" });

    const [result] = await pool.query(
      `INSERT INTO placement_companies
       (name, role, package_lpa, required_skills, eligibility, deadline, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        String(name).slice(0, 160),
        String(role).slice(0, 160),
        package_lpa || null,
        required_skills || null,
        eligibility || null,
        deadline || null,
        description || null,
      ]
    );
    res.status(201).json({ id: result.insertId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/placements/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["open", "closed"].includes(status))
      return res.status(400).json({ error: "status must be 'open' or 'closed'" });
    await pool.query("UPDATE placement_companies SET status = ? WHERE id = ?", [
      status,
      req.params.id,
    ]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/placements/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM placement_companies WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---------------- Applications ---------------- */

router.post("/placements/apply", async (req, res) => {
  try {
    const { company_id, student_name, student_contact } = req.body;
    if (!company_id || !student_name || !student_contact)
      return res.status(400).json({
        error: "company_id, student_name and student_contact are required",
      });

    const [company] = await pool.query(
      "SELECT id, status FROM placement_companies WHERE id = ?",
      [company_id]
    );
    if (!company.length)
      return res.status(404).json({ error: "Company not found" });
    if (company[0].status === "closed")
      return res.status(400).json({ error: "This posting is closed" });

    try {
      const [result] = await pool.query(
        `INSERT INTO student_applications (company_id, student_name, student_contact)
         VALUES (?, ?, ?)`,
        [company_id, String(student_name).slice(0, 160), String(student_contact).slice(0, 160)]
      );
      res.status(201).json({ id: result.insertId, status: "applied" });
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: "You've already applied to this company" });
      }
      throw err;
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/placements/status", async (req, res) => {
  try {
    const { student_contact } = req.query;
    if (!student_contact)
      return res.status(400).json({ error: "student_contact is required" });

    const [rows] = await pool.query(
      `SELECT sa.*, pc.name AS company_name, pc.role AS company_role
       FROM student_applications sa
       JOIN placement_companies pc ON pc.id = sa.company_id
       WHERE sa.student_contact = ?
       ORDER BY sa.applied_at DESC`,
      [student_contact]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---------------- Resume analyzer ---------------- */

router.post("/resume/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const filePath = req.file.path;
  try {
    const { student_name, student_contact, target_skills } = req.body;
    if (!student_name || !student_contact) {
      return res
        .status(400)
        .json({ error: "student_name and student_contact are required" });
    }

    const mime = req.file.mimetype;
    const b64 = fs.readFileSync(filePath).toString("base64");
    const analysis = await analyzeResumeFile(b64, mime, target_skills || null);

    const [result] = await pool.query(
      `INSERT INTO resumes (student_name, student_contact, file_name, ats_score, analysis)
       VALUES (?, ?, ?, ?, ?)`,
      [
        String(student_name).slice(0, 160),
        String(student_contact).slice(0, 160),
        req.file.originalname,
        analysis.ats_score ?? null,
        JSON.stringify(analysis),
      ]
    );

    res.json({ id: result.insertId, analysis });
  } catch (e) {
    console.error("resume upload error", e);
    res.status(500).json({ error: e.message || "Resume analysis failed" });
  } finally {
    cleanupFile(filePath);
  }
});

router.get("/resume/history", async (req, res) => {
  try {
    const { student_contact } = req.query;
    if (!student_contact)
      return res.status(400).json({ error: "student_contact is required" });

    const [rows] = await pool.query(
      `SELECT id, student_name, file_name, ats_score, analysis, created_at
       FROM resumes WHERE student_contact = ? ORDER BY created_at DESC LIMIT 10`,
      [student_contact]
    );
    res.json(
      rows.map((r) => ({
        ...r,
        analysis: typeof r.analysis === "string" ? JSON.parse(r.analysis) : r.analysis,
      }))
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
