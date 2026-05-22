create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text not null,
  created_at timestamptz default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  note text,
  tabs jsonb not null,
  parent_session_id uuid references public.sessions(id) on delete set null,
  source_shared_session_id uuid,
  local_created_at text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.shared_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  status text default 'sent' check (status in ('sent', 'opened', 'restored')),
  created_at timestamptz default now(),
  opened_at timestamptz,
  restored_at timestamptz
);

alter table public.sessions
  drop constraint if exists sessions_source_shared_session_id_fkey;

alter table public.sessions
  add constraint sessions_source_shared_session_id_fkey
  foreign key (source_shared_session_id)
  references public.shared_sessions(id)
  on delete set null;

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists public.daily_activity (
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_date date not null,
  save_count int default 0,
  restore_count int default 0,
  focus_count int default 0,
  share_count int default 0,
  append_count int default 0,
  total_score int default 0,
  primary key (user_id, activity_date)
);

create table if not exists public.badges (
  key text primary key,
  name text not null,
  description text not null,
  icon text,
  threshold int
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_key text not null references public.badges(key) on delete cascade,
  unlocked_at timestamptz default now(),
  unique (user_id, badge_key)
);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.sessions to authenticated;
grant select, insert, update, delete on public.shared_sessions to authenticated;
grant select, insert, update, delete on public.activity_events to authenticated;
grant select, insert, update, delete on public.daily_activity to authenticated;
grant select on public.badges to authenticated;
grant select, insert, update, delete on public.user_badges to authenticated;

insert into public.badges (key, name, description, icon, threshold) values
  ('first_flow', 'First Flow', 'Save your first context.', 'F', 1),
  ('back_in_flow', 'Back in Flow', 'Restore your first context.', 'R', 1),
  ('deep_work_day', 'Deep Work Day', 'Enter focus mode.', 'D', 1),
  ('context_giver', 'Context Giver', 'Share your first context.', 'S', 1),
  ('team_resumer', 'Team Resumer', 'Restore a shared context.', 'T', 1),
  ('builder', 'Builder', 'Save a shared context as your own.', 'B', 1),
  ('appender', 'Appender', 'Append tabs to a shared context.', 'A', 1),
  ('relay', 'Relay', 'Share a derived context.', 'Y', 1),
  ('three_day_streak', 'Three Day Streak', 'Reach a 3-day streak.', '3', 3),
  ('seven_day_streak', 'Seven Day Streak', 'Reach a 7-day streak.', '7', 7),
  ('flow_builder', 'Flow Builder', 'Save 25 contexts.', '25', 25)
on conflict (key) do nothing;

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.shared_sessions enable row level security;
alter table public.activity_events enable row level security;
alter table public.daily_activity enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, 'user'), '@', 1))
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = excluded.display_name;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_lookup_for_sharing" on public.profiles;
drop policy if exists "sessions_owner_all" on public.sessions;
drop policy if exists "sessions_read_if_shared" on public.sessions;
drop policy if exists "shared_sessions_sender_insert" on public.shared_sessions;
drop policy if exists "shared_sessions_sender_or_recipient_select" on public.shared_sessions;
drop policy if exists "shared_sessions_recipient_update_status" on public.shared_sessions;
drop policy if exists "activity_events_owner_all" on public.activity_events;
drop policy if exists "daily_activity_owner_all" on public.daily_activity;
drop policy if exists "badges_read_authenticated" on public.badges;
drop policy if exists "user_badges_owner_all" on public.user_badges;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_lookup_for_sharing" on public.profiles for select using (auth.role() = 'authenticated');

create policy "sessions_owner_all" on public.sessions for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "sessions_read_if_shared" on public.sessions for select using (
  exists (
    select 1 from public.shared_sessions
    where shared_sessions.session_id = sessions.id
      and shared_sessions.recipient_id = auth.uid()
  )
);

create policy "shared_sessions_sender_insert" on public.shared_sessions for insert with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.sessions
    where sessions.id = session_id
      and sessions.owner_id = auth.uid()
  )
);
create policy "shared_sessions_sender_or_recipient_select" on public.shared_sessions for select using (
  auth.uid() = sender_id or auth.uid() = recipient_id
);
create policy "shared_sessions_recipient_update_status" on public.shared_sessions for update using (
  auth.uid() = recipient_id
) with check (
  auth.uid() = recipient_id
);

create policy "activity_events_owner_all" on public.activity_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily_activity_owner_all" on public.daily_activity for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "badges_read_authenticated" on public.badges for select using (auth.role() = 'authenticated');
create policy "user_badges_owner_all" on public.user_badges for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
