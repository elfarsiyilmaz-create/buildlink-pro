
-- Availability calendar
CREATE TABLE public.availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  day_part TEXT NOT NULL CHECK (day_part IN ('morning', 'afternoon', 'evening')),
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, day_part)
);

ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own availability" ON public.availability FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own availability" ON public.availability FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own availability" ON public.availability FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own availability" ON public.availability FOR DELETE USING (auth.uid() = user_id);

-- Daily challenges (admin-managed)
CREATE TABLE public.daily_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  points INTEGER NOT NULL DEFAULT 10,
  challenge_type TEXT NOT NULL DEFAULT 'action',
  icon TEXT DEFAULT 'star',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active challenges" ON public.daily_challenges FOR SELECT TO authenticated USING (active = true);
CREATE POLICY "Admins can manage challenges" ON public.daily_challenges FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- User challenge completions
CREATE TABLE public.user_challenge_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id, completed_date)
);

ALTER TABLE public.user_challenge_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own completions" ON public.user_challenge_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own completions" ON public.user_challenge_completions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Achievements definitions
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'trophy',
  badge_color TEXT DEFAULT '#FF0000',
  required_points INTEGER DEFAULT 0,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view achievements" ON public.achievements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage achievements" ON public.achievements FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- User achievements
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "All users can view achievements for leaderboard" ON public.user_achievements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Leaderboard scores
CREATE TABLE public.leaderboard_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  challenges_completed INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leaderboard_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view leaderboard" ON public.leaderboard_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own score" ON public.leaderboard_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own score" ON public.leaderboard_scores FOR UPDATE USING (auth.uid() = user_id);

-- Seed some default achievements
INSERT INTO public.achievements (name, description, icon, badge_color, required_points, category) VALUES
  ('Nieuwe Kracht', 'Eerste keer ingelogd', 'zap', '#4CAF50', 0, 'onboarding'),
  ('Profiel Compleet', 'Alle profielvelden ingevuld', 'user-check', '#2196F3', 50, 'profile'),
  ('Eerste Opdracht', 'Gereageerd op je eerste opdracht', 'briefcase', '#FF9800', 100, 'work'),
  ('Referral Master', '5 mensen uitgenodigd', 'users', '#9C27B0', 200, 'network'),
  ('Betrouwbare Kracht', '7 dagen op rij ingelogd', 'flame', '#F44336', 150, 'streak'),
  ('Alhan Veteraan', '30 dagen actief', 'award', '#FFD700', 500, 'streak'),
  ('Challenge Kampioen', '10 daily challenges voltooid', 'target', '#00BCD4', 300, 'challenges'),
  ('Top Performer', '1000 punten behaald', 'crown', '#FF0000', 1000, 'points');

-- Seed some default daily challenges
INSERT INTO public.daily_challenges (title, description, points, challenge_type, icon) VALUES
  ('Update je bio', 'Schrijf iets nieuws in je profiel bio', 10, 'profile', 'edit'),
  ('Deel je referral link', 'Stuur je referral link naar iemand', 15, 'social', 'share-2'),
  ('Check opdrachten', 'Bekijk de beschikbare opdrachten', 5, 'browse', 'search'),
  ('Upload certificaat', 'Upload een nieuw certificaat', 20, 'document', 'upload'),
  ('Stel beschikbaarheid in', 'Update je beschikbaarheid voor deze week', 10, 'availability', 'calendar');

-- Enable realtime for leaderboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.leaderboard_scores;
