// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import AuthPage from "./pages/AuthPage";
import InterestsPage from "./pages/InterestsPage";
import MatchesPage from "./pages/MatchesPage";
import ProfilePage from "./pages/ProfilePage";
import { getToken, getUser, logout } from "./lib/api";

type Tab = "interests" | "matches" | "profile";

export default function App() {
  // --- Auth gate ---
  const [authedVersion, setAuthedVersion] = useState(0);
  const authed = useMemo(() => !!getToken() && !!getUser(), [authedVersion]);

  // --- Tab / hash syncing ---
  const initialTab: Tab =
    (window.location.hash.replace("#", "") as Tab) || "interests";
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    const onHash = () => {
      const next = (window.location.hash.replace("#", "") as Tab) || "interests";
      if (next === "matches" || next === "profile") {
        setTab(next);
      } else {
        setTab("interests");
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const desired = `#${tab}`;
    if (window.location.hash !== desired) {
      window.location.hash = desired;
    }
  }, [tab]);

  if (!authed) {
    return <AuthPage onAuthed={() => setAuthedVersion((v) => v + 1)} />;
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-screen-sm p-4 sm:p-6">
        {/* Top bar with Logout */}
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">PuppyMatch 🐶</h1>
          <button
            onClick={() => logout()}
            className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
          >
            Logout
          </button>
        </header>

        {/* Navigation */}
        <nav className="mb-4 flex gap-2">
          <NavButton active={tab === "interests"} onClick={() => setTab("interests")}>
            Interests
          </NavButton>
          <NavButton active={tab === "matches"} onClick={() => setTab("matches")}>
            Matches
          </NavButton>
          <NavButton active={tab === "profile"} onClick={() => setTab("profile")}>
            Profile
          </NavButton>
        </nav>

        {/* Page content */}
        {tab === "interests" && <InterestsPage />}
        {tab === "matches" && <MatchesPage />}
        {tab === "profile" && <ProfilePage />}
      </div>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "px-3 py-1 rounded transition-colors " +
        (active
          ? "bg-blue-600 text-white"
          : "bg-white border border-gray-300 text-gray-800 hover:bg-gray-50")
      }
      aria-current={active ? "page" : undefined}
    >
      {children}
    </button>
  );
}
