import { useEffect, useState } from "react";
import {
  MapPin,
  Plus,
  Trash2,
  Navigation2,
  Search,
  Building2,
  ExternalLink,
} from "lucide-react";
import { PageShell } from "@/components/Shell";
import { Card, SectionTitle, Button, EmptyState, Spinner } from "@/components/ui";
import { getJson, postJson, deleteJson } from "@/lib/api";
import type { CampusLocation } from "@/types";

const TYPE_OPTIONS = [
  "building",
  "classroom",
  "library",
  "hostel",
  "faculty",
  "canteen",
  "sports",
  "other",
];

function embedUrl(loc: CampusLocation) {
  // Key-less embed: this classic maps.google.com pattern renders a live,
  // pannable Google Map with no API key or billing account required.
  return `https://maps.google.com/maps?q=${loc.latitude},${loc.longitude}&z=17&output=embed`;
}

function embedUrlForQuery(q: string) {
  // Same key-less embed, but for a free-text place search — lets people
  // look up anything on real Google Maps directly, not just saved spots.
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`;
}

function directionsUrl(loc: CampusLocation) {
  // Opens Google Maps (app or web) with turn-by-turn directions from the
  // user's current location — also key-less.
  return `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`;
}

function directionsUrlForQuery(q: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}

export default function CampusMap() {
  const [locations, setLocations] = useState<CampusLocation[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [liveQuery, setLiveQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [selected, setSelected] = useState<CampusLocation | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [locationType, setLocationType] = useState("building");
  const [buildingName, setBuildingName] = useState("");
  const [floor, setFloor] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [description, setDescription] = useState("");

  async function load() {
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (typeFilter) params.set("type", typeFilter);
      const qs = params.toString();
      const rows = await getJson<CampusLocation[]>(
        `/campus-locations${qs ? `?${qs}` : ""}`
      );
      setLocations(rows);
      if (rows.length && !selected) setSelected(rows[0]);
    } catch (e: any) {
      setErr(e.message);
      setLocations([]); // stop the spinner even if the request failed
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  // Search Google Maps directly for whatever was typed, regardless of
  // whether it matches anything in the saved locations list.
  function searchGoogleMaps() {
    if (!query.trim()) return;
    setSelected(null);
    setLiveQuery(query.trim());
    load();
  }

  function useMyLocationOnMap() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setSelected(null);
      setLiveQuery(`${pos.coords.latitude},${pos.coords.longitude}`);
    });
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setLatitude(pos.coords.latitude.toFixed(6));
      setLongitude(pos.coords.longitude.toFixed(6));
    });
  }

  async function addLocation() {
    if (!name || !latitude || !longitude) return;
    setSaving(true);
    try {
      await postJson("/campus-locations", {
        name,
        location_type: locationType,
        building_name: buildingName || null,
        floor: floor || null,
        room_number: roomNumber || null,
        latitude: Number(latitude),
        longitude: Number(longitude),
        description: description || null,
      });
      setName("");
      setBuildingName("");
      setFloor("");
      setRoomNumber("");
      setLatitude("");
      setLongitude("");
      setDescription("");
      setShowAdd(false);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeLocation(id: number) {
    try {
      await deleteJson(`/campus-locations/${id}`);
      if (selected?.id === id) setSelected(null);
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <PageShell
      title="Campus Navigation"
      subtitle="Find buildings, classrooms, and facilities — powered by Google Maps, no API key needed."
      action={
        <Button onClick={() => setShowAdd((v) => !v)} variant="outline">
          <Plus className="h-4 w-4" /> Add location
        </Button>
      }
    >
      {showAdd && (
        <Card className="mb-4 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-violet-300/70">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Central Library"
                className="mt-1 w-full rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-violet-300/70">Type</label>
              <select
                value={locationType}
                onChange={(e) => setLocationType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t} className="capitalize">
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-violet-300/70">Building</label>
              <input
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-violet-300/70">Floor</label>
              <input
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                className="mt-1 w-full rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-violet-300/70">Room</label>
              <input
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="mt-1 w-full rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-violet-300/70">
                Coordinates
              </label>
              <div className="mt-1 flex gap-1.5">
                <input
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="Latitude"
                  className="w-full rounded-lg border border-violet-800/60 bg-violet-950/30 px-2.5 py-2 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
                />
                <input
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="Longitude"
                  className="w-full rounded-lg border border-violet-800/60 bg-violet-950/30 px-2.5 py-2 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
                />
                <button
                  onClick={useMyLocation}
                  title="Use my current location"
                  className="shrink-0 rounded-lg border border-violet-800/60 bg-violet-950/30 px-2.5 text-violet-300 hover:bg-violet-900/40"
                >
                  <Navigation2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-violet-300/70">
                Description
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Anything useful to know"
                className="mt-1 w-full rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={addLocation}
                disabled={saving || !name || !latitude || !longitude}
              >
                {saving ? <Spinner /> : null}
                Save
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-violet-400/60">
            Tip: search the place on Google Maps, right-click it, and the
            coordinates appear at the top of the menu — paste them here.
          </p>
        </Card>
      )}

      {err && (
        <p className="mb-4 rounded-xl border border-rose-900/40 bg-rose-950/20 px-4 py-2 text-sm text-rose-400">
          {err}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle
            title="Locations"
            subtitle="Search buildings, classrooms & facilities"
            icon={<Building2 className="h-5 w-5" />}
          />

          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-500/60" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchGoogleMaps()}
                placeholder="Search any place on Google Maps..."
                className="w-full rounded-lg border border-violet-800/60 bg-violet-950/30 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-violet-500/50 focus:border-violet-500"
              />
            </div>
            <button
              onClick={searchGoogleMaps}
              className="rounded-lg border border-violet-800/60 px-3 text-sm text-violet-300 hover:bg-violet-900/40"
            >
              Go
            </button>
            <button
              onClick={useMyLocationOnMap}
              title="Show my current location on the map"
              className="shrink-0 rounded-lg border border-violet-800/60 px-3 text-violet-300 hover:bg-violet-900/40"
            >
              <Navigation2 className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              onClick={() => setTypeFilter("")}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${
                typeFilter === ""
                  ? "bg-violet-600 text-white"
                  : "bg-violet-950/40 text-violet-300/70 hover:text-white"
              }`}
            >
              All
            </button>
            {TYPE_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${
                  typeFilter === t
                    ? "bg-violet-600 text-white"
                    : "bg-violet-950/40 text-violet-300/70 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto">
            {locations === null ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : locations.length === 0 ? (
              <EmptyState
                title="No locations added yet"
                hint="Add a building, classroom, or facility to get started."
                icon={<MapPin className="h-8 w-8" />}
              />
            ) : (
              locations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => {
                    setLiveQuery("");
                    setSelected(loc);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    selected?.id === loc.id
                      ? "border-violet-500 bg-violet-900/30"
                      : "border-violet-900/40 bg-violet-950/10 hover:bg-violet-900/20"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {loc.name}
                    </p>
                    <p className="truncate text-xs capitalize text-violet-300/60">
                      {loc.location_type}
                      {loc.building_name ? ` · ${loc.building_name}` : ""}
                      {loc.floor ? ` · Floor ${loc.floor}` : ""}
                      {loc.room_number ? ` · Room ${loc.room_number}` : ""}
                    </p>
                  </div>
                  <Trash2
                    className="h-4 w-4 shrink-0 text-violet-500/40 hover:text-rose-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeLocation(loc.id);
                    }}
                  />
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="overflow-hidden p-0 lg:col-span-3">
          {selected ? (
            <div className="flex h-full flex-col">
              <div className="border-b border-violet-900/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {selected.name}
                    </h3>
                    {selected.description && (
                      <p className="mt-1 text-sm text-violet-300/70">
                        {selected.description}
                      </p>
                    )}
                  </div>
                  <a
                    href={directionsUrl(selected)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
                  >
                    <Navigation2 className="h-4 w-4" /> Directions
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
              <iframe
                title={`Map of ${selected.name}`}
                src={embedUrl(selected)}
                className="min-h-[420px] w-full flex-1 border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : liveQuery ? (
            <div className="flex h-full flex-col">
              <div className="border-b border-violet-900/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Google Maps search
                    </h3>
                    <p className="mt-1 text-sm text-violet-300/70">
                      Showing results for "{liveQuery}"
                    </p>
                  </div>
                  <a
                    href={directionsUrlForQuery(liveQuery)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
                  >
                    <Navigation2 className="h-4 w-4" /> Directions
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
              <iframe
                title={`Map search for ${liveQuery}`}
                src={embedUrlForQuery(liveQuery)}
                className="min-h-[420px] w-full flex-1 border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center">
              <EmptyState
                title="Search Google Maps or pick a location"
                hint="Type a place above and hit Go, use the location pin for where you are now, or pick a saved spot from the list."
                icon={<MapPin className="h-8 w-8" />}
              />
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
