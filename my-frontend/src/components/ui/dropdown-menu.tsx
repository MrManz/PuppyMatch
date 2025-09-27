import * as React from "react";

const Ctx = React.createContext<{ open: boolean; setOpen: (o: boolean) => void } | null>(null);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>;
}
export function DropdownMenuTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactNode }) {
  const ctx = React.useContext(Ctx)!;
  const onClick = () => ctx.setOpen((o) => !o);
  return asChild ? React.cloneElement(children as any, { onClick }) : <button onClick={onClick}>{children}</button>;
}
export function DropdownMenuContent({ align = "start", children }: { align?: "start" | "end"; children: React.ReactNode }) {
  const ctx = React.useContext(Ctx)!;
  if (!ctx.open) return null;
  return (
    <div className={`absolute z-50 mt-2 min-w-[12rem] rounded-md border bg-white p-2 shadow ${align === "end" ? "right-0" : ""}`}>
      {children}
    </div>
  );
}
export function DropdownMenuLabel({ children }: { children: React.ReactNode }) { return <div className="px-2 py-1 text-xs text-gray-500">{children}</div>; }
export function DropdownMenuSeparator() { return <div className="my-1 h-px bg-gray-200" />; }
export function DropdownMenuItem({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className="block w-full rounded px-2 py-1 text-left hover:bg-gray-100">{children}</button>;
}
export function DropdownMenuCheckboxItem(props: any) { return <DropdownMenuItem {...props} />; }
export function DropdownMenuTriggerItem(props: any) { return <DropdownMenuItem {...props} />; }
