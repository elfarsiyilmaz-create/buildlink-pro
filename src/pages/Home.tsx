import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Clock, CalendarDays, Cloud, Thermometer, FileCheck, Car, MapPin, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AvailabilityCalendar from '@/components/home/AvailabilityCalendar';
import DailyChallenges from '@/components/home/DailyChallenges';
import PersonalDashboard from '@/components/home/PersonalDashboard';
import AchievementUnlock from '@/components/home/AchievementUnlock';

const Home = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [time, setTime] = useState(new Date());
  const [available, setAvailable] = useState(false);
  const [weather, setWeather] = useState<{ temp: number; description: string } | null>(null);
  const [userName, setUserName] = useState("ZZP'er");
  const [profilePercentage, setProfilePercentage] = useState(0);
  const [stats, setStats] = useState({ documents: 0, referrals: 0, city: '--' });

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Load real profile data
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [profileRes, certsRes, referralsRes] = await Promise.all([
          supabase.from('profiles').select('first_name, last_name, profile_completeness, city').eq('user_id', user.id).single(),
          supabase.from('certificates').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('referral_invites').select('id', { count: 'exact', head: true }).eq('referrer_id', user.id),
        ]);

        if (profileRes.data) {
          const p = profileRes.data;
          const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || "ZZP'er";
          setUserName(name);
          setProfilePercentage(p.profile_completeness || 0);
          setStats({
            documents: certsRes.count || 0,
            referrals: referralsRes.count || 0,
            city: p.city || '--',
          });
        }
      } catch (err) {
        console.error('Error loading home data:', err);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=temperature_2m,weather_code`
          );
          const data = await res.json();
          const code = data.current?.weather_code || 0;
          const descriptions: Record<number, string> = {
            0: '☀️ Helder', 1: '🌤️ Licht bewolkt', 2: '⛅ Half bewolkt', 3: '☁️ Bewolkt',
            45: '🌫️ Mist', 51: '🌧️ Lichte regen', 61: '🌧️ Regen', 71: '🌨️ Sneeuw',
            80: '🌦️ Buien', 95: '⛈️ Onweer',
          };
          setWeather({
            temp: Math.round(data.current?.temperature_2m || 0),
            description: descriptions[code] || '🌤️ Wisselend',
          });
        } catch {
          setWeather({ temp: 14, description: '🌤️ Wisselend' });
        }
      },
      () => setWeather({ temp: 14, description: '🌤️ Wisselend' })
    );
  }, []);

  const formatDate = () => {
    return time.toLocaleDateString('nl-NL', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

  return (
    <div className="space-y-5 py-5 pb-24">
      {/* Achievement unlock toast */}
      <AchievementUnlock />

      {/* Welcome Header */}
      <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
        <h1 className="text-2xl font-bold text-foreground">{t('home.welcome', { name: userName })}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('home.subtitle')}</p>
      </motion.div>

      {/* Widget Grid */}
      <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-2xl p-4">
          <Clock className="w-5 h-5 text-primary mb-2" />
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {time.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Tijd</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <CalendarDays className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm font-semibold text-foreground capitalize">{formatDate()}</p>
          <p className="text-xs text-muted-foreground mt-1">Datum</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <Cloud className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm font-semibold text-foreground">{weather?.description || '...'}</p>
          <p className="text-xs text-muted-foreground mt-1">Weer</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <Thermometer className="w-5 h-5 text-primary mb-2" />
          <p className="text-2xl font-bold text-foreground">{weather?.temp ?? '--'}°C</p>
          <p className="text-xs text-muted-foreground mt-1">Temperatuur</p>
        </div>
      </motion.div>

      {/* Availability Toggle */}
      <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
        <button
          onClick={() => setAvailable(!available)}
          className={`w-full rounded-2xl p-5 flex items-center justify-between transition-all duration-300 ${
            available ? 'bg-success text-success-foreground pulse-green' : 'bg-destructive text-destructive-foreground'
          }`}
        >
          <span className="font-bold text-lg">{available ? t('home.available') : t('home.unavailable')}</span>
          <div className={`w-14 h-8 rounded-full relative transition-colors duration-300 ${available ? 'bg-white/30' : 'bg-white/20'}`}>
            <motion.div layout className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-md" style={{ left: available ? 'calc(100% - 28px)' : '4px' }} />
          </div>
        </button>
      </motion.div>

      {/* Availability Calendar */}
      <motion.div {...fadeUp} transition={{ delay: 0.35 }}>
        <AvailabilityCalendar />
      </motion.div>

      {/* Personal Dashboard */}
      <motion.div {...fadeUp} transition={{ delay: 0.4 }}>
        <PersonalDashboard />
      </motion.div>

      {/* Daily Challenges */}
      <motion.div {...fadeUp} transition={{ delay: 0.45 }}>
        <DailyChallenges />
      </motion.div>

      {/* Profile Completeness */}
      <motion.div {...fadeUp} transition={{ delay: 0.5 }} className="glass-card rounded-2xl p-4 cursor-pointer" onClick={() => navigate('/profile')}>
        <p className="text-sm font-medium text-foreground mb-2">{t('home.profileComplete', { percentage: profilePercentage })}</p>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${profilePercentage}%` }} transition={{ duration: 1, delay: 0.6 }} className="h-full gradient-primary rounded-full" />
        </div>
      </motion.div>

      {/* Quick Stats */}
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

      {/* Wheel of Fortune Link */}
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
