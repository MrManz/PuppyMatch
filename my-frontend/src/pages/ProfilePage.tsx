// src/pages/ProfilePage.tsx
import { useEffect, useRef, useState } from "react";
import { apiGetProfile, apiUpdateProfile, type Profile } from "../lib/api";

// Resize helper: makes a small, mobile-friendly data URL (JPEG)
async function resizeImageToDataURL(file: File, maxSize = 256, quality = 0.8): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

// Simple client-side check for Telegram handle (optional)
function isValidTelegramHandle(s: string) {
  // allow empty, otherwise @ + 5..32 [a-zA-Z0-9_]
  if (!s) return true;
  return /^@[a-zA-Z0-9_]{5,32}$/.test(s);
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");
  const [telegramHandle, setTelegramHandle] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    apiGetProfile()
      .then((p) => {
        if (!live) return;
        setProfile(p);
        setUsername(p.username ?? "");
        setTelegramHandle(p.telegramHandle ?? "");
      })
      .catch((e) => setError(e.message || "Failed to load profile"));
    return () => {
      live = false;
    };
  }, []);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    // quick size guard (original)
    if (file.size > 3_000_000) {
      setError("Image is too large. Pick a smaller one.");
      return;
    }
    try {
      const dataUrl = await resizeImageToDataURL(file, 256, 0.8);
      setAvatarDataUrl(dataUrl);
    } catch (err: any) {
      setError(err?.message || "Could not process image");
    }
  }

  async function onSave() {
    setError(null);

    if (!isValidTelegramHandle(telegramHandle.trim())) {
      setError("Telegram handle must start with @ and be 5–32 characters (letters, digits, underscores).");
      return;
    }

    setSaving(true);
    try {
      const payload: { username?: string; avatarDataUrl?: string; telegramHandle?: string } = {};
      if (username.trim() !== (profile?.username ?? "")) payload.username = username.trim();
      if ((telegramHandle || "") !== (profile?.telegramHandle ?? "")) {
        payload.telegramHandle = telegramHandle.trim() || undefined;
      }
      if (avatarDataUrl) payload.avatarDataUrl = avatarDataUrl;

      const res = await apiUpdateProfile(payload);
      setProfile(res.user);
      setAvatarDataUrl(undefined);
    } catch (e: any) {
      setError(e?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  if (!profile && !error) return <p className="p-4">Loading profile…</p>;

  return (
    <div className="max-w-xl mx-auto p-4 bg-white rounded shadow">
      <h1 className="text-xl font-semibold mb-4">Your profile</h1>

      {error && <p className="mb-3 text-red-600">{error}</p>}

      <div className="flex items-center gap-4 mb-4">
        {/* Fixed/min size for reliable mobile layout */}
        <div className="w-16 h-16 min-w-16 min-h-16 rounded-full overflow-hidden bg-gray-100 shrink-0">
          {avatarDataUrl ? (
            <img src={avatarDataUrl} alt="preview" className="block w-full h-full object-cover" />
          ) : profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt="avatar" className="block w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-gray-400 text-xs">No photo</div>
          )}
        </div>

        <div className="flex-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="block w-full text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">We’ll resize to a small mobile-friendly image.</p>
        </div>
      </div>

      <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full border rounded px-3 py-2 mb-4"
        placeholder="username"
      />

      <label className="block text-sm font-medium text-gray-700 mb-1">Telegram handle (optional)</label>
      <input
        value={telegramHandle}
        onChange={(e) => setTelegramHandle(e.target.value)}
        className="w-full border rounded px-3 py-2 mb-4"
        placeholder="@yourhandle"
        inputMode="text"
        autoComplete="off"
      />
      <p className="text-xs text-gray-500 -mt-3 mb-4">
        Format: <code>@username</code> (5–32 letters, digits, or underscores). Leave empty if you prefer.
      </p>

      <button
        onClick={onSave}
        disabled={saving}
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save profile"}
      </button>
    </div>
  );
}
