import { useEffect, useState, useRef } from "react";
import { QrCode, ScanLine, CheckCircle2, XCircle, Plus } from "lucide-react";
import { PageShell } from "@/components/Shell";
import { Card, SectionTitle, Button, EmptyState, Spinner } from "@/components/ui";
import { getJson, postJson } from "@/lib/api";
import type {
  AttendanceSummaryRow,
  AttendanceSession,
  AttendanceRecord,
} from "@/types";

type Tab = "teacher" | "student" | "summary";

export default function Attendance() {
  const [tab, setTab] = useState<Tab>("summary");

  return (
    <PageShell
      title="QR Attendance"
      subtitle="Generate a QR code as a teacher, scan it as a student, and track attendance %."
    >
      <div className="mb-4 flex gap-2 rounded-xl bg-violet-950/40 p-1">
        {(
          [
            { k: "summary", l: "Summary" },
            { k: "teacher", l: "Teacher (Generate QR)" },
            { k: "student", l: "Student (Scan QR)" },
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

      {tab === "summary" && <SummaryTab />}
      {tab === "teacher" && <TeacherTab />}
      {tab === "student" && <StudentTab />}
    </PageShell>
  );
}

function SummaryTab() {
  const [rows, setRows] = useState<AttendanceSummaryRow[] | null>(null);
  const [overall, setOverall] = useState<{
    total: number;
    attended: number;
    percentage: number;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      const res = await getJson<{
        subjects: AttendanceSummaryRow[];
        overall: { total: number; attended: number; percentage: number };
      }>("/attendance/summary");
      setRows(res.subjects);
      setOverall(res.overall);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (err) return <p className="text-sm text-rose-400">{err}</p>;
  if (!rows || !overall)
    return (
      <div className="flex items-center gap-2 text-sm text-violet-300/70">
        <Spinner /> Loading…
      </div>
    );

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionTitle
          title="Overall Attendance"
          icon={<QrCode className="h-5 w-5" />}
        />
        <div className="mt-4 flex items-center gap-4">
          <div
            className={`flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold ${
              overall.percentage >= 75
                ? "bg-emerald-950/50 text-emerald-300"
                : overall.percentage >= 60
                ? "bg-amber-950/50 text-amber-300"
                : "bg-rose-950/50 text-rose-300"
            }`}
          >
            {overall.percentage}%
          </div>
          <div className="text-sm text-violet-200/70">
            <p>
              Attended{" "}
              <span className="font-semibold text-white">
                {overall.attended}
              </span>{" "}
              of {overall.total} classes
            </p>
            <p className="mt-1 text-xs text-violet-400/60">
              {overall.percentage >= 75
                ? "Safe — above 75%."
                : overall.percentage >= 60
                ? "Borderline — attend upcoming classes."
                : "At risk — below 60%."}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">
          Per-subject breakdown
        </h3>
        {rows.length === 0 ? (
          <EmptyState
            title="No attendance yet"
            hint="Generate a QR session and mark attendance to see stats."
            icon={<QrCode className="h-8 w-8" />}
          />
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const pct =
                r.total_classes > 0
                  ? Math.round((r.attended_classes / r.total_classes) * 100)
                  : 0;
              return (
                <div
                  key={r.id}
                  className="rounded-xl border border-violet-900/40 bg-violet-950/30 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">
                      {r.subject}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        pct >= 75
                          ? "bg-emerald-950/60 text-emerald-300"
                          : pct >= 60
                          ? "bg-amber-950/60 text-amber-300"
                          : "bg-rose-950/60 text-rose-300"
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>
                  <p className="text-[11px] text-violet-300/60">
                    {r.attended_classes} / {r.total_classes} classes attended
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function TeacherTab() {
  const [subject, setSubject] = useState("");
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function createSession() {
    if (!subject) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await postJson("/attendance/session", { subject });
      const sessionData: AttendanceSession = { ...res, id: res.session_id };
      setSession(sessionData);
      const recs = await getJson<AttendanceRecord[]>(
        `/attendance/records/${sessionData.id}`
      );
      setRecords(recs);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function refreshRecords() {
    if (!session) return;
    try {
      const recs = await getJson<AttendanceRecord[]>(
        `/attendance/records/${session.id}`
      );
      setRecords(recs);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-5">
        <SectionTitle
          title="Create QR Session"
          subtitle="A QR code valid for 5 minutes"
          icon={<QrCode className="h-5 w-5" />}
        />
        <div className="mt-4 flex gap-2">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject name"
            className="flex-1 rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
          />
          <Button onClick={createSession} disabled={busy || !subject}>
            {busy ? <Spinner /> : <Plus className="h-4 w-4" />}
            Generate
          </Button>
        </div>
        {err && <p className="mt-3 text-sm text-rose-400">{err}</p>}

        {session && (
          <div className="mt-5 flex flex-col items-center">
            <img
              src={session.qr_data_url}
              alt="Attendance QR"
              className="h-56 w-56 rounded-xl border border-violet-800/60 bg-white p-2"
            />
            <p className="mt-2 text-sm font-medium text-white">
              {session.subject}
            </p>
            <p className="text-xs text-violet-300/60">
              Expires {new Date(session.expires_at).toLocaleTimeString()}
            </p>
            <Button
              onClick={refreshRecords}
              variant="outline"
              className="mt-3"
            >
              Refresh attendance list
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <SectionTitle
          title="Marked Students"
          subtitle={`${records.length} present`}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <div className="mt-4 space-y-2">
          {records.length === 0 ? (
            <EmptyState
              title="No one has scanned yet"
              hint="Ask students to scan the QR code."
              icon={<ScanLine className="h-8 w-8" />}
            />
          ) : (
            records.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-emerald-900/40 bg-emerald-950/20 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {r.student_name}
                  </p>
                  <p className="text-[11px] text-emerald-300/60">
                    ID: {r.student_id}
                  </p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function StudentTab() {
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<
    { ok: boolean; msg: string } | null
  >(null);
  const [err, setErr] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const html5Ref = useRef<HTMLDivElement>(null);

  async function startScan() {
    if (!studentId || !studentName) {
      setErr("Enter your student ID and name first.");
      return;
    }
    setErr(null);
    setResult(null);
    setScanning(true);

    const { Html5Qrcode } = await import("html5-qrcode");
    const elId = "qr-reader";
    if (!document.getElementById(elId) && html5Ref.current) {
      const d = document.createElement("div");
      d.id = elId;
      html5Ref.current.appendChild(d);
    }
    const scanner = new Html5Qrcode(elId);
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      async (decodedText) => {
        try {
          await scanner.stop();
          scanner.clear();
        } catch {
          /* ignore */
        }
        setScanning(false);
        try {
          const payload = JSON.parse(decodedText);
          const res = await postJson("/attendance/mark", {
            token: payload.token,
            student_id: studentId,
            student_name: studentName,
          });
          setResult({
            ok: true,
            msg: `Marked present for ${res.subject} (${res.session_date})`,
          });
        } catch (e: any) {
          setResult({ ok: false, msg: e.message });
        }
      },
      () => {
        /* per-frame error, ignore */
      }
    );
  }

  function stopScan() {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => scannerRef.current.clear())
        .catch(() => {})
        .finally(() => setScanning(false));
    } else {
      setScanning(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-5">
        <SectionTitle
          title="Your Details"
          subtitle="Enter your info before scanning"
          icon={<ScanLine className="h-5 w-5" />}
        />
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-violet-300/70">
              Student ID
            </label>
            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g. CS21B045"
              className="mt-1 w-full rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-violet-300/70">
              Name
            </label>
            <input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Your name"
              className="mt-1 w-full rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
            />
          </div>
          {!scanning ? (
            <Button onClick={startScan} disabled={!studentId || !studentName}>
              <ScanLine className="h-4 w-4" /> Start Scanning
            </Button>
          ) : (
            <Button onClick={stopScan} variant="danger">
              <XCircle className="h-4 w-4" /> Stop
            </Button>
          )}
          {err && <p className="text-sm text-rose-400">{err}</p>}
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle
          title="QR Scanner"
          subtitle="Point your camera at the attendance QR"
          icon={<QrCode className="h-5 w-5" />}
        />
        <div ref={html5Ref} className="mt-4 min-h-[240px]" />
        {result && (
          <div
            className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${
              result.ok
                ? "bg-emerald-950/40 text-emerald-300 border border-emerald-900/40"
                : "bg-rose-950/40 text-rose-300 border border-rose-900/40"
            }`}
          >
            {result.ok ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {result.msg}
          </div>
        )}
      </Card>
    </div>
  );
}
