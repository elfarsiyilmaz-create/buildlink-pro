import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ta = enc.encode(a);
  const tb = enc.encode(b);
  if (ta.length !== tb.length) return false;
  return crypto.subtle.timingSafeEqual(ta, tb);
}

/** Kalenderdatum in Europe/Amsterdam (dag 1–31, maand 1–12, jaar). */
function amsterdamCalendarDate(d = new Date()): { day: number; month: number; year: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(d);
  const day = Number(parts.find((p) => p.type === "day")?.value ?? "0");
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "0");
  const year = Number(parts.find((p) => p.type === "year")?.value ?? "0");
  return { day, month, year };
}

/** Vorige kalendermaand t.o.v. een datum in Amsterdam. */
function vorigeMaandAmsterdam(day: number, month: number, year: number): { month: number; year: number } {
  if (month === 1) return { month: 12, year: year - 1 };
  return { month: month - 1, year };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
    const cronSecretExpected = Deno.env.get("CRON_SECRET");

    if (!serviceRoleKey) {
      return jsonResponse(
        { error: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY" },
        500,
      );
    }
    if (!cronSecretExpected) {
      return jsonResponse({ error: "Server misconfiguration: CRON_SECRET" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Alleen service role toegestaan" }, 403);
    }

    const bearer = authHeader.slice(7).trim();
    if (!timingSafeEqual(bearer, serviceRoleKey)) {
      return jsonResponse({ error: "Alleen service role toegestaan" }, 403);
    }

    const cronHeader =
      req.headers.get("X-Cron-Secret") ??
      req.headers.get("x-cron-secret") ??
      "";
    if (!timingSafeEqual(cronHeader, cronSecretExpected)) {
      return jsonResponse({ error: "Ongeldige cron authenticatie" }, 403);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) {
      return jsonResponse({ error: "Server misconfiguration: SUPABASE_URL" }, 500);
    }

    const { day, month, year } = amsterdamCalendarDate();
    if (day !== 1) {
      return jsonResponse(
        { success: false, reden: "niet_eerste_van_de_maand" },
        200,
      );
    }

    const { month: maandAfgesloten, year: jaarAfgesloten } = vorigeMaandAmsterdam(
      day,
      month,
      year,
    );

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    /**
     * Rijen zonder beloning (tier "geen"): niets te verzenden → beloning_verstuurd mag op true voor administratieve consistentie.
     * Rijen met beloning: status blijft ongewijzigd (handmatige/administratieve verzending).
     */
    const { error: normErr } = await admin
      .from("platform_partner_monthly_summary")
      .update({ beloning_verstuurd: true })
      .eq("maand", maandAfgesloten)
      .eq("jaar", jaarAfgesloten)
      .eq("beloning_bedrag", 0)
      .eq("beloning_verstuurd", false);

    if (normErr) {
      console.error("maand-reset normalisatie:", normErr);
      return jsonResponse({ error: normErr.message }, 500);
    }

    const { count: nogTeVerzenden, error: cntErr } = await admin
      .from("platform_partner_monthly_summary")
      .select("*", { count: "exact", head: true })
      .eq("maand", maandAfgesloten)
      .eq("jaar", jaarAfgesloten)
      .gt("beloning_bedrag", 0)
      .eq("beloning_gekozen", true)
      .eq("beloning_verstuurd", false);

    if (cntErr) {
      console.warn("maand-reset: tellen openstaande beloningen mislukt:", cntErr.message);
    } else if (nogTeVerzenden != null && nogTeVerzenden > 0) {
      console.log(
        `maand-reset: vorige maand nog te verzenden beloningen (admin): ${nogTeVerzenden}`,
      );
    }

    return jsonResponse(
      {
        success: true,
        maand_afgesloten: maandAfgesloten,
        jaar_afgesloten: jaarAfgesloten,
      },
      200,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    console.error("maand-reset:", e);
    return jsonResponse({ error: message }, 500);
  }
});
