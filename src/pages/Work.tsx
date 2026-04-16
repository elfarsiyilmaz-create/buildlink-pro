import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Search, Briefcase, Home as HomeIcon, Clock3, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import JobCard from '@/components/work/JobCard';
import JobDetailSheet from '@/components/work/JobDetailSheet';
import type { Job } from '@/components/work/JobCard';

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
  const [activeTab, setActiveTab] = useState<'available' | 'applications'>('available');
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

      const [jobsRes, appsRes, profileRes] = await Promise.all([
        supabase.from('jobs').select('*').eq('status', 'open').order('created_at', { ascending: false }),
        supabase.from('job_applications').select('*, jobs(*)').eq('user_id', user.id).order('applied_at', { ascending: false }),
        supabase.from('profiles').select('phone, specialization, specializations').eq('user_id', user.id).single(),
      ]);

      if (jobsRes.data) setJobs(jobsRes.data as Job[]);
      if (appsRes.data) {
        setApplications(appsRes.data as Application[]);
        setAppliedJobIds(new Set((appsRes.data as Application[]).map(a => a.job_id)));
      }
      if (profileRes.data) {
        const p = profileRes.data;
        const hasPhone = !!p.phone;
        const hasSpec = ((p.specializations as string[] | null)?.length ?? 0) > 0 || !!p.specialization;
        setProfileComplete(hasPhone && hasSpec);
      }
    } catch (err) {
      console.error('Error fetching work data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
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

  const filteredJobs = useMemo(() => {
    if (!search.trim()) return jobs;
    const q = search.toLowerCase();
    return jobs.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.city?.toLowerCase().includes(q) ||
      j.location?.toLowerCase().includes(q),
    );
  }, [jobs, search]);

  const filteredApplications = useMemo(() => {
    if (!search.trim()) return applications;
    const q = search.toLowerCase();
    return applications.filter(a => (a.jobs?.title || '').toLowerCase().includes(q));
  }, [applications, search]);

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

  const showEmpty = activeTab === 'available' ? filteredJobs.length === 0 : filteredApplications.length === 0;

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f3f3f5]">
        <Briefcase className="h-7 w-7 animate-pulse text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#f3f3f5]">
      <div className="mx-auto w-full max-w-[430px] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+108px)] pt-12">
        <h1 className="text-center text-[47px] font-semibold leading-none tracking-[-0.02em] text-zinc-900">
          {t('work.title')}
        </h1>

        <div className="mt-5 grid grid-cols-2 gap-3 rounded-[18px] p-1">
          <button
            type="button"
            onClick={() => setActiveTab('available')}
            className={`rounded-[16px] px-3 py-3 text-[17px] font-semibold leading-tight ${
              activeTab === 'available' ? 'bg-white text-zinc-900 shadow-[0_4px_14px_rgba(15,23,42,0.07)]' : 'bg-white/75 text-zinc-800'
            }`}
          >
            {t('work.available_jobs')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('applications')}
            className={`rounded-[16px] px-3 py-3 text-[17px] font-semibold leading-tight ${
              activeTab === 'applications' ? 'bg-white text-zinc-900 shadow-[0_4px_14px_rgba(15,23,42,0.07)]' : 'bg-white/75 text-zinc-800'
            }`}
          >
            {t('work.my_applications')}
          </button>
        </div>

        <div className="mt-4 rounded-full bg-zinc-100 px-4 py-3">
          <label className="flex items-center gap-2.5">
            <Search className="h-5 w-5 shrink-0 text-zinc-500" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('work.search_placeholder')}
              className="h-auto border-0 bg-transparent p-0 text-[16px] text-zinc-700 shadow-none placeholder:text-zinc-400 focus-visible:ring-0"
            />
          </label>
        </div>

        {showEmpty ? (
          <section className="mt-5 rounded-[20px] border border-black/[0.04] bg-white p-10 shadow-[0_6px_20px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col items-center text-center">
              <Briefcase className="h-12 w-12 text-zinc-500" />
              <p className="mt-4 text-[17px] leading-tight text-zinc-500">
                {activeTab === 'available' ? t('work.no_jobs_found') : t('work.no_applications_yet')}
              </p>
            </div>
          </section>
        ) : activeTab === 'available' ? (
          <section className="mt-5 space-y-3">
            {filteredJobs.map((job, i) => (
              <JobCard
                key={job.id}
                job={job}
                index={i}
                distance={getDistance(job)}
                hasApplied={appliedJobIds.has(job.id)}
                onView={() => { setSelectedJob(job); setSheetOpen(true); }}
              />
            ))}
          </section>
        ) : (
          <section className="mt-5 space-y-3">
            {filteredApplications.map((app, i) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (app.jobs) { setSelectedJob(app.jobs); setSheetOpen(true); }
                }}
                onKeyDown={e => {
                  if ((e.key === 'Enter' || e.key === ' ') && app.jobs) {
                    e.preventDefault();
                    setSelectedJob(app.jobs);
                    setSheetOpen(true);
                  }
                }}
                className="rounded-[18px] border border-black/[0.04] bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.05)] cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[17px] font-semibold text-zinc-900 truncate">
                    {app.jobs?.title || t('work.title')}
                  </p>
                  <Badge className={`${statusColor(app.status)} shrink-0 border-0 text-xs`}>
                    {statusLabel(app.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {t('work.applied_on')} {format(new Date(app.applied_at), 'dd MMM yyyy')}
                </p>
              </motion.div>
            ))}
          </section>
        )}
      </div>

      <JobDetailSheet
        job={selectedJob}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        hasApplied={selectedJob ? appliedJobIds.has(selectedJob.id) : false}
        distance={selectedJob ? getDistance(selectedJob) : null}
        profileComplete={profileComplete}
        onApplicationSent={fetchData}
      />

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div className="mx-auto w-full max-w-[430px] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+9px)]">
          <nav className="pointer-events-auto rounded-[20px] border border-black/[0.05] bg-white/98 px-3 py-1.5 shadow-[0_-2px_10px_rgba(15,23,42,0.07)] backdrop-blur">
            <ul className="grid grid-cols-4">
              <li>
                <Link to="/" className="flex flex-col items-center gap-0.5 py-1 text-zinc-500">
                  <HomeIcon className="h-5 w-5" />
                  <span className="text-[11px]">{t('nav.home')}</span>
                </Link>
              </li>
              <li>
                <Link to="/hours" className="flex flex-col items-center gap-0.5 py-1 text-zinc-500">
                  <Clock3 className="h-5 w-5" />
                  <span className="text-[11px]">{t('nav.hours')}</span>
                </Link>
              </li>
              <li>
                <Link to="/work" aria-current="page" className="flex flex-col items-center gap-0.5 py-1 text-zinc-900">
                  <Briefcase className="h-5 w-5" />
                  <span className="text-[11px] font-medium">{t('nav.work')}</span>
                </Link>
              </li>
              <li>
                <Link to="/profile" className="flex flex-col items-center gap-0.5 py-1 text-zinc-500">
                  <User className="h-5 w-5" />
                  <span className="text-[11px]">{t('nav.profile')}</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Work;
