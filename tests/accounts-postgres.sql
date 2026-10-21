-- Run only against an isolated database with the migration already applied.
-- Every assertion rolls back its data. Never point this at a production project.
begin;
set local role service_role;
select public.thrive_bootstrap('supabase:11111111-1111-4111-8111-111111111111','\x01');
select public.thrive_bootstrap('supabase:22222222-2222-4222-8222-222222222222','\x02');
select public.thrive_bootstrap('supabase:11111111-1111-4111-8111-111111111111','\xffff');
do $$ declare r jsonb; begin
 if (select state<>'\x01'::bytea from public.thrive_workspaces where owner_id='supabase:11111111-1111-4111-8111-111111111111') then raise exception 'bootstrap overwrote account';end if;
 r=public.thrive_commit('supabase:11111111-1111-4111-8111-111111111111',0,'\x03','request-1','hash','{"ok":true}','[{"token_hash":"only-token","share_id":"share-1"}]','[{"type":"client.created","entity":"client","record_id":"c1","detail":{"eventId":"e1"}}]');
 if r->>'revision'<>'1' then raise exception 'revision did not advance';end if;
 r=public.thrive_commit('supabase:11111111-1111-4111-8111-111111111111',0,'\x04','request-1','hash','{}','[]','[]');
 if r->>'revision'<>'1' or (select count(*) from public.thrive_events)<>1 then raise exception 'replay was not idempotent';end if;
 begin perform public.thrive_commit('supabase:11111111-1111-4111-8111-111111111111',1,'\x04','request-1','different','{}','[]','[]');raise exception 'accepted different replay';exception when sqlstate 'PT409' then null;end;
 begin perform public.thrive_commit('supabase:11111111-1111-4111-8111-111111111111',0,'\x04','request-2','hash2','{}','[]','[]');raise exception 'accepted stale revision';exception when sqlstate 'PT409' then null;end;
 begin perform public.thrive_commit('supabase:11111111-1111-4111-8111-111111111111',1,'\x04','request-3','hash3','{}','[]','[{}]');raise exception 'accepted invalid event';exception when not_null_violation then null;end;
 if (select revision<>1 from public.thrive_workspaces where owner_id='supabase:11111111-1111-4111-8111-111111111111') or (select count(*) from public.thrive_receipts)<>1 then raise exception 'failed transaction was not rolled back';end if;
 if (select revision<>0 or state<>'\x02'::bytea from public.thrive_workspaces where owner_id='supabase:22222222-2222-4222-8222-222222222222') then raise exception 'another account was modified';end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
 if (select count(*) from public.thrive_workspaces)<>1 then raise exception 'RLS leaked another account';end if;
 if exists(select 1 from public.thrive_workspaces where owner_id='supabase:22222222-2222-4222-8222-222222222222') then raise exception 'RLS leaked target account';end if;
 begin perform public.thrive_bootstrap('evil','\x01');raise exception 'RPC allowed direct client writes';exception when insufficient_privilege then null;end;
 begin perform 1 from public.thrive_google_connections;raise exception 'token table accessible';exception when insufficient_privilege then null;end;
 begin update public.thrive_workspaces set revision=99;raise exception 'direct client writes allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform 1 from public.thrive_workspaces;raise exception 'anonymous read allowed';exception when insufficient_privilege then null;end;
 begin perform public.thrive_commit('evil',0,'\x01','evil','hash','{}','[]','[]');raise exception 'anonymous RPC allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$ begin if (select public from storage.buckets where id='thrive-files') then raise exception 'files bucket is public';end if;end $$;
rollback;
