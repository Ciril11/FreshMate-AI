export interface TimetableSlot {
  id: number;
  day_of_week: number; // 0=Sun..6=Sat
  start_time: string; // HH:MM:SS
  end_time: string;
  subject: string;
  room: string | null;
}

export interface AcademicEvent {
  id: number;
  title: string;
  event_date: string;
  event_type: "exam" | "assignment" | "holiday" | "deadline";
  description: string | null;
}

export interface Holiday {
  id: number;
  holiday_date: string;
  reason: string;
}

export interface AttendanceSummaryRow {
  id: number;
  subject: string;
  total_classes: number;
  attended_classes: number;
}

export interface AttendanceSession {
  id: number;
  subject: string;
  session_date: string;
  qr_token: string;
  expires_at: string;
  qr_data_url: string;
}

export interface AttendanceRecord {
  id: number;
  session_id: number;
  student_id: string;
  student_name: string;
  marked_at: string;
}

export interface ImpactResult {
  range: { start_date: string; end_date: string };
  current_attendance_pct: number;
  skipped_classes: number;
  skipped_by_subject: Record<string, number>;
  if_holidays_official: {
    new_total_classes: number;
    new_attendance_pct: number;
    delta: number;
  };
  if_treated_as_absent: {
    new_total_classes: number;
    new_attendance_pct: number;
    delta: number;
  };
  recommendation: string;
}

export interface LostFoundItem {
  id: number;
  item_type: "lost" | "found";
  title: string;
  description: string | null;
  location: string | null;
  contact_name: string;
  contact_info: string;
  status: "open" | "resolved";
  created_at: string;
}

export interface Mentor {
  id: number;
  name: string;
  department: string | null;
  year: string | null;
  expertise: string | null;
  bio: string | null;
  contact_email: string | null;
}

export interface MentorConnection {
  id: number;
  mentor_id: number;
  mentor_name?: string;
  requester_name: string;
  requester_contact: string;
  message: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

export interface CampusLocation {
  id: number;
  name: string;
  location_type: string;
  building_name: string | null;
  floor: string | null;
  room_number: string | null;
  latitude: number;
  longitude: number;
  description: string | null;
}

export interface PlacementCompany {
  id: number;
  name: string;
  role: string;
  package_lpa: string | null;
  required_skills: string | null;
  eligibility: string | null;
  deadline: string | null;
  status: "open" | "closed";
  description: string | null;
  match_score?: number;
}

export interface StudentApplication {
  id: number;
  company_id: number;
  company_name?: string;
  company_role?: string;
  student_name: string;
  student_contact: string;
  status: "applied" | "shortlisted" | "rejected" | "selected";
  applied_at: string;
}

export interface ResumeAnalysis {
  ats_score: number | null;
  detected_skills: string[];
  missing_sections: string[];
  skill_gaps: string[];
  strengths: string[];
  suggestions: string[];
  summary: string;
}

export interface ResumeRecord {
  id: number;
  student_name: string;
  file_name: string | null;
  ats_score: number | null;
  analysis: ResumeAnalysis;
  created_at: string;
}
