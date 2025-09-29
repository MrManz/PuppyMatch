// src/components/Avatar.tsx
import React from "react";

export function Avatar({
  src,
  size = 48,
}: {
  src?: string | null;
  size?: number;
}) {
  return (
    <div
      className="relative rounded-full overflow-hidden bg-gray-100 shrink-0"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt="" className="block w-full h-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-gray-400 text-[11px] leading-none text-center select-none">
          No photo
        </span>
      )}
    </div>
  );
}
