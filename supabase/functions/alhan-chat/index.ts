import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

async function handleDashboardSmartBlock(body: Record<string, unknown>, geminiKey: string): Promise<Response> {
  const weather = String(body.weather ?? "");
  const temperature = typeof body.temperature === "number" ? body.temperature : Number(body.temperature);
  const hoursLoggedYesterday = Boolean(body.hoursLoggedYesterday);
  const leaderboardPosition = typeof body.leaderboardPosition === "number"
    ? body.leaderboardPosition
    : Number(body.leaderboardPosition);

  const tempStr = Number.isFinite(temperature) ? `${temperature}` : "?";
  const rankStr = leaderboardPosition > 0 ? String(leaderboardPosition) : "geen";

  const systemPrompt =
    `Je bent Alhan AI coach (dashboard smart block) voor ZZP'ers in de bouw.
Antwoord ALLEEN met JSON (geen markdown), exact dit formaat:
{"message":"...","priority":"low"|"medium"|"high"}

Regels priority:
- "high" als uren gisteren niet zijn ingeschreven (hoursLoggedYesterday false).
- "medium" als leaderboardpositie > 10 of 0.
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
    const t = await response.text();
    console.error("dashboard smart block gateway error:", response.status, t);
    return new Response(JSON.stringify({ error: "AI fout" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    return new Response(JSON.stringify({ error: "Ongeldig AI antwoord" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = parseJsonAssistantContent(content);
  if (!parsed?.message) {
    return new Response(JSON.stringify({ error: "Ongeldig JSON van AI" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let priority: "low" | "medium" | "high" | undefined;
  const p = parsed.priority?.toLowerCase();
  if (p === "low" || p === "medium" || p === "high") priority = p;

  return new Response(JSON.stringify({ message: parsed.message, priority }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    if (body?.context === "dashboard_smart_block") {
      return await handleDashboardSmartBlock(body as Record<string, unknown>, GEMINI_API_KEY);
    }

    const { messages, profileContext, dashboardCoachContext } = body;
    const profileSummary = buildProfileSummary(profileContext);

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
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Tegoed op, neem contact op met de beheerder." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI fout" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream the SSE response directly to the client
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Onbekende fout" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
