import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FileCheck, Car, MapPin, Users, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { supabase } from '@/integrations/supabase/client';
import AvailabilityCalendar from '@/components/home/AvailabilityCalendar';
import DailyChallenges from '@/components/home/DailyChallenges';
import PersonalDashboard from '@/components/home/PersonalDashboard';
import AchievementUnlock from '@/components/home/AchievementUnlock';
import { fetchDashboardCoachLine, truncateWords } from '@/lib/dashboardCoachStream';

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

function emojiFromConditionCode(code: number | null, isDay: number | null): string {
  if (code == null) return '🌤️';
  const day = isDay === 1;
  if (code === 1000) return day ? '☀️' : '🌙';
  if ([1003, 1006, 1009].includes(code)) return '☁️';
  if ([1030, 1135, 1147].includes(code)) return '🌫️';
  if ([1063, 1150, 1153, 1180, 1183, 1186, 1189, 1192, 1240, 1243, 1246].includes(code)) return '🌧️';
  if ([1066, 1069, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258].includes(code)) return '🌨️';
  if ([1087, 1273, 1276, 1279, 1282].includes(code)) return '⛈️';
  if ([1114, 1117, 1195, 1204, 1237, 1249, 1252, 1261, 1264].includes(code)) return '🌧️';
  return '🌤️';
}

function isWeatherWarning(
  wind: number | null,
  temp: number | null,
  code: number | null,
  text: string,
): boolean {
  const w = wind ?? 0;
  const tLow = (temp ?? 20) <= 1;
  const windy = w >= 35;
  const lower = text.toLowerCase();
  const nasty =
    lower.includes('rain') ||
    lower.includes('snow') ||
    lower.includes('thunder') ||
    lower.includes('sleet') ||
    lower.includes('drizzle') ||
    lower.includes('blizzard') ||
    lower.includes('ice');
  const codes = [1087, 1273, 1276, 1279, 1282, 1195, 1246, 1264];
  return windy || tLow || nasty || (code != null && codes.includes(code));
}

function smartUrgencyLevel(params: { hoursYesterday: boolean; rank: number | null }): 'green' | 'orange' | 'red' {
  const { hoursYesterday, rank } = params;
  if (!hoursYesterday) return 'red';
  if (rank == null || rank > 10) return 'orange';
  return 'green';
}

type LiveWeather = {
  temp_c: number | null;
  conditionText: string;
  conditionCode: number | null;
  wind_kph: number | null;
  is_day: number | null;
};

