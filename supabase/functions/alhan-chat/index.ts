import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

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

const envOrigins = Deno.env.get("ALLOWED_ORIGINS") ?? "";
const parsedEnvOrigins = envOrigins
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** Lokale dev (o.a. Vite/Capacitor live reload); POST moet exact `Access-Control-Allow-Origin: <Origin>` terugkrijgen — nooit `*`. */
const ALLOWED_ORIGINS = new Set([
  "http://localhost:8081",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:8081",
  "capacitor://localhost",
  "https://localhost",
  ...parsedEnvOrigins,
]);

const isProduction =
  Deno.env.get("ENVIRONMENT") === "production" ||
  Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;

if (isProduction && parsedEnvOrigins.length === 0) {
  console.error(
    "[SECURITY] ALLOWED_ORIGINS is niet geconfigureerd in productie. " +
      "Alleen dev-origins zijn actief. " +
      "Stel ALLOWED_ORIGINS in via Supabase secrets.",
  );
}

/** Vergelijk origins robuust (trailing slash + lowercase host), echo altijd de exacte Origin-header van de client. */
function normalizeOriginKey(origin: string): string {
  const t = origin.trim();
  const noSlash = t.replace(/\/+$/, "");
  try {
    const u = new URL(noSlash);
    return `${u.protocol}//${u.host}`.toLowerCase();
  } catch {
    return noSlash.toLowerCase();
  }
}

function isOriginAllowed(requestOrigin: string): boolean {
  if (!requestOrigin.trim()) return false;
  const key = normalizeOriginKey(requestOrigin);
  for (const allowed of ALLOWED_ORIGINS) {
    if (normalizeOriginKey(allowed) === key) return true;
  }
  return false;
}

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };

  // Echo de request Origin exact terug (CORS-specificatie); geen wildcard.
  if (origin && isOriginAllowed(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function jsonHeaders(req: Request): Record<string, string> {
  return { ...getCorsHeaders(req), "Content-Type": "application/json" };
}

function sseHeaders(req: Request): Record<string, string> {
  return { ...getCorsHeaders(req), "Content-Type": "text/event-stream" };
}

function buildProfileSummary(ctx: any): string {
  if (!ctx) return "";

  const parts: string[] = [];
  const p = ctx.profile;

  if (p) {
    const name = (p.full_name || "").trim();
    if (name) parts.push(`Naam: ${name}`);
    if (p.specialization) parts.push(`Specialisatie: ${p.specialization}`);
    if (p.city) parts.push(`Woonplaats: ${p.city}`);
    if (p.hourly_rate) parts.push(`Uurtarief: €${p.hourly_rate}`);
    if (p.transport_type) parts.push(`Transport: ${p.transport_type}`);
    if (p.has_own_equipment) parts.push(`Heeft eigen gereedschap`);
    if (p.bio) parts.push(`Bio: ${p.bio}`);
    if (p.status) parts.push(`Account status: ${p.status}`);
    if (!p.avatar_url) parts.push(`⚠️ Geen profielfoto geüpload`);
    if (!p.specialization) parts.push(`⚠️ Geen specialisatie ingevuld`);
    if (!p.city) parts.push(`⚠️ Geen woonplaats ingevuld`);
    if (!p.bio) parts.push(`⚠️ Geen bio/werkervaring ingevuld`);
  }

  const s = ctx.scores;
  if (s) {
    parts.push(`\nGamificatie: Level ${s.level}, ${s.total_points} punten, ${s.current_streak} dagen streak, ${s.challenges_completed} challenges voltooid`);
  }

  if (ctx.achievements?.length) {
    parts.push(`Badges: ${ctx.achievements.join(", ")}`);
  } else {
    parts.push(`⚠️ Nog geen badges ontgrendeld`);
  }

  if (ctx.certificates?.length) {
    const certList = ctx.certificates.map((c: any) => {
      const expired = c.expiry_date && new Date(c.expiry_date) < new Date();
      return `${c.name}${expired ? " (VERLOPEN!)" : c.expiry_date ? ` (geldig tot ${c.expiry_date})` : ""}`;
    });
    parts.push(`Certificaten: ${certList.join(", ")}`);
  } else {
    parts.push(`⚠️ Geen certificaten geüpload`);
  }

  parts.push(`Recente activiteit: ${ctx.recentActivity || 0} challenges voltooid afgelopen 7 dagen`);

  return parts.join("\n");
}

function jsonError(req: Request, message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: jsonHeaders(req),
  });
}

