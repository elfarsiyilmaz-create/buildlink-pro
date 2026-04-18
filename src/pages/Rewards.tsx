import { Calendar, Clock, LogIn, ShieldCheck } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { cn } from '@/lib/utils';

/** Mock — later vervangen door API / profielstate */
const currentPoints = 42;
const tierOne = 50;
const tierTwo = 75;
const tierThree = 100;
const isRewardsDay = false;
const availableSpins = 0;

const nextDrawLabel = 'Volgende maandtrekking: 25 april';

const WHEEL_CX = 100;
const WHEEL_CY = 100;
const WHEEL_R = 92;

const wheelSegments: { label: string; fill: string; emphasis: 'money' | 'neutral' | 'muted' }[] = [
  { label: '€5', fill: '#F5E4E4', emphasis: 'money' },
  { label: '€10', fill: '#F0D6D6', emphasis: 'money' },
  { label: '€25', fill: '#E8C8C8', emphasis: 'money' },
  { label: 'Extra draai', fill: '#F2F2F7', emphasis: 'neutral' },
  { label: 'Bonus', fill: '#E8E8ED', emphasis: 'muted' },
  { label: 'Geen prijs', fill: '#E5E5EA', emphasis: 'muted' },
];

function wedgePath(index: number): string {
  const start = ((-90 + index * 60) * Math.PI) / 180;
  const end = ((-90 + (index + 1) * 60) * Math.PI) / 180;
  const x0 = WHEEL_CX + WHEEL_R * Math.cos(start);
  const y0 = WHEEL_CY + WHEEL_R * Math.sin(start);
  const x1 = WHEEL_CX + WHEEL_R * Math.cos(end);
  const y1 = WHEEL_CY + WHEEL_R * Math.sin(end);
  return `M ${WHEEL_CX} ${WHEEL_CY} L ${x0} ${y0} A ${WHEEL_R} ${WHEEL_R} 0 0 1 ${x1} ${y1} Z`;
}

function labelTransform(index: number): string {
  const midDeg = -90 + index * 60 + 30;
  const mid = (midDeg * Math.PI) / 180;
  const tr = 58;
  const tx = WHEEL_CX + tr * Math.cos(mid);
  const ty = WHEEL_CY + tr * Math.sin(mid);
  return `translate(${tx}, ${ty}) rotate(${midDeg + 90})`;
}

const cardBase = 'rounded-[20px] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)]';

