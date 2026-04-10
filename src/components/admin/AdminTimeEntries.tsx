import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Check, X, Loader2, Search, Clock, Banknote, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface TimeEntry {
  id: string;
  user_id: string;
  date: string;
  hours_worked: number;
  hourly_rate: number | null;
  total_earned: number | null;
  description: string | null;
  status: string;
  week_number: number | null;
  year: number | null;
  submitted_at: string | null;
  job_id: string | null;
}

interface GroupedWeek {
  key: string;
  week: number;
  year: number;
  userId: string;
  userName: string;
  entries: TimeEntry[];
  totalHours: number;
  totalEarned: number;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-warning/15 text-warning border-warning/30',
  approved: 'bg-success/15 text-success border-success/30',
  paid: 'bg-primary/15 text-primary border-primary/30',
};

const AdminTimeEntries = () => {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('submitted');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [entriesRes, profilesRes] = await Promise.all([
      supabase.from('time_entries').select('*').order('date', { ascending: false }),
      supabase.from('profiles').select('user_id, first_name, last_name'),
    ]);

    if (entriesRes.data) setEntries(entriesRes.data);
    if (profilesRes.data) {
      const map: Record<string, string> = {};
      profilesRes.data.forEach((p: any) => {
        map[p.user_id] = `${p.first_name || ''} ${p.last_name || ''}`.trim() || t('admin.unnamed');
      });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const grouped = useMemo(() => {
    const filtered = entries.filter(e => filterStatus === 'all' || e.status === filterStatus);
    const map = new Map<string, GroupedWeek>();

    filtered.forEach(entry => {
      const key = `${entry.user_id}-${entry.year}-${entry.week_number}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          week: entry.week_number || 0,
          year: entry.year || 0,
          userId: entry.user_id,
          userName: profiles[entry.user_id] || t('admin.unnamed'),
          entries: [],
          totalHours: 0,
          totalEarned: 0,
          status: entry.status,
        });
      }
      const group = map.get(key)!;
      group.entries.push(entry);
      group.totalHours += Number(entry.hours_worked) || 0;
      group.totalEarned += Number(entry.total_earned) || 0;
      // Use worst status
      if (entry.status === 'submitted' && group.status !== 'submitted') group.status = 'submitted';
    });

    const results = Array.from(map.values());
    if (search) {
      return results.filter(g => g.userName.toLowerCase().includes(search.toLowerCase()));
    }
    return results.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.week - a.week;
    });
  }, [entries, profiles, filterStatus, search]);

  const counts = useMemo(() => ({
    submitted: entries.filter(e => e.status === 'submitted').length,
    approved: entries.filter(e => e.status === 'approved').length,
    paid: entries.filter(e => e.status === 'paid').length,
  }), [entries]);

  const updateWeekStatus = async (group: GroupedWeek, newStatus: string) => {
    setUpdating(group.key);
    try {
      const ids = group.entries.map(e => e.id);
      const updateData: any = { status: newStatus };
      if (newStatus === 'approved') {
        updateData.approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('time_entries')
        .update(updateData)
        .in('id', ids);

      if (error) throw error;

      setEntries(prev => prev.map(e =>
        ids.includes(e.id) ? { ...e, ...updateData } : e
      ));
      toast.success(t('admin.statusUpdated'));
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: t('admin.hours_submitted'), value: counts.submitted, color: 'text-warning' },
          { label: t('admin.hours_approved'), value: counts.approved, color: 'text-success' },
          { label: t('admin.hours_paid'), value: counts.paid, color: 'text-primary' },
        ].map(stat => (
          <div key={stat.label} className="glass-card rounded-xl p-3 text-center">
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('admin.searchPlaceholder')} className="pl-9 bg-card" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="bg-card w-36 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.allStatuses')}</SelectItem>
            <SelectItem value="submitted">{t('hours.status_submitted')}</SelectItem>
            <SelectItem value="approved">{t('hours.status_approved')}</SelectItem>
            <SelectItem value="paid">{t('hours.status_paid')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grouped entries */}
      {grouped.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {t('common.noResults')}
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(group => {
            const isExpanded = expandedWeek === group.key;
            return (
              <div key={group.key} className="glass-card rounded-xl overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setExpandedWeek(isExpanded ? null : group.key)}
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{group.userName}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('hours.week')} {group.week}, {group.year} • {group.entries.length} {t('admin.entries')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">{group.totalHours}h</p>
                    <p className="text-xs text-muted-foreground">€{group.totalEarned.toFixed(2)}</p>
                  </div>
                  <Badge variant="outline" className={cn('text-xs border shrink-0', STATUS_COLORS[group.status] || '')}>
                    {t(`hours.status_${group.status}`)}
                  </Badge>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border px-4 pb-4">
                    <div className="space-y-2 pt-3">
                      {group.entries.map(entry => (
                        <div key={entry.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-border/50 last:border-0">
                          <span className="text-muted-foreground w-20 shrink-0">
                            {format(new Date(entry.date), 'EEE dd/MM', { locale: nl })}
                          </span>
                          <span className="flex-1 truncate text-foreground">{entry.description || '—'}</span>
                          <span className="font-medium shrink-0">{entry.hours_worked}h</span>
                          <span className="text-muted-foreground shrink-0">€{(Number(entry.total_earned) || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action buttons */}
                    {group.status === 'submitted' && (
                      <div className="flex gap-2 pt-3">
                        <Button
                          className="flex-1"
                          size="sm"
                          disabled={updating === group.key}
                          onClick={() => updateWeekStatus(group, 'approved')}
                        >
                          {updating === group.key ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                          {t('admin.approve')}
                        </Button>
                        <Button
                          className="flex-1"
                          size="sm"
                          variant="destructive"
                          disabled={updating === group.key}
                          onClick={() => updateWeekStatus(group, 'draft')}
                        >
                          <X className="w-4 h-4 mr-1" />
                          {t('admin.reject')}
                        </Button>
                      </div>
                    )}
                    {group.status === 'approved' && (
                      <div className="pt-3">
                        <Button
                          className="w-full"
                          size="sm"
                          variant="outline"
                          disabled={updating === group.key}
                          onClick={() => updateWeekStatus(group, 'paid')}
                        >
                          {updating === group.key ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Banknote className="w-4 h-4 mr-1" />}
                          {t('admin.markPaid')}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminTimeEntries;
