import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "freshmate_ai",
  waitForConnections: true,
  connectionLimit: 10,
  multipleStatements: true,
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS timetable_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  day_of_week TINYINT NOT NULL COMMENT '0=Sun..6=Sat',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject VARCHAR(120) NOT NULL,
  room VARCHAR(80),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS academic_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  event_date DATE NOT NULL,
  event_type ENUM('exam','assignment','holiday','deadline') NOT NULL DEFAULT 'exam',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS holidays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  holiday_date DATE NOT NULL UNIQUE,
  reason VARCHAR(160) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject VARCHAR(120) NOT NULL,
  session_date DATE NOT NULL,
  qr_token VARCHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  student_id VARCHAR(80) NOT NULL,
  student_name VARCHAR(160) NOT NULL,
  marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_attendance (session_id, student_id),
  FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attendance_summary (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject VARCHAR(120) NOT NULL UNIQUE,
  total_classes INT NOT NULL DEFAULT 0,
  attended_classes INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role ENUM('user','assistant') NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lost_found (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_type ENUM('lost','found') NOT NULL,
  title VARCHAR(160) NOT NULL,
  description TEXT,
  location VARCHAR(160),
  contact_name VARCHAR(160) NOT NULL,
  contact_info VARCHAR(160) NOT NULL,
  status ENUM('open','resolved') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mentors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  department VARCHAR(120),
  year VARCHAR(40),
  expertise VARCHAR(255),
  bio TEXT,
  contact_email VARCHAR(160),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mentor_connections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mentor_id INT NOT NULL,
  requester_name VARCHAR(160) NOT NULL,
  requester_contact VARCHAR(160) NOT NULL,
  message TEXT,
  status ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mentor_id) REFERENCES mentors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS campus_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  location_type VARCHAR(60) NOT NULL DEFAULT 'other',
  building_name VARCHAR(160),
  floor VARCHAR(40),
  room_number VARCHAR(40),
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS placement_companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  role VARCHAR(160) NOT NULL,
  package_lpa VARCHAR(40),
  required_skills TEXT,
  eligibility TEXT,
  deadline DATE,
  status ENUM('open','closed') NOT NULL DEFAULT 'open',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  student_name VARCHAR(160) NOT NULL,
  student_contact VARCHAR(160) NOT NULL,
  status ENUM('applied','shortlisted','rejected','selected') NOT NULL DEFAULT 'applied',
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_application (company_id, student_contact),
  FOREIGN KEY (company_id) REFERENCES placement_companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resumes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_name VARCHAR(160) NOT NULL,
  student_contact VARCHAR(160) NOT NULL,
  file_name VARCHAR(255),
  ats_score INT,
  analysis JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

export async function initDb() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS ??`, [
      process.env.MYSQL_DATABASE || "freshmate_ai",
    ]);
    await conn.query(SCHEMA);

    // CREATE TABLE IF NOT EXISTS never alters a pre-existing table, so a
    // table left over from an earlier/different schema draft (missing a
    // column the current code expects) would otherwise keep causing
    // "Unknown column" errors forever. Self-heal known drift here.
    async function hasColumn(table, column) {
      const [rows] = await conn.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
        [table, column]
      );
      return rows[0].cnt > 0;
    }

    if (!(await hasColumn("users", "name"))) {
      await conn.query(
        `ALTER TABLE users ADD COLUMN name VARCHAR(160) NOT NULL DEFAULT '' AFTER id`
      );
      console.log("[db] migrated: added users.name column");
    }

    // campus_locations: an earlier draft of this schema (matching the
    // original spec) used `location_name` instead of `name`. If a table
    // from that draft already exists, rename the column instead of
    // silently failing every query that expects `name`.
    if (!(await hasColumn("campus_locations", "name"))) {
      if (await hasColumn("campus_locations", "location_name")) {
        await conn.query(
          `ALTER TABLE campus_locations CHANGE COLUMN location_name name VARCHAR(160) NOT NULL`
        );
        console.log("[db] migrated: renamed campus_locations.location_name -> name");
      } else {
        await conn.query(
          `ALTER TABLE campus_locations ADD COLUMN name VARCHAR(160) NOT NULL DEFAULT '' AFTER id`
        );
        console.log("[db] migrated: added campus_locations.name column");
      }
    }

    // Seed a few sample mentors so Senior Connect isn't empty on first run.
    const [[{ cnt: mentorCount }]] = await conn.query(
      "SELECT COUNT(*) AS cnt FROM mentors"
    );
    if (mentorCount === 0) {
      await conn.query(
        `INSERT INTO mentors (name, department, year, expertise, bio, contact_email) VALUES
         (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)`,
        [
          "Ananya Rao", "Computer Science", "Final Year",
          "DSA, Web Development, Internship prep",
          "Happy to help juniors with coding interview prep and project ideas.",
          "ananya.rao@example.edu",
          "Rahul Mehta", "Electronics & Communication", "Third Year",
          "Embedded Systems, Placement guidance",
          "Went through campus placements last year — ask me anything about the process.",
          "rahul.mehta@example.edu",
          "Sara Thomas", "Mechanical Engineering", "Final Year",
          "Research, Higher studies, GATE prep",
          "Mentoring students interested in higher studies or GATE.",
          "sara.thomas@example.edu",
        ]
      );
      console.log("[db] seeded sample mentors");
    }

    // Seed a couple of sample companies so Placement Hub isn't empty.
    const [[{ cnt: companyCount }]] = await conn.query(
      "SELECT COUNT(*) AS cnt FROM placement_companies"
    );
    if (companyCount === 0) {
      await conn.query(
        `INSERT INTO placement_companies
         (name, role, package_lpa, required_skills, eligibility, deadline, description) VALUES
         (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)`,
        [
          "TechNova Solutions", "Software Engineer Intern", "6",
          "JavaScript, React, Node.js, SQL, Data Structures",
          "CGPA 7.0+, no active backlogs",
          new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          "Product-based startup building developer tooling.",
          "DataSphere Analytics", "Data Analyst", "5.5",
          "Python, SQL, Excel, Statistics, Power BI",
          "CGPA 6.5+, any branch",
          new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
          "Analytics consultancy working with retail and fintech clients.",
        ]
      );
      console.log("[db] seeded sample placement companies");
    }

    console.log("[db] schema ready");
  } finally {
    conn.release();
  }
}
