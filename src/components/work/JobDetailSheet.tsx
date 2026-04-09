import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { MapPin, Euro, Clock, Calendar as CalIcon, Share2, Shield, Check } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Job } from './JobCard';

interface JobDetailSheetProps {
  job: Job | null;
  open: boolean;
  onClose: () => void;
  hasApplied: boolean;
  distance?: number | null;
  profileComplete: boolean;
  onApplicationSent: () => void;
}

const JobDetailSheet = ({
  job, open, onClose, hasApplied, distance, profileComplete, onApplicationSent
}: JobDetailSheetProps) => {
  const { t } = useTranslation();
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [motivation, setMotivation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!job) return null;

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: job.title, text: `${job.title} - ${job.city}` });
    } else {
      await navigator.clipboard.writeText(job.title);
      toast.success(t('network.copied'));
    }
  };

  const handleApply = async () => {
    if (!profileComplete) {
      toast.error(t('work.complete_profile_first'));
      return;
    }
    if (motivation.length < 50) {
      toast.error(t('work.motivation_too_short'));
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('job_applications').insert({
        job_id: job.id,
        user_id: user.id,
        motivation,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error(t('work.already_applied'));
        } else {
          throw error;
        }
        return;
      }

      setSuccess(true);
      toast.success(t('work.application_sent'));
      onApplicationSent();
      setTimeout(() => {
        setSuccess(false);
        setShowApplyForm(false);
        setMotivation('');
        onClose();
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setShowApplyForm(false);
      setMotivation('');
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl overflow-y-auto p-5">
        {success ? (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center gap-4 py-20"
          >
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{t('work.application_sent')}</h2>
          </motion.div>
        ) : showApplyForm ? (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-semibold">{t('work.apply_now')}</h2>
            <p className="text-sm text-muted-foreground">{job.title}</p>
            <div className="space-y-2">
              <Label>{t('work.motivation')}</Label>
              <Textarea
                value={motivation}
                onChange={e => setMotivation(e.target.value)}
                placeholder={t('work.motivation_placeholder')}
                className="min-h-[120px] bg-card"
                maxLength={500}
              />
              <p className={`text-xs ${motivation.length < 50 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {motivation.length}/500 ({t('work.min_chars', { count: 50 })})
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowApplyForm(false)} className="flex-1">
                {t('common.back')}
              </Button>
              <Button
                onClick={handleApply}
                disabled={submitting || motivation.length < 50}
                className="flex-1"
              >
                {submitting ? t('common.loading') : t('work.apply_now')}
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">{job.title}</h2>

            <div className="flex flex-wrap gap-3">
              {(job.city || job.location) && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {job.city || job.location}
                  {distance != null && <span>• {distance.toFixed(1)} km</span>}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {job.hourly_rate && (
                <div className="glass-card rounded-xl p-3 text-center">
                  <Euro className="w-5 h-5 mx-auto text-primary mb-1" />
                  <p className="text-lg font-bold text-foreground">€{Number(job.hourly_rate).toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">{t('work.per_hour')}</p>
                </div>
              )}
              {job.hours_per_week && (
                <div className="glass-card rounded-xl p-3 text-center">
                  <Clock className="w-5 h-5 mx-auto text-primary mb-1" />
                  <p className="text-lg font-bold text-foreground">{job.hours_per_week}</p>
                  <p className="text-xs text-muted-foreground">{t('work.hours_per_week')}</p>
                </div>
              )}
            </div>

            {(job.start_date || job.end_date) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalIcon className="w-4 h-4" />
                {job.start_date && format(new Date(job.start_date), 'dd MMM yyyy')}
                {job.end_date && ` — ${format(new Date(job.end_date), 'dd MMM yyyy')}`}
              </div>
            )}

            <Separator />

            {job.description && (
              <div>
                <h3 className="font-semibold text-foreground mb-2">{t('work.description')}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{job.description}</p>
              </div>
            )}

            {job.specialization_required?.length > 0 && (
              <div>
                <h3 className="font-semibold text-foreground mb-2">{t('work.required_specializations')}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {job.specialization_required.map(s => (
                    <Badge key={s} variant="secondary">{s}</Badge>
                  ))}
                </div>
              </div>
            )}

            {job.certifications_required?.length > 0 && (
              <div>
                <h3 className="font-semibold text-foreground mb-2">{t('work.required_certifications')}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {job.certifications_required.map(c => (
                    <Badge key={c} variant="outline" className="gap-1">
                      <Shield className="w-3 h-3" />
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="icon" onClick={handleShare}>
                <Share2 className="w-4 h-4" />
              </Button>
              <Button
                className="flex-1"
                disabled={hasApplied}
                onClick={() => setShowApplyForm(true)}
              >
                {hasApplied ? t('work.already_applied') : t('work.apply_now')}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default JobDetailSheet;
