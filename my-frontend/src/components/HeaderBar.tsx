import type { RefObject } from "react";
import { Input } from "../components/ui/input";
import { Search } from "lucide-react";

export default function HeaderBar({
  query,
  onQueryChange,
  inputRef,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  inputRef: RefObject<HTMLInputElement>;
}) {
  return (
    <header className="sticky top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-6 pb-5 bg-blue-100/90 backdrop-blur rounded-b-3xl shadow">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-700 flex items-center gap-2">🐾 PupMatch</h1>
          <p className="text-sm text-blue-600">Find playmates by choosing your favorite interests!</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" aria-hidden />
          <Input
            ref={inputRef}
            placeholder="Search interests..."
            className="pl-8"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </div>
      </div>
    </header>
  );
}
