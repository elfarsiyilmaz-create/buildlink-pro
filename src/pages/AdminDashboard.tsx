import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Users, Briefcase, Calendar, Award, FileText } from 'lucide-react';
import AdminZZPers from '@/components/admin/AdminZZPers';

const TABS = [
  { id: 'users', icon: Users },
  { id: 'assignments', icon: Briefcase },
  { id: 'availability', icon: Calendar },
  { id: 'referrals', icon: Award },
  { id: 'certificates', icon: FileText },
] as const;

type TabId = typeof TABS[number]['id'];

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('users');

  const renderContent = () => {
    if (activeTab === 'users') return <AdminZZPers />;

    const Tab = TABS.find(tb => tb.id === activeTab)!;
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Tab.icon className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-1">
            {t(`admin.tabs.${activeTab}`)}
          </h2>
          <p className="text-sm text-muted-foreground">{t('admin.comingSoon')}</p>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-5 space-y-5 pb-24"
    >
      <h1 className="text-2xl font-bold text-foreground">{t('admin.title')}</h1>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-card text-muted-foreground hover:bg-muted border border-border'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {t(`admin.tabs.${tab.id}`)}
            </button>
          );
        })}
      </div>

      {renderContent()}
    </motion.div>
  );
};

export default AdminDashboard;
