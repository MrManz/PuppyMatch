// src/corsConfig.ts
import cors, { CorsOptions } from "cors";

/**
 * Dev: allow any origin (reflects Origin header) and common headers/methods.
 * Prod: restrict to allowlist.
 */
const isProd = process.env.NODE_ENV === "production";

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://puppymatch-frontend.onrender.com",
];

export function makeCors() {
  if (!isProd) {
    const opts: CorsOptions = {
      origin: true,                 // reflect Origin
      credentials: false,           // you don't use cookies; keep false to allow '*'
      methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    };
    return cors(opts);
  }

  const opts: CorsOptions = {
    origin(origin, cb) {
      if (!origin) return cb(null, true); // server-to-server
      cb(null, ALLOWED_ORIGINS.includes(origin));
    },
    credentials: false,
    methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };
  return cors(opts);
}

/** Optional tiny middleware to guarantee headers even on early errors */
export function ensureCorsHeaders(req: any, res: any, next: any) {
  const origin = req.headers.origin;
  if (!isProd) {
    // reflect dev origin (or wildcard if none)
    res.header("Access-Control-Allow-Origin", origin || "*");
  } else if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
}
