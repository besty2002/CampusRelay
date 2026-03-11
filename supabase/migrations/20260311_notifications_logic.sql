-- 1. Create notifications table for history (Optional but recommended)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Conceptual Trigger for Email (PostgreSQL Function)
-- NOTE: Real email sending usually requires an Edge Function + Mail Service (Resend, SendGrid etc.)
-- This is a template for how you would trigger it.

CREATE OR REPLACE FUNCTION public.handle_new_request_notification()
RETURNS TRIGGER AS $$
DECLARE
  giver_id uuid;
  post_title text;
  requester_name text;
BEGIN
  -- Get post info and giver id
  SELECT user_id, title INTO giver_id, post_title FROM public.posts WHERE id = NEW.post_id;
  -- Get requester name
  SELECT display_name INTO requester_name FROM public.profiles WHERE id = NEW.requester_id;

  -- Insert into local notification table
  INSERT INTO public.notifications (user_id, title, message, link)
  VALUES (
    giver_id, 
    '新しいお譲り申請！', 
    requester_name || 'さんが「' || post_title || '」を申請しました。',
    '/post/' || NEW.post_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_post_request_created
  AFTER INSERT ON public.post_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_request_notification();
