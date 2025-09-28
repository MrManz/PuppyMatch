import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Check, ChevronDown, CircleX, Download, Filter, Plus, Save,
  Search, Upload, X, PawPrint
} from "lucide-react";

const API_BASE =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE) ||
  (typeof window !== "undefined" && (window as any).__API_BASE__) ||
  "http://localhost:3000";

// Puppy theme tokens
const theme = {
  bg: "bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50",
  ink: "text-stone-900",
  brand: "bg-amber-600 text-white hover:bg-amber-700",
  outline: "border-amber-300 text-amber-800 hover:bg-amber-50",
  soft: "bg-amber-100 text-amber-900",
  chipOn: "bg-amber-700 text-white border-amber-700",
  chipOff: "bg-white text-stone-900 border-amber-300 hover:border-amber-500",
};

const CATALOG: Record<string, string[]> = {
  Outdoors: ["Hiking", "Camping", "Cycling", "Trail Running", "Birdwatching"],
  Sports: ["Football", "Basketball", "Swimming", "Tennis"],
  Tech: ["Web Development", "Machine Learning", "Cybersecurity"],
  Creative: ["Photography", "Painting", "Writing", "Music Production"],
};

const keyOf = (s: string) => s.trim().toLowerCase();
const capitalize = (s: string) => s.replace(/\b\w/g, (m) => m.toUpperCase());

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
  label, selected, onToggle,
}: { label: string; selected: boolean; onToggle: (next: boolean) => void }) {
  return (
    <button
      onClick={() => onToggle(!selected)}
      className={[
        "px-3 py-2 text-sm rounded-full border transition active:scale-[0.98] shadow-sm",
        selected ? theme.chipOn : theme.chipOff,
      ].join(" ")}
      aria-pressed={selected}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center rounded-full bg-white/20 p-0.5">
          <PawPrint className="h-4 w-4" aria-hidden />
        </span>
        <span>{label}</span>
      </div>
    </button>
  );
}

function PuppyHeader() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-white/70 shadow-sm">
      {/* decorative paw prints */}
      <div className="pointer-events-none absolute -top-6 -right-6 rotate-12 opacity-20">
        <PawPrint className="h-16 w-16" />
      </div>
      <div className="pointer-events-none absolute -bottom-6 -left-6 -rotate-12 opacity-20">
        <PawPrint className="h-16 w-16" />
      </div>

      <div className="flex items-center justify-between gap-3 p-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded-full bg-amber-600 text-white p-1">
              <PawPrint className="h-5 w-5" />
            </span>
            Puppy Match — Interests
          </h1>
          <p className="text-sm text-stone-600">Friendly, puppy-themed UI for picking what you like.</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className={`gap-2 ${theme.outline}`} variant="outline">
              <Filter className="h-4 w-4" /> Filters
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Filters</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox /> Show only popular
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox /> Show only selected
              </label>
            </div>
            <DialogFooter>
              <Button variant="secondary" className={theme.soft}>Reset</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function App() {
  const [userId] = useState("demo-user");
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
    return () => { cancelled = true; };
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
    <div className={`min-h-dvh ${theme.bg} ${theme.ink}`}>
      <div className="mx-auto max-w-screen-sm p-4 sm:p-6">

        <PuppyHeader />

        <div className="mt-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-amber-700/70" aria-hidden />
            <Input
              ref={inputRef}
              placeholder="Search or add a new interest..."
              className="pl-8 border-amber-300 focus-visible:ring-amber-600"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
            />
          </div>
          <Button onClick={addCustom} className={theme.brand}>
            <Plus className="h-4 w-4 mr-1" />Add
          </Button>
        </div>

        <Card className="mt-4 border-amber-200 bg-white/80 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <PawPrint className="h-5 w-5 text-amber-700" /> Your selection
            </CardTitle>
            <CardDescription>{loading ? "Loading…" : `${selectedCount} selected`}</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedCount === 0 ? (
              <p className="text-sm text-stone-600">No interests yet. Try "Hiking" or add your own.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.keys(selected).map((k) => (
                  <Badge key={k} className="flex items-center gap-1 px-2 py-1 bg-amber-200 text-amber-900">
                    {capitalize(k)}
                    <button onClick={() => toggleSelection(k)} aria-label={`Remove ${k}`} className="hover:text-amber-700">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={removeAll} disabled={selectedCount === 0} className={theme.soft}>
                <CircleX className="h-4 w-4 mr-1" />Clear all
              </Button>
              <Button onClick={handleSave} disabled={saving} className={theme.brand}>
                <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save preferences"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const data = JSON.stringify({ interests: Object.keys(selected) }, null, 2);
                  const blob = new Blob([data], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = "interests.json"; a.click();
                  URL.revokeObjectURL(url);
                }}
                className={theme.outline}
              >
                <Download className="h-4 w-4 mr-1" />Export JSON
              </Button>
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer border rounded-md px-3 py-2 border-amber-300">
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
                      } catch { toast.error("Invalid file"); }
                    }
                  }}
                />
                <Upload className="h-4 w-4" /> Import JSON
              </label>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="all" className="w-full mt-6">
          <TabsList className="grid grid-cols-3 gap-2">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="popular">Popular</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <Card className="border-amber-200 bg-white/80">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2"><PawPrint className="h-5 w-5 text-amber-700"/> Browse</CardTitle>
                <CardDescription>Tap to toggle an interest</CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="categories">
            <Card className="border-amber-200 bg-white/80">
              <CardHeader className="pb-2">
                <CardTitle>Categories</CardTitle>
                <CardDescription>Group picks by theme</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.entries(CATALOG).map(([cat, items]) => (
                  <div key={cat} className="mb-4">
                    <div className="mb-2 flex items-center gap-2 font-medium text-amber-800">
                      <PawPrint className="h-4 w-4"/> {cat}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {items.map((label) => (
                        <InterestChip
                          key={label}
                          label={label}
                          selected={!!selected[keyOf(label)]}
                          onToggle={() => toggleSelection(label)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="popular">
            <Card className="border-amber-200 bg-white/80">
              <CardHeader className="pb-2">
                <CardTitle>Popular</CardTitle>
                <CardDescription>Commonly chosen by users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {flatList.slice(0, 12).map((t) => (
                    <InterestChip
                      key={t.key}
                      label={t.label}
                      selected={!!selected[t.key]}
                      onToggle={() => toggleSelection(t.label)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <footer className="h-16" />

        {/* Mobile sticky bar */}
        <div className="fixed inset-x-0 bottom-0 border-t border-amber-200 bg-white/90 backdrop-blur p-3 sm:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm"><strong>{selectedCount}</strong> selected</div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={removeAll} disabled={selectedCount === 0} className={theme.soft}>
                Clear
              </Button>
              <Button onClick={handleSave} disabled={saving} className={theme.brand}>Save</Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
