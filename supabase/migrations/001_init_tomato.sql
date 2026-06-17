-- 1. Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "users can read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "users can insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "users can update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "users can delete own profile" on public.profiles for delete to authenticated using (auth.uid() = id);


-- 2. Focus Tasks
create table public.focus_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  focus_minutes int not null default 25,
  break_minutes int not null default 5,
  status text not null default 'open',
  target_date date not null,
  task_order int not null default 0,
  source text not null default 'manual',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.focus_tasks enable row level security;
create policy "users can read own tasks" on public.focus_tasks for select to authenticated using (auth.uid() = user_id);
create policy "users can insert own tasks" on public.focus_tasks for insert to authenticated with check (auth.uid() = user_id);
create policy "users can update own tasks" on public.focus_tasks for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can delete own tasks" on public.focus_tasks for delete to authenticated using (auth.uid() = user_id);


-- 3. Current Sessions
create table public.current_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  active_task_id uuid references public.focus_tasks(id) on delete set null,
  mode text not null default 'idle',
  is_running boolean not null default false,
  started_at timestamptz,
  paused_at timestamptz,
  end_time timestamptz,
  remaining_seconds int not null default 0,
  title text,
  completion_key text,
  pause_count int not null default 0,
  resumed_count int not null default 0,
  updated_by text,
  updated_at timestamptz default now(),
  unique(user_id)
);

alter table public.current_sessions enable row level security;
create policy "users can read own session" on public.current_sessions for select to authenticated using (auth.uid() = user_id);
create policy "users can insert own session" on public.current_sessions for insert to authenticated with check (auth.uid() = user_id);
create policy "users can update own session" on public.current_sessions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can delete own session" on public.current_sessions for delete to authenticated using (auth.uid() = user_id);


-- 4. Focus History
create table public.focus_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.focus_tasks(id) on delete set null,
  title text not null,
  focus_minutes int not null,
  break_minutes int not null,
  planned_seconds int not null,
  actual_seconds int not null,
  completed_at timestamptz not null default now(),
  target_date date not null,
  reflection text,
  completion_type text not null,
  completion_key text not null,
  pause_count int not null default 0,
  resumed_count int not null default 0,
  source text not null default 'web',
  system_note text,
  unique(user_id, completion_key)
);

alter table public.focus_history enable row level security;
create policy "users can read own history" on public.focus_history for select to authenticated using (auth.uid() = user_id);
create policy "users can insert own history" on public.focus_history for insert to authenticated with check (auth.uid() = user_id);
create policy "users can update own history" on public.focus_history for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can delete own history" on public.focus_history for delete to authenticated using (auth.uid() = user_id);


-- 5. Session Commands
create table public.session_commands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  command text not null,
  payload jsonb default '{}'::jsonb,
  status text not null default 'pending',
  issued_by text not null,
  issued_at timestamptz default now(),
  processed_at timestamptz,
  idempotency_key text,
  unique(user_id, idempotency_key)
);

alter table public.session_commands enable row level security;
create policy "users can read own commands" on public.session_commands for select to authenticated using (auth.uid() = user_id);
create policy "users can insert own commands" on public.session_commands for insert to authenticated with check (auth.uid() = user_id);
create policy "users can update own commands" on public.session_commands for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can delete own commands" on public.session_commands for delete to authenticated using (auth.uid() = user_id);


-- 6. User Preferences
create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'ko',
  default_focus_minutes int not null default 25,
  default_break_minutes int not null default 5,
  long_break_minutes int not null default 15,
  long_break_every int not null default 4,
  widget_enabled boolean not null default true,
  archive_insight_enabled boolean not null default true,
  updated_at timestamptz default now()
);

alter table public.user_preferences enable row level security;
create policy "users can read own preferences" on public.user_preferences for select to authenticated using (auth.uid() = user_id);
create policy "users can insert own preferences" on public.user_preferences for insert to authenticated with check (auth.uid() = user_id);
create policy "users can update own preferences" on public.user_preferences for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can delete own preferences" on public.user_preferences for delete to authenticated using (auth.uid() = user_id);


-- 7. Device Clients
create table public.device_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_type text not null,
  device_name text,
  last_seen_at timestamptz default now(),
  app_version text,
  platform text
);

alter table public.device_clients enable row level security;
create policy "users can read own devices" on public.device_clients for select to authenticated using (auth.uid() = user_id);
create policy "users can insert own devices" on public.device_clients for insert to authenticated with check (auth.uid() = user_id);
create policy "users can update own devices" on public.device_clients for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can delete own devices" on public.device_clients for delete to authenticated using (auth.uid() = user_id);
