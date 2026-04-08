import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Copy, Share2, Users } from 'lucide-react';
import { toast } from 'sonner';

const Network = () => {
  const { t } = useTranslation();
  const referralCode = 'ALHAN-DEMO';

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success(t('network.copied'));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-5 space-y-5"
    >
      <h1 className="text-2xl font-bold text-foreground">{t('network.title')}</h1>

      {/* Referral Code Card */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold text-foreground">{t('network.inviteTitle')}</h2>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-muted rounded-xl px-4 py-3 font-mono font-bold text-foreground text-center tracking-wider">
            {referralCode}
          </div>
          <button
            onClick={copyCode}
            className="p-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Copy className="w-5 h-5" />
          </button>
        </div>
        <button className="w-full flex items-center justify-center gap-2 bg-success text-success-foreground font-semibold py-3 rounded-xl hover:bg-success/90 transition-colors">
          <Share2 className="w-4 h-4" />
          {t('network.share')}
        </button>
      </div>

      {/* Referral List */}
      <div className="glass-card rounded-2xl p-5">
        <h2 className="font-semibold text-foreground mb-3">{t('network.referralList')}</h2>
        <div className="flex flex-col items-center py-6 text-center">
          <Users className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">{t('common.noResults')}</p>
        </div>
      </div>

      {/* Bonus Explanation */}
      <div className="glass-card rounded-2xl p-4">
        <p className="text-xs text-muted-foreground text-center">
          💡 {t('network.bonusExplanation')}
        </p>
      </div>
    </motion.div>
  );
};

export default Network;
