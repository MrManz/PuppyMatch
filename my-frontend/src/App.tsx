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
import { ChevronDown, CircleX, Download, Filter, Plus, Save, Search, Upload, X } from "lucide-react";

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
  Outdoors: [
    "Hiking",
    "Camping",
    "Bouldering",
    "Rock Climbing",
    "Trail Running",
    "Cycling",
    "Birdwatching",
    "Skiing",
    "Snowboarding",
  ],
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

/** Chip (no paw/check/plus icons; just label) */
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

  const { flatList, categories } = useMemo(() => {
    const cats = Object.keys(CATALOG);
    const flat: { key: string; label: string; category: string; pop: number }[] = [];
    for (const cat of cats) {
      const items = CATALOG[cat];
      for (const label of items) flat.push({ key: keyOf(label), label, category: cat, pop: items.length });
    }
    for (const k of Object.keys(selected)) {
      if (!flat.find((f) => f.key === k)) flat.push({ key: k, label: capitalize(k), category: "Custom", pop: 1 });
    }
    return { flatList: flat, categories: cats };
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
  const addCustom = () => {
    const val = inputRef.current?.value?.trim();
    if (!val) return;
    setSelected((prev) => ({ ...prev, [keyOf(val)]: true }));
    setQuery("");
    if (inputRef.current) inputRef.current.value = "";
    toast.success(`Added "${val}"`);
  };
  const exportJSON = () => {
    const data = JSON.stringify({ interests: Object.keys(selected) }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "interests.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const importJSON = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (Array.isArray(data?.interests)) {
        const next: Record<string, boolean> = {};
        for (const it of data.interests) if (typeof it === "string") next[keyOf(it)] = true;
        setSelected(next);
        toast.success("Imported interests");
      } else {
        toast.error("Invalid file format");
      }
    } catch {
      toast.error("Failed to import file");
    }
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

  /** UI */
  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-s
