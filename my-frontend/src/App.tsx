import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Button
} from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Check,
  ChevronDown,
  CircleX,
  Download,
  Filter,
  Plus,
  Save,
  Search,
  Upload,
  X
} from "lucide-react";

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
      className={[
        "px-3 py-2 text-sm rounded-2xl border transition active:scale-[0.98]",
        selected ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:border-black",
      ].join(" ")}
      aria-pressed={selected}
    >
      <div className="flex items-center gap-2">
        {selected ? <Check className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
        <span>{label}</span>
      </div>
    </button>
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
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Choose your interests</h1>
          <p className="text-sm text-gray-600">Tap to add or remove interests.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />Filters
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Filters</DialogTitle>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary">Reset</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" aria-hidden />
          <Input
            ref={inputRef}
            placeholder="Search or add a new interest..."
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
          />
        </div>
        <Button onClick={addCustom}>
          <Plus className="h-4 w-4 mr-1" />Add
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Your selection</CardTitle>
          <CardDescription>{loading ? "Loading…" : `${selectedCount} selected`}</CardDescription>
        </CardHeader>
        <CardContent>
          {selectedCount === 0 ? (
            <p className="text-sm text-gray-600">No interests yet. Try "Hiking" or add your own.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.keys(selected).map((k) => (
                <Badge key={k} className="flex items-center gap-1 px-2 py-1">
                  {capitalize(k)}
                  <button onClick={() => toggleSelection(k)} aria-label={`Remove ${k}`}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={removeAll} disabled={selectedCount === 0}>
              <CircleX className="h-4 w-4 mr-1" />Clear all
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="outline"
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
            >
              <Download className="h-4 w-4 mr-1" />Export JSON
            </Button>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
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
              <span className="inline-flex items-center gap-2 px-3 py-2 border rounded-md">
                <Upload className="h-4 w-4" /> Import JSON
              </span>
            </label>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="popular">Popular</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Browse</CardTitle>
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
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Category browsing can go here…</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="popular">
          <Card>
            <CardHeader>
              <CardTitle>Popular</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Popular interests list…</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
