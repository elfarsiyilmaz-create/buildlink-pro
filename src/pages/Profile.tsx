import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';

const Profile = () => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-5 space-y-5"
    >
      <h1 className="text-2xl font-bold text-foreground">{t('profile.title')}</h1>

      <div className="glass-card rounded-2xl p-6 flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
          <User className="w-10 h-10 text-muted-foreground" />
        </div>
        <p className="font-semibold text-foreground">ZZP'er</p>
        <p className="text-sm text-muted-foreground">{t('profile.status.pending')}</p>
      </div>

      <div className="glass-card rounded-2xl p-4 text-center text-muted-foreground text-sm">
        {t('profile.completionSubtitle')}
      </div>
    </motion.div>
  );
};

export default Profile;
