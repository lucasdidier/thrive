-- Free trial and subscription per Thrive account (THRIVE_BILLING=paddle, see docs/launch.md › 10).
-- The trial is Thrive's own and needs no card; Paddle only bills once someone subscribes.
-- One row per account, created on the account's first visit. Only the Worker (service_role) writes it.
-- Free access for someone: set comped = true in the Table Editor. Extend a trial: change trial_ends_at.
create table if not exists public.thrive_subscriptions (
  owner_id text primary key check (owner_id like 'supabase:%'),
  email text not null default '' check (length(email) <= 254),
  time_zone text not null default 'UTC' check (length(time_zone) <= 64),
  trial_ends_at timestamptz not null,
  -- Last trial email sent: welcome, 3d, 1d or ended.
  trial_email text not null default '',
  comped boolean not null default false,
  paddle_customer_id text,
  paddle_subscription_id text,
  -- Paddle subscription status: active, trialing, past_due, paused or canceled. Null until subscribed.
  status text,
  period_ends_at timestamptz,
  -- A scheduled cancellation (or pause) takes effect at this time.
  cancel_at timestamptz,
  price_id text,
  -- occurred_at of the last Paddle event applied, so older events never overwrite newer ones.
  event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists thrive_subscriptions_subscription on public.thrive_subscriptions(paddle_subscription_id);
create index if not exists thrive_subscriptions_customer on public.thrive_subscriptions(paddle_customer_id);
alter table public.thrive_subscriptions enable row level security;
revoke all on public.thrive_subscriptions from public, anon, authenticated;
grant all on public.thrive_subscriptions to service_role;

-- Applies a Paddle subscription snapshot from a webhook or a checkout check. An older event for the same
-- subscription is ignored, and an ended subscription never replaces a different one that is still live.
create or replace function public.thrive_apply_subscription(p jsonb) returns boolean language plpgsql set search_path = '' as $$
declare
  s public.thrive_subscriptions;
  at timestamptz := (p->>'event_at')::timestamptz;
  sub text := p->>'subscription_id';
  live boolean := coalesce(p->>'status', '') in ('active', 'trialing', 'past_due');
begin
  insert into public.thrive_subscriptions(owner_id, email, trial_ends_at) values (p->>'owner_id', coalesce(p->>'email', ''), now()) on conflict (owner_id) do nothing;
  select * into s from public.thrive_subscriptions where owner_id = p->>'owner_id' for update;
  if s.event_at is not null and (
    (s.paddle_subscription_id is not distinct from sub and s.event_at > at)
    or (s.paddle_subscription_id is distinct from sub and not live and coalesce(s.status, '') in ('active', 'trialing', 'past_due'))
  ) then
    return false;
  end if;
  update public.thrive_subscriptions set
    paddle_customer_id = coalesce(p->>'customer_id', paddle_customer_id),
    paddle_subscription_id = coalesce(sub, paddle_subscription_id),
    status = p->>'status',
    period_ends_at = (p->>'period_ends_at')::timestamptz,
    cancel_at = (p->>'cancel_at')::timestamptz,
    price_id = coalesce(p->>'price_id', price_id),
    event_at = at,
    updated_at = now()
  where owner_id = p->>'owner_id';
  return true;
end $$;
revoke all on function public.thrive_apply_subscription(jsonb) from public, anon, authenticated;
grant execute on function public.thrive_apply_subscription(jsonb) to service_role;
