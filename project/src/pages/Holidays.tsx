import { useEffect, useState } from "react";
import { Plane, Plus, Trash2, AlertTriangle, TrendingUp } from "lucide-react";
import { PageShell } from "@/components/Shell";
import { Card, SectionTitle, Button, EmptyState, Spinner } from "@/components/ui";
import { getJson, postJson, deleteJson } from "@/lib/api";
import { fmtDate } from "@/lib/date";
import type { Holiday, ImpactResult } from "@/types";

export default function Holidays() {
  const [holidays, setHolidays] = useState<Holiday[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [saving, setSaving] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [impact, setImpact] = useState<ImpactResult | null>(null);
  const [impactErr, setImpactErr] = useState<string | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);

  async function load() {
    try {
      const rows = await getJson<Holiday[]>("/holidays");
      setHolidays(rows);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addHoliday() {
    if (!newDate || !newReason) return;
    setSaving(true);
    try {
      await postJson("/holidays", {
        holiday_date: newDate,
        reason: newReason,
      });
      setNewDate("");
      setNewReason("");
      setShowAdd(false);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeHoliday(id: number) {
    try {
      await deleteJson(`/holidays/${id}`);
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function checkImpact() {
    if (!startDate || !endDate) return;
    setImpactLoading(true);
    setImpactErr(null);
    setImpact(null);
    try {
      const res = await getJson<ImpactResult>(
        `/holidays/impact?start_date=${startDate}&end_date=${endDate}`
      );
      setImpact(res);
    } catch (e: any) {
      setImpactErr(e.message);
    } finally {
      setImpactLoading(false);
    }
  }

  return (
    <PageShell
      title="Holidays & Attendance Impact"
      subtitle="Mark holidays and see how a break affects your attendance percentage."
      action={
        <Button onClick={() => setShowAdd((v) => !v)} variant="outline">
          <Plus className="h-4 w-4" /> Add Holiday
        </Button>
      }
    >
      {showAdd && (
        <Card className="mb-4 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-violet-300/70">Date</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-violet-300/70">Reason</label>
              <input
                type="text"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="e.g. Festival"
                className="mt-1 w-full rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addHoliday} disabled={saving}>
                {saving ? <Spinner /> : null}
                Save
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle
            title="Holidays"
            subtitle="Marked from your planner or added manually"
            icon={<Plane className="h-5 w-5" />}
          />
          <div className="mt-4 space-y-2">
            {err && <p className="text-sm text-rose-400">{err}</p>}
            {holidays && holidays.length === 0 && (
              <EmptyState
                title="No holidays marked yet"
                hint="Upload your academic planner or add one manually."
                icon={<Plane className="h-8 w-8" />}
              />
            )}
            {holidays &&
              holidays.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-xl border border-emerald-900/40 bg-emerald-950/20 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {h.reason}
                    </p>
                    <p className="text-xs text-emerald-300/60">
                      {fmtDate(h.holiday_date)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeHoliday(h.id)}
                    className="rounded-lg p-1.5 text-violet-400/60 hover:bg-rose-950/40 hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle
            title="Attendance Impact"
            subtitle="Pick a holiday range (e.g. Mon–Wed)"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-violet-300/70">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-violet-300/70">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
              />
            </div>
          </div>
          <div className="mt-3">
            <Button onClick={checkImpact} disabled={impactLoading || !startDate || !endDate}>
              {impactLoading ? <Spinner /> : <TrendingUp className="h-4 w-4" />}
              Calculate Impact
            </Button>
          </div>

          {impactErr && (
            <p className="mt-3 text-sm text-rose-400">{impactErr}</p>
          )}

          {impact && (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-violet-900/40 bg-violet-950/30 p-3">
                <p className="text-xs text-violet-300/60">Current attendance</p>
                <p className="text-2xl font-bold text-white">
                  {impact.current_attendance_pct}%
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/30 p-3">
                  <p className="text-[11px] font-medium text-emerald-300">
                    If official holiday
                  </p>
                  <p className="text-xl font-bold text-emerald-300">
                    {impact.if_holidays_official.new_attendance_pct}%
                  </p>
                  <p className="text-[11px] text-emerald-400/60">
                    {impact.if_holidays_official.delta >= 0 ? "+" : ""}
                    {impact.if_holidays_official.delta}%
                  </p>
                </div>
                <div className="rounded-xl border border-rose-900/40 bg-rose-950/30 p-3">
                  <p className="text-[11px] font-medium text-rose-300">
                    If counted as absent
                  </p>
                  <p className="text-xl font-bold text-rose-300">
                    {impact.if_treated_as_absent.new_attendance_pct}%
                  </p>
                  <p className="text-[11px] text-rose-400/60">
                    {impact.if_treated_as_absent.delta >= 0 ? "+" : ""}
                    {impact.if_treated_as_absent.delta}%
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-amber-950/30 border border-amber-900/40 px-3 py-2.5 text-xs text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{impact.recommendation}</p>
              </div>
              {impact.skipped_classes > 0 && (
                <div className="text-xs text-violet-300/60">
                  <p className="font-medium">Skipped classes by subject:</p>
                  <ul className="mt-1 space-y-0.5">
                    {Object.entries(impact.skipped_by_subject).map(
                      ([subj, n]) => (
                        <li key={subj}>
                          {subj}: {n}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
