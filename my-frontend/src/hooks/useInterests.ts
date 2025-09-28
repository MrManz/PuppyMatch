// src/hooks/useInterests.ts
import { useEffect, useMemo, useState } from "react";
import { apiGetInterests, apiPutInterests } from "../lib/api";
import { CATALOG } from "../lib/catalog";
import { keyOf, capitalize } from "../lib/utils";

const LS_SELECTED = "interest_picker_selected_v1";
const LS_USERID = "interest_picker_user_id_v1";

/**
 * Persist a userId locally (kept for compatibility with your App.tsx).
 * In token-based auth flows, you can ignore this and rely on the JWT.
 */
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

/**
 * Main interests hook.
 * - Optional userId only exists to preserve your current call sites (it is not sent to the API).
 * - Loads interests from API (derived from JWT on the server).
 * - Persists selection to localStorage.
 */
export function useInterests(userId?: string) {
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

  // Persist locally whenever selection changes
  useEffect(() => {
    try {
      localStorage.setItem(LS_SELECTED, JSON.stringify(selected));
    } catch {}
  }, [selected]);

  // Load from API. Dependency on userId is optional (triggers reload if caller changes it).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const interests = await apiGetInterests(); // server infers user from JWT
        if (!cancelled) {
          const map: Record<string, boolean> = {};
          for (const it of interests) map[keyOf(it)] = true;
          setSelected(map);
        }
      } catch (e) {
        // Let the caller toast errors if desired
        console.error("Failed to load interests:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // keep for compatibility; safe to remove when fully token-based

  // Flat list built from catalog + any previously-selected custom keys
  const flatList = useMemo(() => {
    const cats = Object.keys(CATALOG);
    const flat: { key: string; label: string; category: string; pop: number }[] = [];
    for (const cat of cats) {
      const items = CATALOG[cat];
      for (const label of items) flat.push({ key: keyOf(label), label, category: cat, pop: items.length });
    }
    // ensure custom/unknown selections still render
    for (const k of Object.keys(selected)) {
      if (!flat.find((f) => f.key === k)) {
        flat.push({ key: k, label: capitalize(k), category: "Custom", pop: 1 });
      }
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
      const saved = await apiPutInterests(payload); // server uses JWT subject
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
