-- Site visits on the public pages (landing page, blog, sign-in), counted without cookies or personal data:
-- no IP address, no user agent, no identifier. One row per page view; "new_session" marks the first view in a
-- browser tab session, which is what the daily digest calls a visit. Written by server/visits.mjs from
-- public/visit.js; rows older than 13 months are deleted nightly.
create table if not exists public.thrive_visits (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  path text not null check (length(path) <= 120),
  lang text not null default '' check (length(lang) <= 8),
  referrer text not null default '' check (length(referrer) <= 120),
  source text not null default '' check (length(source) <= 60),
  medium text not null default '' check (length(medium) <= 60),
  campaign text not null default '' check (length(campaign) <= 80),
  country text not null default '' check (length(country) <= 2),
  device text not null default '' check (device in ('', 'mobile', 'desktop')),
  new_session boolean not null default false
);
create index if not exists thrive_visits_at on public.thrive_visits (at desc);
alter table public.thrive_visits enable row level security;
revoke all on public.thrive_visits from public, anon, authenticated;
grant all on public.thrive_visits to service_role;

-- In the SQL editor:
--   select * from thrive_visits_daily;     -- visits and page views per day
--   select * from thrive_visits_sources;   -- where visitors came from, last 30 days
create or replace view public.thrive_visits_daily with (security_invoker = true) as
select (at at time zone 'Europe/Lisbon')::date as day,
  count(*) filter (where new_session) as visits, count(*) as page_views
from public.thrive_visits group by 1 order by 1 desc;

create or replace view public.thrive_visits_sources with (security_invoker = true) as
select coalesce(nullif(source, ''), nullif(referrer, ''), 'direct') as source, count(*) as visits
from public.thrive_visits where new_session and at > now() - interval '30 days'
group by 1 order by 2 desc;

revoke all on public.thrive_visits_daily, public.thrive_visits_sources from public, anon, authenticated;
grant select on public.thrive_visits_daily, public.thrive_visits_sources to service_role;
