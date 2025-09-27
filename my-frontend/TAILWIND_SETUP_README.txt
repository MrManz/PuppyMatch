Tailwind Setup (Vite + React)
=============================
1) Install deps:
   npm install -D tailwindcss postcss autoprefixer tailwindcss-animate

2) Make sure these files exist at repo root / src:
   - tailwind.config.cjs
   - postcss.config.cjs
   - src/index.css  (imports Tailwind layers)

3) Ensure your app imports the CSS (usually in src/main.tsx):
   import "./index.css";

4) Build locally to verify:
   npm run build

5) Render (Static Site) settings:
   Build command:   npm install && npm run build
   Publish dir:     dist
   Env:             VITE_API_BASE=https://your-backend.onrender.com

6) If styles still look plain:
   - Clear build cache in Render and redeploy.
   - Check tailwind.config.cjs `content` globs include ./src/**/*.tsx.
   - Confirm src/components/ui/* exists and is committed.
