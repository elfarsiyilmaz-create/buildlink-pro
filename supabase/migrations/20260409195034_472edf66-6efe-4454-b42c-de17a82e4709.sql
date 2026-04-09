
-- Add referral columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
ADD COLUMN IF NOT EXISTS total_referrals integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS approved_referrals integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_earned numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_per_referral numeric DEFAULT 25.00;

-- Create referral_invites table
CREATE TABLE public.referral_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  invited_email text,
  invited_name text,
  status text NOT NULL DEFAULT 'invited',
  invited_at timestamptz NOT NULL DEFAULT now(),
  registered_at timestamptz,
  approved_at timestamptz,
  bonus_paid boolean DEFAULT false,
  bonus_amount numeric DEFAULT 25.00
);

ALTER TABLE public.referral_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral invites" ON public.referral_invites
  FOR SELECT TO authenticated USING (auth.uid() = referrer_id);

CREATE POLICY "Users can create own referral invites" ON public.referral_invites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Admins can view all referral invites" ON public.referral_invites
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update referral invites" ON public.referral_invites
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create wheel_prizes table
CREATE TABLE public.wheel_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  label_translations jsonb DEFAULT '{}',
  value text,
  prize_type text NOT NULL DEFAULT 'points',
  points_value integer DEFAULT 0,
  bonus_amount numeric DEFAULT 0,
  color text NOT NULL DEFAULT '#F59E0B',
  probability numeric NOT NULL DEFAULT 12.5,
  icon text DEFAULT '🎁',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wheel_prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active prizes" ON public.wheel_prizes
  FOR SELECT TO authenticated USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage prizes" ON public.wheel_prizes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create wheel_spins table
CREATE TABLE public.wheel_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prize_id uuid REFERENCES public.wheel_prizes(id),
  prize_label text,
  prize_type text,
  points_earned integer DEFAULT 0,
  bonus_earned numeric DEFAULT 0,
  spun_at timestamptz NOT NULL DEFAULT now(),
  spin_source text DEFAULT 'daily'
);

ALTER TABLE public.wheel_spins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own spins" ON public.wheel_spins
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own spins" ON public.wheel_spins
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create user_spins table
CREATE TABLE public.user_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  available_spins integer DEFAULT 1,
  total_spins_used integer DEFAULT 0,
  last_daily_spin date,
  last_spin_reset timestamptz DEFAULT now()
);

ALTER TABLE public.user_spins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own spin balance" ON public.user_spins
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own spin balance" ON public.user_spins
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own spin balance" ON public.user_spins
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Seed wheel prizes
INSERT INTO public.wheel_prizes (label, label_translations, value, prize_type, points_value, bonus_amount, color, probability, icon) VALUES
  ('50 Punten', '{"nl":"50 Punten","en":"50 Points","de":"50 Punkte","fr":"50 Points","es":"50 Puntos","pl":"50 Punktów","ro":"50 Puncte","tr":"50 Puan","ar":"50 نقطة","pt":"50 Pontos","bg":"50 Точки"}', '50', 'points', 50, 0, '#F59E0B', 20, '⭐'),
  ('Extra Spin', '{"nl":"Extra Spin","en":"Extra Spin","de":"Extra Dreh","fr":"Tour Extra","es":"Giro Extra","pl":"Dodatkowy Spin","ro":"Rotire Extra","tr":"Ekstra Çeviriş","ar":"لفة إضافية","pt":"Giro Extra","bg":"Допълнително Завъртане"}', '1', 'spin', 0, 0, '#10B981', 10, '🎫'),
  ('€5 Bonus', '{"nl":"€5 Bonus","en":"€5 Bonus","de":"€5 Bonus","fr":"€5 Bonus","es":"€5 Bono","pl":"€5 Bonus","ro":"€5 Bonus","tr":"€5 Bonus","ar":"€5 مكافأة","pt":"€5 Bónus","bg":"€5 Бонус"}', '5', 'bonus', 0, 5.00, '#3B82F6', 5, '💶'),
  ('100 Punten', '{"nl":"100 Punten","en":"100 Points","de":"100 Punkte","fr":"100 Points","es":"100 Puntos","pl":"100 Punktów","ro":"100 Puncte","tr":"100 Puan","ar":"100 نقطة","pt":"100 Pontos","bg":"100 Точки"}', '100', 'points', 100, 0, '#8B5CF6', 15, '🏆'),
  ('Geen Prijs', '{"nl":"Geen Prijs","en":"No Prize","de":"Kein Preis","fr":"Pas de Prix","es":"Sin Premio","pl":"Brak Nagrody","ro":"Fără Premiu","tr":"Ödül Yok","ar":"لا جائزة","pt":"Sem Prémio","bg":"Без Награда"}', '0', 'empty', 0, 0, '#6B7280', 20, '😅'),
  ('25 Punten', '{"nl":"25 Punten","en":"25 Points","de":"25 Punkte","fr":"25 Points","es":"25 Puntos","pl":"25 Punktów","ro":"25 Puncte","tr":"25 Puan","ar":"25 نقطة","pt":"25 Pontos","bg":"25 Точки"}', '25', 'points', 25, 0, '#EF4444', 20, '✨'),
  ('€10 Bonus', '{"nl":"€10 Bonus","en":"€10 Bonus","de":"€10 Bonus","fr":"€10 Bonus","es":"€10 Bono","pl":"€10 Bonus","ro":"€10 Bonus","tr":"€10 Bonus","ar":"€10 مكافأة","pt":"€10 Bónus","bg":"€10 Бонус"}', '10', 'bonus', 0, 10.00, '#EC4899', 2, '💰'),
  ('200 Punten', '{"nl":"200 Punten","en":"200 Points","de":"200 Punkte","fr":"200 Points","es":"200 Puntos","pl":"200 Punktów","ro":"200 Puncte","tr":"200 Puan","ar":"200 نقطة","pt":"200 Pontos","bg":"200 Точки"}', '200', 'points', 200, 0, '#F97316', 8, '🔥');
