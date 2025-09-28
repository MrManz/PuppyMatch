import React, { useMemo, useRef, useState } from "react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { toast } from "sonner";
import { CircleX, Save, X } from "lucide-react";

import { CATALOG } from "./lib/catalog";
import { keyOf, capitalize } from "./lib/utils";
import { usePersistedUserId, useInterests } from "./hooks/useInterests";

import ChipGrid from "./components/ChipGrid";
import CategoryBrowser from "./components/CategoryBrowser";
import HeaderBar from "./components/HeaderBar";

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { userId } = usePersistedUserId();
  const { loading, saving, selected, setSelected, flatList, toggleSelection, clearAll, save } = useInterests(userId);

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = keyOf(query);
    if (!q) return flatList;
    return flatList.filter((t) => keyOf(t.label).includes(q));
  }, [flatList, query]);

  const handleSave = async () => {
    try {
      const saved = await save();
      toast.success(`Saved ${saved} interests`);
    } catch (e: any) {
      toast.error(`Save failed: ${e?.message || e}`);
    }
  };

  const selectedCount = Object.keys(selected).length;

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-screen-sm p-4 sm:p-6">
        <HeaderBar query={query} onQueryChange={setQuery} inputRef={inputRef} />

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
                <p className="text-sm text-gray-600">No interests yet. Tap any chip below to add.</p>
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
                <Button variant="secondary" onClick={clearAll} disabled={Object.keys(selected).length === 0}>
                  <CircleX className="h-4 w-4 mr-1" /> Clear all
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
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
              <Button variant="secondary" onClick={clearAll} disabled={selectedCount === 0}>
                Clear
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
