begin;
create table if not exists public.thrive_nylas_connections (owner_id text primary key,grant_id text not null unique,email text not null,provider text not null,scopes text not null,updated_at text not null,last_sync text);
create table if not exists public.thrive_nylas_oauth_states (hash text primary key,owner_id text not null,payload text not null,expires_at bigint not null);
alter table public.thrive_nylas_connections enable row level security;
alter table public.thrive_nylas_oauth_states enable row level security;
revoke all on public.thrive_nylas_connections,public.thrive_nylas_oauth_states from public,anon,authenticated;
grant all on public.thrive_nylas_connections,public.thrive_nylas_oauth_states to service_role;
create or replace function public.thrive_disconnect_nylas(p_owner text) returns void language plpgsql set search_path='' as $$
begin
 delete from public.thrive_nylas_connections where owner_id=p_owner;
 delete from public.thrive_nylas_oauth_states where owner_id=p_owner;
 delete from public.thrive_mail_threads where owner_id=p_owner and id like 'nylas:%';
end $$;
revoke all on function public.thrive_disconnect_nylas(text) from public,anon,authenticated;
grant execute on function public.thrive_disconnect_nylas(text) to service_role;
commit;
