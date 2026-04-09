import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, UserCheck, Briefcase, Users, Flame, Award, Target, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const iconMap: Record<string, typeof Trophy> = {
  trophy: Trophy, zap: Zap, 'user-check': UserCheck, briefcase: Briefcase,
  users: Users, flame: Flame, award: Award, target: Target, crown: Crown,
};

// Simple achievement unlock sound using Web Audio API
const playUnlockSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.4);
    });
  } catch {
    // Audio not available
  }
};

interface UnlockedAchievement {
  name: string;
  description: string | null;
  icon: string | null;
  badge_color: string | null;
}

const AchievementUnlock = () => {
  const [unlocked, setUnlocked] = useState<UnlockedAchievement | null>(null);

  const checkAchievements = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get all achievements and user's unlocked ones
    const [{ data: allAchievements }, { data: userAchievements }, { data: scores }] = await Promise.all([
      supabase.from('achievements').select('*'),
      supabase.from('user_achievements').select('achievement_id').eq('user_id', user.id),
      supabase.from('leaderboard_scores').select('*').eq('user_id', user.id).single(),
    ]);

    if (!allAchievements) return;
    const unlockedIds = new Set(userAchievements?.map(a => a.achievement_id) || []);
    const totalPoints = scores?.total_points || 0;

    // Check which achievements can be unlocked
    for (const achievement of allAchievements) {
      if (unlockedIds.has(achievement.id)) continue;
      if (achievement.required_points !== null && totalPoints >= achievement.required_points) {
        // Unlock it!
        const { error } = await supabase.from('user_achievements').insert({
          user_id: user.id,
          achievement_id: achievement.id,
        });
        if (!error) {
          setUnlocked(achievement);
          playUnlockSound();
          setTimeout(() => setUnlocked(null), 4000);
          break; // One at a time
        }
      }
    }
  }, []);

  useEffect(() => {
    checkAchievements();
    const interval = setInterval(checkAchievements, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [checkAchievements]);

  return (
    <AnimatePresence>
      {unlocked && (
        <motion.div
          initial={{ opacity: 0, y: -80, scale: 0.5 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.8 }}
          className="fixed top-20 left-4 right-4 z-[100] flex justify-center"
        >
          <div
            className="bg-card border-2 rounded-2xl p-4 shadow-2xl flex items-center gap-3 max-w-sm w-full"
            style={{ borderColor: unlocked.badge_color || 'hsl(var(--primary))' }}
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6 }}
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: (unlocked.badge_color || '#FF0000') + '20' }}
            >
              {(() => {
                const Icon = iconMap[unlocked.icon || 'trophy'] || Trophy;
                return <Icon className="w-6 h-6" style={{ color: unlocked.badge_color || '#FF0000' }} />;
              })()}
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-primary uppercase tracking-wider">🏆 Achievement Unlocked!</p>
              <p className="font-bold text-foreground text-sm">{unlocked.name}</p>
              {unlocked.description && (
                <p className="text-xs text-muted-foreground">{unlocked.description}</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AchievementUnlock;
