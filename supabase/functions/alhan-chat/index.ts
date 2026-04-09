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
    const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, profileContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const profileSummary = buildProfileSummary(profileContext);

    const systemPrompt = `Je bent Alhan, de AI profiel-coach van Alhan Groep B.V. — een uitzendbureau voor ZZP'ers in de bouw en infra sector in Nederland.

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

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

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Sorry, ik kon geen antwoord genereren.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Onbekende fout" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
