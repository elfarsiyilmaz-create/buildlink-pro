-- =============================================================================
-- Maand-reset Edge Function — pg_cron + pg_net
-- =============================================================================
-- 1) Dashboard → Database → Extensions: zet pg_cron en pg_net aan.
-- 2) Edge Function secrets (Project Settings → Edge Functions / Secrets):
--      CRON_SECRET=<kies een willekeurige lange string; zelfde als X-Cron-Secret hieronder>
--      (SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY staan automatisch op Edge.)
-- 3) Vervang in dit script vóór uitvoeren in de SQL Editor:
--      <PROJECT_REF>           → projectref uit je Supabase-URL (subdomein)
--      <SERVICE_ROLE_OR_ANON>  → service role key (of anon) voor Authorization/apikey
--      <CRON_SECRET_VALUE>     → dezelfde waarde als CRON_SECRET in Edge secrets
-- 4) Voer dit uit in de SQL Editor (één keer). Bij fouten: controleer extensies.
--
-- Tijdschema: pg_cron draait in UTC. 05:00 UTC op de 1e ≈ 06:00 CET (winter).
-- Voor zomertijd (CEST) kun je een tweede job op '0 4 1 * *' toevoegen of het
-- tijdstip in het dashboard aanpassen. De functie zelf controleert of het in
-- Europe/Amsterdam de 1e is; alleen dan wordt afgesloten.
-- =============================================================================

-- Bestaande job met dezelfde naam eerst verwijderen (Dashboard → Integrations → Cron, of):
-- SELECT cron.unschedule('maand-reset-eerste-van-de-maand');
-- (Als die fout geeft: job bestond nog niet.)

SELECT cron.schedule(
  'maand-reset-eerste-van-de-maand',
  '0 5 1 * *',
  $$
  SELECT net.http_post(
   url := 'https://<PROJECT_REF>.supabase.co/functions/v1/maand-reset',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_OR_ANON>',
      'apikey', '<SERVICE_ROLE_OR_ANON>',
      'X-Cron-Secret', '<CRON_SECRET_VALUE>'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
