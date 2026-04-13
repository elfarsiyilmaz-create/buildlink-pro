import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const lat = url.searchParams.get("lat");
    const lon = url.searchParams.get("lon");

    if (!lat || !lon) {
      return new Response(JSON.stringify({ error: "Query parameters lat and lon are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("WEATHER_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "WEATHER_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const weatherUrl =
      `https://api.weatherapi.com/v1/current.json?key=${encodeURIComponent(apiKey)}` +
      `&q=${encodeURIComponent(lat)},${encodeURIComponent(lon)}&aqi=no`;

    const upstream = await fetch(weatherUrl);
    if (!upstream.ok) {
      const text = await upstream.text();
      console.error("WeatherAPI error:", upstream.status, text);
      return new Response(JSON.stringify({ error: "Weather upstream failed", status: upstream.status }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await upstream.json();
    const current = data?.current;
    const condition = current?.condition;

    const body = {
      temp_c: current?.temp_c ?? null,
      condition: {
        text: condition?.text ?? "",
        code: condition?.code ?? null,
      },
      wind_kph: current?.wind_kph ?? null,
      is_day: current?.is_day ?? null,
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=1800",
      },
    });
  } catch (e) {
    console.error("get-weather:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
