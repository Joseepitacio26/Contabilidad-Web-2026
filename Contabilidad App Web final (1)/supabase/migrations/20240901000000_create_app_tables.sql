-- Jobs: one row per job per user
create table if not exists public.jobs (
  id         bigint       not null,
  user_id    uuid         not null references auth.users(id) on delete cascade,
  data       jsonb        not null default '{}',
  updated_at timestamptz  not null default now(),
  primary key (user_id, id)
);
alter table public.jobs enable row level security;
create policy "users_own_jobs" on public.jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Employees: one row per employee per user
create table if not exists public.employees (
  id         bigint       not null,
  user_id    uuid         not null references auth.users(id) on delete cascade,
  data       jsonb        not null default '{}',
  updated_at timestamptz  not null default now(),
  primary key (user_id, id)
);
alter table public.employees enable row level security;
create policy "users_own_employees" on public.employees
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Settings: one row per user
create table if not exists public.user_settings (
  user_id    uuid         not null primary key references auth.users(id) on delete cascade,
  data       jsonb        not null default '{}',
  updated_at timestamptz  not null default now()
);
alter table public.user_settings enable row level security;
create policy "users_own_settings" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
