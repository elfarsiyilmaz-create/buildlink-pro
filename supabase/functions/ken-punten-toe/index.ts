import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Missing or invalid Authorization header" }, 401);
    }

    const jwt = authHeader.slice(7).trim();
    if (!jwt) {
      return jsonResponse({ error: "Missing JWT" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseUrl) {
      return jsonResponse({ error: "Server misconfiguration: SUPABASE_URL" }, 500);
    }
    if (!serviceRoleKey) {
      return jsonResponse(
        {
          error:
            "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY (or SERVICE_ROLE_KEY)",
        },
        500,
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return jsonResponse(
        { error: userErr?.message || "Invalid or expired session" },
        401,
      );
    }

    const callerId = userData.user.id;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const userId = body["user_id"];
    const activiteit = body["activiteit"];
    const referralUserId = body["referral_user_id"];

    if (!isUuid(userId)) {
      return jsonResponse({ error: "Ongeldige of ontbrekende user_id" }, 400);
    }
    if (typeof activiteit !== "string" || !activiteit.trim()) {
      return jsonResponse({ error: "Ongeldige of ontbrekende activiteit" }, 400);
    }
    if (referralUserId != null && referralUserId !== "" && !isUuid(referralUserId)) {
      return jsonResponse({ error: "Ongeldige referral_user_id" }, 400);
    }

    if (userId !== callerId) {
      return jsonResponse({ error: "user_id komt niet overeen met de ingelogde gebruiker" }, 403);
    }

    const pReferral =
      referralUserId === "" || referralUserId == null ? null : referralUserId;

    const { data, error } = await admin.rpc("ken_punten_toe", {
      p_user_id: userId,
      p_activiteit: activiteit.trim(),
      p_referral_user_id: pReferral,
    });

    if (error) {
      console.error("ken-punten-toe rpc:", error);
      return jsonResponse({ error: error.message }, 500);
    }

    if (data && typeof data === "object" && !Array.isArray(data)) {
      return jsonResponse(data as Record<string, unknown>, 200);
    }

    return jsonResponse({ error: "Onverwacht antwoord van server" }, 500);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    console.error("ken-punten-toe:", e);
    return jsonResponse({ error: message }, 500);
  }
});
