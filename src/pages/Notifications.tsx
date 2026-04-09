import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { nl, enUS, de, fr, es, pt, pl, ro, tr, ar, bg } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

const localeMap: Record<string, typeof nl> = { nl, en: enUS, de, fr, es, pt, pl, ro, tr, ar, bg };

const typeIcon = (type: string) => {
  switch (type) {
    case 'success': return '✅';
    case 'error': return '❌';
    case 'warning': return '⚠️';
    default: return 'ℹ️';
  }
};

const Notifications = () => {
  const { t, i18n } = useTranslation();
  const locale = localeMap[i18n.language] || enUS;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setNotifications(data as Notification[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('notifications-page-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (!unreadIds.length) return;
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const deleteAllRead = async () => {
    const readIds = notifications.filter(n => n.read).map(n => n.id);
    if (!readIds.length) return;
    await supabase.from('notifications').delete().in('id', readIds);
    setNotifications(prev => prev.filter(n => !n.read));
  };

  const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-5 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('notifications.title')}</h1>
        {unreadCount > 0 && (
          <span className="px-2.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
            {unreadCount}
          </span>
        )}
      </div>

      {/* Filter tabs + actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {t('notifications.all')} ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unread' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {t('notifications.unread')} ({unreadCount})
          </button>
        </div>
        <div className="flex gap-1">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs gap-1">
              <CheckCheck className="w-3.5 h-3.5" />
              {t('notifications.markAllRead')}
            </Button>
          )}
        </div>
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card rounded-2xl p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground text-sm">{t('notifications.empty')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filtered.map(n => (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, height: 0 }}
                className={`glass-card rounded-2xl p-4 transition-colors ${!n.read ? 'border-l-4 border-l-primary' : ''}`}
              >
                <div className="flex gap-3">
                  <span className="text-xl mt-0.5">{typeIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale })}
                    </p>
                  </div>
                  <div className="flex items-start gap-1">
                    {!n.read && (
                      <button onClick={() => markAsRead(n.id)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title={t('notifications.markRead')}>
                        <Check className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                    <button onClick={() => deleteNotification(n.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors" title={t('common.delete')}>
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Delete read button */}
      {notifications.some(n => n.read) && (
        <Button variant="outline" size="sm" onClick={deleteAllRead} className="w-full text-xs text-destructive border-destructive/20 hover:bg-destructive/5">
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
          {t('notifications.deleteRead')}
        </Button>
      )}
    </motion.div>
  );
};

export default Notifications;
