import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Trash2, Clock, Euro, Loader2, CalendarIcon, ChevronLeft, ChevronRight, Send, FileText } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, getISOWeek, getYear, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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

interface ActiveJob {
  id: string;
  title: string;
  hourly_rate: number | null;
}

const TimeRegistration = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [allEntries, setAllEntries] = useState<TimeEntry[]>([]);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [saving, setSaving] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [hours, setHours] = useState(8);
  const [selectedJob, setSelectedJob] = useState<string>('none');
  const [rate, setRate] = useState(25);
  const [description, setDescription] = useState('');

  const now = new Date();
  const weekStart = startOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 1 });
  const weekNum = getISOWeek(weekStart);
  const yearNum = getYear(weekStart);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startStr = format(weekStart, 'yyyy-MM-dd');
      const endStr = format(weekEnd, 'yyyy-MM-dd');

      const [entriesRes, allRes, jobsRes, profileRes] = await Promise.all([
        supabase.from('time_entries').select('*').eq('user_id', user.id)
          .gte('date', startStr).lte('date', endStr).order('date'),
        supabase.from('time_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('job_applications').select('job_id, jobs(id, title, hourly_rate)')
          .eq('user_id', user.id).eq('status', 'accepted'),
        supabase.from('profiles').select('hourly_rate').eq('user_id', user.id).single(),
      ]);

      setEntries((entriesRes.data as any) || []);
      setAllEntries((allRes.data as any) || []);

      const jobs: ActiveJob[] = (jobsRes.data || [])
        .filter((a: any) => a.jobs)
        .map((a: any) => ({
          id: a.jobs.id,
          title: a.jobs.title,
          hourly_rate: a.jobs.hourly_rate ? Number(a.jobs.hourly_rate) : null,
        }));
      setActiveJobs(jobs);

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
        description: description || null,
        job_id: selectedJob !== 'none' ? selectedJob : null,
        week_number: wn,
        year: yr,
        status: 'draft',
      });

      if (error) throw error;
      toast.success(t('hours.entry_added'));
      setDescription('');
      if (navigator.vibrate) navigator.vibrate(50);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('time_entries').delete().eq('id', id);
      if (error) throw error;
      toast.success(t('common.delete'));
      if (navigator.vibrate) navigator.vibrate(30);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
    }
  };

  const handleSubmitWeek = async () => {
    setSubmitting(true);
    try {
      const draftIds = entries.filter(e => e.status === 'draft').map(e => e.id);
      if (draftIds.length === 0) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (const id of draftIds) {
        await supabase.from('time_entries').update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        }).eq('id', id);
      }

      toast.success(t('hours.week_submitted'));
      setConfirmSubmit(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const weekTotal = entries.reduce((sum, e) => sum + Number(e.hours_worked), 0);
  const weekEarned = entries.reduce((sum, e) => sum + (Number(e.total_earned) || 0), 0);
  const hasDraftEntries = entries.some(e => e.status === 'draft');
  const weekStatus = entries.length === 0 ? null :
    entries.every(e => e.status === 'paid') ? 'paid' :
    entries.every(e => e.status === 'approved' || e.status === 'paid') ? 'approved' :
    entries.some(e => e.status === 'submitted') ? 'submitted' : 'draft';

  // Chart data
  const chartData = weekDays.map(day => {
    const dayEntries = entries.filter(e => isSameDay(parseISO(e.date), day));
    return {
      day: format(day, 'EEE', { locale: nl }),
      hours: dayEntries.reduce((s, e) => s + Number(e.hours_worked), 0),
    };
  });

  // All-time stats
  const totalHoursAll = allEntries.reduce((s, e) => s + Number(e.hours_worked), 0);
  const totalEarnedAll = allEntries.reduce((s, e) => s + (Number(e.total_earned) || 0), 0);
  const avgRate = totalHoursAll > 0 ? totalEarnedAll / totalHoursAll : 0;

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; class: string }> = {
      draft: { label: t('hours.status_draft'), class: 'bg-muted text-muted-foreground' },
      submitted: { label: t('hours.status_submitted'), class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
      approved: { label: t('hours.status_approved'), class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
      paid: { label: t('hours.status_paid'), class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    };
    const s = map[status] || map.draft;
    return <Badge className={`${s.class} border-0 text-xs`}>{s.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="py-5 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-5 space-y-4 pb-24">
      <h1 className="text-2xl font-bold text-foreground">{t('hours.title')}</h1>

      {/* Week selector */}
      <div className="flex items-center justify-between glass-card rounded-2xl p-4">
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset(o => o - 1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <p className="font-semibold text-foreground">{t('hours.week')} {weekNum}</p>
          <p className="text-xs text-muted-foreground">
            {format(weekStart, 'dd MMM')} - {format(weekEnd, 'dd MMM yyyy')}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset(o => o + 1)} disabled={weekOffset >= 0}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-2xl p-4 text-center">
          <Clock className="w-5 h-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{weekTotal}</p>
          <p className="text-xs text-muted-foreground">{t('hours.hours_worked')}</p>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <Euro className="w-5 h-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">€{weekEarned.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">{t('hours.total_earned')}</p>
        </div>
      </div>

      <Tabs defaultValue="entry" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="entry">{t('hours.add_entry')}</TabsTrigger>
          <TabsTrigger value="overview">{t('hours.overview')}</TabsTrigger>
          <TabsTrigger value="status">{t('hours.status')}</TabsTrigger>
        </TabsList>

        {/* Tab 1: Uren Invoeren */}
        <TabsContent value="entry" className="space-y-4 mt-4">
          <div className="glass-card rounded-2xl p-4 space-y-4">
            <h3 className="font-semibold text-foreground">{t('hours.new_entry')}</h3>

            {/* Date */}
            <div className="space-y-1.5">
              <Label>{t('hours.date')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal bg-card">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(entryDate, 'EEEE dd MMMM', { locale: nl })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={entryDate} onSelect={(d) => d && setEntryDate(d)} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            {/* Job selector */}
            {activeJobs.length > 0 && (
              <div className="space-y-1.5">
                <Label>{t('hours.project')}</Label>
                <Select value={selectedJob} onValueChange={(v) => {
                  setSelectedJob(v);
                  const job = activeJobs.find(j => j.id === v);
                  if (job?.hourly_rate) setRate(job.hourly_rate);
                }}>
                  <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {activeJobs.map(j => (
                      <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Hours with +/- */}
            <div className="space-y-1.5">
              <Label>{t('hours.hours_worked')}</Label>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => setHours(h => Math.max(0.5, h - 0.5))} type="button">
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  type="number"
                  value={hours}
                  onChange={e => setHours(Math.max(0.5, Math.min(24, Number(e.target.value))))}
                  className="text-center text-lg font-bold bg-card"
                  step={0.5}
                  min={0.5}
                  max={24}
                />
                <Button variant="outline" size="icon" onClick={() => setHours(h => Math.min(24, h + 0.5))} type="button">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Rate */}
            <div className="space-y-1.5">
              <Label>{t('hours.hourly_rate')}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                <Input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} className="pl-7 bg-card" step={0.5} min={0} />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>{t('hours.description')}</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-card min-h-[60px]" placeholder={t('hours.description_placeholder')} />
            </div>

            {/* Calculated total */}
            <div className="bg-accent/50 rounded-xl p-3 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('hours.total_earned')}</span>
              <span className="text-lg font-bold text-primary">€{(hours * rate).toFixed(2)}</span>
            </div>

            <Button onClick={handleAddEntry} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {t('hours.add_entry')}
            </Button>
          </div>

          {/* Week entries */}
          {entries.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 flex flex-col items-center text-center">
              <Clock className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm">{t('hours.no_entries_yet')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {weekDays.map(day => {
                const dayEntries = entries.filter(e => isSameDay(parseISO(e.date), day));
                if (dayEntries.length === 0) return null;
                const dayTotal = dayEntries.reduce((s, e) => s + Number(e.hours_worked), 0);
                return (
                  <div key={day.toISOString()} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-semibold text-foreground">{format(day, 'EEEE dd MMM', { locale: nl })}</h4>
                      <span className="text-xs text-muted-foreground">{dayTotal}h</span>
                    </div>
                    {dayEntries.map((entry, i) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="glass-card rounded-xl p-3 flex items-center justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{Number(entry.hours_worked)}h</span>
                            <span className="text-xs text-muted-foreground">× €{Number(entry.hourly_rate || 0)}</span>
                            <span className="text-sm font-medium text-primary">= €{Number(entry.total_earned || 0).toFixed(0)}</span>
                          </div>
                          {entry.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.description}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          {statusBadge(entry.status)}
                          {entry.status === 'draft' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(entry.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                );
              })}

              <Separator />
              <div className="flex justify-between items-center px-1">
                <span className="font-semibold text-foreground">{t('hours.week_total')}</span>
                <div className="text-right">
                  <span className="font-bold text-foreground">{weekTotal}h</span>
                  <span className="text-sm text-primary ml-2">€{weekEarned.toFixed(0)}</span>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Overzicht */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="glass-card rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-foreground">{totalHoursAll}</p>
              <p className="text-[10px] text-muted-foreground">{t('hours.total_hours')}</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-foreground">€{totalEarnedAll.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">{t('hours.total_earned')}</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-foreground">€{avgRate.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">{t('hours.avg_rate')}</p>
            </div>
          </div>

          {/* Bar chart */}
          <div className="glass-card rounded-2xl p-4">
            <h3 className="font-semibold text-foreground mb-3">{t('hours.week')} {weekNum}</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Tab 3: Status */}
        <TabsContent value="status" className="space-y-4 mt-4">
          {/* Submit button */}
          {hasDraftEntries && (
            <Button onClick={() => setConfirmSubmit(true)} className="w-full">
              <Send className="w-4 h-4 mr-2" />
              {t('hours.submit_week')}
            </Button>
          )}

          {/* Status timeline */}
          {weekStatus && (
            <div className="glass-card rounded-2xl p-4 space-y-3">
              <h3 className="font-semibold text-foreground">{t('hours.week')} {weekNum} — {t('hours.status')}</h3>
              {['draft', 'submitted', 'approved', 'paid'].map((s, i) => {
                const icons = ['✏️', '📤', '✅', '💰'];
                const labels = [t('hours.status_draft'), t('hours.status_submitted'), t('hours.status_approved'), t('hours.status_paid')];
                const statusOrder = { draft: 0, submitted: 1, approved: 2, paid: 3 };
                const current = statusOrder[weekStatus as keyof typeof statusOrder] ?? 0;
                const isActive = i <= current;
                return (
                  <div key={s} className={`flex items-center gap-3 ${isActive ? 'opacity-100' : 'opacity-30'}`}>
                    <span className="text-lg">{icons[i]}</span>
                    <span className={`text-sm ${isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{labels[i]}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Paid weeks */}
          {(() => {
            const paidEntries = allEntries.filter(e => e.status === 'paid');
            const totalPaid = paidEntries.reduce((s, e) => s + (Number(e.total_earned) || 0), 0);
            if (paidEntries.length === 0) return null;
            return (
              <div className="glass-card rounded-2xl p-4">
                <h3 className="font-semibold text-foreground mb-2">{t('hours.payment_history')}</h3>
                <p className="text-2xl font-bold text-primary">€{totalPaid.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">{t('hours.total_paid')}</p>
              </div>
            );
          })()}

          {entries.length === 0 && !weekStatus && (
            <div className="glass-card rounded-2xl p-8 flex flex-col items-center text-center">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm">{t('hours.no_entries_yet')}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirm Submit Dialog */}
      <Dialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('hours.submit_week')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t('hours.submit_confirm')}</p>
            <div className="bg-accent/50 rounded-xl p-3">
              <p className="text-sm"><strong>{t('hours.week')} {weekNum}:</strong> {weekTotal}h — €{weekEarned.toFixed(0)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSubmit(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmitWeek} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {t('hours.submit_week')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default TimeRegistration;
