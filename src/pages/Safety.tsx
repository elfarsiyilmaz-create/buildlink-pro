import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { BottomNav } from '@/components/BottomNav';

const PRIMARY = '#B91C1C';

const CHECKLIST_LABELS = [
  'PBM’s gecontroleerd',
  'Veiligheidsschoenen gedragen',
  'Werkplek gecontroleerd en veilig',
  'Vergunningen gecontroleerd (indien nodig)',
  'Geen risico’s gesignaleerd',
] as const;

const cardClass =
  'rounded-[18px] border border-black/[0.04] bg-white px-4 py-4 shadow-[0_6px_20px_rgba(15,23,42,0.06)]';

const Safety = () => {
  const navigate = useNavigate();
  const [checked, setChecked] = useState<boolean[]>(() => CHECKLIST_LABELS.map(() => false));
  const [note, setNote] = useState('');
  const [completed, setCompleted] = useState(false);

  const allChecked = checked.every(Boolean);

  const toggleItem = useCallback(
    (index: number) => {
      if (completed) return;
      setChecked(prev => prev.map((v, i) => (i === index ? !v : v)));
    },
    [completed],
  );

  const handleComplete = () => {
    if (!allChecked || completed) return;
    setCompleted(true);
  };

  return (
    <div className="min-h-dvh bg-[#f3f3f5]">
      <div className="mx-auto w-full max-w-[430px] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+120px)] pt-10">
        {/* Header */}
        <header className="space-y-1">
          <p className="text-[12px] font-medium text-zinc-400">Alhan Groep</p>
          <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-zinc-900">
            Veilig werken
          </h1>
          <p className="text-[15px] text-zinc-500">Dagelijkse checkup</p>
        </header>

        <p className="mt-3 max-w-full truncate text-[12px] italic text-zinc-400">
          Controleer altijd je werkplek voordat je begint
        </p>

        {/* Checklist card */}
        <section className={cn('mt-5', cardClass)} aria-labelledby="safety-checklist-title">
          <h2 id="safety-checklist-title" className="text-[16px] font-semibold text-zinc-900">
            Checklist
          </h2>

          <ul className="mt-4 space-y-3">
            {CHECKLIST_LABELS.map((label, i) => (
              <li key={label}>
                <button
                  type="button"
                  disabled={completed}
                  onClick={() => toggleItem(i)}
                  className={cn(
                    'flex w-full min-h-[48px] items-start gap-3 rounded-xl py-1.5 text-left transition-colors',
                    !completed && 'active:bg-zinc-50',
                    completed && 'cursor-default opacity-90',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      checked[i]
                        ? 'border-transparent text-white'
                        : 'border-zinc-300 bg-white',
                    )}
                    style={checked[i] ? { backgroundColor: PRIMARY, borderColor: PRIMARY } : undefined}
                    aria-hidden
                  >
                    {checked[i] ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : null}
                  </span>
                  <span className="pt-0.5 text-[15px] leading-snug text-zinc-900">{label}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-5">
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Eventuele opmerkingen (optioneel)"
              disabled={completed}
              className="h-11 rounded-[12px] border-zinc-200 bg-zinc-50/80 text-[15px] text-zinc-900 placeholder:text-zinc-400"
            />
          </div>

          <div className="mt-5">
            {!completed ? (
              <button
                type="button"
                disabled={!allChecked}
                onClick={handleComplete}
                className={cn(
                  'h-12 w-full rounded-full text-[15px] font-semibold text-white shadow-sm transition-opacity',
                  !allChecked && 'cursor-not-allowed opacity-40',
                )}
                style={{ backgroundColor: PRIMARY }}
              >
                Checkup afronden en opslaan
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="flex h-12 w-full cursor-default items-center justify-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 text-[15px] font-semibold text-zinc-600"
              >
                Voltooid
                <Check className="h-4 w-4 text-emerald-600" strokeWidth={2.5} aria-hidden />
              </button>
            )}
          </div>

          {completed && (
            <p className="mt-4 flex items-center justify-center gap-2 text-[14px] font-medium text-zinc-600">
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: PRIMARY }}
                aria-hidden
              >
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
              Checkup voltooid
            </p>
          )}
        </section>

        {/* Secondary cards */}
        <div className="mt-5 space-y-4">
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className={cn(
              'flex w-full items-center justify-between gap-3 text-left transition-colors',
              cardClass,
            )}
          >
            <span>
              <span className="block text-[16px] font-semibold text-zinc-900">Veiligheid en richtlijnen</span>
              <span className="mt-0.5 block text-[14px] text-zinc-500">Bekijk richtlijnen en tips</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-zinc-300" aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => navigate('/settings')}
            className={cn(
              'flex w-full items-center justify-between gap-3 text-left transition-colors',
              cardClass,
            )}
          >
            <span>
              <span className="block text-[16px] font-semibold text-zinc-900">Onveilige situatie melden</span>
              <span className="mt-0.5 block text-[14px] text-zinc-500">Maak een anonieme melding</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-zinc-300" aria-hidden />
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Safety;
