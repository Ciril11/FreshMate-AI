import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarCheck,
  AlarmClock,
  Plane,
  TrendingUp,
  BookOpen,
  ChevronRight,
  Sparkles,
  PackageSearch,
  Users,
  Map as MapIcon,
  Briefcase,
} from "lucide-react";
import { PageShell } from "@/components/Shell";
import { Card, SectionTitle, EmptyState, Spinner, Button } from "@/components/ui";
import { getJson } from "@/lib/api";
import { DAY_NAMES, fmtTime, fmtDate, daysUntil } from "@/lib/date";
import type {
  TimetableSlot,
  AcademicEvent,
  AttendanceSummaryRow,
} from "@/types";

export default function Dashboard() {
  const navigate = useNavigate();
  const [today, setToday] = useState<TimetableSlot[] | null>(null);
  const [exams, setExams] = useState<AcademicEvent[] | null>(null);
  const [summary, setSummary] = useState<AttendanceSummaryRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getJson<{ slots: TimetableSlot[] }>("/timetable/today"),
      getJson<AcademicEvent[]>("/planner/upcoming-exams"),
      getJson<{ subjects: AttendanceSummaryRow[] }>("/attendance/summary"),
    ])
      .then(([t, e, s]) => {
        setToday(t.slots);
        setExams(e);
        setSummary(s.subjects);
      })
      .catch((e) => setErr(e.message));
  }, []);

  if (err) {
    return (
      <PageShell title="Dashboard" subtitle="Your campus at a glance">
        <Card className="p-6">
          <p className="text-sm text-rose-400">
            Couldn't reach the backend. Is the server running on port 8800 and
            MySQL up?
          </p>
          <p className="mt-2 text-xs text-violet-400/60">{err}</p>
        </Card>
      </PageShell>
    );
  }

  const loading = !today || !exams || !summary;
  const dow = new Date().getDay();
  const overall = summary
    ? summary.reduce(
        (a, s) => {
          a.total += s.total_classes;
          a.attended += s.attended_classes;
          return a;
        },
        { total: 0, attended: 0 }
      )
    : { total: 0, attended: 0 };
  const overallPct =
    overall.total > 0
      ? Math.round((overall.attended / overall.total) * 100)
      : null;

  return (
    <PageShell title="Dashboard" subtitle="Your campus at a glance">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-violet-300/70">
          <Spinner /> Loading…
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {/* Today's classes */}
          <Card
            className="cursor-pointer p-5 transition-colors hover:bg-violet-950/20"
            onClick={() => navigate("/timetable")}
          >
            <SectionTitle
              title="Today's Classes"
              subtitle={DAY_NAMES[dow] + ", " + fmtDate(new Date())}
              icon={<CalendarCheck className="h-5 w-5" />}
            />
            <div className="mt-4 space-y-2">
              {today.length === 0 ? (
                <EmptyState
                  title="No classes scheduled today"
                  hint="Upload your timetable to populate this."
                  icon={<BookOpen className="h-8 w-8" />}
                />
              ) : (
                today.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-violet-900/40 bg-violet-950/30 px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {s.subject}
                      </p>
                      <p className="text-xs text-violet-300/60">
                        {s.room ? `Room ${s.room} · ` : ""}
                        {fmtTime(s.start_time)} – {fmtTime(s.end_time)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-violet-600/60" />
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Upcoming exams */}
          <Card
            className="cursor-pointer p-5 transition-colors hover:bg-amber-950/10"
            onClick={() => navigate("/planner")}
          >
            <SectionTitle
              title="Upcoming Exams"
              subtitle="Next 14 days"
              icon={<AlarmClock className="h-5 w-5" />}
            />
            <div className="mt-4 space-y-2">
              {exams.length === 0 ? (
                <EmptyState
                  title="No exams in the next 14 days"
                  hint="Upload your academic planner to see alerts."
                  icon={<AlarmClock className="h-8 w-8" />}
                />
              ) : (
                exams.map((e) => {
                  const d = daysUntil(e.event_date);
                  return (
                    <div
                      key={e.id}
                      className="flex items-center justify-between rounded-xl border border-amber-900/40 bg-amber-950/20 px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          {e.title}
                        </p>
                        <p className="text-xs text-amber-300/60">
                          {fmtDate(e.event_date)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          d <= 3
                            ? "bg-rose-950/60 text-rose-300"
                            : "bg-amber-950/60 text-amber-300"
                        }`}
                      >
                        {d === 0
                          ? "Today"
                          : d === 1
                          ? "Tomorrow"
                          : `${d} days`}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Attendance overview */}
          <Card
            className="cursor-pointer p-5 transition-colors hover:bg-violet-950/20"
            onClick={() => navigate("/attendance")}
          >
            <SectionTitle
              title="Attendance"
              subtitle="Overall percentage"
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <div className="mt-4">
              {overallPct === null ? (
                <EmptyState
                  title="No attendance recorded yet"
                  hint="Generate a QR session and mark attendance."
                  icon={<TrendingUp className="h-8 w-8" />}
                />
              ) : (
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-20 w-20 items-center justify-center rounded-full text-lg font-bold ${
                      overallPct >= 75
                        ? "bg-emerald-950/50 text-emerald-300"
                        : overallPct >= 60
                        ? "bg-amber-950/50 text-amber-300"
                        : "bg-rose-950/50 text-rose-300"
                    }`}
                  >
                    {overallPct}%
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
                      {overallPct >= 75
                        ? "You're safe — above 75%."
                        : overallPct >= 60
                        ? "Borderline — attend upcoming classes."
                        : "At risk — below 60%."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Quick tip */}
          <Card className="p-5">
            <SectionTitle
              title="Holiday Impact"
              subtitle="Plan around breaks"
              icon={<Plane className="h-5 w-5" />}
            />
            <p className="mt-4 text-sm text-violet-200/70">
              Add holidays and see how a break affects your attendance
              percentage — FreshMate AI tells you whether you're safe to skip.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("/holidays")}
            >
              Check holiday impact
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Card>

          {/* AI assistant promo */}
          <Card
            className="cursor-pointer border-fuchsia-900/40 bg-gradient-to-br from-violet-950/40 to-fuchsia-950/20 p-5 transition-colors hover:from-violet-950/60 hover:to-fuchsia-950/30"
            onClick={() => navigate("/assistant")}
          >
            <SectionTitle
              title="Ask FreshMate AI"
              subtitle="Your data, answered instantly"
              icon={<Sparkles className="h-5 w-5" />}
            />
            <p className="mt-4 text-sm text-violet-200/70">
              "Can I skip class tomorrow?" "How many exams this week?" — chat
              with an assistant that knows your actual schedule.
            </p>
            <Button variant="outline" className="mt-4">
              Open assistant
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Card>

          {/* Lost & Found */}
          <Card
            className="cursor-pointer p-5 transition-colors hover:bg-violet-950/20"
            onClick={() => navigate("/lost-found")}
          >
            <SectionTitle
              title="Lost & Found"
              subtitle="Report or search campus items"
              icon={<PackageSearch className="h-5 w-5" />}
            />
            <p className="mt-4 text-sm text-violet-200/70">
              Lost something on campus, or found an item? Post it on the
              board so it can find its way back.
            </p>
            <Button variant="outline" className="mt-4">
              Open board
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Card>

          {/* Senior Connect */}
          <Card
            className="cursor-pointer p-5 transition-colors hover:bg-violet-950/20"
            onClick={() => navigate("/mentors")}
          >
            <SectionTitle
              title="Senior Connect"
              subtitle="Get guidance from seniors"
              icon={<Users className="h-5 w-5" />}
            />
            <p className="mt-4 text-sm text-violet-200/70">
              Browse senior students by department and expertise, and send a
              request to connect for advice.
            </p>
            <Button variant="outline" className="mt-4">
              Find a mentor
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Card>

          {/* Campus Navigation */}
          <Card
            className="cursor-pointer p-5 transition-colors hover:bg-violet-950/20"
            onClick={() => navigate("/campus-map")}
          >
            <SectionTitle
              title="Campus Navigation"
              subtitle="Find your way around"
              icon={<MapIcon className="h-5 w-5" />}
            />
            <p className="mt-4 text-sm text-violet-200/70">
              Search buildings, classrooms, and facilities, and get Google
              Maps directions straight from campus.
            </p>
            <Button variant="outline" className="mt-4">
              Open map
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Card>

          {/* Placement Hub */}
          <Card
            className="cursor-pointer p-5 transition-colors hover:bg-violet-950/20"
            onClick={() => navigate("/placements")}
          >
            <SectionTitle
              title="Placement Hub"
              subtitle="Companies, applications & resume AI"
              icon={<Briefcase className="h-5 w-5" />}
            />
            <p className="mt-4 text-sm text-violet-200/70">
              Browse company drives, apply and track status, and get your
              resume AI-reviewed for ATS score and skill gaps.
            </p>
            <Button variant="outline" className="mt-4">
              Open placement hub
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
