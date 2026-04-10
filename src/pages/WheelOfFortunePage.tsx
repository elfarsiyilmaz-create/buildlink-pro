import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Loader2, Lock, History, Zap, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Prize {
  id: string;
  label: string;
  label_translations: Record<string, string>;
  value: string;
  prize_type: string;
  points_value: number;
  bonus_amount: number;
  color: string;
  probability: number;
  icon: string;
}

interface SpinRecord {
  id: string;
  prize_label: string;
  prize_type: string;
  points_earned: number;
  bonus_earned: number;
  spun_at: string;
}

const WheelOfFortunePage = () => {
  const { t, i18n } = useTranslation();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [spinHistory, setSpinHistory] = useState<SpinRecord[]>([]);
  const [availableSpins, setAvailableSpins] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<Prize | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nextSpinCountdown, setNextSpinCountdown] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setNextSpinCountdown(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check profile completeness
      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_completeness')
        .eq('user_id', user.id)
        .single();
      setProfileComplete((profile?.profile_completeness || 0) >= 100);

      // Load prizes
      const { data: prizeData } = await supabase
        .from('wheel_prizes')
        .select('*')
        .eq('is_active', true);
      setPrizes((prizeData as any[]) || []);

      // Load or create user_spins
      let { data: userSpins } = await supabase
        .from('user_spins')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!userSpins) {
        const { data: newSpins } = await supabase
          .from('user_spins')
          .insert({ user_id: user.id, available_spins: 1 })
          .select()
          .single();
        userSpins = newSpins;
      }

      // Check daily spin reset
      if (userSpins) {
        const today = new Date().toISOString().split('T')[0];
        const lastSpin = userSpins.last_daily_spin;
        if (lastSpin !== today) {
          const newSpins = (userSpins.available_spins || 0) + 1;
          await supabase.from('user_spins').update({
            available_spins: newSpins,
            last_daily_spin: today,
          }).eq('user_id', user.id);
          setAvailableSpins(newSpins);
        } else {
          setAvailableSpins(userSpins.available_spins || 0);
        }
      }

      // Load spin history
      const { data: history } = await supabase
        .from('wheel_spins')
        .select('*')
        .eq('user_id', user.id)
        .order('spun_at', { ascending: false })
        .limit(20);
      setSpinHistory((history as SpinRecord[]) || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Draw wheel
  useEffect(() => {
    if (prizes.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 15;
    const segAngle = (2 * Math.PI) / prizes.length;

    ctx.clearRect(0, 0, size, size);

    // Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate((rotation * Math.PI) / 180);

    prizes.forEach((prize, i) => {
      const start = i * segAngle;
      const end = start + segAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = prize.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.rotate(start + segAngle / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 3;

      const lang = i18n.language;
      const label = (prize.label_translations as any)?.[lang] || prize.label;

      // Icon
      ctx.font = '18px sans-serif';
      ctx.fillText(prize.icon, radius * 0.55, -6);
      // Text
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(label, radius * 0.55, 10);
      ctx.restore();
    });

    ctx.restore();

    // Pointer (top)
    ctx.beginPath();
    ctx.moveTo(center, 8);
    ctx.lineTo(center - 12, 30);
    ctx.lineTo(center + 12, 30);
    ctx.closePath();
    ctx.fillStyle = 'hsl(var(--primary))';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(center, center, 22, 0, Math.PI * 2);
    ctx.fillStyle = 'hsl(var(--primary))';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎰', center, center);

  }, [prizes, rotation, i18n.language]);

  const playSound = (freq: number, duration: number) => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.value = 0.1;
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  };

  const selectPrize = useCallback((): number => {
    // Weighted random
    const totalWeight = prizes.reduce((s, p) => s + p.probability, 0);
    let rand = Math.random() * totalWeight;
    for (let i = 0; i < prizes.length; i++) {
      rand -= prizes[i].probability;
      if (rand <= 0) return i;
    }
    return 0;
  }, [prizes]);

  const spin = async () => {
    if (spinning || availableSpins <= 0 || !profileComplete) return;
    setSpinning(true);
    setWonPrize(null);

    const winIndex = selectPrize();
    const segAngle = 360 / prizes.length;
    // Pointer is at top (270°), so target needs adjustment
    const targetSegCenter = winIndex * segAngle + segAngle / 2;
    const targetAngle = 360 * 6 + (360 - targetSegCenter);

    const startRot = rotation;
    const duration = 5000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = startRot + targetAngle * eased;
      setRotation(current);

      // Tick sound every segment
      if (progress < 0.9 && Math.random() < 0.1) {
        playSound(800 + Math.random() * 400, 0.03);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        finishSpin(winIndex);
      }
    };

    requestAnimationFrame(animate);
  };

  const finishSpin = async (winIndex: number) => {
    const prize = prizes[winIndex];
    setWonPrize(prize);
    setSpinning(false);
    setShowResult(true);

    if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
    if (prize.prize_type !== 'empty') {
      playSound(523, 0.1);
      setTimeout(() => playSound(659, 0.1), 100);
      setTimeout(() => playSound(784, 0.2), 200);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Record spin
      await supabase.from('wheel_spins').insert({
        user_id: user.id,
        prize_id: prize.id,
        prize_label: prize.label,
        prize_type: prize.prize_type,
        points_earned: prize.points_value || 0,
        bonus_earned: prize.bonus_amount || 0,
        spin_source: 'daily',
      });

      // Get current spin balance and update atomically
      const { data: currentSpins } = await supabase
        .from('user_spins')
        .select('available_spins, total_spins_used')
        .eq('user_id', user.id)
        .single();

      const newAvailable = Math.max(0, (currentSpins?.available_spins || 1) - 1);
      const newUsed = (currentSpins?.total_spins_used || 0) + 1;

      // Handle extra spin prize
      const extraSpins = prize.prize_type === 'spin' ? 1 : 0;

      await supabase.from('user_spins').update({
        available_spins: newAvailable + extraSpins,
        total_spins_used: newUsed,
      }).eq('user_id', user.id);

      setAvailableSpins(newAvailable + extraSpins);

      // Award points
      if (prize.prize_type === 'points' && prize.points_value > 0) {
        const { data: score } = await supabase
          .from('leaderboard_scores')
          .select('total_points')
          .eq('user_id', user.id)
          .single();

        if (score) {
          await supabase.from('leaderboard_scores').update({
            total_points: score.total_points + prize.points_value,
          }).eq('user_id', user.id);
        } else {
          await supabase.from('leaderboard_scores').insert({
            user_id: user.id,
            total_points: prize.points_value,
          });
        }
      }

      // Reload history
      const { data: history } = await supabase
        .from('wheel_spins')
        .select('*')
        .eq('user_id', user.id)
        .order('spun_at', { ascending: false })
        .limit(20);
      setSpinHistory((history as SpinRecord[]) || []);

    } catch (err) {
      console.error(err);
    }
  };

  const totalPointsWon = spinHistory.reduce((s, h) => s + (h.points_earned || 0), 0);
  const totalBonusWon = spinHistory.reduce((s, h) => s + (h.bonus_earned || 0), 0);
  const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

  if (loading) {
    return (
      <div className="py-5 space-y-5">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="h-72 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="py-5 space-y-5 pb-24">
      {/* Header */}
      <motion.div {...fadeUp} className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">🎰 {t('wheel.title')}</h1>
        <Badge variant="secondary" className="text-sm gap-1">
          🎫 {availableSpins} {t('wheel.available_spins')}
        </Badge>
      </motion.div>

      {/* Locked state */}
      {!profileComplete && (
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6 text-center space-y-3">
          <Lock className="w-16 h-16 text-muted-foreground mx-auto" />
          <p className="font-semibold text-foreground">{t('wheel.locked')}</p>
          <p className="text-sm text-muted-foreground">{t('profile.complete_your_profile')}</p>
        </motion.div>
      )}

      {/* Wheel */}
      {profileComplete && (
        <>
          <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="flex flex-col items-center gap-4">
            <canvas
              ref={canvasRef}
              width={300}
              height={300}
              className="rounded-full"
              style={{ maxWidth: '100%' }}
            />

            <Button
              onClick={spin}
              disabled={spinning || availableSpins <= 0}
              size="lg"
              className={`w-full max-w-xs text-lg ${availableSpins > 0 && !spinning ? 'animate-pulse' : ''}`}
            >
              {spinning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  {t('wheel.spinning')}
                </>
              ) : availableSpins > 0 ? (
                <>🎰 {t('wheel.spin_button')}</>
              ) : (
                t('wheel.no_spins')
              )}
            </Button>

            {availableSpins <= 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                {t('wheel.next_free_spin')}: {nextSpinCountdown}
              </div>
            )}
          </motion.div>

          {/* How to earn spins */}
          <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-4 space-y-2">
            <h3 className="font-semibold text-foreground text-sm">{t('wheel.earn_more_spins')}</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: '🔄', label: t('wheel.daily_spin') },
                { icon: '🏆', label: t('wheel.challenge_spin') || 'Challenge voltooid' },
                { icon: '👥', label: t('wheel.referral_spin') || 'Referral goedgekeurd' },
                { icon: '✅', label: t('wheel.profile_spin') || 'Profiel 100%' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded-lg">
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}

      {/* Stats */}
      {spinHistory.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="grid grid-cols-2 gap-3">
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-xs text-muted-foreground">⭐ {t('dashboard.points')}</p>
            <p className="text-xl font-bold text-primary">{totalPointsWon}</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-xs text-muted-foreground">💶 Bonus</p>
            <p className="text-xl font-bold text-primary">€{totalBonusWon.toFixed(2)}</p>
          </div>
        </motion.div>
      )}

      {/* History */}
      <motion.div {...fadeUp} transition={{ delay: 0.35 }} className="glass-card rounded-2xl p-5">
        <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <History className="w-4 h-4" />
          {t('wheel.prizes_history')}
        </h2>
        {spinHistory.length === 0 ? (
          <div className="text-center py-6">
            <Gift className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t('wheel.empty_history')}</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {spinHistory.map((spin, i) => (
              <motion.div
                key={spin.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {spin.prize_type === 'points' ? '⭐' : spin.prize_type === 'bonus' ? '💶' : spin.prize_type === 'spin' ? '🎫' : '😅'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{spin.prize_label}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(spin.spun_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {spin.points_earned > 0 && (
                  <Badge variant="secondary">+{spin.points_earned}</Badge>
                )}
                {spin.bonus_earned > 0 && (
                  <Badge>€{spin.bonus_earned}</Badge>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Prize Result Dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>{t('wheel.you_won')}</DialogTitle>
          </DialogHeader>
          {wonPrize && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="py-6 space-y-4"
            >
              <span className="text-6xl block">{wonPrize.icon}</span>
              <p className="text-2xl font-bold text-foreground">
                {(wonPrize.label_translations as any)?.[i18n.language] || wonPrize.label}
              </p>
              {wonPrize.prize_type === 'points' && (
                <p className="text-primary font-bold text-lg">+{wonPrize.points_value} {t('dashboard.points')}! ✨</p>
              )}
              {wonPrize.prize_type === 'bonus' && (
                <p className="text-primary font-bold text-lg">+€{wonPrize.bonus_amount} 💶</p>
              )}
              {wonPrize.prize_type === 'spin' && (
                <p className="text-primary font-bold text-lg">+1 {t('wheel.available_spins')}! 🎫</p>
              )}
              {wonPrize.prize_type === 'empty' && (
                <p className="text-muted-foreground">{t('wheel.no_prize_text') || 'Volgende keer beter!'}</p>
              )}
              <Button onClick={() => setShowResult(false)} className="w-full">
                {t('wheel.claim_prize')}
              </Button>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WheelOfFortunePage;
