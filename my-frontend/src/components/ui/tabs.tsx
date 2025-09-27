import * as React from "react";
import { cn } from "@/lib/utils";

type TabsContextType = { value: string; setValue: (v: string) => void };
const Ctx = React.createContext<TabsContextType | null>(null);

export function Tabs({ defaultValue, className, children }: { defaultValue: string; className?: string; children: React.ReactNode }) {
  const [value, setValue] = React.useState(defaultValue);
  return <div className={className}><Ctx.Provider value={{ value, setValue }}>{children}</Ctx.Provider></div>;
}
export function TabsList({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("inline-grid gap-2", className)}>{children}</div>;
}
export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(Ctx)!;
  const active = ctx.value === value;
  return (
    <button
      onClick={() => ctx.setValue(value)}
      className={cn("px-3 py-2 rounded-md border text-sm", active ? "bg-black text-white border-black" : "bg-white")}
    >
      {children}
    </button>
  );
}
export function TabsContent({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(Ctx)!;
  if (ctx.value !== value) return null;
  return <div className="mt-3">{children}</div>;
}
