import { useEffect, useRef, useState } from "react";
import { CalendarDays, Upload } from "lucide-react";
import { PageShell } from "@/components/Shell";
import { Card, SectionTitle, Button, EmptyState, Spinner } from "@/components/ui";
import { getJson, uploadFile } from "@/lib/api";
import { DAY_NAMES, fmtTime } from "@/lib/date";
import type { TimetableSlot } from "@/types";

export default function Timetable() {
  const [slots, setSlots] = useState<TimetableSlot[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const rows = await getJson<TimetableSlot[]>("/timetable");
      setSlots(rows);
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
      const res = await uploadFile("/timetable/upload", f);
      setMsg(
        `Parsed ${res.inserted} class${res.inserted === 1 ? "" : "es"} from your file.`
      );
      await load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const grouped: Record<number, TimetableSlot[]> = {};
  if (slots) {
    for (const s of slots) {
      (grouped[s.day_of_week] ||= []).push(s);
    }
  }

  return (
    <PageShell
      title="Timetable"
      subtitle="Upload your class schedule (PDF or image) — Gemini extracts it automatically."
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
            {uploading ? "Parsing…" : "Upload Timetable"}
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
      {slots && slots.length === 0 && (
        <Card className="p-6">
          <EmptyState
            title="No timetable uploaded yet"
            hint="Click 'Upload Timetable' to parse a PDF or photo of your schedule."
            icon={<CalendarDays className="h-10 w-10" />}
          />
        </Card>
      )}
      {slots && slots.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 7 }).map((_, dow) => {
            const daySlots = grouped[dow] || [];
            return (
              <Card key={dow} className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">
                    {DAY_NAMES[dow]}
                  </h3>
                  <span className="rounded-full bg-violet-950/50 px-2 py-0.5 text-[11px] text-violet-300/70">
                    {daySlots.length} class{daySlots.length === 1 ? "" : "es"}
                  </span>
                </div>
                {daySlots.length === 0 ? (
                  <p className="text-xs text-violet-500/50">Free day</p>
                ) : (
                  <div className="space-y-2">
                    {daySlots
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map((s) => (
                        <div
                          key={s.id}
                          className="rounded-lg border border-violet-900/40 bg-violet-950/30 px-3 py-2"
                        >
                          <p className="text-sm font-medium text-white">
                            {s.subject}
                          </p>
                          <p className="text-[11px] text-violet-300/60">
                            {fmtTime(s.start_time)} – {fmtTime(s.end_time)}
                            {s.room ? ` · Room ${s.room}` : ""}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
