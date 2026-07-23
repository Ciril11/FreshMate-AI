import { useEffect, useRef, useState } from "react";
import {
  Briefcase,
  Search,
  Plus,
  Building2,
  Calendar,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Upload,
  FileText,
  Sparkles,
} from "lucide-react";
import { PageShell } from "@/components/Shell";
import { Card, SectionTitle, Button, EmptyState, Spinner } from "@/components/ui";
import { getJson, postJson, uploadFile } from "@/lib/api";
import { fmtDate, daysUntil } from "@/lib/date";
import type {
  PlacementCompany,
  StudentApplication,
  ResumeAnalysis,
  ResumeRecord,
} from "@/types";

type Tab = "companies" | "applications" | "resume";

const PROFILE_NAME_KEY = "freshmate_student_name";
const PROFILE_CONTACT_KEY = "freshmate_student_contact";

function useStudentProfile() {
  const [studentName, setStudentName] = useState(
    () => localStorage.getItem(PROFILE_NAME_KEY) || ""
  );
  const [studentContact, setStudentContact] = useState(
    () => localStorage.getItem(PROFILE_CONTACT_KEY) || ""
  );
  useEffect(() => {
    localStorage.setItem(PROFILE_NAME_KEY, studentName);
  }, [studentName]);
  useEffect(() => {
    localStorage.setItem(PROFILE_CONTACT_KEY, studentContact);
  }, [studentContact]);
  return { studentName, setStudentName, studentContact, setStudentContact };
}

export default function PlacementHub() {
  const [tab, setTab] = useState<Tab>("companies");
  const profile = useStudentProfile();

  return (
    <PageShell
      title="Placement Hub"
      subtitle="Browse company drives, track your applications, and get your resume AI-reviewed."
    >
      <div className="mb-4 flex gap-2 rounded-xl bg-violet-950/40 p-1">
        {(
          [
            { k: "companies", l: "Companies" },
            { k: "applications", l: "My Applications" },
            { k: "resume", l: "Resume Analyzer" },
          ] as { k: Tab; l: string }[]
        ).map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.k
                ? "bg-violet-600 text-white shadow-sm"
                : "text-violet-300/70 hover:text-violet-200"
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {tab === "companies" && <CompaniesTab profile={profile} />}
      {tab === "applications" && <ApplicationsTab profile={profile} />}
      {tab === "resume" && <ResumeTab profile={profile} />}
    </PageShell>
  );
}

type Profile = ReturnType<typeof useStudentProfile>;

function ProfileFields({ profile }: { profile: Profile }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <input
        value={profile.studentName}
        onChange={(e) => profile.setStudentName(e.target.value)}
        placeholder="Your name"
        className="rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
      />
      <input
        value={profile.studentContact}
        onChange={(e) => profile.setStudentContact(e.target.value)}
        placeholder="Your email or phone"
        className="rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
      />
    </div>
  );
}

/* ---------------- Companies tab ---------------- */