const Home = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [available, setAvailable] = useState(false);
  const [displayName, setDisplayName] = useState(DISPLAY_NAME_FALLBACK);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [profilePercentage, setProfilePercentage] = useState(0);
  const [stats, setStats] = useState({ documents: 0, referrals: 0, city: '--' });

  const [weatherLive, setWeatherLive] = useState<LiveWeather | null>(null);
  const [weatherOffline, setWeatherOffline] = useState(false);
  const [smartUrgency, setSmartUrgency] = useState<'green' | 'orange' | 'red'>('green');
  const [coachLine, setCoachLine] = useState('');
  const [coachLoading, setCoachLoading] = useState(true);

  useEffect(() => {
    const loadWeatherAndCoach = async (userId: string) => {
      setCoachLoading(true);
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
      setSmartUrgency(smartUrgencyLevel({ hoursYesterday: hoursY, rank }));

      const condText = live?.conditionText?.trim() || t('home.weatherUnavailable');
      const tempStr = live?.temp_c != null ? String(live.temp_c) : '?';
      const rankStr = rank != null ? `#${rank}` : 'nog geen plek';
      const ctx = `Je bent Alhan AI Coach. Geef een korte motiverende boodschap van maximaal 10 woorden voor een ZZP'er in de bouw. Weer: ${condText}, ${tempStr}°C, uren gisteren: ${hoursY ? 'ja' : 'nee'}, leaderboard: ${rankStr}. Direct en motiverend.`;

      try {
        const raw = await fetchDashboardCoachLine(ctx, null);
        setCoachLine(truncateWords(raw || '💪 Blijf knappen!', 10));
      } catch {
        setCoachLine('💪 Blijf knappen!');
      } finally {
        setCoachLoading(false);
      }
    };

    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setProfileLoaded(true);
          navigate('/login', { replace: true });
          return;
        }

        const [profileRes, certsRes, referralsRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('full_name, profile_completeness, city, onboarding_completed')
            .eq('user_id', user.id)
            .single(),
          supabase.from('certificates').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('referral_invites').select('id', { count: 'exact', head: true }).eq('referrer_id', user.id),
        ]);

        const p = profileRes.data;
        const name = (p?.full_name?.trim() && p.full_name.trim().length > 0 ? p.full_name.trim() : null) || DISPLAY_NAME_FALLBACK;
        setDisplayName(name);
        setOnboardingCompleted(!!p?.onboarding_completed);
        setProfilePercentage(p?.profile_completeness || 0);
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

  const weatherWarning =
    weatherLive &&
    isWeatherWarning(weatherLive.wind_kph, weatherLive.temp_c, weatherLive.conditionCode, weatherLive.conditionText);

  const smartBlockClass =
    smartUrgency === 'red'
      ? 'border-red-500/50 bg-red-500/15 text-red-950 dark:text-red-50'
      : smartUrgency === 'orange'
        ? 'border-orange-500/50 bg-orange-500/15 text-orange-950 dark:text-orange-50'
        : 'border-emerald-500/50 bg-emerald-500/15 text-emerald-950 dark:text-emerald-50';

  return (
    <div className="space-y-5 py-5 pb-24">
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

      {/* Smart Weather Bar + Action row */}
      <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="space-y-3">
        <div className="glass-card rounded-2xl px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-sm font-semibold text-foreground capitalize">{shortDate}</span>
          <span className="text-xl" aria-hidden>
            {weatherOffline || !weatherLive
              ? '🌤️'
              : emojiFromConditionCode(weatherLive.conditionCode, weatherLive.is_day)}
          </span>
          <span className="text-lg font-bold text-foreground tabular-nums">
            {weatherOffline || weatherLive?.temp_c == null ? '—' : `${weatherLive.temp_c}°C`}
          </span>
          <span className="text-xs text-muted-foreground flex-1 min-w-[8rem]">
            {weatherOffline ? t('home.weatherUnavailable') : weatherWarning ? t('home.weatherWarning') : t('home.weatherGood')}
          </span>
        </div>

        <div className="flex gap-2 items-stretch">
          <Link
            to="/time-registration"
            className="flex-[0.7] min-w-0 min-h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 px-3 shadow-md hover:opacity-90 transition-opacity"
          >
            <span aria-hidden>✍️</span>
            <span className="truncate">{t('home.writeHours')}</span>
          </Link>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('alhan-chat:open'))}
            className={`flex-[0.3] min-w-[44px] min-h-11 rounded-2xl border px-2 py-2 text-left text-xs font-medium leading-snug flex flex-col justify-center ${smartBlockClass}`}
          >
            {coachLoading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
                <span className="line-clamp-3">{t('home.smartBlockLoading')}</span>
              </span>
            ) : (
              <span className="line-clamp-4">{coachLine}</span>
            )}
          </button>
        </div>
      </motion.div>

      <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
        <button
          type="button"
          onClick={() => setAvailable(!available)}
          className={`w-full rounded-2xl p-5 flex items-center justify-between transition-all duration-300 ${
            available ? 'bg-success text-success-foreground pulse-green' : 'bg-destructive text-destructive-foreground'
          }`}
          aria-label={available ? t('home.available') : t('home.unavailable')}
          aria-pressed={available}
        >
          <span className="font-bold text-lg">{available ? t('home.available') : t('home.unavailable')}</span>
          <div className={`w-14 h-8 rounded-full relative transition-colors duration-300 ${available ? 'bg-white/30' : 'bg-white/20'}`}>
            <motion.div layout className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-md" style={{ left: available ? 'calc(100% - 28px)' : '4px' }} />
          </div>
        </button>
      </motion.div>

      <motion.div {...fadeUp} transition={{ delay: 0.35 }}>
        <AvailabilityCalendar />
      </motion.div>

      <motion.div {...fadeUp} transition={{ delay: 0.4 }}>
        <PersonalDashboard />
      </motion.div>

      <motion.div {...fadeUp} transition={{ delay: 0.45 }}>
        <DailyChallenges />
      </motion.div>

      <motion.div {...fadeUp} transition={{ delay: 0.5 }} className="glass-card rounded-2xl p-4 cursor-pointer" onClick={() => navigate('/profile')}>
        <p className="text-sm font-medium text-foreground mb-2">{t('home.profileComplete', { percentage: profilePercentage })}</p>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${profilePercentage}%` }} transition={{ duration: 1, delay: 0.6 }} className="h-full gradient-primary rounded-full" />
        </div>
      </motion.div>

      <motion.div {...fadeUp} transition={{ delay: 0.55 }} className="grid grid-cols-4 gap-2">
        {[
          { icon: FileCheck, label: t('home.documents'), value: `${stats.documents}` },
          { icon: Car, label: t('home.license'), value: t('home.none') },
          { icon: MapPin, label: t('home.region'), value: stats.city },
          { icon: Users, label: t('home.referrals'), value: `${stats.referrals}` },
        ].map((stat, i) => (
          <div key={i} className="glass-card rounded-xl p-3 text-center">
            <stat.icon className="w-5 h-5 text-primary mx-auto mb-1.5" />
            <p className="text-xs font-bold text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      <motion.button
        {...fadeUp}
        transition={{ delay: 0.6 }}
        onClick={() => navigate('/wheel')}
        className="glass-card rounded-2xl p-4 flex items-center gap-3 w-full text-left"
      >
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">🎰</div>
        <div className="flex-1">
          <p className="font-semibold text-foreground text-sm">{t('wheel.title')}</p>
          <p className="text-xs text-muted-foreground">{t('wheel.spin_available')}</p>
        </div>
      </motion.button>
    </div>
  );
};

export default Home;
