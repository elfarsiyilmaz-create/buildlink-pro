import { useEffect, useState } from 'react';
import { Bell, ChevronRight, Clock3, Home as HomeIcon, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { supabase } from '@/integrations/supabase/client';
import { useProfileCompleteness, type ProfileData } from '@/hooks/useProfileCompleteness';

const DISPLAY_NAME = 'Yunus';
const CITY_LABEL = 'Rotterdam';
const WEATHER_TEMP = 12;
const WEATHER_CONDITION = 'Bewolkt';
const PROFILE_PERCENT = 35;
const REWARD_POINTS = 35;
const AMSTERDAM = { lat: 52.3676, lon: 4.9041 };

type LiveWeather = {
  temp_c: number | null;
  conditionText: string;
};

const cardClass =
  'rounded-[22px] border border-black/[0.035] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.05)]';

const formatCondition = (value: string) => {
  const raw = value.trim().toLowerCase();
  if (!raw) return 'Bewolkt';
  if (raw.includes('cloud')) return 'Bewolkt';
  if (raw.includes('sun') || raw.includes('clear')) return 'Zonnig';
  if (raw.includes('rain') || raw.includes('drizzle')) return 'Regen';
  if (raw.includes('snow')) return 'Sneeuw';
  return value;
};

const Home = () => {
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(DISPLAY_NAME);
  const [homeProfile, setHomeProfile] = useState<ProfileData | null>(null);
  const [hasCerts, setHasCerts] = useState(false);
  const [hasAvail, setHasAvail] = useState(false);
  const [city, setCity] = useState(CITY_LABEL);
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
          };
          live = {
            temp_c: data.temp_c,
            conditionText: data.condition?.text || '',
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
          navigate('/login', { replace: true });
          return;
        }

        const [profileRes, certsRes, availRes] = await Promise.all([
          supabase
            .from('profiles')
            .select(
              'full_name, city, phone, avatar_url, date_of_birth, specialization, specializations, bio, kvk_number, iban, preferred_language',
            )
            .eq('user_id', user.id)
            .single(),
          supabase.from('certificates').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('availability').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        ]);

        const p = profileRes.data;
        const fullName = p?.full_name?.trim();
        setDisplayName(fullName && fullName.length > 0 ? fullName : DISPLAY_NAME);
        setHasCerts((certsRes.count || 0) > 0);
        setHasAvail(false);
        setHomeProfile(p ? (p as ProfileData) : null);
        setCity(CITY_LABEL);

        void loadWeather();
      } catch (err) {
        console.error('Error loading home data:', err);
      }
    };

    void loadData();
  }, [navigate]);

  const completeness = useProfileCompleteness(homeProfile, hasCerts, hasAvail);
  const firstName = displayName.trim().split(/\s+/)[0] || DISPLAY_NAME;
  const profilePercent = PROFILE_PERCENT;
  const earnedPoints = REWARD_POINTS;
  const cityLabel = CITY_LABEL;
  const temperatureLabel = WEATHER_TEMP;
  const conditionLabel = WEATHER_CONDITION;
  const isAvailable = hasAvail;

  return (
    <div className="min-h-dvh bg-[#f3f3f5]">
      <div className="mx-auto w-full max-w-[430px] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+94px)] pt-11">
        <section className="space-y-2">
          <p className="text-center text-[15px] font-medium text-zinc-500">Alhan Groep</p>
          <h1 className="text-[42px] font-semibold leading-[1.06] tracking-[-0.02em] text-zinc-900">Welkom, {firstName}</h1>
          <p className="text-[17px] leading-[1.25] text-zinc-700">{`${cityLabel} • ${temperatureLabel}°C • ${conditionLabel}`}</p>
        </section>

        <section className={`${cardClass} mt-5 p-4`}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[18px] font-semibold leading-none tracking-[-0.015em] text-zinc-900">Profiel</h2>
            <p className="text-[17px] leading-none text-zinc-700">{profilePercent}% compleet</p>
          </div>
          <div className="h-[5px] overflow-hidden rounded-full bg-zinc-200">
            <div className="h-full rounded-full bg-[#B91C1C]" style={{ width: `${profilePercent}%` }} />
          </div>
          <p className="mt-3 text-[17px] leading-[1.3] tracking-[-0.005em] text-zinc-800">
            Werk je profiel bij om alles te ontgrendelen
          </p>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigate('/hours')}
            className={`${cardClass} flex h-[162px] flex-col p-4 text-left`}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="text-[17px] font-semibold leading-tight tracking-[-0.01em] text-zinc-900">Uren schrijven</h3>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
            </div>
            <div className="space-y-0.5">
              <p className="text-[14px] leading-tight text-zinc-700">Vorige week</p>
              <p className="text-[16px] leading-tight tracking-[-0.01em] text-zinc-800">40 uur gewerkt</p>
            </div>
          </button>

          <div className={`${cardClass} flex h-[162px] flex-col p-4 text-left`}>
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <h3 className="text-[17px] font-semibold leading-tight tracking-[-0.01em] text-zinc-900">Beschikbaar</h3>
                <span className={`mt-1 h-2.5 w-2.5 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-[#C0161E]'}`} />
              </div>
            </div>
            <p className={`text-[16px] leading-tight ${isAvailable ? 'font-medium text-zinc-900' : 'text-zinc-500'}`}>
              {isAvailable ? 'Je bent beschikbaar' : 'Je bent niet beschikbaar'}
            </p>
            <button
              type="button"
              role="switch"
              aria-checked={isAvailable}
              aria-label="Beschikbaarheid wijzigen"
              onClick={() => setHasAvail(v => !v)}
              className={`mt-auto self-end inline-flex h-7 w-12 items-center rounded-full p-0.5 transition-colors ${
                isAvailable ? 'bg-emerald-500' : 'bg-[#C0161E]'
              }`}
            >
              <span
                className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  isAvailable ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('/settings')}
            className={`${cardClass} flex h-[162px] flex-col p-4 text-left`}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="text-[17px] font-semibold leading-tight tracking-[-0.01em] text-zinc-900">Veilig werken</h3>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
            </div>
            <p className="text-[16px] leading-tight text-zinc-800">Vandaag nog afronden</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/leaderboard')}
            className={`${cardClass} flex h-[162px] flex-col p-4 text-left`}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="text-[17px] font-semibold leading-tight tracking-[-0.01em] text-zinc-900">Beloningen</h3>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
            </div>
            <div className="space-y-0.5">
              <p className="text-[16px] leading-tight text-zinc-800">{earnedPoints} punten •</p>
              <p className="text-[16px] leading-tight text-zinc-800">Scoor meer</p>
            </div>
          </button>
        </section>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('alhan-chat:open'))}
          className={`${cardClass} mt-5 w-full p-4 text-left`}
        >
          <h3 className="text-[17px] font-semibold leading-none tracking-[-0.01em] text-zinc-900">Slimme assistent</h3>
          <p className="mt-1 text-[16px] leading-tight text-zinc-800">Hulp nodig? Stel je vraag</p>
        </button>

        <section className="mt-6">
          <div className="h-px w-full bg-zinc-300/80" />
          <div className="space-y-0.5 py-3 text-center">
            <p className="text-[20px] font-medium leading-tight text-zinc-800">Volgende trekking: 25 maart</p>
            <p className="text-[14px] leading-tight text-zinc-500">Spaar punten en doe mee</p>
          </div>
        </section>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div className="mx-auto w-full max-w-[430px] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+9px)]">
          <nav className="pointer-events-auto rounded-[20px] border border-black/[0.05] bg-white/98 px-3 py-1.5 shadow-[0_-2px_10px_rgba(15,23,42,0.07)] backdrop-blur">
            <ul className="grid grid-cols-4">
              <li>
                <Link to="/" aria-current="page" className="flex flex-col items-center gap-0.5 py-1 text-zinc-900">
                  <HomeIcon className="h-5 w-5" />
                  <span className="text-[11px] font-medium">Home</span>
                </Link>
              </li>
              <li>
                <Link to="/hours" className="flex flex-col items-center gap-0.5 py-1 text-zinc-500">
                  <Clock3 className="h-5 w-5" />
                  <span className="text-[11px]">Uren</span>
                </Link>
              </li>
              <li>
                <Link to="/notifications" className="flex flex-col items-center gap-0.5 py-1 text-zinc-500">
                  <Bell className="h-5 w-5" />
                  <span className="text-[11px]">Meldingen</span>
                </Link>
              </li>
              <li>
                <Link to="/profile" className="flex flex-col items-center gap-0.5 py-1 text-zinc-500">
                  <User className="h-5 w-5" />
                  <span className="text-[11px]">Profiel</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Home;
