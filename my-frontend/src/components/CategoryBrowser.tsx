import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import ChipGrid from "./ChipGrid";
import { CATALOG } from "../lib/catalog"; // ⬅️ only CATALOG

export default function CategoryBrowser({
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
            <div>
              <CardTitle className="text-base">{cat}</CardTitle>
              <CardDescription>{items.length} interests</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ChipGrid
              items={items.map((label) => ({
                key: label.trim().toLowerCase(), // ⬅️ inline key instead of keyOf
                label,
                category: cat,
              }))}
              selected={selected}
              onToggle={onToggle}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
