-- Server-validated domain operations write through service_role only. RLS is
-- enabled on every table; the user's JWT may only read its own workspace row.
create table public.thrive_workspaces(owner_id text primary key, revision bigint not null default 0, state bytea not null, updated_at text not null);
create table public.thrive_receipts(owner_id text not null, request_id text not null, hash text not null, result text not null, primary key(owner_id,request_id));
create table public.thrive_events(id bigint generated always as identity primary key,owner_id text not null,revision bigint not null,type text not null,entity text not null,record_id text not null,detail text not null,created_at text not null);
create index on public.thrive_events(owner_id,id);
create table public.thrive_share_links(token_hash text primary key,owner_id text not null,share_id text not null);
create index on public.thrive_share_links(owner_id);
create table public.thrive_form_uploads(id text primary key,owner_id text not null,form_id text not null,question_id text not null,request_id text not null,share_id text not null,form_revision text not null,name text not null,size bigint not null check(size>0 and size<=5242880),object_key text not null,status text not null check(status in ('pending','ready')),created_at bigint not null);
create index on public.thrive_form_uploads(owner_id,created_at);
create table public.thrive_google_connections(owner_id text primary key,account_sub text not null,email text not null,scopes text not null,tokens text not null,updated_at text not null,last_sync text);
create table public.thrive_google_oauth_states(hash text primary key,owner_id text not null,payload text not null,expires_at bigint not null);
create table public.thrive_mail_threads(owner_id text not null,id text not null,client_id text not null,project_id text not null default '',archived integer not null default 0,data text not null,updated_at text not null,primary key(owner_id,id));
create table public.thrive_provider_operations(owner_id text not null,id text not null,hash text not null,status text not null,result text not null,updated_at text not null,primary key(owner_id,id));

do $$ declare t text; begin
 foreach t in array array['workspaces','receipts','events','share_links','form_uploads','google_connections','google_oauth_states','mail_threads','provider_operations'] loop
  execute format('alter table public.thrive_%I enable row level security',t);
  execute format('revoke all on public.thrive_%I from anon, authenticated',t);
  execute format('grant all on public.thrive_%I to service_role',t);
 end loop;
end $$;
grant usage,select on sequence public.thrive_events_id_seq to service_role;
grant select on public.thrive_workspaces to authenticated;
create policy own_workspace on public.thrive_workspaces for select to authenticated using(owner_id='supabase:'||(select auth.uid())::text);

create function public.thrive_bootstrap(p_owner text,p_state bytea,p_links jsonb default '[]') returns void language plpgsql set search_path='' as $$
declare inserted integer; l jsonb;
begin
 insert into public.thrive_workspaces values(p_owner,0,p_state,now()::text) on conflict do nothing;
 get diagnostics inserted=row_count;
 if inserted>0 then
  for l in select * from jsonb_array_elements(p_links) loop
   insert into public.thrive_share_links values(l->>'token_hash',p_owner,l->>'share_id');
  end loop;
 end if;
end $$;

create function public.thrive_commit(p_owner text,p_expected bigint,p_state bytea,p_request_id text,p_hash text,p_result jsonb,p_links jsonb,p_events jsonb) returns jsonb language plpgsql set search_path='' as $$
declare rev bigint; receipt public.thrive_receipts; response jsonb; l jsonb; e jsonb; at text=now()::text;
begin
 select revision into rev from public.thrive_workspaces where owner_id=p_owner for update;
 if not found then raise exception using errcode='PT409',message='Workspace not initialized.'; end if;
 select * into receipt from public.thrive_receipts where owner_id=p_owner and request_id=p_request_id;
 if found then
  if receipt.hash<>p_hash then raise exception using errcode='PT409',message='This request ID was used for a different operation.'; end if;
  return receipt.result::jsonb;
 end if;
 if rev<>p_expected then raise exception using errcode='PT409',message='Workspace changed. Reload before saving.'; end if;
 response=p_result||jsonb_build_object('revision',rev+1);
 update public.thrive_workspaces set state=p_state,revision=rev+1,updated_at=at where owner_id=p_owner;
 insert into public.thrive_receipts values(p_owner,p_request_id,p_hash,response::text);
 for l in select * from jsonb_array_elements(p_links) loop
  insert into public.thrive_share_links values(l->>'token_hash',p_owner,l->>'share_id') on conflict do nothing;
 end loop;
 for e in select * from jsonb_array_elements(p_events) loop
  insert into public.thrive_events(owner_id,revision,type,entity,record_id,detail,created_at) values(p_owner,rev+1,e->>'type',e->>'entity',e->>'record_id',(e->'detail')::text,at);
 end loop;
 return response;
end $$;

create function public.thrive_reserve_upload(p_upload jsonb) returns boolean language plpgsql set search_path='' as $$
declare r public.thrive_form_uploads; total bigint; submission bigint; hourly bigint;
begin
 r=jsonb_populate_record(null::public.thrive_form_uploads,p_upload);
 perform 1 from public.thrive_workspaces where owner_id=r.owner_id for update;
 if not found then return false; end if;
 select coalesce(sum(size),0),coalesce(sum(size) filter(where request_id=r.request_id),0),count(*) filter(where share_id=r.share_id and created_at>r.created_at-3600000) into total,submission,hourly from public.thrive_form_uploads where owner_id=r.owner_id;
 if total+r.size>524288000 or submission+r.size>20971520 or hourly>=100 then return false; end if;
 insert into public.thrive_form_uploads select r.*;
 return true;
end $$;

create function public.thrive_disconnect_google(p_owner text) returns void language plpgsql set search_path='' as $$
begin
 delete from public.thrive_google_connections where owner_id=p_owner;
 delete from public.thrive_google_oauth_states where owner_id=p_owner;
 delete from public.thrive_mail_threads where owner_id=p_owner;
end $$;
create function public.thrive_sync_thread(p_thread jsonb) returns void language plpgsql set search_path='' as $$
begin
 insert into public.thrive_mail_threads(owner_id,id,client_id,data,updated_at) values(p_thread->>'owner_id',p_thread->>'id',p_thread->>'client_id',p_thread->>'data',p_thread->>'updated_at') on conflict(owner_id,id) do update set data=excluded.data,updated_at=excluded.updated_at;
end $$;

-- Postgres grants EXECUTE to PUBLIC by default: explicitly close every RPC.
revoke all on function public.thrive_bootstrap(text,bytea,jsonb) from public,anon,authenticated;
revoke all on function public.thrive_commit(text,bigint,bytea,text,text,jsonb,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.thrive_reserve_upload(jsonb) from public,anon,authenticated;
revoke all on function public.thrive_disconnect_google(text) from public,anon,authenticated;
revoke all on function public.thrive_sync_thread(jsonb) from public,anon,authenticated;
grant execute on function public.thrive_bootstrap(text,bytea,jsonb),public.thrive_commit(text,bigint,bytea,text,text,jsonb,jsonb,jsonb),public.thrive_reserve_upload(jsonb),public.thrive_disconnect_google(text),public.thrive_sync_thread(jsonb) to service_role;

-- No public bucket or direct user upload policies. File access is mediated by
-- Thrive's owner/share checks, question validation, and quota reservation.
insert into storage.buckets(id,name,public,file_size_limit) values('thrive-files','thrive-files',false,5242880) on conflict(id) do nothing;
