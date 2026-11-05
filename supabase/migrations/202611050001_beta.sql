-- Closed beta. Invite someone: insert their email into thrive_beta_invites (Table Editor or SQL).
-- Revoke: delete the row; their access flag is cleared by the trigger below.
create table if not exists public.thrive_beta_invites (
  email text primary key check (email = lower(email) and length(email) <= 254),
  note text not null default '',
  invited_at timestamptz not null default now(),
  emailed_at timestamptz,
  accepted_at timestamptz
);
create table if not exists public.thrive_beta_requests (
  email text primary key check (email = lower(email) and length(email) <= 254),
  name text not null default '' check (length(name) <= 80),
  business text not null default '' check (length(business) <= 80),
  work text not null default '' check (length(work) <= 500),
  created_at timestamptz not null default now()
);
alter table public.thrive_beta_invites enable row level security;
alter table public.thrive_beta_requests enable row level security;
revoke all on public.thrive_beta_invites, public.thrive_beta_requests from public, anon, authenticated;
grant all on public.thrive_beta_invites, public.thrive_beta_requests to service_role;

-- Access lives in auth.users app_metadata (not user-editable) so each request needs no extra query.
create or replace function public.thrive_beta_revoked() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update auth.users set raw_app_meta_data = raw_app_meta_data - 'thrive_beta' where lower(email) = old.email;
  return old;
end $$;
revoke all on function public.thrive_beta_revoked() from public, anon, authenticated;
drop trigger if exists thrive_beta_revoked on public.thrive_beta_invites;
create trigger thrive_beta_revoked after delete on public.thrive_beta_invites for each row execute function public.thrive_beta_revoked();
