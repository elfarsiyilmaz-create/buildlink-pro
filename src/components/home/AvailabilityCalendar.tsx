import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Calendar, Sun, Sunset, Moon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type DayPart = 'morning' | 'afternoon' | 'evening';
type AvailabilityMap = Record<string, Record<DayPart, boolean>>;

const AvailabilityCalendar = () => {
  const { t } = useTranslation();
  const [availability, setAvailability] = useState<AvailabilityMap>({});
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  const dayParts: { key: DayPart; icon: typeof Sun; label: string }[] = [
    { key: 'morning', icon: Sun, label: t('calendar.morning', 'Ochtend') },
    { key: 'afternoon', icon: Sunset, label: t('calendar.afternoon', 'Middag') },
    { key: 'evening', icon: Moon, label: t('calendar.evening', 'Avond') },
  ];

  const formatDateKey = (d: Date) => d.toISOString().split('T')[0];
  const formatDayName = (d: Date) => d.toLocaleDateString('nl-NL', { weekday: 'short' });
  const formatDayNum = (d: Date) => d.getDate();

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const startDate = formatDateKey(weekDays[0]);
    const endDate = formatDateKey(weekDays[6]);

    const { data } = await supabase
      .from('availability')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate);

    const map: AvailabilityMap = {};
    data?.forEach(row => {
      if (!map[row.date]) map[row.date] = { morning: false, afternoon: false, evening: false };
      map[row.date][row.day_part as DayPart] = row.is_available;
    });
    setAvailability(map);
    setLoading(false);
  };

  const toggleSlot = async (date: Date, part: DayPart) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dateKey = formatDateKey(date);
    const current = availability[dateKey]?.[part] || false;
    const newVal = !current;

    setAvailability(prev => ({
      ...prev,
      [dateKey]: { ...prev[dateKey], morning: prev[dateKey]?.morning || false, afternoon: prev[dateKey]?.afternoon || false, evening: prev[dateKey]?.evening || false, [part]: newVal },
    }));

    const { error } = await supabase
      .from('availability')
      .upsert({
        user_id: user.id,
        date: dateKey,
        day_part: part,
        is_available: newVal,
      }, { onConflict: 'user_id,date,day_part' });

    if (error) {
      toast.error(t('common.error'));
      setAvailability(prev => ({
        ...prev,
        [dateKey]: { ...prev[dateKey], [part]: current },
      }));
    }
  };

  if (loading) return <div className="glass-card rounded-2xl p-4 animate-pulse h-40" />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground text-sm">{t('calendar.title', 'Beschikbaarheid deze week')}</h3>
      </div>

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-center text-xs">
          <thead>
            <tr>
              <th className="w-8" />
              {weekDays.map(d => (
                <th key={formatDateKey(d)} className="pb-2 px-1">
                  <span className="text-muted-foreground uppercase text-[10px]">{formatDayName(d)}</span>
                  <br />
                  <span className={`font-bold text-sm ${formatDateKey(d) === formatDateKey(today) ? 'text-primary' : 'text-foreground'}`}>
                    {formatDayNum(d)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dayParts.map(({ key, icon: Icon }) => (
              <tr key={key}>
                <td className="pr-1 py-1">
                  <Icon className="w-3.5 h-3.5 text-foreground/70" aria-hidden />
                </td>
                {weekDays.map(d => {
                  const dateKey = formatDateKey(d);
                  const isAvail = availability[dateKey]?.[key] || false;
                  return (
                    <td key={dateKey} className="px-0.5 py-1">
                      <button
                        type="button"
                        onClick={() => toggleSlot(d, key)}
                        className={`w-8 h-8 rounded-lg transition-all duration-200 ${
                          isAvail
                            ? 'bg-success text-success-foreground shadow-sm scale-105'
                            : 'bg-muted text-foreground/75 hover:bg-muted/80'
                        }`}
                        aria-label={`${formatDayName(d)} ${formatDayNum(d)} ${dayParts.find(p => p.key === key)?.label ?? key}: ${isAvail ? t('home.available') : t('home.unavailable')}`}
                        aria-pressed={isAvail}
                      >
                        {isAvail ? '✓' : ''}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default AvailabilityCalendar;