/** Returns Response on auth failure, null when authenticated. */
async function requireAuth(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonError(req, "Unauthorized", 401);
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return jsonError(req, "Unauthorized", 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("alhan-chat: SUPABASE_URL or SUPABASE_ANON_KEY missing");
    return jsonError(req, "Interne fout", 500);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return jsonError(req, "Unauthorized", 401);
  }
  return null;
}

function validateScores(
  src: unknown,
): { ok: true; scores: Record<string, number> } | { ok: false; message: string } {
  if (src === undefined || src === null) {
    return { ok: true, scores: {} };
  }

  if (typeof src !== "object" || Array.isArray(src)) {
    return { ok: false, message: "Invalid profileContext" };
  }

  const ALLOWED_FIELDS: Record<string, { min: number; max: number }> = {
    level: { min: 0, max: 1_000 },
    total_points: { min: 0, max: 10_000_000 },
    current_streak: { min: 0, max: 100_000 },
    challenges_completed: { min: 0, max: 1_000_000 },
  };

  const raw = src as Record<string, unknown>;
  const out: Record<string, number> = {};

  for (const key of Object.keys(raw)) {
    if (!(key in ALLOWED_FIELDS)) {
      return { ok: false, message: "Invalid profileContext" };
    }
  }

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

/** Strips unknown profile keys; validates listed fields. Pass-through scores/achievements/recentActivity when well-typed. */
function validateProfileContext(
  raw: unknown,
): { ok: false; message: string } | { ok: true; value: Record<string, unknown> | null } {
  if (raw === undefined || raw === null) {
    return { ok: true, value: null };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, message: "Invalid profileContext" };
  }

  const src = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  if (src.profile !== undefined && src.profile !== null) {
    if (typeof src.profile !== "object" || Array.isArray(src.profile)) {
      return { ok: false, message: "Invalid profileContext" };
    }
    const p = src.profile as Record<string, unknown>;
    const profileOut: Record<string, string> = {};
    const limits: Record<string, number> = {
      full_name: 100,
      bio: 500,
      city: 100,
      specialization: 100,
    };
    for (const key of Object.keys(limits) as (keyof typeof limits)[]) {
      if (!(key in p)) continue;
      const v = p[key];
      if (v === undefined || v === null) continue;
      if (typeof v !== "string") {
        return { ok: false, message: "Invalid profileContext" };
      }
      if (v.length > limits[key]) {
        return { ok: false, message: "Invalid profileContext" };
      }
      profileOut[key] = v;
    }
    if (Object.keys(profileOut).length > 0) {
      out.profile = profileOut;
    }
  }

  if (src.certificates !== undefined && src.certificates !== null) {
    if (!Array.isArray(src.certificates)) {
      return { ok: false, message: "Invalid profileContext" };
    }
    if (src.certificates.length > 10) {
      return { ok: false, message: "Invalid profileContext" };
    }
    const certsOut: { name: string; expiry_date?: string }[] = [];
    for (const item of src.certificates) {
      if (typeof item === "string") {
        if (item.length > 200) return { ok: false, message: "Invalid profileContext" };
        certsOut.push({ name: item });
      } else if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        const c = item as Record<string, unknown>;
        if (typeof c.name !== "string" || c.name.length > 200) {
          return { ok: false, message: "Invalid profileContext" };
        }
        const entry: { name: string; expiry_date?: string } = { name: c.name };
        if (typeof c.expiry_date === "string" && c.expiry_date.length <= 50) {
          entry.expiry_date = c.expiry_date;
        }
        certsOut.push(entry);
      } else {
        return { ok: false, message: "Invalid profileContext" };
      }
    }
    out.certificates = certsOut;
  }

  const scoresResult = validateScores(src.scores);
  if (!scoresResult.ok) {
    return scoresResult;
  }
  if (Object.keys(scoresResult.scores).length > 0) {
    out.scores = scoresResult.scores;
  }

  if (src.achievements !== undefined && src.achievements !== null) {
    if (!Array.isArray(src.achievements)) {
      return { ok: false, message: "Invalid profileContext" };
    }
    if (!src.achievements.every((x): x is string => typeof x === "string")) {
      return { ok: false, message: "Invalid profileContext" };
    }
    out.achievements = src.achievements;
  }

  if (src.recentActivity !== undefined && src.recentActivity !== null) {
    if (typeof src.recentActivity !== "number" || !Number.isFinite(src.recentActivity)) {
      return { ok: false, message: "Invalid profileContext" };
    }
    out.recentActivity = src.recentActivity;
  }

  return { ok: true, value: Object.keys(out).length > 0 ? out : null };
}

