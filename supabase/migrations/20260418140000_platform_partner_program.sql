-- Platform Partner Programma: punten per activiteit + maandelijkse stand (tier / beloning)

CREATE TABLE public.platform_partner_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  activiteit TEXT NOT NULL CHECK (
    activiteit IN (
      'dagelijks_inloggen',
      'uren_registreren',
      'veiligheidscheck',
      'profiel_compleet',
      'referral_goedgekeurd'
    )
  ),
  punten INTEGER NOT NULL,
  aangemaakt_op TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  maand INTEGER NOT NULL CHECK (maand >= 1 AND maand <= 12),
  jaar INTEGER NOT NULL CHECK (jaar >= 2020 AND jaar <= 2100)
);

CREATE INDEX platform_partner_activity_log_user_id_idx
  ON public.platform_partner_activity_log (user_id);

CREATE INDEX platform_partner_activity_log_user_period_idx
  ON public.platform_partner_activity_log (user_id, jaar, maand);

ALTER TABLE public.platform_partner_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own platform partner activity log"
  ON public.platform_partner_activity_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own platform partner activity log"
  ON public.platform_partner_activity_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage platform partner activity log"
  ON public.platform_partner_activity_log FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.platform_partner_monthly_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  maand INTEGER NOT NULL CHECK (maand >= 1 AND maand <= 12),
  jaar INTEGER NOT NULL CHECK (jaar >= 2020 AND jaar <= 2100),
  totaal_punten INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'geen' CHECK (tier IN ('geen', 'brons', 'zilver', 'goud', 'platina')),
  beloning_bedrag INTEGER NOT NULL DEFAULT 0 CHECK (beloning_bedrag IN (0, 8, 18, 30, 40)),
  beloning_gekozen BOOLEAN NOT NULL DEFAULT false,
  beloning_verstuurd BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (user_id, maand, jaar)
);

CREATE INDEX platform_partner_monthly_summary_user_id_idx
  ON public.platform_partner_monthly_summary (user_id);

ALTER TABLE public.platform_partner_monthly_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own platform partner monthly summary"
  ON public.platform_partner_monthly_summary FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own platform partner monthly summary"
  ON public.platform_partner_monthly_summary FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own platform partner monthly summary"
  ON public.platform_partner_monthly_summary FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage platform partner monthly summary"
  ON public.platform_partner_monthly_summary FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

COMMENT ON TABLE public.platform_partner_activity_log IS 'Individuele punten-events voor het Platform Partner Programma.';
COMMENT ON TABLE public.platform_partner_monthly_summary IS 'Maandtotalen, tier en beloningsstatus per gebruiker (uniek per maand/jaar).';
