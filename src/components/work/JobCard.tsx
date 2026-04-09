import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MapPin, Clock, Euro, Calendar as CalIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface Job {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  city: string | null;
  hourly_rate: number | null;
  hours_per_week: number | null;
  start_date: string | null;
  end_date: string | null;
  specialization_required: string[];
  certifications_required: string[];
  status: string;
  latitude: number | null;
  longitude: number | null;
}

interface JobCardProps {
  job: Job;
  distance?: number | null;
  index: number;
  onView: () => void;
  hasApplied?: boolean;
}

const JobCard = ({ job, distance, index, onView, hasApplied }: JobCardProps) => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="glass-card rounded-2xl p-4 space-y-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{job.title}</h3>
          {(job.city || job.location) && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{job.city || job.location}</span>
              {distance != null && (
                <span className="text-xs ml-1">• {distance.toFixed(1)} km</span>
              )}
            </div>
          )}
        </div>
        {job.hourly_rate && (
          <div className="flex items-center gap-1 text-primary font-bold text-lg shrink-0">
            <Euro className="w-4 h-4" />
            {Number(job.hourly_rate).toFixed(0)}<span className="text-xs font-normal text-muted-foreground">/uur</span>
          </div>
        )}
      </div>

      {job.specialization_required?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {job.specialization_required.map(s => (
            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {job.start_date && (
          <span className="flex items-center gap-1">
            <CalIcon className="w-3.5 h-3.5" />
            {format(new Date(job.start_date), 'dd MMM yyyy')}
          </span>
        )}
        {job.hours_per_week && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {job.hours_per_week} {t('work.hours_per_week')}
          </span>
        )}
      </div>

      <Button
        onClick={onView}
        className="w-full"
        variant={hasApplied ? "secondary" : "default"}
      >
        {hasApplied ? t('work.interestRegistered') : t('work.view_job')}
      </Button>
    </motion.div>
  );
};

export default JobCard;
export type { Job };