function validateChatBody(
  body: Record<string, unknown>,
):
  | { ok: true; profileContext: Record<string, unknown> | null }
  | { ok: false; message: string } {
  if (!Array.isArray(body.messages)) {
    return { ok: false, message: "Invalid messages" };
  }
  if (body.messages.length === 0 || body.messages.length > 20) {
    return { ok: false, message: "Invalid messages" };
  }
  for (const item of body.messages) {
    if (typeof item !== "object" || item === null) {
      return { ok: false, message: "Invalid messages" };
    }
    const m = item as Record<string, unknown>;
    if (typeof m.role !== "string" || typeof m.content !== "string") {
      return { ok: false, message: "Invalid messages" };
    }
    if (m.content.length > 2000) {
      return { ok: false, message: "Invalid messages" };
    }
  }

  if ("dashboardCoachContext" in body && body.dashboardCoachContext !== undefined && body.dashboardCoachContext !== null) {
    if (typeof body.dashboardCoachContext !== "string" || body.dashboardCoachContext.length > 500) {
      return { ok: false, message: "Invalid dashboardCoachContext" };
    }
  }

  const pc = validateProfileContext(body.profileContext);
  if (!pc.ok) {
    return { ok: false, message: pc.message };
  }

  return { ok: true, profileContext: pc.value };
}

function parseJsonAssistantContent(raw: string): { message: string; priority?: string } | null {
  const trimmed = raw.trim();
  const withoutFence = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const obj = JSON.parse(withoutFence) as { message?: unknown; priority?: unknown };
    if (typeof obj.message !== "string") return null;
    return {
      message: obj.message.trim(),
      priority: typeof obj.priority === "string" ? obj.priority : undefined,
    };
  } catch {
    return null;
  }
}

