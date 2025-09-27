import * as React from "react";

const Ctx = React.createContext<{ open: boolean; setOpen: (o: boolean) => void } | null>(null);

export function Dialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>;
}
export function DialogTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactNode }) {
  const ctx = React.useContext(Ctx)!;
  const onClick = () => ctx.setOpen(true);
  return asChild ? React.cloneElement(children as any, { onClick }) : <button onClick={onClick}>{children}</button>;
}
export function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(Ctx)!;
  if (!ctx.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className={"w-full max-w-md rounded-xl bg-white p-4 " + (className || "")}>{children}</div>
    </div>
  );
}
export function DialogHeader({ children }: { children: React.ReactNode }) { return <div className="mb-2">{children}</div>; }
export function DialogFooter({ children }: { children: React.ReactNode }) { return <div className="mt-4 flex justify-end gap-2">{children}</div>; }
export function DialogTitle({ children }: { children: React.ReactNode }) { return <h3 className="text-lg font-semibold">{children}</h3>; }
