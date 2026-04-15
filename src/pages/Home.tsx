import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Loader2, Sun, Cloud, CloudRain, ChevronRight, Lock, ShieldAlert, Bot, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { supabase } from '@/integrations/supabase/client';
import AvailabilityCalendar from '@/components/home/AvailabilityCalendar';
import { useProfileCompleteness, type ProfileData } from '@/hooks/useProfileCompleteness';

const DISPLAY_NAME_FALLBACK = 'Vakman';
const AMSTERDAM = { lat: 52.3676, lon: 4.9041 };

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
    1063, 1150, 1153, 1180, 1183, 1186, 1189, 1192, 1240, 1243, 1246, 1066, 1069, 1114, 1117, 1195, 1204, 1237, 1249,
    1252, 1261, 1264, 1087, 1273, 1276, 1279, 1282,
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

const Home = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { t: td } = useTranslation('dashboard');

  const [displayName, setDisplayName] = useState(DISPLAY_NAME_FALLBACK);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [homeProfile, setHomeProfile] = useState<ProfileData | null>(null);
  const [hasCerts, setHasCerts] = useState(false);
  const [hasAvail, setHasAvail] = useState(false);
  const [city, setCity] = useState('--');
  const [weatherLive, setWeatherLive] = useState<LiveWeather | null>(null);
  const [weatherOffline, setWeatherOffline] = useState(false);

  useEffect(() => {
    const loadWeather = async () => {
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

        const [profileRes, certsRes, availRes] = await Promise.all([
          supabase
            .from('profiles')
            .select(
              'full_name, city, onboarding_completed, phone, avatar_url, date_of_birth, specialization, specializations, bio, kvk_number, iban, preferred_language',
            )
            .eq('user_id', user.id)
            .single(),
          supabase.from('certificates').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
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
        setCity(p?.city || '--');

        void loadWeather();
      } catch (err) {
        console.error('Error loading home data:', err);
      } finally {
        setProfileLoaded(true);
      }
    };

    void loadData();
  }, [navigate]);

  const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };
  const { kind: weatherKind, Icon: WeatherIcon } = weatherPresentation(weatherLive, weatherOffline);
  const weatherCaptionKey =
    weatherKind === 'sunny' ? 'weatherSunny' : weatherKind === 'rain' ? 'weatherRainy' : 'weatherCloudy';

  const completeness = useProfileCompleteness(homeProfile, hasCerts, hasAvail);
  const firstNameRaw = displayName.trim().split(/\s+/)[0] || '';
  const welcomeLine = firstNameRaw && firstNameRaw !== DISPLAY_NAME_FALLBACK ? `Welkom, ${firstNameRaw}` : 'Welkom';
  const isAvailable = hasAvail;
  const weatherLine = weatherOffline || !weatherLive ? null : `${city || '--'} • ${weatherLive.temp_c ?? '—'}°C • ${td(weatherCaptionKey)}`;

  return (
    <div className="space-y-6 py-6 pb-24">
      <motion.div {...fadeUp} transition={{ delay: 0.08 }} className="space-y-1">
        {!profileLoaded ? (
          <div className="flex min-h-[2.5rem] items-center gap-2 py-1">
            <Loader2 className="h-6 w-6 shrink-0 animate-spin text-primary" aria-hidden />
            <span className="text-sm text-muted-foreground">{t('common.loading')}</span>
          </div>
        ) : !onboardingCompleted ? (
          <>
            <p className="text-sm font-medium text-muted-foreground">Alhan Groep</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{welcomeLine}</h1>
            <p className="text-sm text-muted-foreground">
              <Link to="/onboarding" className="font-medium text-primary underline-offset-2 hover:underline">
                {t('home.completeProfile')}
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-muted-foreground">Alhan Groep</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{welcomeLine}</h1>
            {weatherLine ? (
              <div className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                <WeatherIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span>{weatherLine}</span>
              </div>
            ) : null}
          </>
        )}
      </motion.div>

      <motion.section {...fadeUp} transition={{ delay: 0.12 }} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-foreground">Profiel</h3>
          <p className="text-sm font-medium text-muted-foreground">{completeness.percentage}% compleet</p>
        </div>
        <p className="text-sm text-muted-foreground">Vul je profiel aan voor volledige toegang</p>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completeness.percentage}%` }}
            transition={{ duration: 1, delay: 0.1 }}
            className="h-full rounded-full bg-[#B91C1C]/85"
          />
        </div>
        <Link
          to="/profile"
          className="flex h-12 w-full items-center justify-center rounded-full bg-[#B91C1C] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#991B1B]"
        >
          {t('home.finishProfile')}
        </Link>
      </motion.section>

      <motion.section {...fadeUp} transition={{ delay: 0.16 }} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">Uren schrijven</h2>
          <p className="text-sm text-muted-foreground">Afgelopen week: 40 uur</p>
        </div>
        <Link
          to="/time-registration"
          className="flex h-14 w-full items-center justify-center rounded-full bg-[#B91C1C] px-6 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#991B1B]"
        >
          Uren invoeren
        </Link>
      </motion.section>

      <motion.button
        {...fadeUp}
        transition={{ delay: 0.2 }}
        onClick={() => navigate('/profile')}
        className="flex w-full items-center justify-between rounded-2xl bg-white p-5 text-left shadow-sm"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold text-foreground">Beschikbaar</p>
            <span
              className={`h-2.5 w-2.5 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-gray-400'}`}
              aria-hidden
            />
          </div>
          <p className="text-sm text-muted-foreground">{isAvailable ? 'Je bent beschikbaar' : 'Je bent niet beschikbaar'}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
      </motion.button>

      <motion.section {...fadeUp} transition={{ delay: 0.24 }} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-foreground">Beschikbaarheid</h3>
        <div className="rounded-xl bg-background/60 p-2">
          <AvailabilityCalendar />
        </div>
      </motion.section>

      <motion.button
        {...fadeUp}
        transition={{ delay: 0.28 }}
        onClick={() => window.dispatchEvent(new CustomEvent('alhan-chat:open'))}
        className="flex w-full items-center justify-between rounded-2xl bg-white p-5 text-left shadow-sm"
      >
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">AI-assistent</p>
          <p className="text-sm text-muted-foreground">Stel je vraag</p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Bot className="h-4 w-4" aria-hidden />
          <ChevronRight className="h-4 w-4" aria-hidden />
        </div>
      </motion.button>

      <motion.button
        {...fadeUp}
        transition={{ delay: 0.32 }}
        onClick={() => navigate('/settings')}
        className="flex w-full items-center justify-between rounded-2xl bg-white p-5 text-left shadow-sm"
      >
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">Veilig werken</p>
          <p className="text-sm text-muted-foreground">Checklist nog niet afgerond</p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <ShieldAlert className="h-4 w-4" aria-hidden />
          <ChevronRight className="h-4 w-4" aria-hidden />
        </div>
      </motion.button>

      <motion.button
        {...fadeUp}
        transition={{ delay: 0.36 }}
        onClick={() => navigate('/leaderboard')}
        className="flex w-full items-center justify-between rounded-2xl bg-white p-5 text-left shadow-sm"
      >
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">Beloningen</p>
          <p className="text-sm text-muted-foreground">{`${completeness.earnedPoints} punten gespaard`}</p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Trophy className="h-4 w-4" aria-hidden />
          <ChevronRight className="h-4 w-4" aria-hidden />
        </div>
      </motion.button>

      <motion.section {...fadeUp} transition={{ delay: 0.4 }} className="space-y-1 rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-foreground">Volgende trekking: 25 maart</p>
        <p className="text-xs text-muted-foreground">Op basis van punten</p>
      </motion.section>

      <motion.section {...fadeUp} transition={{ delay: 0.44 }} className="space-y-2 pt-1">
        <p className="text-sm font-medium text-muted-foreground">{t('home.lockedVerifiedTitle')}</p>
        <p className="text-xs text-muted-foreground">{t('home.lockedVerifiedSubtitle')}</p>
        <div className="space-y-1.5 pt-1">
          {['Verdien beloningen', 'Draai aan het rad', 'Extra functies beschikbaar'].map(item => (
            <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-3.5 w-3.5 text-gray-400" aria-hidden />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  );
};

export default Home;
