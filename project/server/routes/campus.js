import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// List campus locations, optional type filter or text search
router.get("/campus-locations", async (req, res) => {
  try {
    const { type, q } = req.query;
    const clauses = [];
    const params = [];
    if (type) {
      clauses.push("location_type = ?");
      params.push(type);
    }
    if (q) {
      clauses.push("(name LIKE ? OR building_name LIKE ? OR description LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const [rows] = await pool.query(
      `SELECT * FROM campus_locations ${where} ORDER BY name`,
      params
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add a campus location (building, classroom, faculty cabin, hostel, etc.)
router.post("/campus-locations", async (req, res) => {
  try {
    const {
      name,
      location_type,
      building_name,
      floor,
      room_number,
      latitude,
      longitude,
      description,
    } = req.body;
    if (!name || latitude === undefined || longitude === undefined)
      return res
        .status(400)
        .json({ error: "name, latitude and longitude are required" });

    const [result] = await pool.query(
      `INSERT INTO campus_locations
       (name, location_type, building_name, floor, room_number, latitude, longitude, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(name).slice(0, 160),
        location_type || "other",
        building_name || null,
        floor || null,
        room_number || null,
        latitude,
        longitude,
        description || null,
      ]
    );
    res.status(201).json({ id: result.insertId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/campus-locations/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM campus_locations WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
