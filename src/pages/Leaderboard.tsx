import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Trophy, Medal, Flame, Crown, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface LeaderboardEntry {
  user_id: string;
  total_points: number;
  current_streak: number;
  level: number;
  challenges_completed: number;
  profile?: { first_name: string | null; last_name: string | null; avatar_url: string | null };
}

const Leaderboard = () => {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);

    const { data: scores } = await supabase
      .from('leaderboard_scores')
      .select('*')
      .order('total_points', { ascending: false })
      .limit(20);

    if (!scores?.length) { setLoading(false); return; }

    // Fetch profiles for all users
    const userIds = scores.map(s => s.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, avatar_url')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
    const enriched = scores.map(s => ({ ...s, profile: profileMap.get(s.user_id) || undefined }));
    setEntries(enriched);
    setLoading(false);
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{index + 1}</span>;
  };

  const getRankBg = (index: number) => {
    if (index === 0) return 'bg-yellow-500/10 border-yellow-500/30';
    if (index === 1) return 'bg-gray-400/10 border-gray-400/30';
    if (index === 2) return 'bg-amber-600/10 border-amber-600/30';
    return 'bg-card border-border';
  };

  if (loading) {
    return (
      <div className="space-y-3 py-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-4 animate-pulse h-16" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 py-5 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">{t('leaderboard.title', 'Leaderboard')}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{t('leaderboard.subtitle', 'Top ZZP\'ers van Alhan Groep')}</p>
      </motion.div>

      {entries.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <Star className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">{t('leaderboard.empty', 'Nog geen scores. Voltooi challenges om punten te verdienen!')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => {
            const isMe = entry.user_id === currentUserId;
            const initials = `${(entry.profile?.first_name || '')[0] || ''}${(entry.profile?.last_name || '')[0] || ''}`.toUpperCase();
            const name = [entry.profile?.first_name, entry.profile?.last_name].filter(Boolean).join(' ') || 'ZZP\'er';

            return (
              <motion.div
                key={entry.user_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${getRankBg(index)} ${isMe ? 'ring-2 ring-primary' : ''}`}
              >
                <div className="w-6 flex justify-center">{getRankIcon(index)}</div>
                <Avatar className="w-9 h-9">
                  {entry.profile?.avatar_url ? <AvatarImage src={entry.profile.avatar_url} /> : null}
                  <AvatarFallback className="text-xs bg-muted text-muted-foreground">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {name} {isMe && '(jij)'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Lvl {entry.level}</span>
                    {entry.current_streak > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Flame className="w-3 h-3 text-orange-500" />{entry.current_streak}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">{entry.total_points}</p>
                  <p className="text-[10px] text-muted-foreground">{t('dashboard.points', 'punten')}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
