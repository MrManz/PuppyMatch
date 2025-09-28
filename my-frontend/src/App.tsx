import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ChevronDown, CircleX, Filter, Save, Search, X } from "lucide-react";

/**
 * API base configuration
 */
const API_BASE: string =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE) ||
  (typeof window !== "undefined" && (window as any).__API_BASE__) ||
  "http://localhost:3000";

/**
 * Catalog
 */
const CATALOG: Record<string, string[]> = {
  Outdoors: ["Hiking", "Camping", "Bouldering", "Rock Climbing", "Trail Running", "Cycling", "Birdwatching", "Skiing", "Snowboarding"],
  Sports: ["Football", "Basketball", "Tennis", "Table Tennis", "Badminton", "Swimming", "Martial Arts"],
  Creative: ["Painting", "Photography", "Writing", "Calligraphy", "UI/UX", "Graphic Design", "Music Production"],
  Tech: ["Web Development", "Data Science", "Machine Learning", "Cybersecurity", "Open Source", "Blockchain", "DevOps"],
  Entertainment: ["Sci-Fi", "Fantasy", "Anime", "Board Games", "Video Games", "Podcasts", "Movies", "TV Shows"],
  Wellness: ["Meditation", "Yoga", "Mindfulness", "Running", "Strength Training", "Nutrition"],
  "Food & Drink": ["Baking", "Coffee", "Tea", "Vegan Cooking", "BBQ", "Wine Tasting", "Cocktails"],
};

const keyOf = (s: string) => s.trim().toLowerCase();
const LS_SELECTED = "interest_picker_selected_v1";
const LS_USERID = "interest_picker_user_id_v1";

/** API */
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

/** Chip */
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
        selected ? "bg-pink-600 text-white border-pink-600" : "bg-white text-black border-gray-300 hover:border-pink-400",
      ].join(" ")}
      aria-pressed={selected}
    >
      <span className="truncate">{label}</span>
    </button>
  );
}

