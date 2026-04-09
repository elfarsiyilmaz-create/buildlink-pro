
-- Create time_entries table
CREATE TABLE public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  date date NOT NULL,
  hours_worked numeric NOT NULL,
  description text,
  hourly_rate numeric,
  total_earned numeric GENERATED ALWAYS AS (hours_worked * hourly_rate) STORED,
  status text NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  week_number integer,
  year integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Users can view own entries
CREATE POLICY "Users can view own time entries"
  ON public.time_entries FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can create own entries
CREATE POLICY "Users can create own time entries"
  ON public.time_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update own draft entries
CREATE POLICY "Users can update own draft entries"
  ON public.time_entries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'draft');

-- Users can delete own draft entries
CREATE POLICY "Users can delete own draft entries"
  ON public.time_entries FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND status = 'draft');

-- Admins can view all
CREATE POLICY "Admins can view all time entries"
  ON public.time_entries FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Admins can update all
CREATE POLICY "Admins can update all time entries"
  ON public.time_entries FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));
