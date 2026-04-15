import { Lock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const ProfileGate = () => {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const loadProgress = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profile }, { count: availabilityCount }] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, phone, kvk_number, status')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('availability')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ]);

      const checks = [
        !!(profile?.full_name?.trim() && profile?.phone?.trim() && profile?.kvk_number?.trim()),
        (availabilityCount || 0) > 0,
        profile?.status === 'approved',
      ];
      const completeCount = checks.filter(Boolean).length;
      setProgress(Math.round((completeCount / checks.length) * 100));
    };

    void loadProgress();
  }, []);

  const checklistItems = useMemo(
    () => [t('profileGate.check1'), t('profileGate.check2'), t('profileGate.check3')],
    [t],
  );

  const lockedItems = useMemo(
    () => [t('profileGate.lockedItem1'), t('profileGate.lockedItem2'), t('profileGate.lockedItem3')],
    [t],
  );

  return (
    <div className="min-h-screen bg-white px-6 pt-safe pb-10 font-sans">
      <div className="mx-auto flex w-full max-w-sm flex-col items-stretch pt-10">
        <p className="text-center text-sm font-medium tracking-tight text-foreground/80">Alhan Groep</p>

        <section className="mt-10 space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('profileGate.title')}</h1>
          <p className="text-base leading-relaxed text-muted-foreground">{t('profileGate.subtitle')}</p>
        </section>

        <section className="mt-8 space-y-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-[#B91C1C]/85" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{progress}%</p>
        </section>

        <section className="mt-8 space-y-3">
          {checklistItems.map(item => (
            <div key={item} className="flex items-center gap-2 text-sm text-foreground">
              <span aria-hidden>•</span>
              <span>{item}</span>
            </div>
          ))}
        </section>

        <Link
          to="/profile"
          className="mt-8 flex h-14 w-full items-center justify-center rounded-full bg-[#B91C1C] px-6 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#991B1B]"
        >
          {t('profileGate.cta')}
        </Link>

        <section className="mt-10 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{t('profileGate.lockedTitle')}</p>
          <p className="text-xs text-muted-foreground">{t('profileGate.lockedSubtitle')}</p>
        </section>

        <section className="mt-4 space-y-2">
          {lockedItems.map(item => (
            <div key={item} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
              <Lock className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
              <span className="text-sm text-muted-foreground">{item}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

export default ProfileGate;
