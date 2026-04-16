import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Copy,
  Share2,
  Users,
  Mail,
  Link2,
  TrendingUp,
  Home as HomeIcon,
  Search,
  Bell,
  User,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const cardShell = 'rounded-[20px] border border-black/[0.04] bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)]';
const primaryRed = '#B91C1C';

const Network = () => {
  const { t } = useTranslation();
  const [referralCode, setReferralCode] = useState('');
  const [invites, setInvites] = useState<any[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [howOpen, setHowOpen] = useState(false);

  useEffect(() => {
    void loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code, full_name, total_earned, approved_referrals')
        .eq('user_id', user.id)
        .single();

      if (profile?.referral_code) {
        setReferralCode(profile.referral_code);
      } else {
        const name = (profile?.full_name || 'USR').replace(/\s+/g, '').substring(0, 3).toUpperCase() || 'USR';
        const digits = Math.floor(1000 + Math.random() * 9000);
        const code = `${name}${digits}`;
        await supabase.from('profiles').update({ referral_code: code }).eq('user_id', user.id);
        setReferralCode(code);
      }

      setTotalEarned(profile?.total_earned || 0);
      setApprovedCount(profile?.approved_referrals || 0);

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
      `Hey! Ik gebruik BuildLink Pro voor mijn ZZP werk. Meld je aan via mijn link en we verdienen allebei! 👉 https://${referralLink}`,
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const shareEmail = () => {
    const subject = encodeURIComponent('Uitnodiging BuildLink Pro');
    const body = encodeURIComponent(
      `Hey!\n\nIk nodig je uit bij BuildLink Pro. Meld je aan via mijn link:\nhttps://${referralLink}\n\nWe verdienen allebei €25!`,
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'BuildLink Pro',
          text: 'Meld je aan bij BuildLink Pro via mijn link en verdien €25!',
          url: `https://${referralLink}`,
        });
      } catch {
        /* user cancelled */
      }
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

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f3f3f5]">
        <Users className="h-7 w-7 animate-pulse text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#f3f3f5]">
      <div className="mx-auto w-full max-w-[430px] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+108px)] pt-12">
        <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.02em] text-zinc-900">
          {t('network.title')}
        </h1>

        {/* Verdiend + link */}
        <section className={cn('mt-6 p-5', cardShell)}>
          <p className="text-[15px] leading-snug text-zinc-500">{t('network.earnings')}</p>
          <p className="mt-1 text-[40px] font-semibold leading-none tracking-[-0.03em]" style={{ color: primaryRed }}>
            €{totalEarned.toFixed(2)}
          </p>
          <p className="mt-2 text-[14px] leading-snug text-zinc-600">
            {t('network.bonus_per_referral')} — €25
          </p>
          <p className="mt-3 text-[12px] leading-snug text-zinc-400 break-all">{referralLink}</p>
          {invites.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-[12px] text-zinc-500">
                <span>{approvedCount} {t('network.approved')}</span>
                <span>{invites.length} {t('network.total_invited')}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${invites.length > 0 ? Math.min(100, (approvedCount / invites.length) * 100) : 0}%`,
                    backgroundColor: primaryRed,
                  }}
                />
              </div>
            </div>
          )}
        </section>

        {/* Jouw unieke code */}
        <section className={cn('relative mt-4 p-5', cardShell)}>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-[17px] font-semibold text-zinc-900">{t('network.your_code')}</h2>
            <TrendingUp className="h-5 w-5 shrink-0 text-zinc-300" aria-hidden />
          </div>
          <div className="mt-4 flex items-stretch gap-2">
            <div className="flex flex-1 items-center justify-center rounded-[14px] bg-zinc-100 px-3 py-3.5 text-center font-mono text-[18px] font-bold tracking-[0.2em] text-zinc-900">
              {referralCode}
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="flex shrink-0 items-center justify-center rounded-[14px] px-4 text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: primaryRed }}
              aria-label={t('network.copy')}
            >
              <Copy className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </section>

        {/* Delen: grote knoppen + secundair */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={shareWhatsApp}
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-[16px] py-3.5 text-[15px] font-semibold text-white shadow-sm transition-opacity hover:opacity-95"
            style={{ backgroundColor: '#25D366' }}
          >
            <span aria-hidden>📱</span>
            WhatsApp
          </button>
          <button
            type="button"
            onClick={shareEmail}
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-[16px] py-3.5 text-[15px] font-semibold text-white shadow-sm transition-opacity hover:opacity-95"
            style={{ backgroundColor: primaryRed }}
          >
            <Mail className="h-4 w-4 shrink-0" aria-hidden />
            Email
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={copyLink}
            className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-[16px] border border-zinc-200/90 bg-white px-2 py-3 text-[14px] font-semibold text-zinc-800 shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
          >
            <Link2 className="h-4 w-4 text-zinc-500" aria-hidden />
            {t('network.copy_link')}
            {approvedCount > 0 && (
              <span className="text-[11px] font-normal text-zinc-500">
                {approvedCount} {t('network.approved')}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={shareNative}
            className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-[16px] border border-zinc-200/90 bg-white px-2 py-3 text-[14px] font-semibold text-zinc-800 shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
          >
            <Share2 className="h-4 w-4 text-zinc-500" aria-hidden />
            {t('network.share_more')}
          </button>
        </div>

        {/* Mijn Netwerk */}
        <section className={cn('mt-5 p-5', cardShell)}>
          <h2 className="text-[17px] font-semibold text-zinc-900">{t('network.invited_people')}</h2>
          <div className="mt-5 flex flex-col items-center text-center">
            <Users className="h-11 w-11 text-zinc-300" aria-hidden />
            <p className="mt-3 text-[17px] font-semibold text-zinc-900">
              <span className="mr-1.5" aria-hidden>{badge.icon}</span>
              {badge.label}
            </p>
            {invites.length === 0 ? (
              <p className="mt-1 max-w-[260px] text-[15px] leading-snug text-zinc-500">
                {t('network.empty_network')}
              </p>
            ) : (
              <p className="mt-1 text-[14px] text-zinc-500">
                {invites.length} {t('network.total_invited')}
                {badge.next != null && (
                  <span className="mt-1 block text-[12px] text-zinc-400">
                    {t('network.next_badge')}: {badge.next} {t('network.approved')}
                  </span>
                )}
              </p>
            )}
          </div>
          {invites.length > 0 && (
            <ul className="mt-5 space-y-2 border-t border-zinc-100 pt-4">
              {invites.map(invite => (
                <li
                  key={invite.id}
                  className="flex items-center gap-3 rounded-[14px] bg-zinc-50/90 px-3 py-2.5"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
                    style={{ backgroundColor: primaryRed }}
                  >
                    {(invite.invited_name || invite.invited_email || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium text-zinc-900">
                      {invite.invited_name || invite.invited_email || t('common.noResults')}
                    </p>
                    <p className="text-[12px] text-zinc-500">
                      {new Date(invite.invited_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-sm">{getStatusIcon(invite.status)}</span>
                    <Badge
                      variant={invite.status === 'approved' ? 'default' : 'secondary'}
                      className="border-0 text-[10px]"
                    >
                      {String(t(`network.status.${invite.status}`) || invite.status)}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Verdiensten overzicht */}
        {invites.filter(i => i.status === 'approved' || i.bonus_paid).length > 0 && (
          <section className={cn('mt-4 space-y-3 p-5', cardShell)}>
            <h2 className="text-[17px] font-semibold text-zinc-900">{t('network.earnings_breakdown')}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[14px] bg-zinc-50 p-3 text-center">
                <p className="text-[11px] text-zinc-500">{t('network.pending_bonus')}</p>
                <p className="mt-1 text-lg font-bold text-zinc-900">
                  €{invites.filter(i => i.status === 'approved' && !i.bonus_paid).reduce((s, i) => s + (i.bonus_amount || 25), 0).toFixed(2)}
                </p>
              </div>
              <div className="rounded-[14px] bg-zinc-50 p-3 text-center">
                <p className="text-[11px] text-zinc-500">{t('network.paid_out')}</p>
                <p className="mt-1 text-lg font-bold" style={{ color: primaryRed }}>
                  €{invites.filter(i => i.bonus_paid).reduce((s, i) => s + (i.bonus_amount || 25), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Hoe werkt het? */}
        <section className={cn('mt-4 overflow-hidden', cardShell)}>
          <button
            type="button"
            onClick={() => setHowOpen(o => !o)}
            className="flex w-full items-center justify-between p-5 text-left"
            aria-expanded={howOpen}
          >
            <span className="text-[17px] font-semibold text-zinc-900">{t('network.how_it_works')}</span>
            <ChevronRight
              className={cn('h-5 w-5 shrink-0 text-zinc-400 transition-transform', howOpen && 'rotate-90')}
              aria-hidden
            />
          </button>
          {howOpen && (
            <div className="space-y-3 border-t border-zinc-100 px-5 pb-5 pt-4">
              {[
                { step: '1', icon: '🔗', text: t('network.step1') },
                { step: '2', icon: '📝', text: t('network.step2') },
                { step: '3', icon: '✅', text: t('network.step3') },
                { step: '4', icon: '💰', text: t('network.step4') },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-3">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ backgroundColor: `${primaryRed}cc` }}
                  >
                    {s.step}
                  </div>
                  <p className="pt-0.5 text-[14px] leading-snug text-zinc-600">
                    {s.icon} {s.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Ondernavigatie — zoals mockup: Home, Zoeken, Meldingen, Profiel */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div className="mx-auto w-full max-w-[430px] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+9px)]">
          <nav className="pointer-events-auto rounded-[20px] border border-black/[0.05] bg-white/98 px-3 py-1.5 shadow-[0_-2px_10px_rgba(15,23,42,0.07)] backdrop-blur">
            <ul className="grid grid-cols-4">
              <li>
                <Link to="/" className="flex flex-col items-center gap-0.5 py-1 text-zinc-500">
                  <HomeIcon className="h-5 w-5" />
                  <span className="text-[11px]">{t('nav.home')}</span>
                </Link>
              </li>
              <li>
                <Link to="/work" className="flex flex-col items-center gap-0.5 py-1 text-zinc-500">
                  <Search className="h-5 w-5" />
                  <span className="text-[11px]">{t('nav.search')}</span>
                </Link>
              </li>
              <li>
                <Link to="/notifications" className="flex flex-col items-center gap-0.5 py-1 text-zinc-500">
                  <span className="relative inline-flex">
                    <Bell className="h-5 w-5" />
                  </span>
                  <span className="text-[11px]">{t('notifications.title')}</span>
                </Link>
              </li>
              <li>
                <Link to="/profile" className="flex flex-col items-center gap-0.5 py-1 text-zinc-500">
                  <User className="h-5 w-5" />
                  <span className="text-[11px]">{t('nav.profile')}</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Network;
