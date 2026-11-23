-- Suggestions and bug reports sent by any active user, handled by coordinators.

create type public.feedback_kind as enum ('suggestion', 'bug', 'other');
alter type public.feedback_kind owner to postgres;

create type public.feedback_status as enum ('new', 'seen', 'planned', 'done', 'dismissed');
alter type public.feedback_status owner to postgres;

create table public.feedback_reports (
    id uuid default gen_random_uuid() not null,
    kind public.feedback_kind not null,
    message text not null,
    -- Where the person was when sending (route and query string), and their browser, to help reproduce.
    page_path text,
    user_agent text,
    status public.feedback_status default 'new' not null,
    coordinator_note text,
    created_by uuid default auth.uid(),
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,
    constraint feedback_reports_pkey primary key (id),
    constraint feedback_reports_created_by_fkey foreign key (created_by) references public.profiles (id) on delete set null,
    constraint feedback_reports_message_check check (length(btrim(message)) between 3 and 4000),
    constraint feedback_reports_page_path_check check (page_path is null or length(page_path) <= 500),
    constraint feedback_reports_user_agent_check check (user_agent is null or length(user_agent) <= 500)
);
alter table public.feedback_reports owner to postgres;
create index feedback_reports_status_created_idx on public.feedback_reports (status, created_at desc);
create index feedback_reports_created_by_idx on public.feedback_reports (created_by);
create trigger feedback_reports_touch_updated_at before update on public.feedback_reports
    for each row execute function public.touch_updated_at();

alter table public.feedback_reports enable row level security;

-- Anyone active sends feedback in their own name; each person reads what they sent; coordinators read
-- and handle everything. Nobody deletes.
create policy "active users send feedback" on public.feedback_reports
    for insert to authenticated
    with check (private.has_active_profile() and created_by = auth.uid() and status = 'new' and coordinator_note is null);
create policy "users read own feedback" on public.feedback_reports
    for select to authenticated using (created_by = auth.uid());
create policy "coordinators read feedback" on public.feedback_reports
    for select to authenticated using (private.is_coordinator());
create policy "coordinators handle feedback" on public.feedback_reports
    for update to authenticated using (private.is_coordinator()) with check (private.is_coordinator());

grant select, insert, update on table public.feedback_reports to authenticated;
grant all on table public.feedback_reports to service_role;
