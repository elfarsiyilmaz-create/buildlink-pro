import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Target, Check, Star, Edit, Share2, Search, Upload, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const iconMap: Record<string, typeof Star> = {
  star: Star, edit: Edit, 'share-2': Share2, search: Search, upload: Upload, calendar: Calendar, target: Target,
};

const DailyChallenges = () => {
  const { t } = useTranslation();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [completions, setCompletions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    const [{ data: challengeData }, { data: completionData }] = await Promise.all([
      supabase.from('daily_challenges').select('*').eq('active', true),
      supabase.from('user_challenge_completions').select('challenge_id').eq('user_id', user.id).eq('completed_date', today),
    ]);

    setChallenges(challengeData || []);
    setCompletions(new Set(completionData?.map(c => c.challenge_id) || []));
    setLoading(false);
  };

  const completeChallenge = async (challengeId: string, points: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase.from('user_challenge_completions').insert({
      user_id: user.id,
      challenge_id: challengeId,
      completed_date: today,
      points_earned: points,
    });

    if (error) {
      if (error.code === '23505') toast.info(t('challenges.alreadyDone', 'Al voltooid vandaag!'));
      else toast.error(t('common.error'));
      return;
    }

    // Update leaderboard score
    const { data: existing } = await supabase.from('leaderboard_scores').select('*').eq('user_id', user.id).single();
    if (existing) {
      await supabase.from('leaderboard_scores').update({
        total_points: existing.total_points + points,
        challenges_completed: existing.challenges_completed + 1,
      }).eq('user_id', user.id);
    } else {
      await supabase.from('leaderboard_scores').insert({
        user_id: user.id,
        total_points: points,
        challenges_completed: 1,
      });
    }

    setCompletions(prev => new Set([...prev, challengeId]));
    toast.success(`+${points} ${t('challenges.points', 'punten')}! 🎉`);
  };

  if (loading) return <div className="glass-card rounded-2xl p-4 animate-pulse h-32" />;
  if (!challenges.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground text-sm">{t('challenges.title', 'Dagelijkse Challenges')}</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {completions.size}/{challenges.length}
        </span>
      </div>

      <div className="space-y-2">
        {challenges.map(ch => {
          const done = completions.has(ch.id);
          const Icon = iconMap[ch.icon] || Star;
          return (
            <motion.button
              key={ch.id}
              whileTap={{ scale: 0.97 }}
              disabled={done}
              onClick={() => completeChallenge(ch.id, ch.points)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                done
                  ? 'bg-success/10 border border-success/20'
                  : 'bg-muted/50 hover:bg-muted border border-transparent'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                done ? 'bg-success text-success-foreground' : 'bg-primary/10 text-primary'
              }`}>
                {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {ch.title}
                </p>
                {ch.description && (
                  <p className="text-xs text-muted-foreground truncate">{ch.description}</p>
                )}
              </div>
              <span className={`text-xs font-bold ${done ? 'text-success' : 'text-primary'}`}>
                +{ch.points}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default DailyChallenges;
