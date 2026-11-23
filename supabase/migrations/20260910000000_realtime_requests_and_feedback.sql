-- Maintenance requests and feedback reach the people who handle them in real time (sidebar badges, bell and
-- desktop alerts). Realtime still respects row-level security, so each person only receives what they can read.
alter publication supabase_realtime add table public.maintenance_requests;
alter publication supabase_realtime add table public.feedback_reports;
