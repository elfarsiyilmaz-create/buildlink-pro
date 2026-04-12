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
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseUrl) {
      return jsonResponse({ error: "Server misconfiguration: SUPABASE_URL" }, 500);
    }
    if (!serviceRoleKey) {
      return jsonResponse({ error: "Server misconfiguration: SERVICE_ROLE_KEY" }, 500);
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

    const userId = userData.user.id;

    const tablesUserId: { table: string; column: string }[] = [
      { table: "notifications", column: "user_id" },
      { table: "time_entries", column: "user_id" },
      { table: "job_applications", column: "user_id" },
      { table: "user_challenge_completions", column: "user_id" },
      { table: "user_achievements", column: "user_id" },
      { table: "leaderboard_scores", column: "user_id" },
      { table: "availability", column: "user_id" },
      { table: "certificates", column: "user_id" },
      { table: "wheel_spins", column: "user_id" },
      { table: "user_spins", column: "user_id" },
      { table: "user_roles", column: "user_id" },
      { table: "profiles", column: "user_id" },
    ];

    for (const { table, column } of tablesUserId) {
      const { error } = await admin.from(table).delete().eq(column, userId);
      if (error) {
        console.error(`delete-account: ${table}`, error);
        return jsonResponse(
          { error: `Failed to remove data from ${table}: ${error.message}` },
          500,
        );
      }
    }

    const { error: refErr } = await admin
      .from("referral_invites")
      .delete()
      .eq("referrer_id", userId);
    if (refErr) {
      console.error("delete-account: referral_invites", refErr);
      return jsonResponse(
        { error: `Failed to remove referral data: ${refErr.message}` },
        500,
      );
    }

    const { error: delAuthErr } = await admin.auth.admin.deleteUser(userId);
    if (delAuthErr) {
      console.error("delete-account: auth.admin.deleteUser", delAuthErr);
      return jsonResponse(
        { error: delAuthErr.message || "Failed to delete auth user" },
        500,
      );
    }

    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    console.error("delete-account:", e);
    return jsonResponse({ error: message }, 500);
  }
});
