-- Referral-dedupe + Amsterdam-kalenderdag voor dagelijkse activiteiten + atomische punten-award RPC

ALTER TABLE public.platform_partner_activity_log
  ADD COLUMN IF NOT EXISTS referral_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.platform_partner_activity_log
  DROP CONSTRAINT IF EXISTS platform_partner_activity_referral_user_chk;

ALTER TABLE public.platform_partner_activity_log
  ADD CONSTRAINT platform_partner_activity_referral_user_chk CHECK (
    (
      activiteit = 'referral_goedgekeurd'
      AND referral_user_id IS NOT NULL
      AND referral_user_id <> user_id
    )
    OR (
      activiteit <> 'referral_goedgekeurd'
      AND referral_user_id IS NULL
    )
  );

ALTER TABLE public.platform_partner_activity_log
  DROP COLUMN IF EXISTS datum_amsterdam;

ALTER TABLE public.platform_partner_activity_log
  ADD COLUMN datum_amsterdam DATE GENERATED ALWAYS AS (
    ((aangemaakt_op AT TIME ZONE 'Europe/Amsterdam'))::date
  ) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS platform_partner_daily_activity_unique
  ON public.platform_partner_activity_log (user_id, activiteit, datum_amsterdam)
  WHERE activiteit IN ('dagelijks_inloggen', 'uren_registreren', 'veiligheidscheck');

CREATE UNIQUE INDEX IF NOT EXISTS platform_partner_profiel_unique
  ON public.platform_partner_activity_log (user_id)
  WHERE activiteit = 'profiel_compleet';

CREATE UNIQUE INDEX IF NOT EXISTS platform_partner_referral_unique
  ON public.platform_partner_activity_log (user_id, referral_user_id)
  WHERE activiteit = 'referral_goedgekeurd';

CREATE OR REPLACE FUNCTION public.tier_voor_punten(p_totaal integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_totaal >= 95 THEN 'platina'::text
    WHEN p_totaal >= 75 THEN 'goud'::text
    WHEN p_totaal >= 55 THEN 'zilver'::text
    WHEN p_totaal >= 30 THEN 'brons'::text
    ELSE 'geen'::text
  END;
$$;

CREATE OR REPLACE FUNCTION public.beloning_voor_tier(p_tier text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_tier
    WHEN 'platina' THEN 40
    WHEN 'goud' THEN 30
    WHEN 'zilver' THEN 18
    WHEN 'brons' THEN 8
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.ken_punten_toe(
  p_user_id uuid,
  p_activiteit text,
  p_referral_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_punten integer;
  v_maand integer;
  v_jaar integer;
  v_nu timestamptz := clock_timestamp();
  v_totaal integer;
  v_tier text;
  v_beloning integer;
BEGIN
  IF p_activiteit IS NULL OR p_activiteit NOT IN (
    'dagelijks_inloggen',
    'uren_registreren',
    'veiligheidscheck',
    'profiel_compleet',
    'referral_goedgekeurd'
  ) THEN
    RETURN jsonb_build_object('success', false, 'reden', 'ongeldige_activiteit');
  END IF;

  IF p_activiteit = 'referral_goedgekeurd' THEN
    IF p_referral_user_id IS NULL OR p_referral_user_id = p_user_id THEN
      RETURN jsonb_build_object('success', false, 'reden', 'ongeldige_activiteit');
    END IF;
  ELSE
    IF p_referral_user_id IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'reden', 'ongeldige_activiteit');
    END IF;
  END IF;

  v_punten := CASE p_activiteit
    WHEN 'dagelijks_inloggen' THEN 1
    WHEN 'uren_registreren' THEN 2
    WHEN 'veiligheidscheck' THEN 2
    WHEN 'profiel_compleet' THEN 25
    WHEN 'referral_goedgekeurd' THEN 20
  END;

  v_maand := EXTRACT(MONTH FROM (v_nu AT TIME ZONE 'Europe/Amsterdam'))::integer;
  v_jaar := EXTRACT(YEAR FROM (v_nu AT TIME ZONE 'Europe/Amsterdam'))::integer;

  BEGIN
    INSERT INTO public.platform_partner_activity_log (
      user_id,
      activiteit,
      punten,
      maand,
      jaar,
      referral_user_id
    )
    VALUES (
      p_user_id,
      p_activiteit,
      v_punten,
      v_maand,
      v_jaar,
      CASE WHEN p_activiteit = 'referral_goedgekeurd' THEN p_referral_user_id ELSE NULL END
    );
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('success', false, 'reden', 'al_gedaan');
  END;

  INSERT INTO public.platform_partner_monthly_summary (
    user_id,
    maand,
    jaar,
    totaal_punten,
    tier,
    beloning_bedrag,
    beloning_gekozen,
    beloning_verstuurd
  )
  VALUES (
    p_user_id,
    v_maand,
    v_jaar,
    v_punten,
    public.tier_voor_punten(v_punten),
    public.beloning_voor_tier(public.tier_voor_punten(v_punten)),
    false,
    false
  )
  ON CONFLICT (user_id, maand, jaar) DO UPDATE SET
    totaal_punten = public.platform_partner_monthly_summary.totaal_punten + EXCLUDED.totaal_punten,
    tier = public.tier_voor_punten(
      public.platform_partner_monthly_summary.totaal_punten + EXCLUDED.totaal_punten
    ),
    beloning_bedrag = public.beloning_voor_tier(
      public.tier_voor_punten(
        public.platform_partner_monthly_summary.totaal_punten + EXCLUDED.totaal_punten
      )
    );

  SELECT s.totaal_punten, s.tier, s.beloning_bedrag
  INTO v_totaal, v_tier, v_beloning
  FROM public.platform_partner_monthly_summary AS s
  WHERE s.user_id = p_user_id
    AND s.maand = v_maand
    AND s.jaar = v_jaar;

  RETURN jsonb_build_object(
    'success', true,
    'punten_toegevoegd', v_punten,
    'nieuw_totaal', v_totaal,
    'tier', v_tier
  );
END;
$func$;

REVOKE ALL ON FUNCTION public.ken_punten_toe(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ken_punten_toe(uuid, text, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.tier_voor_punten(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tier_voor_punten(integer) TO service_role;

REVOKE ALL ON FUNCTION public.beloning_voor_tier(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.beloning_voor_tier(text) TO service_role;

COMMENT ON FUNCTION public.ken_punten_toe IS
  'Atomisch punten toekennen voor Platform Partner Programma (alleen via service role / Edge).';
