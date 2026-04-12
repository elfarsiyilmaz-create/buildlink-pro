import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Loader2, Search, Check, Banknote, Users, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ReferralInvite {
  id: string;
  referrer_id: string;
  invited_email: string | null;
  invited_name: string | null;
  status: string;
  invited_at: string;
  registered_at: string | null;
  approved_at: string | null;
  bonus_paid: boolean | null;
  bonus_amount: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  invited: 'bg-muted text-muted-foreground',
  registered: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  approved: 'bg-success/15 text-success border-success/30',
  paid: 'bg-primary/15 text-primary border-primary/30',
};

const AdminReferrals = () => {
  const { t } = useTranslation();
  const [invites, setInvites] = useState<ReferralInvite[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [invitesRes, profilesRes] = await Promise.all([
      supabase.from('referral_invites').select('*').order('invited_at', { ascending: false }),
      supabase.from('profiles').select('user_id, full_name'),
    ]);

    if (invitesRes.data) setInvites(invitesRes.data);
    if (profilesRes.data) {
      const map: Record<string, string> = {};
      profilesRes.data.forEach((p: any) => {
        map[p.user_id] = (p.full_name || '').trim() || t('admin.unnamed');
      });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    return invites.filter(inv => {
      const matchStatus = filterStatus === 'all' || inv.status === filterStatus;
      const name = (inv.invited_name || '').toLowerCase();
      const referrer = (profiles[inv.referrer_id] || '').toLowerCase();
      const matchSearch = !search || name.includes(search.toLowerCase()) || referrer.includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [invites, filterStatus, search, profiles]);

  const counts = useMemo(() => ({
    total: invites.length,
    approved: invites.filter(i => i.status === 'approved').length,
    pendingPayout: invites.filter(i => i.status === 'approved' && !i.bonus_paid).length,
    totalPaid: invites.filter(i => i.bonus_paid).reduce((s, i) => s + (Number(i.bonus_amount) || 0), 0),
  }), [invites]);

  const updateInvite = async (id: string, updates: Partial<ReferralInvite>) => {
    setUpdating(id);
    try {
      const { error } = await supabase
        .from('referral_invites')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;

      setInvites(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));

      const invite = invites.find(i => i.id === id);

      // If marking as paid, also update referrer's total_earned and notify
      if (updates.bonus_paid && invite) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('total_earned')
          .eq('user_id', invite.referrer_id)
          .single();
        
        if (profile) {
          await supabase
            .from('profiles')
            .update({
              total_earned: (Number(profile.total_earned) || 0) + (Number(invite.bonus_amount) || 25),
            } as any)
            .eq('user_id', invite.referrer_id);
        }

        await supabase.from('notifications').insert({
          user_id: invite.referrer_id,
          title: 'Referral bonus uitbetaald 💰',
          message: `Je hebt €${Number(invite.bonus_amount || 25).toFixed(2)} ontvangen voor het aanbrengen van ${invite.invited_name || 'een nieuwe ZZP\'er'}.`,
          type: 'success',
        });
      }

      // Notify on referral approval
      if (updates.status === 'approved' && invite) {
        await supabase.from('notifications').insert({
          user_id: invite.referrer_id,
          title: 'Referral goedgekeurd 🎉',
          message: `${invite.invited_name || 'Je referral'} is goedgekeurd als ZZP'er! Je bonus wordt binnenkort uitbetaald.`,
          type: 'success',
        });
      }

      toast.success(t('admin.statusUpdated'));
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
    } finally {
      setUpdating(null);
    }
  };

  const markAsPaid = (invite: ReferralInvite) => {
    updateInvite(invite.id, {
      bonus_paid: true,
      status: 'paid',
    });
  };

  const approveReferral = (invite: ReferralInvite) => {
    updateInvite(invite.id, {
      status: 'approved',
      approved_at: new Date().toISOString(),
    });
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
          { label: t('admin.hours_approved'), value: counts.approved, color: 'text-success' },
          { label: t('admin.pendingPayout'), value: counts.pendingPayout, color: 'text-warning' },
          { label: t('admin.totalPaidOut'), value: `€${counts.totalPaid.toFixed(0)}`, color: 'text-primary' },
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
            <SelectItem value="invited">{t('network.status.invited')}</SelectItem>
            <SelectItem value="registered">{t('network.status.registered')}</SelectItem>
            <SelectItem value="approved">{t('network.status.approved')}</SelectItem>
            <SelectItem value="paid">{t('network.status.paid')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {t('common.noResults')}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(invite => (
            <div key={invite.id} className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {invite.invited_name || invite.invited_email || '—'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t('admin.referredBy')}: {profiles[invite.referrer_id] || t('admin.unnamed')}
                  </p>
                </div>
                <Badge variant="outline" className={cn('text-xs border shrink-0', STATUS_COLORS[invite.status] || '')}>
                  {t(`network.status.${invite.status}`)}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{format(new Date(invite.invited_at), 'dd-MM-yyyy')}</span>
                <span>€{Number(invite.bonus_amount || 25).toFixed(2)}</span>
              </div>

              {/* Actions */}
              {invite.status === 'registered' && (
                <Button
                  size="sm"
                  className="w-full"
                  disabled={updating === invite.id}
                  onClick={() => approveReferral(invite)}
                >
                  {updating === invite.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                  {t('admin.approveReferral')}
                </Button>
              )}
              {invite.status === 'approved' && !invite.bonus_paid && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={updating === invite.id}
                  onClick={() => markAsPaid(invite)}
                >
                  {updating === invite.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Banknote className="w-4 h-4 mr-1" />}
                  {t('admin.payBonus')}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReferrals;
