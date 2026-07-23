import { useEffect, useState } from "react";
import { Search, Plus, Trash2, CheckCircle2, RotateCcw, PackageSearch } from "lucide-react";
import { PageShell } from "@/components/Shell";
import { Card, SectionTitle, Button, EmptyState, Spinner } from "@/components/ui";
import { getJson, postJson, putJson, deleteJson } from "@/lib/api";
import { fmtDate } from "@/lib/date";
import type { LostFoundItem } from "@/types";

type Filter = "all" | "lost" | "found";

export default function LostFound() {
  const [items, setItems] = useState<LostFoundItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [itemType, setItemType] = useState<"lost" | "found">("lost");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactInfo, setContactInfo] = useState("");

  async function load() {
    try {
      const q = filter === "all" ? "" : `?item_type=${filter}`;
      const rows = await getJson<LostFoundItem[]>(`/lost-found${q}`);
      setItems(rows);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function submit() {
    if (!title || !contactName || !contactInfo) return;
    setSaving(true);
    try {
      await postJson("/lost-found", {
        item_type: itemType,
        title,
        description: description || null,
        location: location || null,
        contact_name: contactName,
        contact_info: contactInfo,
      });
      setTitle("");
      setDescription("");
      setLocation("");
      setContactName("");
      setContactInfo("");
      setShowAdd(false);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(item: LostFoundItem) {
    try {
      await putJson(`/lost-found/${item.id}/status`, {
        status: item.status === "open" ? "resolved" : "open",
      });
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function remove(id: number) {
    try {
      await deleteJson(`/lost-found/${id}`);
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <PageShell
      title="Lost & Found"
      subtitle="Report a lost item, or post something you found on campus."
      action={
        <Button onClick={() => setShowAdd((v) => !v)} variant="outline">
          <Plus className="h-4 w-4" /> Post an item
        </Button>
      }
    >
      {showAdd && (
        <Card className="mb-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-violet-300/70">Type</label>
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value as "lost" | "found")}
                className="mt-1 w-full rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
              >
                <option value="lost">I lost something</option>
                <option value="found">I found something</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-violet-300/70">Item</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Blue water bottle"
                className="mt-1 w-full rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-violet-300/70">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Any identifying details"
                className="mt-1 w-full rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-violet-300/70">Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Library, 2nd floor"
                className="mt-1 w-full rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-violet-300/70">Your name</label>
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-violet-300/70">Phone or email</label>
              <input
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={submit}
                disabled={saving || !title || !contactName || !contactInfo}
              >
                {saving ? <Spinner /> : null}
                Post
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle
            title="Board"
            subtitle="Recent posts from your campus"
            icon={<PackageSearch className="h-5 w-5" />}
          />
          <div className="flex gap-1 rounded-lg border border-violet-900/40 bg-violet-950/20 p-1">
            {(["all", "lost", "found"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  filter === f
                    ? "bg-violet-600 text-white"
                    : "text-violet-300/70 hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {err && <p className="mt-4 text-sm text-rose-400">{err}</p>}

        <div className="mt-4 space-y-2">
          {items === null ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="Nothing here yet"
              hint="Be the first to post a lost or found item."
              icon={<Search className="h-8 w-8" />}
            />
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border px-4 py-3 ${
                  item.status === "resolved"
                    ? "border-violet-900/20 bg-violet-950/10 opacity-60"
                    : item.item_type === "lost"
                    ? "border-rose-900/40 bg-rose-950/10"
                    : "border-emerald-900/40 bg-emerald-950/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                          item.item_type === "lost"
                            ? "bg-rose-950/60 text-rose-300"
                            : "bg-emerald-950/60 text-emerald-300"
                        }`}
                      >
                        {item.item_type}
                      </span>
                      {item.status === "resolved" && (
                        <span className="rounded-full bg-violet-950/60 px-2 py-0.5 text-[11px] font-semibold text-violet-300">
                          Resolved
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-white">
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="mt-0.5 text-xs text-violet-300/70">
                        {item.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-violet-400/60">
                      {item.location ? `${item.location} · ` : ""}
                      {fmtDate(item.created_at)} · Contact: {item.contact_name} (
                      {item.contact_info})
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => toggleStatus(item)}
                      className="rounded-lg p-1.5 text-violet-400/60 hover:bg-violet-900/40 hover:text-violet-200"
                      title={item.status === "open" ? "Mark resolved" : "Reopen"}
                    >
                      {item.status === "open" ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => remove(item.id)}
                      className="rounded-lg p-1.5 text-violet-400/60 hover:bg-rose-950/40 hover:text-rose-400"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </PageShell>
  );
}
