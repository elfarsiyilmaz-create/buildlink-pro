import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Gift, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const SEGMENTS = [
  { label: '10 pts', value: 10, color: '#EF4444' },
  { label: '25 pts', value: 25, color: '#F59E0B' },
  { label: '50 pts', value: 50, color: '#3B82F6' },
  { label: '5 pts', value: 5, color: '#8B5CF6' },
  { label: '100 pts', value: 100, color: '#10B981' },
  { label: '15 pts', value: 15, color: '#EC4899' },
  { label: '75 pts', value: 75, color: '#06B6D4' },
  { label: '20 pts', value: 20, color: '#F97316' },
];

const WheelOfFortune = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [canSpin, setCanSpin] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    checkEligibility();
  }, []);

  const checkEligibility = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_completeness')
        .eq('user_id', user.id)
        .single();

      const complete = (profile?.profile_completeness || 0) >= 100;
      setProfileComplete(complete);

      // Check if already spun today
      if (complete) {
        const today = new Date().toISOString().split('T')[0];
        const lastSpin = localStorage.getItem('wheel_last_spin');
        setCanSpin(lastSpin !== today);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    drawWheel();
  }, [rotation]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;
    const segAngle = (2 * Math.PI) / SEGMENTS.length;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate((rotation * Math.PI) / 180);

    SEGMENTS.forEach((seg, i) => {
      const startAngle = i * segAngle;
      const endAngle = startAngle + segAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.rotate(startAngle + segAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(seg.label, radius - 15, 5);
      ctx.restore();
    });

    ctx.restore();

    // Draw pointer
    ctx.beginPath();
    ctx.moveTo(center + radius + 5, center);
    ctx.lineTo(center + radius - 20, center - 10);
    ctx.lineTo(center + radius - 20, center + 10);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  const spin = async () => {
    if (spinning || !canSpin) return;
    setSpinning(true);
    setResult(null);

    const segAngle = 360 / SEGMENTS.length;
    const winIndex = Math.floor(Math.random() * SEGMENTS.length);
    const targetAngle = 360 * 5 + (360 - winIndex * segAngle - segAngle / 2);

    // Animate
    const startRot = rotation;
    const totalRot = targetAngle;
    const duration = 4000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setRotation(startRot + totalRot * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Done
        const won = SEGMENTS[winIndex];
        setResult(won.value);
        setSpinning(false);
        setCanSpin(false);
        localStorage.setItem('wheel_last_spin', new Date().toISOString().split('T')[0]);

        // Award points
        awardPoints(won.value);

        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      }
    };

    requestAnimationFrame(animate);
  };

  const awardPoints = async (points: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: score } = await supabase
        .from('leaderboard_scores')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (score) {
        await supabase.from('leaderboard_scores').update({
          total_points: score.total_points + points,
        }).eq('user_id', user.id);
      } else {
        await supabase.from('leaderboard_scores').insert({
          user_id: user.id,
          total_points: points,
        });
      }

      toast.success(`+${points} ${t('dashboard.points')}! 🎰`);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return null;

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className="glass-card rounded-2xl p-4 flex items-center gap-3 w-full text-left"
      >
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          {profileComplete ? (
            <Gift className="w-6 h-6 text-primary" />
          ) : (
            <Lock className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground text-sm">{t('wheel.title')}</p>
          <p className="text-xs text-muted-foreground">
            {profileComplete
              ? (canSpin ? t('wheel.spin_available') : t('wheel.spin_tomorrow'))
              : t('wheel.locked')}
          </p>
        </div>
      </motion.button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">{t('wheel.title')}</DialogTitle>
          </DialogHeader>

          {!profileComplete ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <Lock className="w-16 h-16 text-muted-foreground" />
              <p className="text-center text-sm text-muted-foreground">{t('wheel.locked')}</p>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t('common.back')}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <canvas
                ref={canvasRef}
                width={280}
                height={280}
                className="rounded-full"
              />

              <AnimatePresence>
                {result !== null && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center"
                  >
                    <p className="text-2xl font-bold text-primary">+{result} {t('dashboard.points')}! 🎉</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                onClick={spin}
                disabled={spinning || !canSpin}
                className="w-full"
                size="lg"
              >
                {spinning ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {spinning ? t('wheel.spinning') : canSpin ? t('wheel.spin') : t('wheel.spin_tomorrow')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WheelOfFortune;
