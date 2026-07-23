import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  User as UserIcon,
  ArrowLeft,
} from "lucide-react";
import { postJson } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui";

type Mode = "login" | "register";

export default function Auth() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const body =
        mode === "register"
          ? { name, email, password }
          : { email, password };
      const res = await postJson(`/auth/${mode}`, body);
      login(res.token, res.user);
      navigate("/");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-black">
      {/* Left — poster */}
      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-gradient-to-br from-violet-950 via-black to-fuchsia-950/60 lg:flex">
        <img
          src="/images/Gemini_poster.png"
          alt="FreshMate AI poster"
          className="max-h-[88%] max-w-[78%] rounded-2xl object-contain shadow-2xl shadow-violet-950/60"
        />
        {/* subtle violet overlay for cohesion */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-violet-950/40 via-transparent to-fuchsia-950/20" />
      </div>

      {/* Right — form */}
      <div className="relative flex w-full flex-col justify-center px-6 py-10 lg:w-1/2 lg:px-16">
        {/* ambient glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-10 h-72 w-72 rounded-full bg-violet-700/20 blur-3xl" />
          <div className="absolute bottom-0 -left-10 h-72 w-72 rounded-full bg-purple-700/15 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-sm">
          <button
            onClick={() => navigate("/")}
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-violet-300/70 hover:text-violet-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </button>

          <h1 className="text-2xl font-bold text-white">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-violet-300/70">
            {mode === "login"
              ? "Sign in to access your campus dashboard."
              : "Sign up to start managing your campus life."}
          </p>

          {/* Mode toggle */}
          <div className="mt-6 flex gap-2 rounded-xl bg-violet-950/50 p-1">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                mode === "login"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-violet-300/70 hover:text-violet-200"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                mode === "register"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-violet-300/70 hover:text-violet-200"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-3">
            {mode === "register" && (
              <div>
                <label className="text-xs font-medium text-violet-300/70">
                  Full name
                </label>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-violet-800/60 bg-violet-950/30 px-3 py-2.5 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500">
                  <UserIcon className="h-4 w-4 text-violet-400/70" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    type="text"
                    placeholder="Your name"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-violet-500/50"
                    required
                  />
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-violet-300/70">Email</label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-violet-800/60 bg-violet-950/30 px-3 py-2.5 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500">
                <Mail className="h-4 w-4 text-violet-400/70" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="you@college.edu"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-violet-500/50"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-violet-300/70">
                Password
              </label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-violet-800/60 bg-violet-950/30 px-3 py-2.5 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500">
                <Lock className="h-4 w-4 text-violet-400/70" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder={mode === "register" ? "Min 6 characters" : "••••••••"}
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-violet-500/50"
                  required
                />
              </div>
            </div>

            {err && (
              <p className="rounded-lg bg-rose-950/50 border border-rose-900/50 px-3 py-2 text-xs text-rose-300">
                {err}
              </p>
            )}

            <Button type="submit" disabled={busy} className="w-full">
              {busy
                ? "Please wait…"
                : mode === "login"
                ? "Sign in"
                : "Create account"}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-violet-300/60">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => setMode("register")}
                  className="font-medium text-violet-300 hover:underline"
                >
                  Register
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="font-medium text-violet-300 hover:underline"
                >
                  Login
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
