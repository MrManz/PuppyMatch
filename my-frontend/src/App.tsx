// src/App.tsx
import { getToken, getUser, logout } from "./lib/api";
import AuthPage from "./pages/AuthPage";
import InterestsPage from "./pages/InterestsPage";

export default function App() {
  const token = getToken();
  const user = getUser();

  // If no token/user in localStorage → show login/register page
  if (!token || !user) {
    return <AuthPage />;
  }

  // Otherwise show the app with a logout button
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar with user info + logout */}
      <header className="flex justify-between items-center p-4 bg-gray-100 shadow">
        <span className="font-semibold">
          PuppyMatch 🐶 — {user.email ?? user.username}
        </span>
        <button
          onClick={() => logout()}
          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Logout
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4">
        <InterestsPage />
      </main>
    </div>
  );
}
