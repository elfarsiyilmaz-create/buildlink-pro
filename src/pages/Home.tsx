import { lazy, Suspense, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FileCheck, Car, MapPin, Users, Loader2, Sun, Cloud, CloudRain, Bot, Check, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { supabase } from '@/integrations/supabase/client';
import AvailabilityCalendar from '@/components/home/AvailabilityCalendar';
import DailyChallenges from '@/components/home/DailyChallenges';
import AchievementUnlock from '@/components/home/AchievementUnlock';
import { fetchDashboardSmartBlock } from '@/lib/fetchDashboardSmartBlock';
import { useProfileCompleteness, type ProfileData } from '@/hooks/useProfileCompleteness';

const DISPLAY_NAME_FALLBACK = 'Vakman';

const AMSTERDAM = { lat: 52.3676, lon: 4.9041 };

function yesterdayLocalISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type LiveWeather = {
  temp_c: number | null;
  conditionText: string;
  conditionCode: number | null;
  wind_kph: number | null;
  is_day: number | null;
};

type WeatherKind = 'sunny' | 'rain' | 'cloud';

function weatherPresentation(live: LiveWeather | null, offline: boolean): { kind: WeatherKind; Icon: LucideIcon } {
  if (offline || !live) {
    return { kind: 'cloud', Icon: Cloud };
  }
  const code = live.conditionCode;
  const text = (live.conditionText || '').toLowerCase();
  const rainCodes = [
    1063, 1150, 1153, 1180, 1183, 1186, 1189, 1192, 1240, 1243, 1246, 1066, 1069, 1114, 1117, 1195, 1204, 1237, 1249, 1252,
    1261, 1264, 1087, 1273, 1276, 1279, 1282,
  ];
  if (code != null && rainCodes.includes(code)) {
    return { kind: 'rain', Icon: CloudRain };
  }
  if (
    text.includes('rain') ||
    text.includes('drizzle') ||
    text.includes('snow') ||
    text.includes('thunder') ||
    text.includes('sleet')
  ) {
    return { kind: 'rain', Icon: CloudRain };
  }
  if (code === 1000 && live.is_day === 1) {
    return { kind: 'sunny', Icon: Sun };
  }
  return { kind: 'cloud', Icon: Cloud };
}

type CoachUi = 'loading' | 'ready' | 'error' | 'timeout';
const PersonalDashboard = lazy(() => import('@/components/home/PersonalDashboard'));

const Home = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { t: td } = useTranslation('dashboard');
  const [available, setAvailable] = useState(false);
  const [displayName, setDisplayName] = useState(DISPLAY_NAME_FALLBACK);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [homeProfile, setHomeProfile] = useState<ProfileData | null>(null);
  const [hasCerts, setHasCerts] = useState(false);
  const [hasAvail, setHasAvail] = useState(false);
  const [stats, setStats] = useState({ documents: 0, referrals: 0, city: '--' });

  const [weatherLive, setWeatherLive] = useState<LiveWeather | null>(null);
  const [weatherOffline, setWeatherOffline] = useState(false);
  const [coachMessage, setCoachMessage] = useState('');
  const [coachPriority, setCoachPriority] = useState<'low' | 'medium' | 'high'>('low');
  const [coachUi, setCoachUi] = useState<CoachUi>('loading');
  const [mountSmartBlock, setMountSmartBlock] = useState(false);

  useEffect(() => {
    let timeoutId: number | null = null;

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(() => setMountSmartBlock(true));
      return () => window.cancelIdleCallback(idleId);
    }

    timeoutId = window.setTimeout(() => setMountSmartBlock(true), 0);
    return () => {
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    const loadWeatherAndCoach = async (userId: string) => {
      setCoachUi('loading');
      setWeatherOffline(false);
      let lat = AMSTERDAM.lat;
      let lon = AMSTERDAM.lon;

      try {
        if (Capacitor.isNativePlatform()) {
          const perm = await Geolocation.requestPermissions();
          if (perm.location === 'granted') {
            const pos = await Geolocation.getCurrentPosition({
              enableHighAccuracy: false,
              timeout: 15000,
            });
            lat = pos.coords.latitude;
            lon = pos.coords.longitude;
          }
        } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
          const pos = await new Promise<GeolocationPosition | null>(resolve => {
            navigator.geolocation.getCurrentPosition(p => resolve(p), () => resolve(null), {
              timeout: 12000,
              maximumAge: 300_000,
            });
          });
          if (pos) {
            lat = pos.coords.latitude;
            lon = pos.coords.longitude;
          }
        }
      } catch {
        lat = AMSTERDAM.lat;
        lon = AMSTERDAM.lon;
      }

      const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const base = import.meta.env.VITE_SUPABASE_URL;

      let live: LiveWeather | null = null;
      try {
        const wr = await fetch(
          `${base}/functions/v1/get-weather?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`,
          { headers: { apikey: anon, Authorization: `Bearer ${anon}` } },
        );
        if (wr.ok) {
          const data = (await wr.json()) as {
            temp_c: number | null;
            condition: { text: string; code: number | null };
            wind_kph: number | null;
            is_day: number | null;
          };
          live = {
            temp_c: data.temp_c,
            conditionText: data.condition?.text || '',
            conditionCode: data.condition?.code ?? null,
            wind_kph: data.wind_kph,
            is_day: data.is_day,
          };
        }
      } catch {
        live = null;
      }

      if (!live || live.temp_c == null) {
        setWeatherLive(null);
        setWeatherOffline(true);
      } else {
        setWeatherLive(live);
        setWeatherOffline(false);
      }

      const yStr = yesterdayLocalISO();
      const { count: yCount } = await supabase
        .from('time_entries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('date', yStr);
      const hoursY = (yCount ?? 0) > 0;

      const { data: myScore } = await supabase.from('leaderboard_scores').select('total_points').eq('user_id', userId).maybeSingle();
      let rank: number | null = null;
      if (myScore && typeof myScore.total_points === 'number') {
        const { count: above } = await supabase
          .from('leaderboard_scores')
          .select('id', { count: 'exact', head: true })
          .gt('total_points', myScore.total_points);
        rank = (above ?? 0) + 1;
      }

      const condText = live?.conditionText?.trim() || '';
      const tempNum = live?.temp_c != null && Number.isFinite(live.temp_c) ? live.temp_c : 0;

      const result = await fetchDashboardSmartBlock({
        weather: condText || t('home.weatherUnavailable'),
        temperature: tempNum,
        hoursLoggedYesterday: hoursY,
        leaderboardPosition: rank != null && rank >= 1 ? rank : 999_999,
        context: 'dashboard_smart_block',
      });

      if (result.status === 'timeout') {
        setCoachUi('timeout');
        setCoachMessage('');
        return;
      }
      if (result.status === 'error') {
        setCoachUi('error');
        setCoachMessage('');
        return;
      }

      setCoachMessage(result.data.message);
      setCoachPriority(result.data.priority ?? 'low');
      setCoachUi('ready');
    };

    const loadData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setProfileLoaded(true);
          navigate('/login', { replace: true });
          return;
        }

        const [profileRes, certsRes, referralsRes, availRes] = await Promise.all([
          supabase
            .from('profiles')
            .select(
              'full_name, profile_completeness, city, onboarding_completed, phone, avatar_url, date_of_birth, specialization, specializations, bio, kvk_number, iban, preferred_language',
            )
            .eq('user_id', user.id)
            .single(),
          supabase.from('certificates').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('referral_invites').select('id', { count: 'exact', head: true }).eq('referrer_id', user.id),
          supabase.from('availability').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        ]);

        const p = profileRes.data;
        const name =
          (p?.full_name?.trim() && p.full_name.trim().length > 0 ? p.full_name.trim() : null) || DISPLAY_NAME_FALLBACK;
        setDisplayName(name);
        setOnboardingCompleted(!!p?.onboarding_completed);
        setHasCerts((certsRes.count || 0) > 0);
        setHasAvail((availRes.count || 0) > 0);
        setHomeProfile(p ? (p as ProfileData) : null);
        setStats({
          documents: certsRes.count || 0,
          referrals: referralsRes.count || 0,
          city: p?.city || '--',
        });

        void loadWeatherAndCoach(user.id);
      } catch (err) {
        console.error('Error loading home data:', err);
      } finally {
        setProfileLoaded(true);
      }
    };

    void loadData();
  }, [navigate, t]);

  const shortDate = new Intl.DateTimeFormat(i18n.language?.startsWith('nl') ? 'nl-NL' : i18n.language || 'en', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

  const { kind: weatherKind, Icon: WeatherIcon } = weatherPresentation(weatherLive, weatherOffline);
  const glowClass = weatherKind === 'sunny' ? 'bg-yellow-50/30' : 'bg-blue-50/30';

  const weatherCaptionKey =
    weatherKind === 'sunny' ? 'weatherSunny' : weatherKind === 'rain' ? 'weatherRainy' : 'weatherCloudy';

  const coachTextClass =
    coachPriority === 'high' ? 'text-primary' : coachPriority === 'medium' ? 'text-foreground' : 'text-foreground';

  const completeness = useProfileCompleteness(homeProfile, hasCerts, hasAvail);

  return (
    <div className="space-y-6 py-5 pb-24">
      <AchievementUnlock />

      <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
        {!profileLoaded ? (
          <div className="flex items-center gap-2 py-1 min-h-[2.5rem]">
            <Loader2 className="w-6 h-6 animate-spin text-primary shrink-0" aria-hidden />
            <span className="text-sm text-muted-foreground">{t('common.loading')}</span>
          </div>
        ) : !onboardingCompleted ? (
          <>
            <h1 className="text-2xl font-bold text-foreground">{t('home.welcomeNew', { name: displayName })}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              <Link to="/onboarding" className="text-primary font-medium underline-offset-2 hover:underline">
                {t('home.completeProfile')}
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-foreground">{t('home.welcomeBack', { name: displayName })}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t('home.tagline')}</p>
          </>
        )}
      </motion.div>

      <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="space-y-3">
        <div className="pt-safe">
          <div className="relative overflow-hidden rounded-2xl border border-border/60">
            <div className={`absolute inset-0 ${glowClass}`} style={{ willChange: 'transform' }} aria-hidden />
            <div className="relative isolate flex min-h-[64px] flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-border/40 bg-background/45 px-4 py-3 backdrop-blur-md [contain:layout] dark:bg-background/35">
              <span className="text-sm font-semibold capitalize text-foreground">{shortDate}</span>
              <WeatherIcon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              <span className="text-lg font-bold tabular-nums text-foreground">
                {weatherOffline || weatherLive?.temp_c == null ? '—' : `${weatherLive.temp_c}°C`}
              </span>
              <span className="min-w-[8rem] flex-1 text-xs text-muted-foreground">{td(weatherCaptionKey)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/time-registration"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-2xl bg-primary px-3 text-base font-semibold text-primary-foreground shadow-md transition-opacity hover:opacity-90"
          >
            <span aria-hidden>✍️</span>
            <span className="truncate">{td('writeHours')}</span>
          </Link>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('alhan-chat:open'))}
            className="flex min-h-[44px] min-w-[44px] flex-col justify-center gap-1 rounded-2xl border border-border/60 bg-secondary/90 px-3 py-2 text-left shadow-sm dark:bg-secondary/40"
            aria-label={t('common.openAssistant')}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-background/80">
                <Bot className="h-6 w-6 text-primary" aria-hidden />
              </span>
              {!mountSmartBlock || coachUi === 'loading' ? (
                <div className="min-h-[56px] flex-1 animate-pulse space-y-2 py-1.5">
                  <span className="sr-only">{td('aiLoading')}</span>
                  <div className="h-2.5 w-3/4 rounded bg-muted" />
                  <div className="h-2.5 w-full rounded bg-muted" />
                  <div className="h-2.5 w-5/6 rounded bg-muted" />
                </div>
              ) : coachUi === 'error' ? (
                <span className="min-h-[44px] flex-1 text-xs leading-snug text-muted-foreground">{td('aiError')}</span>
              ) : coachUi === 'timeout' ? (
                <span className="min-h-[44px] flex-1 text-xs leading-snug text-muted-foreground">{td('aiTimeout')}</span>
              ) : (
                <span className={`line-clamp-4 flex-1 text-xs font-medium leading-snug ${coachTextClass}`}>{coachMessage}</span>
              )}
            </div>
          </button>
        </div>
      </motion.div>

      <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
        <button
          type="button"
          onClick={() => setAvailable(!available)}
          className={`flex w-full items-center justify-between rounded-2xl p-5 transition-all duration-300 ${
            available ? 'bg-success text-success-foreground pulse-green' : 'bg-destructive text-destructive-foreground'
          }`}
          aria-label={available ? t('home.available') : t('home.unavailable')}
          aria-pressed={available}
        >
          <span className="text-lg font-bold">{available ? t('home.available') : t('home.unavailable')}</span>
          <div
            className={`relative h-8 w-14 rounded-full transition-colors duration-300 ${available ? 'bg-white/30' : 'bg-white/20'}`}
          >
            <motion.div
              layout
              className="absolute top-1 h-6 w-6 rounded-full bg-white shadow-md"
              style={{ left: available ? 'calc(100% - 28px)' : '4px' }}
            />
          </div>
        </button>
      </motion.div>

      <motion.div {...fadeUp} transition={{ delay: 0.35 }}>
        <AvailabilityCalendar />
      </motion.div>

      <motion.div {...fadeUp} transition={{ delay: 0.4 }}>
        <Suspense fallback={<div className="glass-card min-h-[260px] rounded-2xl p-4 animate-pulse" />}>
          <PersonalDashboard />
        </Suspense>
      </motion.div>

      <motion.div {...fadeUp} transition={{ delay: 0.45 }}>
        <DailyChallenges />
      </motion.div>

      {profileLoaded && onboardingCompleted && completeness.percentage < 100 && (
        <motion.div
          {...fadeUp}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-2xl p-5 shadow-sm space-y-5"
        >
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t('home.completeProfile')}</h2>
            <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{completeness.percentage}%</p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completeness.percentage}%` }}
                transition={{ duration: 1, delay: 0.6 }}
                className="h-full rounded-full bg-[#B91C1C]/80"
              />
            </div>
          </div>

          <ul className="space-y-1">
            {completeness.missingFields.slice(0, 5).map(field => (
              <li key={field.key}>
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="flex w-full items-center gap-3 rounded-xl py-2 px-2 text-left text-sm text-foreground transition-colors hover:bg-muted/50"
                >
                  <Check className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1">{t(field.labelKey)}</span>
                </button>
              </li>
            ))}
          </ul>

          <Link
            to="/profile"
            className="flex w-full items-center justify-center rounded-full bg-[#B91C1C] px-5 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#991B1B]"
          >
            {t('home.finishProfile')}
          </Link>

          <div className="space-y-2 border-t border-gray-100 pt-5">
            <h3 className="text-sm font-medium text-muted-foreground">{t('home.lockedVerifiedTitle')}</h3>
            <p className="text-xs text-muted-foreground">{t('home.lockedVerifiedSubtitle')}</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                <Lock className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                <span className="text-sm text-muted-foreground">{t('home.lockedItemWheel')}</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                <Lock className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                <span className="text-sm text-muted-foreground">{t('home.lockedItemExtras')}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div {...fadeUp} transition={{ delay: 0.55 }} className="grid grid-cols-4 gap-2">
        {[
          { icon: FileCheck, label: t('home.documents'), value: `${stats.documents}` },
          { icon: Car, label: t('home.license'), value: t('home.none') },
          { icon: MapPin, label: t('home.region'), value: stats.city },
          { icon: Users, label: t('home.referrals'), value: `${stats.referrals}` },
        ].map((stat, i) => (
          <div key={i} className="glass-card rounded-xl p-3 text-center">
            <stat.icon className="mx-auto mb-1.5 h-5 w-5 text-primary" />
            <p className="text-xs font-bold text-foreground">{stat.value}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      <motion.button
        {...fadeUp}
        transition={{ delay: 0.6 }}
        onClick={() => navigate('/wheel')}
        className="glass-card flex w-full items-center gap-3 rounded-2xl p-4 text-left"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">🎰</div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{t('wheel.title')}</p>
          <p className="text-xs text-muted-foreground">{t('wheel.spin_available')}</p>
        </div>
      </motion.button>
    </div>
  );
};

export default Home;
