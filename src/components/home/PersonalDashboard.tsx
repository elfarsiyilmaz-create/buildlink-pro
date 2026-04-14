import { lazy, Suspense, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BarChart3, Trophy, Flame, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
const PersonalDashboardChart = lazy(() => import('@/components/home/PersonalDashboardChart'));

const PersonalDashboard = () => {
  const { t } = useTranslation();
  const [scores, setScores] = useState<any>(null);
  const [weekData, setWeekData] = useState<any[]>([]);
  const [achievementCount, setAchievementCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: scoreData }, { data: achData }, { data: completions }] = await Promise.all([
      supabase.from('leaderboard_scores').select('*').eq('user_id', user.id).single(),
      supabase.from('user_achievements').select('id').eq('user_id', user.id),
      supabase.from('user_challenge_completions').select('completed_date, points_earned').eq('user_id', user.id),
    ]);

    setScores(scoreData);
    setAchievementCount(achData?.length || 0);

    // Build weekly chart data from completions
    const dayMap: Record<string, number> = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dayMap[key] = 0;
    }
    completions?.forEach(c => {
      if (dayMap[c.completed_date] !== undefined) {
        dayMap[c.completed_date] += c.points_earned;
      }
    });

    setWeekData(Object.entries(dayMap).map(([date, pts]) => ({
      day: new Date(date).toLocaleDateString('nl-NL', { weekday: 'short' }),
      punten: pts,
    })));
  };

  const level = scores?.level || 1;
  const totalPoints = scores?.total_points || 0;
  const streak = scores?.current_streak || 0;
  const nextLevel = level * 100;
  const progress = Math.min((totalPoints % 100) / 100 * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground text-sm">{t('dashboard.title', 'Mijn Dashboard')}</h3>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-primary/10 rounded-xl p-3 text-center">
          <TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{totalPoints}</p>
          <p className="text-[10px] text-muted-foreground">{t('dashboard.points', 'Punten')}</p>
        </div>
        <div className="bg-warning/10 rounded-xl p-3 text-center">
          <Flame className="w-4 h-4 text-warning mx-auto mb-1" style={{ color: 'hsl(var(--warning))' }} />
          <p className="text-lg font-bold text-foreground">{streak}</p>
          <p className="text-[10px] text-muted-foreground">{t('dashboard.streak', 'Streak')}</p>
        </div>
        <div className="bg-success/10 rounded-xl p-3 text-center">
          <Trophy className="w-4 h-4 mx-auto mb-1" style={{ color: 'hsl(var(--success))' }} />
          <p className="text-lg font-bold text-foreground">{achievementCount}</p>
          <p className="text-[10px] text-muted-foreground">{t('dashboard.badges', 'Badges')}</p>
        </div>
      </div>

      {/* Level Progress */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-foreground">Level {level}</span>
          <span className="text-xs text-muted-foreground">{totalPoints}/{nextLevel}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1 }}
            className="h-full gradient-primary rounded-full"
          />
        </div>
      </div>

      {/* Weekly Activity Chart */}
      {weekData.length > 0 && (
        <div className="h-32">
          <Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-muted/30" />}>
            <PersonalDashboardChart data={weekData} />
          </Suspense>
        </div>
      )}
    </motion.div>
  );
};

export default PersonalDashboard;