async function handleDashboardSmartBlock(
  req: Request,
  body: Record<string, unknown>,
  geminiKey: string,
): Promise<Response> {
  if (typeof body.weather !== "string" || body.weather.length > 100) {
    return jsonError(req, "Invalid weather", 400);
  }
  const weather = body.weather;

  if (typeof body.temperature !== "number" || !Number.isFinite(body.temperature)) {
    return jsonError(req, "Invalid temperature", 400);
  }
  const temperature = body.temperature;

  if (typeof body.hoursLoggedYesterday !== "boolean") {
    return jsonError(req, "Invalid hoursLoggedYesterday", 400);
  }
  const hoursLoggedYesterday = body.hoursLoggedYesterday;

  if (
    typeof body.leaderboardPosition !== "number" ||
    !Number.isInteger(body.leaderboardPosition) ||
    body.leaderboardPosition < 1 ||
    body.leaderboardPosition > 999_999
  ) {
    return jsonError(req, "Invalid leaderboardPosition", 400);
  }
  const leaderboardPosition = body.leaderboardPosition;

  const tempStr = `${temperature}`;
  const rankStr = leaderboardPosition === 999_999 ? "geen" : String(leaderboardPosition);

  const systemPrompt =
    `Je bent Alhan AI coach (dashboard smart block) voor ZZP'ers in de bouw.
Antwoord ALLEEN met JSON (geen markdown), exact dit formaat:
{"message":"...","priority":"low"|"medium"|"high"}

Regels priority:
- "high" als uren gisteren niet zijn ingeschreven (hoursLoggedYesterday false).
- "medium" als leaderboardpositie > 10 of "geen" (geen plek).
- "low" als uren gisteren wél zijn ingeschreven én positie 1–10.

message: maximaal 12 woorden, motiverend, in het Nederlands.`;

  const userContent =
    `Context: dashboard_smart_block. Weer: ${weather}, ${tempStr}°C. Uren gisteren ingeschreven: ${
      hoursLoggedYesterday ? "ja" : "nee"
    }. Leaderboard positie: ${rankStr}.`;

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=" + geminiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errBody = await response.text();
    console.error("[alhan-chat] Gemini dashboard_smart_block HTTP-fout", {
      status: response.status,
      bodySnippet: errBody.slice(0, 400) || "(leeg)",
    });
    return new Response(JSON.stringify({ error: "AI fout" }), {
      status: 500,
      headers: jsonHeaders(req),
    });
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    return new Response(JSON.stringify({ error: "Ongeldig AI antwoord" }), {
      status: 500,
      headers: jsonHeaders(req),
    });
  }

  const parsed = parseJsonAssistantContent(content);
  if (!parsed?.message) {
    return new Response(JSON.stringify({ error: "Ongeldig JSON van AI" }), {
      status: 500,
      headers: jsonHeaders(req),
    });
  }

  const rawP = typeof parsed.priority === "string" ? parsed.priority.toLowerCase() : "";
  const priority: "low" | "medium" | "high" =
    rawP === "low" || rawP === "medium" || rawP === "high" ? rawP : "low";

  return new Response(JSON.stringify({ message: parsed.message, priority }), {
    status: 200,
    headers: jsonHeaders(req),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const body = await req.json() as Record<string, unknown>;
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("[alhan-chat] GEMINI_API_KEY ontbreekt (secret niet gezet)");
      return jsonError(req, "Interne fout", 500);
    }

    const authFailure = await requireAuth(req);
    if (authFailure) return authFailure;

    if (body?.context === "dashboard_smart_block") {
      return await handleDashboardSmartBlock(req, body, GEMINI_API_KEY);
    }

    const chatCheck = validateChatBody(body);
    if (!chatCheck.ok) {
      console.error("[alhan-chat] validateChatBody geweigerd:", chatCheck.message);
      return jsonError(req, chatCheck.message, 400);
    }
    const sanitizedProfile = chatCheck.profileContext;

    const { messages, dashboardCoachContext } = body as {
      messages: unknown[];
      profileContext?: unknown;
      dashboardCoachContext?: string;
    };
    const profileSummary = buildProfileSummary(sanitizedProfile);

    const dashboardBlock =
      dashboardCoachContext && String(dashboardCoachContext).trim()
        ? `\n\n## DASHBOARD COACH CONTEXT\n${String(dashboardCoachContext).trim()}\n`
        : "";

    const systemPrompt = `Je bent Alhan, de AI profiel-coach van Alhan Groep B.V. — een uitzendbureau voor ZZP'ers in de bouw en infra sector in Nederland.
${dashboardBlock}
${profileSummary ? `## PROFIEL VAN DEZE GEBRUIKER
${profileSummary}

Gebruik deze profielgegevens om GEPERSONALISEERD advies te geven. Noem de gebruiker bij naam. Wijs op ontbrekende onderdelen (gemarkeerd met ⚠️) en geef concrete tips om het profiel te verbeteren. Als certificaten verlopen zijn, waarschuw daar actief over.` : "Je hebt geen profielgegevens beschikbaar. Vraag de gebruiker om eerst in te loggen."}

## WAT JE DOET
- Gepersonaliseerd profiel-advies op basis van bovenstaande data
- Tips over certificaten (VCA, BHV, etc.) en wanneer ze vernieuwd moeten worden
- Uitleg over het puntensysteem, achievements en daily challenges
- Motiveren om streaks vol te houden en meer challenges te doen
- Advies over beschikbaarheid en werkregio's
- Referral programma uitleg
- Algemene vragen over werken als ZZP'er in de bouw

## STIJL
Communiceer kort, vriendelijk en motiverend. Gebruik emoji's. Antwoord in de taal van de gebruiker (standaard Nederlands). Houd antwoorden beknopt (max 3-4 zinnen tenzij meer detail nodig is). Gebruik markdown voor structuur als dat helpt.`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=" + GEMINI_API_KEY,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-2.0-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Te veel verzoeken, probeer het later opnieuw." }), {
          status: 429,
          headers: jsonHeaders(req),
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Tegoed op, neem contact op met de beheerder." }), {
          status: 402,
          headers: jsonHeaders(req),
        });
      }
      const geminiErrBody = await response.text();
      const snippet = geminiErrBody.slice(0, 400);
      console.error("[alhan-chat] Gemini chat streaming HTTP-fout", {
        status: response.status,
        bodySnippet: snippet || "(leeg)",
      });
      return new Response(JSON.stringify({ error: "AI fout" }), {
        status: 500,
        headers: jsonHeaders(req),
      });
    }

    return new Response(response.body, {
      headers: sseHeaders(req),
    });
  } catch (e) {
    console.error("[alhan-chat] onverwachte fout in serve-handler:", e);
    return new Response(JSON.stringify({ error: "Interne fout" }), {
      status: 500,
      headers: jsonHeaders(req),
    });
  }
});
