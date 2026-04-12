import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Search, Filter, Check, X, User, Loader2, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn, initialsFromFullName } from '@/lib/utils';

interface ProfileRow {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  date_of_birth: string | null;
  kvk_number: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  specialization: string | null;
  hourly_rate: number | null;
  preferred_language: string | null;
  avatar_url: string | null;
  status: string;
  created_at: string;
}

const SPECIALIZATIONS = [
  'Grondwerker', 'Timmerman', 'Stratenmaker', 'Lasser', 'Machinist',
  'Kraanmachinist', 'Hovenier', 'Schilder', 'Elektricien', 'Loodgieter', 'Overig',
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/15 text-warning border-warning/30',
  approved: 'bg-success/15 text-success border-success/30',
  rejected: 'bg-destructive/15 text-destructive border-destructive/30',
};

const AdminZZPers = () => {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSpec, setFilterSpec] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedProfile, setSelectedProfile] = useState<ProfileRow | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      toast.error(t('common.error'));
    } else {
      setProfiles((data as ProfileRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchProfiles(); }, []);

  const filtered = useMemo(() => {
    return profiles.filter(p => {
      const name = (p.full_name || '').toLowerCase();
      const matchSearch = !search || name.includes(search.toLowerCase());
      const matchSpec = filterSpec === 'all' || p.specialization === filterSpec;
      const matchStatus = filterStatus === 'all' || p.status === filterStatus;
      return matchSearch && matchSpec && matchStatus;
    });
  }, [profiles, search, filterSpec, filterStatus]);

  const counts = useMemo(() => ({
    total: profiles.length,
    pending: profiles.filter(p => p.status === 'pending').length,
    approved: profiles.filter(p => p.status === 'approved').length,
    rejected: profiles.filter(p => p.status === 'rejected').length,
  }), [profiles]);

  const updateStatus = async (profileId: string, newStatus: string) => {
    setUpdating(profileId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus } as any)
        .eq('id', profileId);
      if (error) throw error;
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, status: newStatus } : p));
      if (selectedProfile?.id === profileId) {
        setSelectedProfile(prev => prev ? { ...prev, status: newStatus } : null);
      }
      toast.success(t('admin.statusUpdated'));
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
    } finally {
      setUpdating(null);
    }
  };

  const getInitials = (p: ProfileRow) => initialsFromFullName(p.full_name);

  const getFullName = (p: ProfileRow) => {
    const name = (p.full_name || '').trim();
    return name || t('admin.unnamed');
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: t('admin.total'), value: counts.total, color: 'text-foreground' },
          { label: t('admin.pending'), value: counts.pending, color: 'text-warning' },
          { label: t('admin.approved'), value: counts.approved, color: 'text-success' },
          { label: t('admin.rejected'), value: counts.rejected, color: 'text-destructive' },
        ].map(stat => (
          <div key={stat.label} className="glass-card rounded-xl p-3 text-center">
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('admin.searchPlaceholder')}
            className="pl-9 bg-card"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterSpec} onValueChange={setFilterSpec}>
            <SelectTrigger className="bg-card flex-1 text-sm">
              <SelectValue placeholder={t('admin.allSpecializations')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.allSpecializations')}</SelectItem>
              {SPECIALIZATIONS.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="bg-card w-36 text-sm">
              <SelectValue placeholder={t('admin.allStatuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.allStatuses')}</SelectItem>
              <SelectItem value="pending">{t('profile.status.pending')}</SelectItem>
              <SelectItem value="approved">{t('profile.status.approved')}</SelectItem>
              <SelectItem value="rejected">{t('profile.status.rejected')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* User List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {t('common.noResults')}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(profile => (
            <button
              key={profile.id}
              onClick={() => setSelectedProfile(profile)}
              className="w-full glass-card rounded-xl p-4 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors"
            >
              {/* Avatar */}
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-primary">{getInitials(profile)}</span>
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{getFullName(profile)}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {profile.specialization || '—'} • {format(new Date(profile.created_at), 'dd-MM-yyyy')}
                </p>
              </div>

              {/* Status badge */}
              <Badge variant="outline" className={cn('text-xs shrink-0 border', STATUS_COLORS[profile.status] || '')}>
                {t(`profile.status.${profile.status}`)}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {/* Profile Detail Modal */}
      <Dialog open={!!selectedProfile} onOpenChange={(open) => !open && setSelectedProfile(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          {selectedProfile && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {selectedProfile.avatar_url ? (
                    <img src={selectedProfile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">{getInitials(selectedProfile)}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-lg font-bold">{getFullName(selectedProfile)}</p>
                    <Badge variant="outline" className={cn('text-xs border mt-1', STATUS_COLORS[selectedProfile.status] || '')}>
                      {t(`profile.status.${selectedProfile.status}`)}
                    </Badge>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Details grid */}
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { label: t('profile.phone'), value: selectedProfile.phone },
                    { label: t('auth.fullName'), value: selectedProfile.full_name },
                    { label: t('profile.kvk'), value: selectedProfile.kvk_number },
                    { label: 'Geboortedatum', value: selectedProfile.date_of_birth ? format(new Date(selectedProfile.date_of_birth), 'dd-MM-yyyy') : null },
                    { label: 'Adres', value: selectedProfile.address },
                    { label: 'Stad', value: selectedProfile.city },
                    { label: 'Postcode', value: selectedProfile.postal_code },
                    { label: 'Specialisatie', value: selectedProfile.specialization },
                    { label: t('profile.hourlyRate'), value: selectedProfile.hourly_rate ? `€${selectedProfile.hourly_rate}` : null },
                    { label: t('settings.language'), value: selectedProfile.preferred_language },
                    { label: t('admin.registrationDate'), value: format(new Date(selectedProfile.created_at), 'dd-MM-yyyy HH:mm') },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between py-2 border-b border-border last:border-0">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className="text-sm font-medium text-foreground">{item.value || '—'}</span>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    variant={selectedProfile.status === 'approved' ? 'secondary' : 'default'}
                    disabled={updating === selectedProfile.id || selectedProfile.status === 'approved'}
                    onClick={() => updateStatus(selectedProfile.id, 'approved')}
                  >
                    {updating === selectedProfile.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    {t('admin.approve')}
                  </Button>
                  <Button
                    className="flex-1"
                    variant="destructive"
                    disabled={updating === selectedProfile.id || selectedProfile.status === 'rejected'}
                    onClick={() => updateStatus(selectedProfile.id, 'rejected')}
                  >
                    {updating === selectedProfile.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <X className="w-4 h-4 mr-2" />
                    )}
                    {t('admin.reject')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminZZPers;
