import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Trash2, Bot, User } from "lucide-react";
import { PageShell } from "@/components/Shell";
import { Card, Button, Spinner } from "@/components/ui";
import { getJson, postJson, deleteJson } from "@/lib/api";

interface ChatMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

const SUGGESTIONS = [
  "What's my attendance percentage?",
  "Do I have any exams this week?",
  "Can I safely skip class tomorrow?",
  "What's on my timetable today?",
];

export default function Assistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadHistory() {
    try {
      const rows = await getJson<ChatMessage[]>("/assistant/history");
      setMessages(rows);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || loading) return;
    setErr(null);
    setInput("");
    const nextHistory = [...messages, { role: "user" as const, content: message }];
    setMessages(nextHistory);
    setLoading(true);
    try {
      const res = await postJson("/assistant/chat", {
        message,
        history: nextHistory.map((m) => ({ role: m.role, content: m.content })),
      });
      setMessages((cur) => [...cur, { role: "assistant", content: res.reply }]);
    } catch (e: any) {
      setErr(e.message);
      setMessages((cur) => cur.slice(0, -1));
      setInput(message);
    } finally {
      setLoading(false);
    }
  }

  async function clearHistory() {
    try {
      await deleteJson("/assistant/history");
      setMessages([]);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <PageShell
      title="AI Assistant"
      subtitle="Ask about your schedule, attendance, or upcoming deadlines."
      action={
        messages.length > 0 ? (
          <Button variant="outline" onClick={clearHistory}>
            <Trash2 className="h-4 w-4" /> Clear chat
          </Button>
        ) : null
      }
    >
      <Card className="flex h-[70vh] flex-col p-0">
        <div className="flex-1 overflow-y-auto p-5">
          {historyLoading ? (
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/20">
                <Sparkles className="h-6 w-6 text-violet-300" />
              </div>
              <p className="text-sm font-medium text-white">
                Ask FreshMate AI anything about campus life
              </p>
              <p className="mt-1 max-w-sm text-xs text-violet-300/60">
                It knows your timetable, exams, holidays, and attendance —
                grounded in your actual data.
              </p>
              <div className="mt-5 grid w-full max-w-md gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-xl border border-violet-900/40 bg-violet-950/20 px-3 py-2.5 text-left text-xs text-violet-200 hover:border-violet-700 hover:bg-violet-900/30"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, i) => (
                <div
                  key={m.id ?? i}
                  className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      m.role === "user"
                        ? "bg-violet-600/30 text-violet-200"
                        : "bg-fuchsia-600/20 text-fuchsia-300"
                    }`}
                  >
                    {m.role === "user" ? (
                      <User className="h-3.5 w-3.5" />
                    ) : (
                      <Bot className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${
                      m.role === "user"
                        ? "bg-violet-600/90 text-white"
                        : "border border-violet-900/40 bg-violet-950/30 text-violet-100"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fuchsia-600/20 text-fuchsia-300">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex items-center rounded-2xl border border-violet-900/40 bg-violet-950/30 px-3.5 py-2.5">
                    <Spinner />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {err && (
          <p className="border-t border-rose-900/40 bg-rose-950/20 px-5 py-2 text-xs text-rose-400">
            {err}
          </p>
        )}

        <div className="flex items-center gap-2 border-t border-violet-900/40 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask about your schedule, exams, or attendance…"
            className="flex-1 rounded-xl border border-violet-800/60 bg-violet-950/30 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
          />
          <Button onClick={() => send()} disabled={loading || !input.trim()}>
            {loading ? <Spinner /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </Card>
    </PageShell>
  );
}
