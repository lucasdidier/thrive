-- Counters for limits longer than Cloudflare's per-minute rate-limit bindings (server/limits.mjs): emailed
-- sign-in codes per address per day, codes sent per hour site-wide, wrong code guesses per address, form
-- submissions and sign-up alerts per day. Keys are hashes or fixed names, never raw email addresses.
create table if not exists public.thrive_rate_limits (
  key text primary key check (length(key) <= 120),
  window_start timestamptz not null default now(),
  hits integer not null default 0
);
alter table public.thrive_rate_limits enable row level security;
revoke all on public.thrive_rate_limits from public, anon, authenticated;
grant all on public.thrive_rate_limits to service_role;

-- Counts one hit for p_key in a window of p_window seconds; true while the count stays within p_max.
create or replace function public.thrive_rate_hit(p_key text, p_window integer, p_max integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  insert into public.thrive_rate_limits as r (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start < now() - make_interval(secs => p_window) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window) then now() else r.window_start end
  returning hits into n;
  return n <= p_max;
end $$;
revoke all on function public.thrive_rate_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.thrive_rate_hit(text, integer, integer) to service_role;

-- Old counters are deleted nightly.
create or replace function public.thrive_rate_prune() returns void
language sql security definer set search_path = '' as $$
  delete from public.thrive_rate_limits where window_start < now() - interval '2 days';
$$;
revoke all on function public.thrive_rate_prune() from public, anon, authenticated;
grant execute on function public.thrive_rate_prune() to service_role;

-- Receipts only make retries safe; keep them 30 days (older rows have no date and are kept).
alter table public.thrive_receipts add column if not exists created_at timestamptz default now();
create index if not exists thrive_receipts_created on public.thrive_receipts (created_at);

-- Trials: one per person. Plus-tags and Gmail dots don't make a new person.
alter table public.thrive_subscriptions add column if not exists canonical_email text not null default '';
create index if not exists thrive_subscriptions_canonical on public.thrive_subscriptions (canonical_email);
