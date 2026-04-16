import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Briefcase, Bell, Home as HomeIcon, Clock3, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

const Network = () => {
  const [activeTab, setActiveTab] = useState<'available' | 'applications'>('available');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [jobs, setJobs] = useState<Array<{ id: string; title: string; city: string | null; location: string | null }>>([]);
  const [applications, setApplications] = useState<Array<{ id: string; status: string; jobs: { id: string; title: string } | null }>>([]);

  useEffect(() => {
    void loadWorkData();
  }, []);

  const loadWorkData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [jobsRes, appsRes] = await Promise.all([
        supabase.from('jobs').select('id, title, city, location').eq('status', 'open').order('created_at', { ascending: false }),
        supabase.from('job_applications').select('id, status, jobs(id, title)').eq('user_id', user.id).order('applied_at', { ascending: false }),
      ]);
      setJobs((jobsRes.data as any) || []);
      setApplications((appsRes.data as any) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredAvailableJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter(job =>
      (job.title || '').toLowerCase().includes(q) ||
      (job.city || '').toLowerCase().includes(q) ||
      (job.location || '').toLowerCase().includes(q),
    );
  }, [jobs, search]);

  const filteredApplications = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter(app => (app.jobs?.title || '').toLowerCase().includes(q));
  }, [applications, search]);

  const showEmpty = activeTab === 'available' ? filteredAvailableJobs.length === 0 : filteredApplications.length === 0;

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
        <h1 className="text-center text-[47px] font-semibold leading-none tracking-[-0.02em] text-zinc-900">Opdrachten</h1>

        <div className="mt-5 grid grid-cols-2 gap-3 rounded-[18px] p-1">
          <button
            type="button"
            onClick={() => setActiveTab('available')}
            className={`rounded-[16px] px-3 py-3 text-[17px] font-semibold leading-tight ${
              activeTab === 'available' ? 'bg-white text-zinc-900 shadow-[0_4px_14px_rgba(15,23,42,0.07)]' : 'bg-white/75 text-zinc-800'
            }`}
          >
            Beschikbare opdrachten
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('applications')}
            className={`rounded-[16px] px-3 py-3 text-[17px] font-semibold leading-tight ${
              activeTab === 'applications' ? 'bg-white text-zinc-900 shadow-[0_4px_14px_rgba(15,23,42,0.07)]' : 'bg-white/75 text-zinc-800'
            }`}
          >
            Mijn aanmeldingen
          </button>
        </div>

        <div className="mt-4 rounded-full bg-zinc-100 px-4 py-3">
          <label className="flex items-center gap-2.5">
            <Search className="h-5 w-5 text-zinc-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Zoek op titel of locatie..."
              className="w-full bg-transparent text-[16px] text-zinc-700 outline-none placeholder:text-zinc-400"
            />
          </label>
        </div>

        {showEmpty ? (
          <section className="mt-5 rounded-[20px] border border-black/[0.04] bg-white p-10 shadow-[0_6px_20px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col items-center text-center">
              <Briefcase className="h-12 w-12 text-zinc-500" />
              <p className="mt-4 text-[17px] leading-tight text-zinc-500">Geen opdrachten gevonden</p>
            </div>
          </section>
        ) : (
          <section className="mt-5 space-y-3">
            {(activeTab === 'available' ? filteredAvailableJobs : filteredApplications).map((item: any) => (
              <div
                key={item.id}
                className="rounded-[18px] border border-black/[0.04] bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.05)]"
              >
                <p className="text-[17px] font-semibold text-zinc-900">{item.title || item.jobs?.title || 'Opdracht'}</p>
              </div>
            ))}
          </section>
        )}
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div className="mx-auto w-full max-w-[430px] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+9px)]">
          <nav className="pointer-events-auto rounded-[20px] border border-black/[0.05] bg-white px-3 py-1 shadow-[0_-1px_8px_rgba(15,23,42,0.06)]">
            <ul className="grid grid-cols-4">
              <li>
                <Link to="/" className="flex flex-col items-center gap-0.5 py-1 text-zinc-500">
                  <HomeIcon className="h-5 w-5" />
                  <span className="text-[11px]">Home</span>
                </Link>
              </li>
              <li>
                <Link to="/hours" className="flex flex-col items-center gap-0.5 py-1 text-zinc-500">
                  <Clock3 className="h-5 w-5" />
                  <span className="text-[11px]">Uren</span>
                </Link>
              </li>
              <li>
                <Link to="/network" aria-current="page" className="flex flex-col items-center gap-0.5 py-1 text-zinc-900">
                  <Briefcase className="h-5 w-5" />
                  <span className="text-[11px] font-medium">Meldingen</span>
                </Link>
              </li>
              <li>
                <Link to="/profile" className="relative flex flex-col items-center gap-0.5 py-1 text-zinc-500">
                  <span className="absolute right-5 top-0.5 h-2.5 w-2.5 rounded-full bg-red-500" />
                  <User className="h-5 w-5" />
                  <span className="text-[11px]">Profiel</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Network;