const Rewards = () => {
  const pointsToFirstSpin = Math.max(0, tierOne - currentPoints);
  const progressToFirstSpin = Math.min(100, (currentPoints / tierOne) * 100);
  const canSpin = isRewardsDay && availableSpins > 0;
  const ctaLocked = !canSpin;

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-28">
      <div className="mx-auto flex max-w-[430px] flex-col gap-4 px-4 pt-5">
        <header>
          <p className="text-[13px] font-medium leading-[18px] text-[#8E8E93]">Alhan Groep</p>
          <h1 className="text-[30px] font-semibold leading-[36px] tracking-[-0.02em] text-[#1C1C1E]">Maandtrekking</h1>
          <p className="mt-1 text-[17px] leading-[22px] text-[#636366]">Consistent werken wordt beloond</p>
        </header>

        {/* Status / progress */}
        <section className={cn(cardBase, 'p-4')}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-[#636366]" aria-hidden />
              <p className="text-[15px] font-semibold leading-[20px] text-[#1C1C1E]">{nextDrawLabel}</p>
            </div>
            <span className="shrink-0 rounded-full bg-[#F2F2F7] px-3 py-1.5 text-[13px] font-medium text-[#636366]">
              Nog niet beschikbaar
            </span>
          </div>

          <p className="mt-5 text-[28px] font-semibold leading-[34px] tracking-[-0.02em] text-[#1C1C1E]">
            {currentPoints} Alhan Punten
          </p>
          <p className="mt-1 text-[14px] leading-[20px] text-[#636366]">
            Nog {pointsToFirstSpin} Alhan Punten voor 1 draai
          </p>

          <div className="mt-3 h-2 w-full rounded-full bg-[#E5E5EA]">
            <div
              className="h-2 rounded-full bg-[#B91C1C] transition-[width] duration-300"
              style={{ width: `${progressToFirstSpin}%` }}
            />
          </div>

          <ul className="mt-3 space-y-1 text-[12px] leading-[16px] text-[#8E8E93]">
            <li>{tierOne} Alhan Punten = 1 draai</li>
            <li>{tierTwo} Alhan Punten = 2 draaien</li>
            <li>{tierThree} Alhan Punten = 3 draaien</li>
          </ul>
        </section>

        {/* Wheel */}
        <section className="rounded-[24px] bg-white px-4 py-5 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          <div className="relative mx-auto flex w-full max-w-[280px] flex-col items-center">
            <div
              className="relative z-10 mb-1 h-0 w-0 border-x-[7px] border-x-transparent border-t-[10px] border-t-[#1C1C1E]"
              aria-hidden
            />
            <div
              className={cn(
                'relative aspect-square w-full max-w-[260px] transition-opacity duration-200',
                ctaLocked ? 'opacity-[0.78]' : 'opacity-100',
              )}
            >
              <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
                <circle cx={WHEEL_CX} cy={WHEEL_CY} r={WHEEL_R + 2} fill="#F2F2F7" />
                {wheelSegments.map((seg, i) => (
                  <path key={seg.label} d={wedgePath(i)} fill={seg.fill} stroke="#FFFFFF" strokeWidth="1.25" />
                ))}
                {wheelSegments.map((seg, i) => {
                  const fs =
                    seg.emphasis === 'money' ? 10.5 : seg.emphasis === 'neutral' ? 8.5 : 8;
                  const fill =
                    seg.emphasis === 'money' ? '#7F1D1D' : seg.emphasis === 'neutral' ? '#636366' : '#8E8E93';
                  return (
                    <text
                      key={`t-${seg.label}`}
                      transform={labelTransform(i)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={fs}
                      fontWeight={500}
                      fill={fill}
                      style={{ userSelect: 'none' }}
                    >
                      {seg.label.includes(' ') ? (
                        <>
                          <tspan x={0} dy="-0.35em">
                            {seg.label.split(' ')[0]}
                          </tspan>
                          <tspan x={0} dy="1.05em">
                            {seg.label.split(' ')[1]}
                          </tspan>
                        </>
                      ) : (
                        seg.label
                      )}
                    </text>
                  );
                })}
                <circle cx={WHEEL_CX} cy={WHEEL_CY} r={22} fill="#FFFFFF" stroke="#E5E5EA" strokeWidth="1.5" />
                <text
                  x={WHEEL_CX}
                  y={WHEEL_CY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={15}
                  fontWeight={600}
                  fill="#B91C1C"
                >
                  A
                </text>
              </svg>
            </div>

            <button
              type="button"
              disabled={ctaLocked}
              className={cn(
                'mt-5 h-14 w-full rounded-full text-[17px] font-semibold transition-colors',
                ctaLocked ? 'cursor-not-allowed bg-[#D1D1D6] text-white' : 'bg-[#B91C1C] text-white hover:bg-[#A01818]',
              )}
            >
              {ctaLocked ? 'Nog niet beschikbaar' : 'Draai het rad'}
            </button>
          </div>
        </section>

        {/* Tier uitleg */}
        <section className={cn(cardBase, 'divide-y divide-[#E5E5EA] overflow-hidden')}>
          <div className="px-4 py-3">
            <h2 className="text-[15px] font-semibold text-[#1C1C1E]">Draaien vrijspelen</h2>
          </div>
          <div className="px-4 py-3 text-[14px] leading-[20px] text-[#3A3A3C]">{tierOne} Alhan Punten → 1 draai</div>
          <div className="px-4 py-3 text-[14px] leading-[20px] text-[#3A3A3C]">{tierTwo} Alhan Punten → 2 draaien</div>
          <div className="px-4 py-3 text-[14px] leading-[20px] text-[#3A3A3C]">{tierThree} Alhan Punten → 3 draaien</div>
        </section>

        <section className={cn(cardBase, 'divide-y divide-[#E5E5EA] overflow-hidden')}>
          <div className="px-4 py-3">
            <h2 className="text-[15px] font-semibold text-[#1C1C1E]">Hoe verdien je punten?</h2>
          </div>

          <div className="flex gap-3 px-4 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F2F2F7]">
              <Clock className="h-5 w-5 text-[#636366]" strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-[20px] text-[#1C1C1E]">Uren registreren</p>
              <p className="mt-1 text-[13px] leading-[18px] text-[#636366]">
                Registreer je gewerkte uren correct en op tijd.
              </p>
            </div>
          </div>

          <div className="flex gap-3 px-4 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F2F2F7]">
              <ShieldCheck className="h-5 w-5 text-[#636366]" strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-[20px] text-[#1C1C1E]">Veiligheidscheck afronden</p>
              <p className="mt-1 text-[13px] leading-[18px] text-[#636366]">
                Voltooi je dagelijkse veiligheidscheck.
              </p>
            </div>
          </div>

          <div className="flex gap-3 px-4 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F2F2F7]">
              <LogIn className="h-5 w-5 text-[#636366]" strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-[20px] text-[#1C1C1E]">Dagelijkse login op werkdagen</p>
              <p className="mt-1 text-[13px] leading-[18px] text-[#636366]">
                Log op werkdagen in om actief te blijven en punten op te bouwen.
              </p>
            </div>
          </div>

          <div className="bg-[#FAFAFA] px-4 py-3">
            <p className="text-[12px] leading-[16px] text-[#8E8E93]">
              Alhan Punten bouw je op door vaste acties consequent uit te voeren.
            </p>
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
};

export default Rewards;
