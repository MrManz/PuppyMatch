import React from "react";

export default function InterestChip({
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
        selected
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white text-black border-gray-300 hover:border-blue-400",
      ].join(" ")}
      aria-pressed={selected}
    >
      <span className="flex items-center gap-2">{label}</span>
    </button>
  );
}
