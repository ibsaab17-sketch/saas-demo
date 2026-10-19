-- BusinessFlow platform administration foundation
-- Creates the platform administrator authorization table
-- and grants the server-side service role the permissions
-- required for secure business/owner onboarding.

create table if not exists public.platform_users (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  role text not null
    check (role in ('platform_admin')),

  status text not null default 'active'
    check (status in ('active', 'suspended')),

  created_at timestamptz not null default now(),

  unique (user_id)
);

alter table public.platform_users
enable row level security;

revoke all
on table public.platform_users
from anon, authenticated;

grant select, insert, update, delete
on table public.platform_users
to service_role;

grant select, insert, update, delete
on table public.businesses
to service_role;

grant select, insert, update, delete
on table public.business_members
to service_role;