function CompaniesTab({ profile }: { profile: Profile }) {
  const [companies, setCompanies] = useState<PlacementCompany[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [packageLpa, setPackageLpa] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [eligibility, setEligibility] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");

  async function load() {
    try {
      const qs = query ? `?q=${encodeURIComponent(query)}` : "";
      const rows = await getJson<PlacementCompany[]>(`/placements${qs}`);
      setCompanies(rows);
    } catch (e: any) {
      setErr(e.message);
      setCompanies([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addCompany() {
    if (!name || !role) return;
    setSaving(true);
    try {
      await postJson("/placements", {
        name,
        role,
        package_lpa: packageLpa || null,
        required_skills: requiredSkills || null,
        eligibility: eligibility || null,
        deadline: deadline || null,
        description: description || null,
      });
      setName("");
      setRole("");
      setPackageLpa("");
      setRequiredSkills("");
      setEligibility("");
      setDeadline("");
      setDescription("");
      setShowAdd(false);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function apply(companyId: number) {
    if (!profile.studentName || !profile.studentContact) {
      setApplyingId(companyId);
      return;
    }
    try {
      await postJson("/placements/apply", {
        company_id: companyId,
        student_name: profile.studentName,
        student_contact: profile.studentContact,
      });
      setAppliedIds((s) => new Set(s).add(companyId));
      setApplyingId(null);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-500/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Search company, role, or skill..."
            className="w-full rounded-lg border border-violet-800/60 bg-violet-950/30 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
          />
        </div>
        <Button variant="outline" onClick={load}>
          Search
        </Button>
        <Button variant="outline" onClick={() => setShowAdd((v) => !v)}>
          <Plus className="h-4 w-4" /> Add company
        </Button>
      </div>

      {showAdd && (
        <Card className="mb-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Company name"
              className="rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
            />
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Role, e.g. SDE Intern"
              className="rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
            />
            <input
              value={packageLpa}
              onChange={(e) => setPackageLpa(e.target.value)}
              placeholder="Package (LPA)"
              className="rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
            />
            <input
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              type="date"
              className="rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
            />
            <input
              value={requiredSkills}
              onChange={(e) => setRequiredSkills(e.target.value)}
              placeholder="Required skills (comma separated)"
              className="sm:col-span-2 rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
            />
            <input
              value={eligibility}
              onChange={(e) => setEligibility(e.target.value)}
              placeholder="Eligibility (e.g. CGPA 7.0+, no backlogs)"
              className="sm:col-span-2 rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
              className="sm:col-span-2 rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
            />
          </div>
          <Button
            className="mt-3"
            onClick={addCompany}
            disabled={saving || !name || !role}
          >
            {saving ? <Spinner /> : null}
            Post opening
          </Button>
        </Card>
      )}

      {err && (
        <p className="mb-4 rounded-xl border border-rose-900/40 bg-rose-950/20 px-4 py-2 text-sm text-rose-400">
          {err}
        </p>
      )}

      {companies === null ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : companies.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            title="No openings posted yet"
            hint="Post the first company drive to get started."
            icon={<Briefcase className="h-8 w-8" />}
          />
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {companies.map((c) => {
            const d = c.deadline ? daysUntil(c.deadline) : null;
            const applied = appliedIds.has(c.id);
            return (
              <Card key={c.id} className="p-5">
                <SectionTitle
                  title={c.name}
                  subtitle={c.role}
                  icon={<Building2 className="h-5 w-5" />}
                />
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {c.package_lpa && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/60 px-2 py-0.5 font-medium text-emerald-300">
                      <IndianRupee className="h-3 w-3" /> {c.package_lpa} LPA
                    </span>
                  )}
                  {c.deadline && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-950/60 px-2 py-0.5 font-medium text-violet-300">
                      <Calendar className="h-3 w-3" /> {fmtDate(c.deadline)}
                      {d !== null && d >= 0 ? ` (${d}d left)` : ""}
                    </span>
                  )}
                  {c.status === "closed" && (
                    <span className="rounded-full bg-rose-950/60 px-2 py-0.5 font-medium text-rose-300">
                      Closed
                    </span>
                  )}
                </div>
                {c.required_skills && (
                  <p className="mt-3 text-xs font-medium text-violet-300/80">
                    {c.required_skills}
                  </p>
                )}
                {c.eligibility && (
                  <p className="mt-1 text-xs text-violet-400/60">{c.eligibility}</p>
                )}
                {c.description && (
                  <p className="mt-2 text-sm text-violet-200/70">{c.description}</p>
                )}

                {applyingId === c.id && !applied && (
                  <div className="mt-3 space-y-2 rounded-xl border border-violet-900/40 bg-violet-950/20 p-3">
                    <ProfileFields profile={profile} />
                  </div>
                )}

                <Button
                  variant={applied ? "outline" : "primary"}
                  className="mt-4 w-full justify-center"
                  disabled={applied || c.status === "closed"}
                  onClick={() => apply(c.id)}
                >
                  {applied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Applied
                    </>
                  ) : c.status === "closed" ? (
                    "Closed"
                  ) : (
                    "Apply"
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ---------------- Applications tab ---------------- */

const STATUS_STYLES: Record<string, string> = {
  applied: "bg-violet-950/60 text-violet-300",
  shortlisted: "bg-amber-950/60 text-amber-300",
  selected: "bg-emerald-950/60 text-emerald-300",
  rejected: "bg-rose-950/60 text-rose-300",
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  applied: Clock,
  shortlisted: Award,
  selected: CheckCircle2,
  rejected: XCircle,
};

function ApplicationsTab({ profile }: { profile: Profile }) {
  const [apps, setApps] = useState<StudentApplication[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!profile.studentContact) {
      setApps([]);
      return;
    }
    try {
      const rows = await getJson<StudentApplication[]>(
        `/placements/status?student_contact=${encodeURIComponent(profile.studentContact)}`
      );
      setApps(rows);
    } catch (e: any) {
      setErr(e.message);
      setApps([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.studentContact]);

  return (
    <Card className="p-5">
      <SectionTitle
        title="My Applications"
        subtitle="Track the status of every drive you've applied to"
        icon={<Briefcase className="h-5 w-5" />}
      />

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-violet-300/70">
          Enter your contact to look up applications
        </p>
        <ProfileFields profile={profile} />
      </div>

      {err && <p className="mt-4 text-sm text-rose-400">{err}</p>}

      <div className="mt-4 space-y-2">
        {!profile.studentContact ? (
          <EmptyState
            title="Add your contact info above"
            hint="We'll use it to find applications tied to you."
            icon={<Briefcase className="h-8 w-8" />}
          />
        ) : apps === null ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : apps.length === 0 ? (
          <EmptyState
            title="No applications yet"
            hint="Apply to a company from the Companies tab to see it here."
            icon={<Briefcase className="h-8 w-8" />}
          />
        ) : (
          apps.map((a) => {
            const Icon = STATUS_ICONS[a.status] || Clock;
            return (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-violet-900/40 bg-violet-950/10 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {a.company_name}
                  </p>
                  <p className="truncate text-xs text-violet-300/60">
                    {a.company_role} · Applied {fmtDate(a.applied_at)}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                    STATUS_STYLES[a.status] || "bg-violet-950/60 text-violet-300"
                  }`}
                >
                  <Icon className="h-3 w-3" /> {a.status}
                </span>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

/* ---------------- Resume analyzer tab ---------------- */

function ScoreGauge({ score }: { score: number | null }) {
  if (score === null) return null;
  const color =
    score >= 75 ? "#34d399" : score >= 50 ? "#fbbf24" : "#fb7185";
  const circumference = 2 * Math.PI * 45;
  const offset = circumference * (1 - score / 100);
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#2e1065" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{score}</span>
        <span className="text-[10px] text-violet-300/70">ATS score</span>
      </div>
    </div>
  );
}

function AnalysisList({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-300/60">
        {title}
      </p>
      <ul className="mt-1.5 space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-violet-200/80">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResumeTab({ profile }: { profile: Profile }) {
  const [targetSkills, setTargetSkills] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [history, setHistory] = useState<ResumeRecord[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadHistory() {
    if (!profile.studentContact) {
      setHistory([]);
      return;
    }
    try {
      const rows = await getJson<ResumeRecord[]>(
        `/resume/history?student_contact=${encodeURIComponent(profile.studentContact)}`
      );
      setHistory(rows);
    } catch (e: any) {
      setHistory([]);
    }
  }

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.studentContact]);

  async function handleFile(file: File) {
    if (!profile.studentName || !profile.studentContact) {
      setErr("Add your name and contact info first.");
      return;
    }
    setAnalyzing(true);
    setErr(null);
    setAnalysis(null);
    try {
      const res = await uploadFile("/resume/upload", file, {
        student_name: profile.studentName,
        student_contact: profile.studentContact,
        target_skills: targetSkills,
      });
      setAnalysis(res.analysis);
      await loadHistory();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-5">
        <SectionTitle
          title="Upload Resume"
          subtitle="Get an instant AI-powered ATS review"
          icon={<FileText className="h-5 w-5" />}
        />

        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-violet-300/70">Your details</p>
          <ProfileFields profile={profile} />
        </div>

        <input
          value={targetSkills}
          onChange={(e) => setTargetSkills(e.target.value)}
          placeholder="Optional: target role skills (e.g. React, SQL, DSA)"
          className="mt-2 w-full rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
        />

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button
          className="mt-4 w-full justify-center"
          onClick={() => fileInputRef.current?.click()}
          disabled={analyzing || !profile.studentName || !profile.studentContact}
        >
          {analyzing ? <Spinner /> : <Upload className="h-4 w-4" />}
          {analyzing ? "Analyzing..." : "Upload resume (PDF or image)"}
        </Button>

        {err && <p className="mt-3 text-sm text-rose-400">{err}</p>}

        {history && history.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-300/60">
              Previous uploads
            </p>
            <div className="space-y-1.5">
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setAnalysis(h.analysis)}
                  className="flex w-full items-center justify-between rounded-lg border border-violet-900/40 bg-violet-950/10 px-3 py-2 text-left hover:bg-violet-900/20"
                >
                  <span className="truncate text-xs text-violet-200/80">
                    {h.file_name || "Resume"} · {fmtDate(h.created_at)}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-violet-300">
                    {h.ats_score ?? "-"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <SectionTitle
          title="Analysis"
          subtitle="Powered by Gemini"
          icon={<Sparkles className="h-5 w-5" />}
        />
        {!analysis ? (
          <div className="mt-6">
            <EmptyState
              title="No analysis yet"
              hint="Upload a resume to see your ATS score and feedback here."
              icon={<Sparkles className="h-8 w-8" />}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            <div className="flex items-center gap-5">
              <ScoreGauge score={analysis.ats_score} />
              <p className="text-sm text-violet-200/80">{analysis.summary}</p>
            </div>
            <AnalysisList title="Detected skills" items={analysis.detected_skills} />
            <AnalysisList title="Missing sections" items={analysis.missing_sections} />
            <AnalysisList title="Skill gaps" items={analysis.skill_gaps} />
            <AnalysisList title="Strengths" items={analysis.strengths} />
            <AnalysisList title="Suggestions" items={analysis.suggestions} />
          </div>
        )}
      </Card>
    </div>
  );
}
