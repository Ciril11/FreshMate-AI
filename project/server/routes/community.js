import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

/* ---------------- Lost & Found ---------------- */

// List lost/found items, optionally filtered by type/status
router.get("/lost-found", async (req, res) => {
  try {
    const { item_type, status } = req.query;
    const clauses = [];
    const params = [];
    if (item_type === "lost" || item_type === "found") {
      clauses.push("item_type = ?");
      params.push(item_type);
    }
    if (status === "open" || status === "resolved") {
      clauses.push("status = ?");
      params.push(status);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const [rows] = await pool.query(
      `SELECT * FROM lost_found ${where} ORDER BY created_at DESC`,
      params
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Post a new lost/found item
router.post("/lost-found", async (req, res) => {
  try {
    const { item_type, title, description, location, contact_name, contact_info } =
      req.body;
    if (!item_type || !["lost", "found"].includes(item_type))
      return res.status(400).json({ error: "item_type must be 'lost' or 'found'" });
    if (!title || !contact_name || !contact_info)
      return res
        .status(400)
        .json({ error: "title, contact_name and contact_info are required" });

    const [result] = await pool.query(
      `INSERT INTO lost_found (item_type, title, description, location, contact_name, contact_info)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        item_type,
        String(title).slice(0, 160),
        description || null,
        location || null,
        String(contact_name).slice(0, 160),
        String(contact_info).slice(0, 160),
      ]
    );
    res.status(201).json({ id: result.insertId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Mark an item resolved/reopened
router.put("/lost-found/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["open", "resolved"].includes(status))
      return res.status(400).json({ error: "status must be 'open' or 'resolved'" });
    await pool.query("UPDATE lost_found SET status = ? WHERE id = ?", [
      status,
      req.params.id,
    ]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/lost-found/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM lost_found WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---------------- Senior Connect (mentors) ---------------- */

// List mentors, optional department filter
router.get("/mentors", async (req, res) => {
  try {
    const { department } = req.query;
    const [rows] = await pool.query(
      department
        ? "SELECT * FROM mentors WHERE department = ? ORDER BY name"
        : "SELECT * FROM mentors ORDER BY name",
      department ? [department] : []
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Request to connect with a mentor
router.post("/mentors/:id/connect", async (req, res) => {
  try {
    const { requester_name, requester_contact, message } = req.body;
    if (!requester_name || !requester_contact)
      return res
        .status(400)
        .json({ error: "requester_name and requester_contact are required" });

    const [mentor] = await pool.query("SELECT id FROM mentors WHERE id = ?", [
      req.params.id,
    ]);
    if (!mentor.length) return res.status(404).json({ error: "Mentor not found" });

    const [result] = await pool.query(
      `INSERT INTO mentor_connections (mentor_id, requester_name, requester_contact, message)
       VALUES (?, ?, ?, ?)`,
      [
        req.params.id,
        String(requester_name).slice(0, 160),
        String(requester_contact).slice(0, 160),
        message || null,
      ]
    );
    res.status(201).json({ id: result.insertId, status: "pending" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// All connection requests (e.g. for the requester to check status by contact)
router.get("/mentors/connections", async (req, res) => {
  try {
    const { requester_contact } = req.query;
    const [rows] = await pool.query(
      requester_contact
        ? `SELECT mc.*, m.name AS mentor_name FROM mentor_connections mc
           JOIN mentors m ON m.id = mc.mentor_id
           WHERE mc.requester_contact = ? ORDER BY mc.created_at DESC`
        : `SELECT mc.*, m.name AS mentor_name FROM mentor_connections mc
           JOIN mentors m ON m.id = mc.mentor_id ORDER BY mc.created_at DESC`,
      requester_contact ? [requester_contact] : []
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
