import { useEffect, useState } from 'react';
import { ChevronRight, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { DashboardDrawer } from '@/components/DashboardDrawer';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const DISPLAY_NAME = 'Yunus';
const CITY_LABEL = 'Rotterdam';
const WEATHER_TEMP = 12;
const WEATHER_CONDITION = 'Bewolkt';
const PROFILE_PERCENT = 35;
const AMSTERDAM = { lat: 52.3676, lon: 4.9041 };

type LiveWeather = {
  temp_c: number | null;
  conditionText: string;
};

const tileCard =
  'min-h-[144px] rounded-[18px] bg-white px-4 py-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)] flex flex-col';
const cardStd =
  'rounded-[18px] bg-white px-4 py-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)]';
const titleSm = 'text-[16px] leading-[22px] font-semibold text-[#1C1C1E]';
const subMd = 'mt-2 text-[14px] leading-[20px] text-[#3A3A3C]';
const chevron = 'h-4 w-4 shrink-0 text-[#8E8E93]';

const Home = () => {
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(DISPLAY_NAME);
  const [isAvailable, setIsAvailable] = useState(false);
  const [city, setCity] = useState(CITY_LABEL);
  const [weatherLive, setWeatherLive] = useState<LiveWeather | null>(null);
  const [weatherOffline, setWeatherOffline] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

        const [profileRes, , availRes] = await Promise.all([
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
        setIsAvailable((availRes.count ?? 0) > 0);
        setCity(CITY_LABEL);

        void loadWeather();
      } catch (err) {
        console.error('Error loading home data:', err);
      }
    };

    void loadData();
  }, [navigate]);

  const firstName = displayName.trim().split(/\s+/)[0] || '';
  const welcomeTitle = firstName ? `Welkom, ${firstName}` : 'Welkom';
  const profilePercent = PROFILE_PERCENT;
  const cityLabel = city;
  const temperatureLabel = weatherLive?.temp_c ?? WEATHER_TEMP;
  const conditionLabel = weatherOffline
    ? WEATHER_CONDITION
    : weatherLive?.conditionText
      ? weatherLive.conditionText
      : WEATHER_CONDITION;

  const workStatusLabel = isAvailable ? 'Beschikbaar voor werk' : 'Niet beschikbaar voor werk';
  const workStatusDotClass = isAvailable ? 'bg-green-600' : 'bg-red-600';
  const workStatusTextClass = isAvailable ? 'text-green-600' : 'text-red-600';

  return (
    <div className="min-h-dvh bg-[#F2F2F7]">
      <DashboardDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="mx-auto flex w-full max-w-[430px] flex-col gap-4 px-4 pb-28 pt-5">
        <header
          className="mb-2 flex h-11 items-center justify-between px-1"
          style={{ paddingTop: 'max(0px, env(safe-area-inset-top, 0px))' }}
        >
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#1C1C1E] transition-colors hover:bg-black/[0.04] active:bg-black/[0.06]"
            aria-label="Menu openen"
            aria-expanded={menuOpen}
            aria-controls="dashboard-drawer"
          >
            <Menu className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
          <div className="min-w-0 flex-1 px-2 text-center">
            <p className="text-[13px] font-medium leading-[18px] text-[#8E8E93]">Alhan Groep</p>
            <p className="text-[22px] font-semibold leading-[28px] tracking-[-0.02em] text-[#1C1C1E]">{welcomeTitle}</p>
            <p className="mt-1 flex items-center justify-center gap-1.5 px-1 text-[13px] leading-[18px] font-medium">
              <span
                className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${workStatusDotClass}`}
                aria-hidden
              />
              <span className={workStatusTextClass}>{workStatusLabel}</span>
            </p>
            <p className="mt-0.5 text-[13px] leading-[18px] text-[#8E8E93]">
              {`${cityLabel} • ${temperatureLabel}°C • ${conditionLabel}`}
            </p>
          </div>
          <div className="h-10 w-10 shrink-0 rounded-full" aria-hidden />
        </header>

        <section className={cardStd}>
          <div className="flex items-center justify-between">
            <h2 className={titleSm}>Profiel</h2>
            <p className="text-[13px] font-medium leading-[18px] text-[#636366]">{profilePercent}% compleet</p>
          </div>
          <div className="mt-3 w-full">
            <div className="h-1.5 w-full rounded-full bg-[#E5E5EA]">
              <div className="h-1.5 rounded-full bg-[#B91C1C]" style={{ width: `${profilePercent}%` }} />
            </div>
          </div>
          <p className="mt-3 text-[14px] leading-[20px] text-[#3A3A3C]">Vul je profiel aan voor volledige toegang</p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigate('/hours')}
            className={`${tileCard} text-left`}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className={titleSm}>Uren schrijven</h3>
              <ChevronRight className={`${chevron} mt-0.5`} aria-hidden />
            </div>
            <p className={subMd}>Afgelopen week: 40 uur</p>
          </button>

          <div className={cn(tileCard, 'min-w-0 gap-2 !p-4 text-left')}>
            <div className="flex min-w-0 items-start justify-between">
              <h3 className="min-w-0 flex-1 truncate pr-2 font-semibold text-sm text-[#1C1C1E]">Werkstatus</h3>
              <div className="shrink-0">
                <Switch
                  checked={isAvailable}
                  onCheckedChange={setIsAvailable}
                  aria-label="Werkstatus"
                  className={cn(
                    'data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600',
                  )}
                />
              </div>
            </div>
            <div className="flex min-w-0 items-start gap-2">
              <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${workStatusDotClass}`} aria-hidden />
              <p className={`min-w-0 flex-1 break-words text-sm font-medium ${workStatusTextClass}`}>
                {workStatusLabel}
              </p>
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={() => navigate('/safety')}
          className={`${cardStd} flex min-h-[116px] w-full flex-col text-left`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className={titleSm}>Veilig werken</h3>
              <p className={subMd}>Checklist nog niet afgerond</p>
            </div>
            <ChevronRight className={`${chevron} mt-0.5`} aria-hidden />
          </div>
        </button>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('alhan-chat:open'))}
          className={`${cardStd} flex min-h-[88px] w-full flex-col text-left`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className={titleSm}>Slimme assistent</h3>
              <p className="mt-1.5 text-[14px] leading-[20px] text-[#636366]">Stel je vraag</p>
            </div>
            <ChevronRight className={`${chevron} mt-0.5`} aria-hidden />
          </div>
        </button>

        <section className="border-t border-[#E5E5EA] pt-4 text-center">
          <p className="text-[14px] font-medium leading-[20px] text-[#1C1C1E]">Volgende trekking: 25 maart</p>
          <p className="mt-1 text-[12px] leading-[16px] text-[#8E8E93]">De prijzen blijven elke maand een verrassing</p>
        </section>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
