import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, CircleX, Download, Filter, Plus, Save, Search, Upload, X } from "lucide-react";

const API_BASE =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE) ||
  (typeof window !== "undefined" && (window as any).__API_BASE__) ||
  "http://localhost:3000";

const CATALOG: Record<string, string[]> = {
  Outdoors: ["Hiking", "Camping", "Cycling"],
  Sports: ["Football", "Basketball", "Swimming"],
  Tech: ["Web Development", "Machine Learning", "Cybersecurity"],
};

const keyOf = (s: string) => s.trim().toLowerCase();
function capitalize(s: string) {
  return s.replace(/\b\w/g, (m) => m.toUpperCase());
}

async function apiGetInterests(userId: string): Promise<string[]> {
  const r = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}/interests`);
  if (!r.ok) throw new Error(`GET interests failed: ${r.status}`);
  const data = await r.json();
  return Array.isArray(data?.interests) ? data.interests : [];
}

async function apiPutInterests(userId: string, interests: string[]): Promise<number> {
  const r = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}/interests`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interests }),
  });
  if (!r.ok) throw new Error(`PUT interests failed: ${r.status}`);
  const data = await r.json();
  return Number(data?.saved ?? 0);
}

function InterestChip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <button
      onClick={() => onToggle(!selected)}
      className={`px-3 py-2 text-sm rounded-2xl border transition active:scale-[0.98] ${
        selected
          ? "bg-black text-white border-black"
          : "bg-white text-black border-gray-300 hover:border-black"
      }`}
    >
      <span className="flex items-center gap-2">
        {selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {label}
      </span>
    </button>
  );
}

export default function App() {
  const [userId, setUserId] = useState("demo-user");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const flatList = useMemo(() => {
    const flat: { key: string; label: string; category: string }[] = [];
    for (const [cat, items] of Object.entries(CATALOG)) {
      for (const label of items) flat.push({ key: keyOf(label), label, category: cat });
    }
    for (const k of Object.keys(selected)) {
      if (!flat.find((f) => f.key === k)) flat.push({ key: k, label: capitalize(k), category: "Custom" });
    }
    return flat;
  }, [selected]);

  // load interests
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const interests = await apiGetInterests(userId);
        if (!cancelled) {
          const map: Record<string, boolean> = {};
          for (const it of interests) map[keyOf(it)] = true;
          setSelected(map);
        }
      } catch (e: any) {
        toast.error(`Failed to load interests: ${e.message || e}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const toggleSelection = (label: string) => {
    const k = keyOf(label);
    setSelected((prev) => {
      const next = { ...prev };
      if (next[k]) delete next[k];
      else next[k] = true;
      return next;
    });
  };

  const removeAll = () => setSelected({});

  const addCustom = () => {
    const val = inputRef.current?.value?.trim();
    if (!val) return;
    setSelected((prev) => ({ ...prev, [keyOf(val)]: true }));
    setQuery("");
    if (inputRef.current) inputRef.current.value = "";
    toast.success(`Added "${val}"`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = Object.keys(selected);
      const saved = await apiPutInterests(userId, payload);
      toast.success(`Saved ${saved} interests`);
    } catch (e: any) {
      toast.error(`Save failed: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = Object.keys(selected).length;

  return (
    <div className="min-h-dvh bg-gray-50 p-4">
      <h1 className="text-2xl font-semibold mb-2">Choose your interests</h1>
      <p className="text-sm text-gray-600 mb-4">API: {API_BASE}</p>

      <div className="flex items-center gap-2 mb-4">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search or add new interest..."
          className="flex-1 border px-2 py-2 rounded"
          onKeyDown={(e) => e.key === "Enter" && addCustom()}
        />
        <button onClick={addCustom} className="px-3 py-2 bg-black text-white rounded">
          <Plus className="h-4 w-4 inline mr-1" /> Add
        </button>
      </div>

      <div className="mb-6">
        <h2 className="font-medium mb-2">Your selection ({loading ? "Loading…" : `${selectedCount} selected`})</h2>
        {selectedCount === 0 ? (
          <p className="text-sm text-gray-600">No interests yet. Try "Hiking" or add your own.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {Object.keys(selected).map((k) => (
              <span key={k} className="px-2 py-1 bg-gray-200 rounded inline-flex items-center gap-1">
                {capitalize(k)}
                <button onClick={() => toggleSelection(k)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex gap-2 flex-wrap">
          <button
            onClick={removeAll}
            disabled={selectedCount === 0}
            className="px-3 py-2 border rounded flex items-center gap-1 disabled:opacity-50"
          >
            <CircleX className="h-4 w-4" /> Clear all
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-2 bg-black text-white rounded flex items-center gap-1 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => {
              const data = JSON.stringify({ interests: Object.keys(selected) }, null, 2);
              const blob = new Blob([data], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "interests.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-3 py-2 border rounded flex items-center gap-1"
          >
            <Download className="h-4 w-4" /> Export JSON
          </button>
          <label className="px-3 py-2 border rounded flex items-center gap-1 cursor-pointer">
            <Upload className="h-4 w-4" /> Import JSON
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const text = await f.text();
                  try {
                    const data = JSON.parse(text);
                    if (Array.isArray(data?.interests)) {
                      const next: Record<string, boolean> = {};
                      for (const it of data.interests) next[keyOf(it)] = true;
                      setSelected(next);
                      toast.success("Imported interests");
                    }
                  } catch {
                    toast.error("Invalid file");
                  }
                }
              }}
            />
          </label>
        </div>
      </div>

      <h2 className="font-medium mb-2">Browse</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {flatList.map((t) => (
          <InterestChip
            key={t.key}
            label={t.label}
            selected={!!selected[t.key]}
            onToggle={() => toggleSelection(t.label)}
          />
        ))}
      </div>
    </div>
  );
}
