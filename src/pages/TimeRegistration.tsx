import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock3, Euro, CalendarDays, Minus, Plus, FileText } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, getISOWeek, getYear } from 'date-fns';
import { nl } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';

interface TimeEntry {
  id: string;
  date: string;
  hours_worked: number;
  hourly_rate: number | null;
  total_earned: number | null;
  description: string | null;
  status: string;
  job_id: string | null;
  week_number: number | null;
  year: number | null;
  submitted_at: string | null;
}

const TimeRegistration = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'entry' | 'overview' | 'status'>('entry');
  const [weekOffset, setWeekOffset] = useState(0);
  const [saving, setSaving] = useState(false);

  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [hours, setHours] = useState(8);
  const [rate, setRate] = useState(25);
  const [description, setDescription] = useState('');

  const now = new Date();
  const weekStart = startOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 1 });
  const weekNum = getISOWeek(weekStart);
  const yearNum = getYear(weekStart);
  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startStr = format(weekStart, 'yyyy-MM-dd');
      const endStr = format(weekEnd, 'yyyy-MM-dd');

      const [entriesRes, profileRes] = await Promise.all([
        supabase.from('time_entries').select('*').eq('user_id', user.id)
          .gte('date', startStr).lte('date', endStr).order('date'),
        supabase.from('profiles').select('hourly_rate').eq('user_id', user.id).single(),
      ]);

      setEntries((entriesRes.data as any) || []);

      if (profileRes.data?.hourly_rate) {
        setRate(Number(profileRes.data.hourly_rate));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [weekOffset]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddEntry = async () => {
    if (hours <= 0) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const d = format(entryDate, 'yyyy-MM-dd');
      const wn = getISOWeek(entryDate);
      const yr = getYear(entryDate);

      const { error } = await supabase.from('time_entries').insert({
        user_id: user.id,
        date: d,
        hours_worked: hours,
        hourly_rate: rate,
        total_earned: hours * rate,
        description: description || null,
        job_id: null,
        week_number: wn,
        year: yr,
        status: 'draft',
      });

      if (error) throw error;
      toast.success('Uren ingevoerd');
      setDescription('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Er ging iets mis');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('time_entries').delete().eq('id', id);
      if (error) throw error;
      toast.success('Uren verwijderd');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Er ging iets mis');
    }
  };

  const weekTotal = entries.reduce((sum, e) => sum + Number(e.hours_worked), 0);
  const weekEarned = entries.reduce((sum, e) => sum + (Number(e.total_earned) || 0), 0);
  const totalLine = useMemo(() => (hours * rate).toFixed(2), [hours, rate]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f3f3f5]">
        <Clock3 className="h-7 w-7 animate-pulse text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#f3f3f5]">
      <div className="mx-auto w-full max-w-[430px] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+120px)] pt-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-1 text-[17px] text-[#B91C1C]"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Terug</span>
        </button>

        <h1 className="mb-4 text-[47px] font-semibold leading-none tracking-[-0.02em] text-zinc-900">Urenregistratie</h1>

        <div className="rounded-[18px] border border-black/[0.035] bg-white px-3 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setWeekOffset(o => o - 1)} className="rounded-md p-1.5 text-zinc-600">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <p className="text-[20px] font-semibold text-zinc-900">Week {weekNum}</p>
              <p className="text-[13px] text-zinc-500">
                {format(weekStart, 'dd MMM', { locale: nl })} - {format(weekEnd, 'dd MMM yyyy', { locale: nl })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setWeekOffset(o => o + 1)}
              disabled={weekOffset >= 0}
              className="rounded-md p-1.5 text-zinc-600 disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-3">
          <div className="rounded-[18px] border border-black/[0.035] bg-white p-4 text-center shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
            <Clock3 className="mx-auto h-6 w-6 text-[#C0161E]" />
            <p className="mt-1 text-[22px] font-bold text-zinc-900">{weekTotal}</p>
            <p className="text-[13px] text-zinc-600">Gewerkte uren</p>
          </div>
          <div className="rounded-[18px] border border-black/[0.035] bg-white p-4 text-center shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
            <Euro className="mx-auto h-6 w-6 text-[#C0161E]" />
            <p className="mt-1 text-[22px] font-bold text-zinc-900">€{weekEarned.toFixed(0)}</p>
            <p className="text-[13px] text-zinc-600">Totaal verdiend</p>
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-3 gap-2 rounded-full bg-zinc-100 p-1">
          {[
            { id: 'entry', label: 'Uren invoeren' },
            { id: 'overview', label: 'Overzicht' },
            { id: 'status', label: 'Status' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as 'entry' | 'overview' | 'status')}
              className={`rounded-full py-2 text-[13px] font-medium ${
                activeTab === tab.id ? 'bg-white text-zinc-900 shadow-sm font-semibold' : 'text-zinc-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'entry' ? (
          <div className="mt-3.5 space-y-3.5">
            <section className="rounded-[18px] border border-black/[0.04] bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
              <h2 className="mb-2.5 text-[31px] font-semibold leading-none text-zinc-900">Nieuwe registratie</h2>

              <div className="mb-3">
                <p className="mb-1 text-[12px] font-medium text-zinc-700">Datum</p>
                <div className="flex h-11 items-center gap-2 rounded-[10px] border border-zinc-200 px-3">
                  <CalendarDays className="h-4 w-4 text-zinc-500" />
                  <input
                    type="date"
                    value={format(entryDate, 'yyyy-MM-dd')}
                    onChange={e => setEntryDate(new Date(e.target.value))}
                    className="w-full bg-transparent text-[16px] text-zinc-900 outline-none"
                  />
                </div>
              </div>

              <div className="mb-3">
                <p className="mb-1 text-[12px] font-medium text-zinc-700">Gewerkte uren</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHours(h => Math.max(0.5, h - 0.5))}
                    className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-zinc-200 bg-zinc-50"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <Input
                    type="number"
                    value={hours}
                    onChange={e => setHours(Math.max(0.5, Math.min(24, Number(e.target.value))))}
                    step={0.5}
                    min={0.5}
                    max={24}
                    className="h-11 text-center text-[18px] font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setHours(h => Math.min(24, h + 0.5))}
                    className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-zinc-200 bg-zinc-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <p className="mb-1 text-[12px] font-medium text-zinc-700">Uurtarief</p>
                <Input
                  type="number"
                  value={rate}
                  onChange={e => setRate(Number(e.target.value))}
                  className="h-11"
                  min={0}
                />
              </div>

              <div className="mb-3">
                <p className="mb-1 text-[12px] font-medium text-zinc-700">Omschrijving</p>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Wat heb je gedaan?"
                  className="min-h-[72px]"
                />
              </div>

              <div className="mb-3 flex items-center justify-between rounded-[10px] bg-zinc-100 px-3 py-2.5">
                <p className="text-[14px] text-zinc-600">Totaal verdiend</p>
                <p className="text-[20px] font-bold text-[#C0161E]">€{totalLine}</p>
              </div>

              <button
                type="button"
                onClick={handleAddEntry}
                disabled={saving}
                className="h-[46px] w-full rounded-[12px] bg-[#C0161E] text-[18px] font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Opslaan...' : '+ Uren invoeren'}
              </button>
            </section>

            <section className="rounded-[18px] border border-black/[0.04] bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
              {entries.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-zinc-500">
                  <Clock3 className="h-8 w-8" />
                  <p className="mt-2 text-[14px]">Nog geen uren geregistreerd</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {entries.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between rounded-[10px] bg-zinc-50 px-3 py-2">
                      <div>
                        <p className="text-[14px] font-medium text-zinc-900">{entry.date}</p>
                        <p className="text-[13px] text-zinc-600">
                          {entry.hours_worked} uur - EUR{Number(entry.total_earned || 0).toFixed(2)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        className="rounded-md px-2 py-1 text-[12px] text-[#C0161E]"
                      >
                        Verwijder
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}

        {activeTab === 'overview' ? (
          <section className="mt-4 rounded-[18px] border border-black/[0.04] bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-[12px] bg-zinc-50 p-3 text-center">
                <p className="text-[23px] font-bold text-zinc-900">{weekTotal}</p>
                <p className="text-[11px] text-zinc-500">Totaal uren</p>
              </div>
              <div className="rounded-[12px] bg-zinc-50 p-3 text-center">
                <p className="text-[23px] font-bold text-zinc-900">€{weekEarned.toFixed(0)}</p>
                <p className="text-[11px] text-zinc-500">Totaal verdiend</p>
              </div>
              <div className="rounded-[12px] bg-zinc-50 p-3 text-center">
                <p className="text-[23px] font-bold text-zinc-900">€{rate.toFixed(0)}</p>
                <p className="text-[11px] text-zinc-500">Gem. tarief</p>
              </div>
            </div>
            <div className="mt-3 rounded-[12px] bg-zinc-50 p-4 text-center text-[14px] text-zinc-500">
              Weekoverzicht komt hier
            </div>
          </section>
        ) : null}

        {activeTab === 'status' ? (
          <section className="mt-4 rounded-[18px] border border-black/[0.04] bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col items-center py-8 text-zinc-500">
              <FileText className="h-8 w-8" />
              <p className="mt-2 text-[14px]">Nog geen uren geregistreerd</p>
            </div>
          </section>
        ) : null}
      </div>

      <BottomNav />
    </div>
  );
};

export default TimeRegistration;
