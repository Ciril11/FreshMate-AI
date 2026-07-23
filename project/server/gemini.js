import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Google retires Gemini model IDs on a rolling basis (gemini-1.5-* is fully
// shut down; gemini-2.0-* shut down June 2026; gemini-2.5-flash is being
// intermittently retired ahead of its official Oct 2026 date). Rather than
// hardcoding one model string, try a fallback chain and remember whichever
// one actually works so we don't re-probe on every request.
const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL, // optional explicit override in .env
  "gemini-flash-latest",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
].filter(Boolean);

let workingModel = null;

function isModelNotFoundError(err) {
  const msg = String(err && err.message ? err.message : err);
  return msg.includes("404") || /not found|no longer available/i.test(msg);
}

async function generateWithFallback(requestParts) {
  if (!genAI) throw new Error("GEMINI_API_KEY not set");
  const candidates = workingModel
    ? [workingModel, ...MODEL_CANDIDATES.filter((m) => m !== workingModel)]
    : MODEL_CANDIDATES;

  let lastErr;
  for (const modelName of candidates) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(requestParts);
      workingModel = modelName; // remember what worked
      return result;
    } catch (err) {
      lastErr = err;
      if (!isModelNotFoundError(err)) throw err; // real error, don't mask it
      // otherwise try the next candidate
    }
  }
  throw new Error(
    `No supported Gemini model found (tried: ${candidates.join(", ")}). ` +
      `Last error: ${lastErr && lastErr.message}. ` +
      `Set GEMINI_MODEL in your .env to a model your API key supports.`
  );
}

const TIMETABLE_PROMPT = `You are a strict JSON generator. Extract a weekly class timetable from the given document.
Return ONLY a JSON array (no markdown fences, no commentary). Each element:
{
  "day_of_week": <0-6 where 0=Sunday, 6=Saturday>,
  "start_time": "HH:MM" 24h,
  "end_time": "HH:MM" 24h,
  "subject": "<subject name>",
  "room": "<room or null>"
}
If you cannot find a timetable, return [] .`;

const PLANNER_PROMPT = `You are a strict JSON generator. Extract academic events (exams, assignments, deadlines, holidays) from the given document.
Return ONLY a JSON array (no markdown fences). Each element:
{
  "title": "<short title>",
  "event_date": "YYYY-MM-DD",
  "event_type": "exam" | "assignment" | "holiday" | "deadline",
  "description": "<one line or null>"
}
If you cannot find any events, return [] .`;

function extractJson(text) {
  if (!text) return null;
  let t = text.trim();
  // strip ```json fences if present
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  // find first [ ... last ]
  const first = t.indexOf("[");
  const last = t.lastIndexOf("]");
  if (first !== -1 && last !== -1 && last > first) {
    t = t.slice(first, last + 1);
  }
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function extractJsonObject(text) {
  if (!text) return null;
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    t = t.slice(first, last + 1);
  }
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

export async function parseTimetableFromText(rawText) {
  const result = await generateWithFallback([
    { text: TIMETABLE_PROMPT },
    { text: "Document text:\n" + rawText.slice(0, 20000) },
  ]);
  const parsed = extractJson(result.response.text());
  return Array.isArray(parsed) ? parsed : [];
}

export async function parsePlannerFromText(rawText) {
  const result = await generateWithFallback([
    { text: PLANNER_PROMPT },
    { text: "Document text:\n" + rawText.slice(0, 20000) },
  ]);
  const parsed = extractJson(result.response.text());
  return Array.isArray(parsed) ? parsed : [];
}

const ASSISTANT_SYSTEM_PROMPT = `You are FreshMate AI, a friendly, concise campus assistant for a college student.
You are given the student's live data (timetable, upcoming academic events, attendance summary, holidays) as JSON context.
Use it to answer questions about their schedule, attendance %, exams/deadlines, and whether skipping class on a given day is safe.
Be specific and use the actual numbers/dates given. Keep answers short (2-6 sentences) unless asked for detail.
If the context doesn't contain what's needed to answer, say so plainly instead of guessing.
Never fabricate class times, dates, or attendance numbers that are not present in the context.`;

export async function chatWithAssistant(message, context, history) {
  const contents = [
    {
      role: "user",
      parts: [
        { text: ASSISTANT_SYSTEM_PROMPT },
        { text: "Student data context (JSON):\n" + JSON.stringify(context).slice(0, 12000) },
      ],
    },
    {
      role: "model",
      parts: [{ text: "Understood. I'll use this data to answer the student's questions accurately." }],
    },
    ...(history || []).slice(-10).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];
  const result = await generateWithFallback({ contents });
  return result.response.text().trim();
}

export async function parseImageParts(base64Data, mimeType, kind) {
  const prompt = kind === "timetable" ? TIMETABLE_PROMPT : PLANNER_PROMPT;
  const result = await generateWithFallback([
    { text: prompt },
    {
      inlineData: {
        mimeType: mimeType || "image/png",
        data: base64Data,
      },
    },
  ]);
  const parsed = extractJson(result.response.text());
  return Array.isArray(parsed) ? parsed : [];
}

const RESUME_PROMPT = `You are an ATS (Applicant Tracking System) resume reviewer for a college placement cell.
Analyze the given resume file and return ONLY a JSON object (no markdown fences, no commentary) with this exact shape:
{
  "ats_score": <integer 0-100, how well this resume would pass an automated ATS filter>,
  "detected_skills": ["skill1", "skill2", ...],
  "missing_sections": ["e.g. Projects", "Certifications", ...],
  "skill_gaps": ["skills the target role wants that are missing from the resume"],
  "strengths": ["short strength", ...],
  "suggestions": ["short actionable improvement", ...],
  "summary": "<2-3 sentence overall summary>"
}
If target-role required skills are provided below, base "skill_gaps" on those. Otherwise infer
reasonable expectations from the resume's apparent field.
Be concise and honest. Do not invent facts about the candidate that aren't in the resume.
If the file isn't a resume at all, still return the JSON shape with ats_score 0 and say so in "summary".`;

export async function analyzeResumeFile(base64Data, mimeType, targetRoleSkills) {
  const parts = [{ text: RESUME_PROMPT }];
  if (targetRoleSkills) {
    parts.push({ text: "Target role required skills: " + targetRoleSkills });
  }
  parts.push({
    inlineData: { mimeType: mimeType || "application/pdf", data: base64Data },
  });
  const result = await generateWithFallback(parts);
  const parsed = extractJsonObject(result.response.text());
  return (
    parsed || {
      ats_score: null,
      detected_skills: [],
      missing_sections: [],
      skill_gaps: [],
      strengths: [],
      suggestions: [],
      summary: "Could not analyze this resume — try uploading it again.",
    }
  );
}
