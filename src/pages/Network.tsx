import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Share2, Users, Mail, Link2, Gift, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const Network = () => {
  const { t } = useTranslation();
  const [referralCode, setReferralCode] = useState('');
  const [invites, setInvites] = useState<any[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get or generate referral code
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code, first_name, total_earned, approved_referrals')
        .eq('user_id', user.id)
        .single();

      if (profile?.referral_code) {
        setReferralCode(profile.referral_code);
      } else {
        // Generate code: first 3 letters of name + 4 random digits
        const name = (profile?.first_name || 'USR').substring(0, 3).toUpperCase();
        const digits = Math.floor(1000 + Math.random() * 9000);
        const code = `${name}${digits}`;
        await supabase.from('profiles').update({ referral_code: code }).eq('user_id', user.id);
        setReferralCode(code);
      }

      setTotalEarned(profile?.total_earned || 0);
      setApprovedCount(profile?.approved_referrals || 0);

      // Load invites
      const { data: inviteData } = await supabase
        .from('referral_invites')
        .select('*')
        .eq('referrer_id', user.id)
        .order('invited_at', { ascending: false });

      setInvites(inviteData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const referralLink = `buildlink.app/join?ref=${referralCode}`;

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success(t('network.copy_success'));
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`https://${referralLink}`);
    toast.success(t('network.copy_success'));
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const shareWhatsApp = () => {
    const message = encodeURIComponent(
      `Hey! Ik gebruik BuildLink Pro voor mijn ZZP werk. Meld je aan via mijn link en we verdienen allebei! 👉 https://${referralLink}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const shareEmail = () => {
    const subject = encodeURIComponent('Uitnodiging BuildLink Pro');
    const body = encodeURIComponent(
      `Hey!\n\nIk nodig je uit bij BuildLink Pro. Meld je aan via mijn link:\nhttps://${referralLink}\n\nWe verdienen allebei €25!`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'BuildLink Pro',
          text: `Meld je aan bij BuildLink Pro via mijn link en verdien €25!`,
          url: `https://${referralLink}`,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'invited': return '📧';
      case 'registered': return '✅';
      case 'approved': return '🎉';
      case 'paid': return '💰';
      default: return '📧';
    }
  };

  const getBadge = () => {
    if (approvedCount >= 10) return { icon: '💎', label: t('network.badge_diamond'), next: null };
    if (approvedCount >= 5) return { icon: '🥇', label: t('network.badge_gold'), next: 10 };
    if (approvedCount >= 3) return { icon: '🥈', label: t('network.badge_silver'), next: 5 };
    if (invites.length >= 1) return { icon: '🥉', label: t('network.badge_bronze'), next: 3 };
    return { icon: '🎯', label: t('network.badge_start'), next: 1 };
  };

  const badge = getBadge();
  const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

  if (loading) {
    return (
      <div className="py-5 space-y-5">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="py-5 space-y-5">
      <motion.h1 {...fadeUp} className="text-2xl font-bold text-foreground">{t('network.title')}</motion.h1>

      {/* Hero Earnings */}
      <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6 text-center space-y-3">
        <p className="text-sm text-muted-foreground">{t('network.earnings')}</p>
        <motion.p
          className="text-4xl font-bold text-primary"
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          €{totalEarned.toFixed(2)}
        </motion.p>
        <p className="text-xs text-muted-foreground">
          {t('network.bonus_per_referral')} — €25
        </p>
        {invites.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{approvedCount} {t('network.approved')}</span>
              <span>{invites.length} {t('network.total_invited')}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: invites.length > 0 ? `${(approvedCount / invites.length) * 100}%` : '0%' }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Referral Code Card */}
      <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold text-foreground">{t('network.your_code')}</h2>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-muted rounded-xl px-4 py-3 font-mono font-bold text-foreground text-center tracking-[0.3em] text-lg">
            {referralCode}
          </div>
          <button
            onClick={copyCode}
            className="p-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Copy className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground text-center break-all">
          🔗 {referralLink}
        </p>
      </motion.div>

      {/* Share Buttons */}
      <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="grid grid-cols-2 gap-3">
        <button
          onClick={shareWhatsApp}
          className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-colors"
          style={{ backgroundColor: '#25D366', color: 'white' }}
        >
          📱 WhatsApp
        </button>
        <button
          onClick={shareEmail}
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          <Mail className="w-4 h-4" /> Email
        </button>
        <button
          onClick={copyLink}
          className="flex items-center justify-center gap-2 bg-muted text-foreground py-3 rounded-xl font-semibold text-sm hover:bg-muted/80 transition-colors"
        >
          <Link2 className="w-4 h-4" /> {t('network.copy_link')}
        </button>
        <button
          onClick={shareNative}
          className="flex items-center justify-center gap-2 bg-muted text-foreground py-3 rounded-xl font-semibold text-sm hover:bg-muted/80 transition-colors"
        >
          <Share2 className="w-4 h-4" /> {t('network.share_more')}
        </button>
      </motion.div>

      {/* Badge Progress */}
      <motion.div {...fadeUp} transition={{ delay: 0.35 }} className="glass-card rounded-2xl p-4 flex items-center gap-4">
        <span className="text-3xl">{badge.icon}</span>
        <div className="flex-1">
          <p className="font-semibold text-foreground text-sm">{badge.label}</p>
          {badge.next && (
            <p className="text-xs text-muted-foreground">
              {t('network.next_badge')}: {badge.next} {t('network.approved')}
            </p>
          )}
        </div>
        <TrendingUp className="w-5 h-5 text-primary" />
      </motion.div>

      {/* My Network / Invite List */}
      <motion.div {...fadeUp} transition={{ delay: 0.4 }} className="glass-card rounded-2xl p-5">
        <h2 className="font-semibold text-foreground mb-3">{t('network.invited_people')}</h2>
        {invites.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <Users className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">{t('network.empty_network')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invites.map((invite, i) => (
              <motion.div
                key={invite.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {(invite.invited_name || invite.invited_email || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {invite.invited_name || invite.invited_email || t('common.noResults')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(invite.invited_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm">{getStatusIcon(invite.status)}</span>
                  <Badge variant={invite.status === 'approved' ? 'default' : 'secondary'} className="text-xs">
                    {String(t(`network.status.${invite.status}`) || invite.status)}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Earnings Breakdown */}
      {invites.filter(i => i.status === 'approved' || i.bonus_paid).length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.45 }} className="glass-card rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-foreground">{t('network.earnings_breakdown')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">{t('network.pending_bonus')}</p>
              <p className="text-lg font-bold text-foreground">
                €{invites.filter(i => i.status === 'approved' && !i.bonus_paid).reduce((s, i) => s + (i.bonus_amount || 25), 0).toFixed(2)}
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">{t('network.paid_out')}</p>
              <p className="text-lg font-bold text-primary">
                €{invites.filter(i => i.bonus_paid).reduce((s, i) => s + (i.bonus_amount || 25), 0).toFixed(2)}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* How it works FAQ */}
      <motion.div {...fadeUp} transition={{ delay: 0.5 }} className="glass-card rounded-2xl p-5">
        <Accordion type="single" collapsible>
          <AccordionItem value="how" className="border-none">
            <AccordionTrigger className="py-0 hover:no-underline">
              <span className="font-semibold text-foreground text-sm">💡 {t('network.how_it_works')}</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-3">
                {[
                  { step: '1', icon: '🔗', text: t('network.step1') },
                  { step: '2', icon: '📝', text: t('network.step2') },
                  { step: '3', icon: '✅', text: t('network.step3') },
                  { step: '4', icon: '💰', text: t('network.step4') },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {s.step}
                    </div>
                    <p className="text-sm text-muted-foreground pt-0.5">
                      {s.icon} {s.text}
                    </p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </motion.div>
    </div>
  );
};

export default Network;
