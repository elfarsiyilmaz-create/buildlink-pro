
-- Create jobs table
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  location text,
  city text,
  hourly_rate numeric,
  hours_per_week integer,
  start_date date,
  end_date date,
  specialization_required text[] DEFAULT '{}',
  certifications_required text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'open',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  latitude numeric,
  longitude numeric
);

-- Create job_applications table
CREATE TABLE public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  motivation text,
  status text NOT NULL DEFAULT 'pending',
  applied_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, user_id)
);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Jobs policies
CREATE POLICY "Authenticated users can view open jobs"
  ON public.jobs FOR SELECT TO authenticated
  USING (status = 'open' OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage jobs"
  ON public.jobs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Job applications policies
CREATE POLICY "Users can view own applications"
  ON public.job_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own applications"
  ON public.job_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications"
  ON public.job_applications FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all applications"
  ON public.job_applications FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
