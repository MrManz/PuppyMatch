import React from "react";
import InterestChip from "./InterestChip";

export default function ChipGrid({
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
        <InterestChip
          key={t.key}
          label={t.label}
          selected={Boolean(selected[t.key])}
          onToggle={() => onToggle(t.label)}
        />
      ))}
    </div>
  );
}