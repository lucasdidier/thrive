-- Free lifetime access (beta testers, friends): add an email here and that account is never charged or locked.
-- Add:    insert into public.thrive_free_access(email, note) values ('name@example.com', 'beta');
-- Remove: delete from public.thrive_free_access where email = 'name@example.com';
-- It works before or after the person signs up: triggers keep thrive_subscriptions.comped in step, and the
-- app already treats comped accounts as free (no trial, no lock, no trial emails, email & calendar allowed).
create table if not exists public.thrive_free_access (
  email text primary key check (email = lower(email) and length(email) <= 254),
  note text not null default '' check (length(note) <= 200),
  created_at timestamptz not null default now()
);
alter table public.thrive_free_access enable row level security;
revoke all on public.thrive_free_access from public, anon, authenticated;
grant all on public.thrive_free_access to service_role;

-- A new plan row (first visit) is comped when its email is on the list.
create or replace function public.thrive_free_access_on_plan() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is not null and exists (select 1 from public.thrive_free_access f where f.email = lower(new.email)) then
    new.comped := true;
  end if;
  return new;
end $$;
drop trigger if exists thrive_free_access_on_plan on public.thrive_subscriptions;
create trigger thrive_free_access_on_plan before insert or update of email on public.thrive_subscriptions
  for each row execute function public.thrive_free_access_on_plan();

-- Adding or removing an email updates an account that already exists.
create or replace function public.thrive_free_access_sync() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.thrive_subscriptions set comped = true, updated_at = now() where lower(email) = new.email;
  elsif tg_op = 'DELETE' then
    update public.thrive_subscriptions set comped = false, updated_at = now() where lower(email) = old.email;
  end if;
  return null;
end $$;
drop trigger if exists thrive_free_access_sync on public.thrive_free_access;
create trigger thrive_free_access_sync after insert or delete on public.thrive_free_access
  for each row execute function public.thrive_free_access_sync();

revoke all on function public.thrive_free_access_on_plan() from public, anon, authenticated;
revoke all on function public.thrive_free_access_sync() from public, anon, authenticated;
