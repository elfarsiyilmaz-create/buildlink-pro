import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Search, Briefcase, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import JobCard from '@/components/work/JobCard';
import JobDetailSheet from '@/components/work/JobDetailSheet';
import type { Job } from '@/components/work/JobCard';
import { format } from 'date-fns';

interface Application {
  id: string;
  job_id: string;
  status: string;
  motivation: string | null;
  applied_at: string;
  jobs: Job | null;
}

const Work = () => {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [profileComplete, setProfileComplete] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch jobs, applications, and profile in parallel
      const [jobsRes, appsRes, profileRes] = await Promise.all([
        supabase.from('jobs').select('*').eq('status', 'open').order('created_at', { ascending: false }),
        supabase.from('job_applications').select('*, jobs(*)').eq('user_id', user.id).order('applied_at', { ascending: false }),
        supabase.from('profiles').select('phone, specialization, specializations').eq('user_id', user.id).single(),
      ]);

      if (jobsRes.data) setJobs(jobsRes.data as any);
      if (appsRes.data) {
        setApplications(appsRes.data as any);
        setAppliedJobIds(new Set((appsRes.data as any).map((a: any) => a.job_id)));
      }
      if (profileRes.data) {
        const p = profileRes.data;
        const hasPhone = !!p.phone;
        const hasSpec = (p.specializations as any)?.length > 0 || !!p.specialization;
        setProfileComplete(hasPhone && hasSpec);
      }
    } catch (err) {
      console.error('Error fetching work data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Try to get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // silently fail
      );
    }
  }, [fetchData]);

  const getDistance = (job: Job): number | null => {
    if (!userLocation || !job.latitude || !job.longitude) return null;
    const R = 6371;
    const dLat = ((Number(job.latitude) - userLocation.lat) * Math.PI) / 180;
    const dLon = ((Number(job.longitude) - userLocation.lng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos((userLocation.lat * Math.PI) / 180) *
      Math.cos((Number(job.latitude) * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const filteredJobs = jobs.filter(j => {
    if (!search) return true;
    const q = search.toLowerCase();
    return j.title.toLowerCase().includes(q) ||
      j.city?.toLowerCase().includes(q) ||
      j.location?.toLowerCase().includes(q);
  });

  const statusColor = (s: string) => {
    if (s === 'accepted') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (s === 'rejected') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  };

  const statusLabel = (s: string) => {
    if (s === 'accepted') return t('work.status_accepted');
    if (s === 'rejected') return t('work.status_rejected');
    return t('work.status_pending');
  };

  if (loading) {
    return (
      <div className="py-5 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-5 space-y-4 pb-24"
    >
      <h1 className="text-2xl font-bold text-foreground">{t('work.title')}</h1>

      <Tabs defaultValue="available" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="available">{t('work.available_jobs')}</TabsTrigger>
          <TabsTrigger value="applications">
            {t('work.my_applications')}
            {applications.length > 0 && (
              <span className="ml-1.5 bg-primary/20 text-primary text-xs rounded-full px-1.5">
                {applications.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-3 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('work.search_placeholder')}
              className="pl-10 bg-card"
            />
          </div>

          {filteredJobs.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 flex flex-col items-center text-center">
              <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm">{t('work.no_jobs_found')}</p>
            </div>
          ) : (
            filteredJobs.map((job, i) => (
              <JobCard
                key={job.id}
                job={job}
                index={i}
                distance={getDistance(job)}
                hasApplied={appliedJobIds.has(job.id)}
                onView={() => { setSelectedJob(job); setSheetOpen(true); }}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="applications" className="space-y-3 mt-4">
          {applications.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 flex flex-col items-center text-center">
              <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm">{t('work.no_applications_yet')}</p>
            </div>
          ) : (
            applications.map((app, i) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass-card rounded-2xl p-4 space-y-2 cursor-pointer"
                onClick={() => {
                  if (app.jobs) { setSelectedJob(app.jobs as any); setSheetOpen(true); }
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground truncate">
                    {(app.jobs as any)?.title || t('work.title')}
                  </h3>
                  <Badge className={`${statusColor(app.status)} border-0 text-xs`}>
                    {statusLabel(app.status)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('work.applied_on')} {format(new Date(app.applied_at), 'dd MMM yyyy')}
                </p>
              </motion.div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <JobDetailSheet
        job={selectedJob}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        hasApplied={selectedJob ? appliedJobIds.has(selectedJob.id) : false}
        distance={selectedJob ? getDistance(selectedJob) : null}
        profileComplete={profileComplete}
        onApplicationSent={fetchData}
      />
    </motion.div>
  );
};

export default Work;
