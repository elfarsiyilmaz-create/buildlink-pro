
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Index for fast lookup
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);

-- Trigger: notify on profile status change
CREATE OR REPLACE FUNCTION public.notify_on_profile_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (NEW.user_id, 'Account Approved', 'Your account has been approved! You can now access all features.', 'success');
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (NEW.user_id, 'Account Rejected', 'Your account application has been rejected. Please contact support.', 'error');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_status_change
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_profile_status_change();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
