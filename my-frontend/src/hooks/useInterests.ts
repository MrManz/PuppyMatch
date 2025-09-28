// src/hooks/useInterests.ts
import { useEffect, useMemo, useState } from "react";
import { apiGetInterests, apiPutInterests } from "../lib/api";
import { CATALOG } from "../lib/catalog";
import { keyOf, capitalize } from "../lib/utils";

const LS_SELECTED = "interest_picker_selected_v1";
const LS_USERID = "interest_picker_user_id_v1";

export function usePersistedUserId(defaultValue = "demo-user") {
  const [userId, setUserId] = useState<string>(() => {
    try {
      return localStorage.getItem(LS_USERID) || defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LS_USERID, userId);
    } catch {}
  }, [userId]);

  return { userId, setUserId };
}

export function useInterests(userId: string) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS_SELECTED);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Persist locally
  useEffect(() => {
    try {
      localStorage.setItem(LS_SELECTED, JSON.stringify(selected));
    } catch {}
  }, [selected]);

  // Load from API on user change
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
      } catch (e) {
        // let caller toast
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Flat list for chips
  const flatList = useMemo(() => {
    const cats = Object.keys(CATALOG);
    const flat: { key: string; label: string; category: string; pop: number }[] = [];
    for (const cat of cats) {
      const items = CATALOG[cat];
      for (const label of items) flat.push({ key: keyOf(label), label, category: cat, pop: items.length });
    }
    // include any custom previously-selected items
    for (const k of Object.keys(selected)) {
      if (!flat.find((f) => f.key === k)) flat.push({ key: k, label: capitalize(k), category: "Custom", pop: 1 });
    }
    return flat;
  }, [selected]);

  const toggleSelection = (label: string) => {
    const k = keyOf(label);
    setSelected((prev) => {
      const next = { ...prev };
      if (next[k]) delete next[k];
      else next[k] = true;
      return next;
    });
  };

  const clearAll = () => setSelected({});

  const save = async () => {
    setSaving(true);
    try {
      const payload = Object.keys(selected);
      const saved = await apiPutInterests(userId, payload);
      return saved;
    } finally {
      setSaving(false);
    }
  };

  return {
    loading,
    saving,
    selected,
    setSelected,
    flatList,
    toggleSelection,
    clearAll,
    save,
  };
}
