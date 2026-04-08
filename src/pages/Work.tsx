import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Briefcase } from 'lucide-react';

const Work = () => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-5 space-y-5"
    >
      <h1 className="text-2xl font-bold text-foreground">{t('work.title')}</h1>

      <div className="glass-card rounded-2xl p-8 flex flex-col items-center text-center">
        <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-sm">{t('work.empty')}</p>
      </div>
    </motion.div>
  );
};

export default Work;
