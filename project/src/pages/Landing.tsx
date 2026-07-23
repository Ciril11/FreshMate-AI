import { useNavigate } from "react-router-dom";
import {
  Plane,
  CalendarCheck,
  AlarmClock,
  TrendingUp,
  QrCode,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: CalendarCheck,
    title: "Today's Classes",
    desc: "Upload your timetable once — FreshMate tells you exactly what's on today.",
  },
  {
    icon: AlarmClock,
    title: "Exam Alerts",
    desc: "Your academic planner, parsed by AI — never miss an approaching exam.",
  },
  {
    icon: TrendingUp,
    title: "Attendance Impact",
    desc: "Mark holidays and see exactly how a break affects your attendance %.",
  },
  {
    icon: QrCode,
    title: "QR Attendance",
    desc: "Generate and scan QR codes for instant, tamper-proof attendance.",
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Ambient violet gradient backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-violet-700/30 blur-3xl" />
        <div className="absolute top-1/4 -right-32 h-96 w-96 rounded-full bg-purple-700/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-fuchsia-700/15 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-700/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-6">
        {/* Nav */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 shadow-lg shadow-violet-900/50">
              <Plane className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">FreshMate AI</span>
          </div>
          <button
            onClick={() => navigate("/auth")}
            className="rounded-xl border border-violet-700/50 px-4 py-2 text-sm font-medium text-violet-200 transition-colors hover:bg-violet-900/40"
          >
            Sign in
          </button>
        </header>

        {/* Hero */}
        <main className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-700/40 bg-violet-950/40 px-4 py-1.5 text-xs font-medium text-violet-200">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered campus assistant
          </div>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            Your campus life,{" "}
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              effortlessly organized
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-violet-200/70 md:text-lg">
            FreshMate AI reads your timetable and academic planner, reminds you
            of exams, predicts how holidays affect your attendance, and runs
            QR-based attendance — all in one place.
          </p>

          <button
            onClick={() => navigate("/auth")}
            className="group mt-8 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-7 py-3.5 text-base font-semibold text-white shadow-xl shadow-violet-900/50 transition-all hover:bg-violet-500 hover:shadow-violet-700/50"
          >
            Get Started
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </main>

        {/* Feature grid */}
        <section className="grid gap-4 pb-10 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-violet-900/50 bg-violet-950/30 p-5 backdrop-blur-sm transition-colors hover:bg-violet-900/30"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-300">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-white">{f.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-violet-300/60">
                {f.desc}
              </p>
            </div>
          ))}
        </section>

        <footer className="py-4 text-center text-xs text-violet-500/50">
          FreshMate AI · Built for the hackathon
        </footer>
      </div>
    </div>
  );
}
