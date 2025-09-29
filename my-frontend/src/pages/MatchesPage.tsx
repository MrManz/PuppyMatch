// src/pages/MatchesPage.tsx
import { useEffect, useState } from "react";
import { apiGetMatches, type MatchUser } from "../lib/api";

function tgLink(handle: string) {
    // handle like "@username" -> "https://t.me/username"
    const clean = handle.startsWith("@") ? handle.slice(1) : handle;
    return `https://t.me/${clean}`;
}

export default function MatchesPage() {
    const [matches, setMatches] = useState<MatchUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        apiGetMatches()
            .then(setMatches)
            .catch((e) => setError(e?.message || "Failed to load matches"))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <p className="p-4">Loading matches…</p>;
    if (error) return <p className="p-4 text-red-600">{error}</p>;

    return (
        <div className="max-w-xl mx-auto p-4 space-y-4">
            <h1 className="text-xl font-semibold">Your Matches</h1>

            {matches.length === 0 && (
                <p className="text-gray-600">No matches yet. Add a few more interests to improve your results.</p>
            )}

            <ul className="divide-y">
                {matches.map((m) => (
                    <li key={m.id} className="py-3">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 shrink-0 grid place-items-center">
                                {m.avatarUrl ? (
                                    <img src={m.avatarUrl} alt="" className="block w-full h-full object-cover" />
                                ) : (
                                    <span className="text-gray-400 text-xs">No photo</span>
                                )}
                            </div>

                            <div className="min-w-0">
                                <p className="font-medium truncate">{m.username || "Unnamed user"}</p>
                                <p className="text-xs text-gray-500">{m.overlap} common interest{m.overlap === 1 ? "" : "s"}</p>
                                {m.telegramHandle && (
                                    <p className="text-xs mt-1">
                                        Telegram:{" "}
                                        <a
                                            href={tgLink(m.telegramHandle)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-blue-600 hover:underline"
                                        >
                                            {m.telegramHandle}
                                        </a>
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Common interests (top 6) */}
                        {m.common && m.common.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {m.common.slice(0, 6).map((c) => (
                                    <span
                                        key={c}
                                        className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-800"
                                    >
                                        {c}
                                    </span>
                                ))}
                                {m.common.length > 6 && (
                                    <span className="text-xs text-gray-500">+{m.common.length - 6} more</span>
                                )}
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}