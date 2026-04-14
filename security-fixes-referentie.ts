// ============================================================================
// SECURITY FIXES — DEFINITIEVE REFERENTIE
// Audit-status: GOEDGEKEURD — DEFINITIEF
// Runtime: Deno / Supabase Edge Functions
//
// Dit bestand bevat ALLEEN de gewijzigde/nieuwe blokken.
// Integreer ze in jullie bestaande index.ts op de aangegeven plekken.
// ============================================================================

// ────────────────────────────────────────────────────────────────────────────
// FIX 1: validateScores()
// Plek: nieuwe functie, toevoegen VÓÓR validateProfileContext()
//
// Doel: alleen bekende scorevelden toestaan, elk veld moet een finite number
//       zijn binnen redelijke limieten. Onbekende keys of ongeldige waarden
//       resulteren in een harde 400 ("Invalid profileContext").
//       Geen silent coercion, geen partial accept.
// ────────────────────────────────────────────────────────────────────────────

function validateScores(
  src: unknown
): { ok: true; scores: Record<string, number> } | { ok: false; message: string } {
  if (src === undefined || src === null) {
    return { ok: true, scores: {} };
  }

  if (typeof src !== "object" || Array.isArray(src)) {
    return { ok: false, message: "Invalid profileContext" };
  }

  const ALLOWED_FIELDS: Record<string, { min: number; max: number }> = {
    level:                { min: 0, max: 1_000 },
    total_points:         { min: 0, max: 10_000_000 },
    current_streak:       { min: 0, max: 100_000 },
    challenges_completed: { min: 0, max: 1_000_000 },
  };

  const raw = src as Record<string, unknown>;
  const out: Record<string, number> = {};

  // Onbekende keys → harde afwijzing
  for (const key of Object.keys(raw)) {
    if (!(key in ALLOWED_FIELDS)) {
      return { ok: false, message: "Invalid profileContext" };
    }
  }

  // Bekende keys → type + range check
  for (const [key, limits] of Object.entries(ALLOWED_FIELDS)) {
    if (key in raw) {
      const val = raw[key];
      if (typeof val !== "number" || !Number.isFinite(val)) {
        return { ok: false, message: "Invalid profileContext" };
      }
      if (val < limits.min || val > limits.max) {
        return { ok: false, message: "Invalid profileContext" };
      }
      out[key] = val;
    }
  }

  return { ok: true, scores: out };
}

// ────────────────────────────────────────────────────────────────────────────
// FIX 2: validateProfileContext() — scores-blok vervangen
// Plek: in bestaande validateProfileContext(), het blok dat src.scores afhandelt
//
// VERWIJDER dit oude blok:
//
//   if (src.scores !== undefined && src.scores !== null) {
//     if (typeof src.scores !== "object" || Array.isArray(src.scores)) {
//       return { ok: false, message: "Invalid profileContext" };
//     }
//     out.scores = src.scores;
//   }
//
// VERVANG door:
// ────────────────────────────────────────────────────────────────────────────

// -- Begin vervanging in validateProfileContext() --
const scoresResult = validateScores(src.scores);
if (!scoresResult.ok) {
  return scoresResult;
}
// Alleen zetten als er daadwerkelijk scorevelden zijn,
// zodat buildProfileSummary() geen lege gamification-context krijgt.
if (Object.keys(scoresResult.scores).length > 0) {
  out.scores = scoresResult.scores;
}
// -- Einde vervanging --

// ────────────────────────────────────────────────────────────────────────────
// FIX 3: CORS — Deno/Supabase Edge Functions
// Plek: vervang de volledige CORS-configuratie (ALLOWED_ORIGINS + getCorsHeaders)
//
// Wijzigingen t.o.v. de oude code:
//   - Geen wildcard (*)
//   - Geen fallback naar localhost voor onbekende origins
//   - Origins uit Deno.env.get("ALLOWED_ORIGINS"), comma-separated
//   - Bestaande Supabase allow-headers behouden
//   - Vary: Origin voor correcte cache/proxy-afhandeling
//   - Expliciete security-log bij ontbrekende productieconfig
// ────────────────────────────────────────────────────────────────────────────

// Bestaande allow-headers — nodig voor Supabase client SDK
const CORS_ALLOW_HEADERS = [
  "authorization",
  "x-client-info",
  "apikey",
  "content-type",
  "x-supabase-client-platform",
  "x-supabase-client-platform-version",
  "x-supabase-client-runtime",
  "x-supabase-client-runtime-version",
].join(", ");

// Origins uit Deno env (stel in via Supabase secrets)
const envOrigins = Deno.env.get("ALLOWED_ORIGINS") ?? "";
const parsedEnvOrigins = envOrigins
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://localhost:4173",
  "capacitor://localhost",
  "https://localhost",
  ...parsedEnvOrigins,
]);

// Productie-detectie: log expliciet als er geen productie-origins geconfigureerd zijn
// De functie crasht NIET, maar requests van onbekende origins worden geblokkeerd.
// Dev-origins (localhost, capacitor) blijven altijd actief ongeacht omgeving.
const isProduction =
  Deno.env.get("ENVIRONMENT") === "production" ||
  Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;

if (isProduction && parsedEnvOrigins.length === 0) {
  console.error(
    "[SECURITY] ALLOWED_ORIGINS is niet geconfigureerd in productie. " +
      "Alleen dev-origins zijn actief. " +
      "Stel ALLOWED_ORIGINS in via Supabase secrets."
  );
}

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };

  if (ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  // Geen match = geen Access-Control-Allow-Origin header.
  // Browser blokkeert het request voor onbekende origins.
  // Dev-origins (localhost, capacitor) blijven actief ongeacht omgeving.

  return headers;
}

// ============================================================================
// CHECKLIST VOOR INTEGRATIE
//
// □  validateScores() toegevoegd vóór validateProfileContext()
// □  Oud scores-blok in validateProfileContext() vervangen door validateScores() call
// □  buildProfileSummary() gebruikt alleen output van gesanitiseerde profileContext
// □  Oude ALLOWED_ORIGINS + getCorsHeaders() volledig vervangen
// □  ALLOWED_ORIGINS secret ingesteld in Supabase dashboard voor productie
//    Voorbeeld: ALLOWED_ORIGINS=https://app.jouwdomein.nl,https://jouwdomein.nl
// □  Na deploy: test CORS vanaf productie-origin, dev-origin, en onbekende origin
// □  Na deploy: test scores met ongeldige typen, onbekende keys, extreme waarden
// ============================================================================
