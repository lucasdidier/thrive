-- Basic product analytics: which pages people open and which buttons they press. First-party, no cookies,
-- no third party. Only names are stored (page "clients", action "new-invoice"), never what people type,
-- record ids or client data. Written by server/analytics.mjs; rows older than 12 months are deleted nightly.
-- (thrive_events is something else: the workspace change log.)
create table if not exists public.thrive_usage (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  owner_id text not null check (length(owner_id) <= 120),
  email text not null default '' check (length(email) <= 254),
  event text not null check (event ~ '^[a-z][a-z0-9_]{0,29}$'),
  page text not null default '' check (length(page) <= 60),
  detail text not null default '' check (length(detail) <= 80)
);
create index if not exists thrive_usage_at on public.thrive_usage (at desc);
create index if not exists thrive_usage_owner on public.thrive_usage (owner_id, at desc);
alter table public.thrive_usage enable row level security;
revoke all on public.thrive_usage from public, anon, authenticated;
grant all on public.thrive_usage to service_role;

-- Read these in the SQL editor:
--   select * from thrive_usage_people;                       -- everyone: last seen, active days, what they use most
--   select * from thrive_usage_daily;                        -- active people per day
--   select * from thrive_usage_pages;                        -- most opened pages, last 30 days
--   select * from thrive_usage_actions;                      -- most pressed buttons, last 30 days
--   select at, event, page, detail from thrive_usage
--     where email = 'name@example.com' order by at desc limit 200;   -- one person's timeline
create or replace view public.thrive_usage_people with (security_invoker = true) as
select max(email) as email,
  min(at) as first_seen,
  max(at) as last_seen,
  count(distinct (at at time zone 'utc')::date) as active_days,
  count(*) filter (where event = 'page') as pages_opened,
  count(*) filter (where event = 'action') as actions,
  (select string_agg(p.page, ', ') from (
     select u2.page from public.thrive_usage u2 where u2.owner_id = u.owner_id and u2.event = 'page'
     group by u2.page order by count(*) desc limit 5) p) as top_pages,
  owner_id
from public.thrive_usage u group by owner_id order by last_seen desc;

create or replace view public.thrive_usage_daily with (security_invoker = true) as
select (at at time zone 'utc')::date as day, count(distinct owner_id) as people, count(*) as events
from public.thrive_usage group by 1 order by 1 desc;

create or replace view public.thrive_usage_pages with (security_invoker = true) as
select page, count(distinct owner_id) as people, count(*) as opens
from public.thrive_usage where event = 'page' and at > now() - interval '30 days'
group by page order by people desc, opens desc;

create or replace view public.thrive_usage_actions with (security_invoker = true) as
select detail as action, page, count(distinct owner_id) as people, count(*) as times
from public.thrive_usage where event = 'action' and at > now() - interval '30 days'
group by detail, page order by people desc, times desc;

revoke all on public.thrive_usage_people, public.thrive_usage_daily, public.thrive_usage_pages, public.thrive_usage_actions from public, anon, authenticated;
grant select on public.thrive_usage_people, public.thrive_usage_daily, public.thrive_usage_pages, public.thrive_usage_actions to service_role;
