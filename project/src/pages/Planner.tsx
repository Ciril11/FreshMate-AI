import { useEffect, useRef, useState } from "react";
import { ClipboardList, Upload, AlarmClock, FileText, Trash2 } from "lucide-react";
import { PageShell } from "@/components/Shell";
import { Card, SectionTitle, Button, EmptyState, Spinner } from "@/components/ui";
import { getJson, uploadFile, deleteJson } from "@/lib/api";
import { fmtDate, daysUntil } from "@/lib/date";
import type { AcademicEvent } from "@/types";

const TYPE_STYLES: Record<string, string> = {
  exam: "bg-rose-950/60 text-rose-300",
  assignment: "bg-amber-950/60 text-amber-300",
  deadline: "bg-purple-950/60 text-purple-300",
  holiday: "bg-emerald-950/60 text-emerald-300",
};

export default function Planner() {
  const [events, setEvents] = useState<AcademicEvent[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const rows = await getJson<AcademicEvent[]>("/planner");
      setEvents(rows);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    setMsg(null);
    try {
      const res = await uploadFile("/planner/upload", f);
      setMsg(
        `Extracted ${res.inserted_events} event(s) and ${res.inserted_holidays} holiday(s).`
      );
      await load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeEvent(id: number) {
    try {
      await deleteJson(`/planner/${id}`);
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <PageShell
      title="Academic Planner"
      subtitle="Upload your syllabus / exam schedule (PDF or image) — Gemini extracts every event."
      action={
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={onUpload}
            className="hidden"
          />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Spinner /> : <Upload className="h-4 w-4" />}
            {uploading ? "Parsing…" : "Upload Planner"}
          </Button>
        </div>
      }
    >
      {msg && (
        <div className="mb-4 rounded-xl border border-violet-700/50 bg-violet-950/40 px-4 py-3 text-sm text-violet-200">
          {msg}
        </div>
      )}
      {err && (
        <Card className="p-5">
          <p className="text-sm text-rose-400">{err}</p>
        </Card>
      )}
      {events && events.length === 0 && (
        <Card className="p-6">
          <EmptyState
            title="No academic events yet"
            hint="Upload your planner to see exams, assignments, and deadlines here."
            icon={<ClipboardList className="h-10 w-10" />}
          />
        </Card>
      )}
      {events && events.length > 0 && (
        <div className="space-y-3">
          {events.map((ev) => {
            const d = daysUntil(ev.event_date);
            return (
              <Card key={ev.id} className="flex items-center justify-between p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-950/50 text-violet-300">
                    {ev.event_type === "exam" ? (
                      <AlarmClock className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {ev.title}
                    </p>
                    <p className="text-xs text-violet-300/60">
                      {fmtDate(ev.event_date)}
                      {ev.description ? ` · ${ev.description}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${TYPE_STYLES[ev.event_type] || "bg-violet-950/60 text-violet-300"}`}
                  >
                    {ev.event_type}
                  </span>
                  {d >= 0 && d <= 7 && (
                    <span className="rounded-full bg-rose-950/60 px-2 py-0.5 text-[11px] font-semibold text-rose-300">
                      {d === 0 ? "Today" : d === 1 ? "Tomorrow" : `${d}d left`}
                    </span>
                  )}
                  <button
                    onClick={() => removeEvent(ev.id)}
                    className="rounded-lg p-1.5 text-violet-400/60 hover:bg-rose-950/40 hover:text-rose-400"
                    title="Delete event"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
