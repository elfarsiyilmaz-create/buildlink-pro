import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, LogIn, ShieldCheck, UserPlus, BadgeCheck } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  BRAND_PARTNER_RED,
  REWARD_TIERS,
  dutchMonthName,
  formatPointsRange,
  getPartnerProgress,
} from '@/lib/partnerProgram';

const PAGE_BG = '#f5f5f7';

const cardClass =
  'rounded-2xl border-[0.5px] border-black/[0.08] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]';

const sectionLabel = 'text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8E8E93]';

const TIER_DOT: Record<string, string> = {
  brons: 'bg-[#9CA3AF]',
  zilver: 'bg-[#3B82F6]',
  goud: 'bg-[#CA8A04]',
  platina: 'bg-[#c0392b]',
};

const earnRows = [
  {
    icon: LogIn,
    title: 'Dagelijks inloggen',
    subtitle: 'Log elke dag in op de app',
    badge: '1 pt / dag',
  },
  {
    icon: Clock,
    title: 'Uren registreren',
    subtitle: 'Vul je gewerkte uren in',
    badge: '2 pt / dag',
  },
  {
    icon: ShieldCheck,
    title: 'Veiligheidscheck',
    subtitle: 'Voltooi je dagelijkse check',
    badge: '2 pt / dag',
  },
  {
    icon: BadgeCheck,
    title: 'Profiel 100% compleet',
    subtitle: 'Eenmalig bij voltooiing',
    badge: '25 pt eenmalig',
  },
  {
    icon: UserPlus,
    title: 'Referral goedgekeurd',
    subtitle: 'KVK-check + profiel 100% + admin approved',
    badge: '20 pt / referral',
  },
] as const;

function currentYmd() {
  const d = new Date();
  return { jaar: d.getFullYear(), maand: d.getMonth() + 1 };
}

const PartnerProgramma = () => {
  const { jaar, maand } = useMemo(() => currentYmd(), []);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['platform_partner_monthly_summary', jaar, maand],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('platform_partner_monthly_summary')
        .select('totaal_punten')
        .eq('maand', maand)
        .eq('jaar', jaar)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const points = summary?.totaal_punten ?? 0;
  const progress = useMemo(() => getPartnerProgress(points), [points]);
  const nextMonth = maand === 12 ? 1 : maand + 1;
  const nextMonthYear = maand === 12 ? jaar + 1 : jaar;
  const resetMonthLabel = dutchMonthName(nextMonth);
  const payoutDayLabel = `${dutchMonthName(maand)}`;

  const rightStatLabel =
    progress.nextTierDisplayName != null
      ? `Nog ${progress.pointsToNext} ${progress.pointsToNext === 1 ? 'punt' : 'punten'} tot ${progress.nextTierDisplayName}`
      : 'Hoogste tier bereikt';

  return (
    <div className="min-h-dvh" style={{ backgroundColor: PAGE_BG }}>
      <div
        className="mx-auto max-w-[430px] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+88px)]"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))' }}
      >
        <header className="border-b border-black/[0.06] pb-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em]" style={{ color: BRAND_PARTNER_RED }}>
            Alhan Groep
          </p>
          <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-[-0.02em] text-[#1C1C1E]">
            Partner Programma
          </h1>
          <p className="mt-1.5 text-[15px] leading-snug text-[#636366]">Consistent werken wordt beloond</p>
        </header>

        <div className="mt-5 flex flex-col gap-4">
          {/* Voortgang + tiers */}
          <section className={cn(cardClass, 'p-4')} aria-labelledby="partner-voortgang">
            {isLoading ? (
              <div className="flex h-24 items-center justify-center text-[14px] text-[#8E8E93]">Laden…</div>
            ) : (
              <>
                <p id="partner-voortgang" className={sectionLabel}>
                  Voortgang
                </p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.04em] text-[#AEAEB2]">
                  Jouw voortgang deze maand
                </p>

                <div className="mt-3 flex items-start justify-between gap-3">
                  <p className="text-[32px] font-bold leading-none tracking-[-0.03em] text-[#1C1C1E]">
                    {points} punten
                  </p>
                  <p className="max-w-[52%] text-right text-[12px] font-medium leading-snug text-[#636366]">
                    {rightStatLabel}
                  </p>
                </div>

                <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-[#E8E8ED]">
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{
                      width: `${Math.min(100, Math.max(0, progress.progressPercent))}%`,
                      backgroundColor: BRAND_PARTNER_RED,
                    }}
                  />
                </div>

                <p className="mt-3 text-[12px] leading-relaxed text-[#8E8E93]">
                  Punten worden gereset op 1 {resetMonthLabel}
                </p>

                <div className="my-4 h-px w-full bg-black/[0.06]" />

                <p className={sectionLabel}>Alle tiers</p>
                <ul className="mt-3 space-y-2">
                  {REWARD_TIERS.map(tier => {
                    const highlight = progress.nextRewardTierId === tier.id;
                    return (
                      <li
                        key={tier.id}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2.5',
                          highlight
                            ? 'border-[0.5px] border-[#c0392b]/45 bg-[#FDF4F4]'
                            : 'border-[0.5px] border-transparent',
                        )}
                      >
                        <span
                          className={cn('h-2.5 w-2.5 shrink-0 rounded-full', TIER_DOT[tier.id] ?? 'bg-gray-400')}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 text-[14px] font-semibold text-[#1C1C1E]">{tier.name}</span>
                        <span className="shrink-0 text-[12px] text-[#636366]">{formatPointsRange(tier)}</span>
                        <span className="shrink-0 text-[14px] font-semibold tabular-nums text-[#1C1C1E]">
                          {tier.reward}
                        </span>
                      </li>
                    );
                  })}
                </ul>

              </>
            )}
          </section>

          {/* Uitkering */}
          <section className={cn(cardClass, 'p-4')}>
            <p className={sectionLabel}>Uitkering</p>
            <div className="mt-3 flex gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(192, 57, 43, 0.12)' }}
              >
                <Calendar className="h-5 w-5" style={{ color: BRAND_PARTNER_RED }} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-[#1C1C1E]">Uitkering op 25 {payoutDayLabel}</p>
                <p className="mt-0.5 text-[13px] text-[#636366]">
                  Kies je beloning t/m 1 {dutchMonthName(nextMonth)}
                  {nextMonthYear !== jaar ? ` ${nextMonthYear}` : ''}
                </p>
              </div>
            </div>
          </section>

          {/* Hoe verdien je punten */}
          <section className={cn(cardClass, 'p-4')}>
            <p className={sectionLabel}>Hoe verdien je punten?</p>
            <ul className="mt-3 space-y-3">
              {earnRows.map(row => (
                <li key={row.title} className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F2F2F7]">
                    <row.icon className="h-[18px] w-[18px] text-[#636366]" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-[14px] font-semibold text-[#1C1C1E]">{row.title}</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-[#8E8E93]">{row.subtitle}</p>
                  </div>
                  <span
                    className="shrink-0 self-center rounded-full px-2.5 py-1 text-[10px] font-semibold text-white"
                    style={{ backgroundColor: BRAND_PARTNER_RED }}
                  >
                    {row.badge}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <footer className="px-2 pt-2 text-center">
            <p className="text-[11px] leading-relaxed text-[#AEAEB2]">
              Punten worden elke 1e van de maand gereset.
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#AEAEB2]">
              Deelname is vrijwillig en staat los van opdrachtverstrekking.
            </p>
          </footer>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default PartnerProgramma;