export default function App() {
  const [userId, setUserId] = useState<string>(
    (typeof localStorage !== "undefined" && localStorage.getItem(LS_USERID)) || "demo-user"
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS_SELECTED);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [activeCats, setActiveCats] = useState<Record<string, boolean>>({});
  const [showOnlyPopular, setShowOnlyPopular] = useState(false);
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { flatList } = useMemo(() => {
    const cats = Object.keys(CATALOG);
    const flat: { key: string; label: string; category: string; pop: number }[] = [];
    for (const cat of cats) {
      const items = CATALOG[cat];
      for (const label of items) flat.push({ key: keyOf(label), label, category: cat, pop: items.length });
    }
    for (const k of Object.keys(selected)) {
      if (!flat.find((f) => f.key === k)) flat.push({ key: k, label: capitalize(k), category: "Custom", pop: 1 });
    }
    return { flatList: flat };
  }, [selected]);

  /** Persist locally */
  useEffect(() => {
    try {
      localStorage.setItem(LS_SELECTED, JSON.stringify(selected));
    } catch {}
  }, [selected]);
  useEffect(() => {
    try {
      localStorage.setItem(LS_USERID, userId);
    } catch {}
  }, [userId]);

  /** Load from API */
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

  /** Filters */
  const filtered = useMemo(() => {
    const q = keyOf(query);
    const catFilterOn = Object.values(activeCats).some(Boolean);
    return flatList.filter((t) => {
      if (showOnlySelected && !selected[t.key]) return false;
      if (showOnlyPopular && t.pop < 5) return false;
      if (catFilterOn && !activeCats[t.category]) return false;
      if (!q) return true;
      return keyOf(t.label).includes(q);
    });
  }, [flatList, query, selected, showOnlyPopular, showOnlySelected, activeCats]);

  const selectedCount = Object.keys(selected).length;

  /** Mutators */
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

  /** UI */
  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-screen-sm p-4 sm:p-6">
        {/* Pup Play styled header */}
        <header className="sticky top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-6 pb-5 bg-pink-100/90 backdrop-blur rounded-b-3xl shadow">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-pink-700 flex items-center gap-2">
                🐾 PupMatch
              </h1>
              <p className="text-sm text-pink-600">Find playmates by choosing your favorite interests!</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-pink-400 text-pink-700 hover:bg-pink-50">
                  <Filter className="h-4 w-4" /> Filters
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Filters & Categories</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">User</label>
                    <div className="mt-2 flex gap-2">
                      <Input
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="user id (email/uuid)"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Quick toggles</label>
                    <div className="mt-2 space-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={showOnlyPopular} onCheckedChange={(v) => setShowOnlyPopular(Boolean(v))} />
                        Show only popular
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={showOnlySelected} onCheckedChange={(v) => setShowOnlySelected(Boolean(v))} />
                        Show only selected
                      </label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="secondary" onClick={() => setActiveCats({})}>
                    Reset
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" aria-hidden />
              <Input
                ref={inputRef}
                placeholder="Search interests..."
                className="pl-8"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        <main className="mt-6 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Your selection</CardTitle>
              <CardDescription>
                {loading ? "Loading…" : `${Object.keys(selected).length} selected`} {saving ? " • Saving…" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(selected).length === 0 ? (
                <p className="text-sm text-gray-600">No interests yet. Try picking one below!</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Object.keys(selected)
                    .sort()
                    .map((k) => (
                      <Badge key={k} variant="secondary" className="flex items-center gap-1 px-2 py-1">
                        {capitalize(k)}
                        <button
                          onClick={() =>
                            setSelected((prev) => {
                              const n = { ...prev };
                              delete n[k];
                              return n;
                            })
                          }
                          aria-label={`Remove ${k}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={removeAll} disabled={Object.keys(selected).length === 0}>
                  <CircleX className="h-4 w-4 mr-1" /> Clear all
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-pink-600 hover:bg-pink-700">
                  <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save preferences"}
                </Button>
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
                  <CardTitle className="text-base">Browse</CardTitle>
                  <CardDescription>Tap to toggle an interest</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChipGrid items={filtered} selected={selected} onToggle={toggleSelection} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories">
              <CategoryBrowser selected={selected} onToggle={toggleSelection} />
            </TabsContent>

            <TabsContent value="popular">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Trending</CardTitle>
                  <CardDescription>Commonly chosen by users</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChipGrid
                    items={[...flatList].sort((a, b) => b.pop - a.pop).slice(0, 40)}
                    selected={selected}
                    onToggle={toggleSelection}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>

        <footer className="h-20" />

        {/* Mobile sticky actions */}
        <div className="fixed inset-x-0 bottom-0 border-t bg-white/80 backdrop-blur p-3 sm:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-gray-700">
              <strong>{selectedCount}</strong> selected
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={removeAll} disabled={selectedCount === 0}>
                Clear
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-pink-600 hover:bg-pink-700 text-white">
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Grids & helpers */
function ChipGrid({
  items,
  selected,
  onToggle,
}: {
  items: { key: string; label: string; category: string }[];
  selected: Record<string, boolean>;
  onToggle: (label: string) => void;
}) {
  if (!items.length) return <p className="text-sm text-gray-600">No results.</p>;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {items.map((t) => (
        <InterestChip key={t.key} label={t.label} selected={Boolean(selected[t.key])} onToggle={() => onToggle(t.label)} />
      ))}
    </div>
  );
}

function CategoryBrowser({
  selected,
  onToggle,
}: {
  selected: Record<string, boolean>;
  onToggle: (label: string) => void;
}) {
  return (
    <div className="space-y-4">
      {Object.entries(CATALOG).map(([cat, items]) => (
        <Card key={cat}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{cat}</CardTitle>
                <CardDescription>{items.length} interests</CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    Bulk actions <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{cat}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => items.forEach((l) => !selected[keyOf(l)] && onToggle(l))}>
                    Select all
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => items.forEach((l) => onToggle(l))}>Toggle all</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => items.forEach((l) => selected[keyOf(l)] && onToggle(l))}>
                    Deselect all
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            <ChipGrid
              items={items.map((label) => ({ key: keyOf(label), label, category: cat }))}
              selected={selected}
              onToggle={onToggle}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function capitalize(s: string) {
  return s.replace(/\b\w/g, (m) => m.toUpperCase());
}
