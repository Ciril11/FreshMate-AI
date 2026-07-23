import { useEffect, useState } from "react";
import { Users, Send, GraduationCap, Mail } from "lucide-react";
import { PageShell } from "@/components/Shell";
import { Card, SectionTitle, Button, EmptyState, Spinner } from "@/components/ui";
import { getJson, postJson } from "@/lib/api";
import type { Mentor } from "@/types";

export default function Mentors() {
  const [mentors, setMentors] = useState<Mentor[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [openMentor, setOpenMentor] = useState<Mentor | null>(null);
  const [requesterName, setRequesterName] = useState("");
  const [requesterContact, setRequesterContact] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sentFor, setSentFor] = useState<number | null>(null);

  async function load() {
    try {
      const rows = await getJson<Mentor[]>("/mentors");
      setMentors(rows);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openConnect(mentor: Mentor) {
    setOpenMentor(mentor);
    setMessage("");
    setSentFor(null);
  }

  async function sendRequest() {
    if (!openMentor || !requesterName || !requesterContact) return;
    setSending(true);
    setErr(null);
    try {
      await postJson(`/mentors/${openMentor.id}/connect`, {
        requester_name: requesterName,
        requester_contact: requesterContact,
        message: message || null,
      });
      setSentFor(openMentor.id);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <PageShell
      title="Senior Connect"
      subtitle="Reach out to senior students for guidance on courses, placements, and campus life."
    >
      {err && (
        <p className="mb-4 rounded-xl border border-rose-900/40 bg-rose-950/20 px-4 py-2 text-sm text-rose-400">
          {err}
        </p>
      )}

      {mentors === null ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : mentors.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            title="No mentors listed yet"
            hint="Check back soon — seniors will be added here."
            icon={<Users className="h-8 w-8" />}
          />
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {mentors.map((m) => (
            <Card key={m.id} className="p-5">
              <SectionTitle
                title={m.name}
                subtitle={[m.department, m.year].filter(Boolean).join(" · ")}
                icon={<GraduationCap className="h-5 w-5" />}
              />
              {m.expertise && (
                <p className="mt-3 text-xs font-medium text-violet-300/80">
                  {m.expertise}
                </p>
              )}
              {m.bio && (
                <p className="mt-2 text-sm text-violet-200/70">{m.bio}</p>
              )}

              {openMentor?.id === m.id ? (
                <div className="mt-4 space-y-2 rounded-xl border border-violet-900/40 bg-violet-950/20 p-3">
                  {sentFor === m.id ? (
                    <p className="text-sm text-emerald-300">
                      Request sent! {m.name.split(" ")[0]} will reach out to you directly.
                    </p>
                  ) : (
                    <>
                      <input
                        value={requesterName}
                        onChange={(e) => setRequesterName(e.target.value)}
                        placeholder="Your name"
                        className="w-full rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
                      />
                      <input
                        value={requesterContact}
                        onChange={(e) => setRequesterContact(e.target.value)}
                        placeholder="Your email or phone"
                        className="w-full rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
                      />
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="What would you like help with?"
                        rows={2}
                        className="w-full rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
                      />
                      <Button
                        onClick={sendRequest}
                        disabled={sending || !requesterName || !requesterContact}
                        className="w-full justify-center"
                      >
                        {sending ? <Spinner /> : <Send className="h-4 w-4" />}
                        Send request
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="mt-4 w-full justify-center"
                  onClick={() => openConnect(m)}
                >
                  <Mail className="h-4 w-4" /> Request to connect
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
