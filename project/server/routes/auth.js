import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "freshmate-dev-secret-change-me";
const TOKEN_EXPIRY = "7d";

function signToken(userId, email) {
  return jwt.sign({ sub: userId, email }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
}

// Register
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res
      .status(400)
      .json({ error: "name, email and password are required" });
  if (String(password).length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" });

  try {
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [String(email).toLowerCase()]
    );
    if (existing.length)
      return res.status(409).json({ error: "An account with this email already exists" });

    const hash = await bcrypt.hash(String(password), 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [String(name).slice(0, 160), String(email).toLowerCase(), hash]
    );
    const token = signToken(String(result.insertId), String(email).toLowerCase());
    res.status(201).json({
      token,
      user: { id: result.insertId, name, email: String(email).toLowerCase() },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "email and password are required" });

  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      String(email).toLowerCase(),
    ]);
    if (!rows.length)
      return res.status(401).json({ error: "Invalid email or password" });

    const user = rows[0];
    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok)
      return res.status(401).json({ error: "Invalid email or password" });

    const token = signToken(String(user.id), user.email);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
