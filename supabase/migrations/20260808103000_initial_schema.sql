-- Packfertig: user-owned templates, trips and checklist items
create extension if not exists pgcrypto;

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  description text not null default '', icon text not null default '🎒', color text not null default 'forest',
  created_at timestamptz not null default now()
);
create table public.template_items (
  id uuid primary key default gen_random_uuid(), template_id uuid not null references public.templates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, name text not null check (char_length(name) between 1 and 200),
  position integer not null default 0, created_at timestamptz not null default now()
);
create table public.trips (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid references public.templates(id) on delete set null, name text not null check (char_length(name) between 1 and 100),
  destination text not null default '', start_date date, end_date date, created_at timestamptz not null default now(),
  constraint valid_trip_dates check (end_date is null or start_date is null or end_date >= start_date)
);
create table public.trip_items (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, name text not null check (char_length(name) between 1 and 200),
  packed boolean not null default false, position integer not null default 0, created_at timestamptz not null default now()
);

alter table public.templates enable row level security;
alter table public.template_items enable row level security;
alter table public.trips enable row level security;
alter table public.trip_items enable row level security;
create policy "users_manage_own_templates" on public.templates for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users_manage_own_template_items" on public.template_items for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users_manage_own_trips" on public.trips for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users_manage_own_trip_items" on public.trip_items for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create index templates_user_id_idx on public.templates(user_id);
create index template_items_template_id_idx on public.template_items(template_id);
create index trips_user_id_idx on public.trips(user_id);
create index trip_items_trip_id_idx on public.trip_items(trip_id);

-- Atomically replaces only the current user's data. RLS and auth.uid() protect every write.
create or replace function public.replace_user_data(payload jsonb) returns void language plpgsql security invoker set search_path = '' as $$
declare t jsonb; item jsonb; uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'Authentication required'; end if;
  delete from public.trips where user_id = uid;
  delete from public.templates where user_id = uid;
  for t in select * from jsonb_array_elements(coalesce(payload->'templates', '[]'::jsonb)) loop
    insert into public.templates(id,user_id,name,description,icon,color) values ((t->>'id')::uuid,uid,t->>'name',coalesce(t->>'description',''),coalesce(t->>'icon','🎒'),coalesce(t->>'color','forest'));
    for item in select * from jsonb_array_elements(coalesce(t->'items','[]'::jsonb)) loop
      insert into public.template_items(id,template_id,user_id,name,position) values ((item->>'id')::uuid,(t->>'id')::uuid,uid,item->>'name',coalesce((item->>'position')::int,0));
    end loop;
  end loop;
  for t in select * from jsonb_array_elements(coalesce(payload->'trips', '[]'::jsonb)) loop
    insert into public.trips(id,user_id,template_id,name,destination,start_date,end_date) values ((t->>'id')::uuid,uid,nullif(t->>'templateId','')::uuid,t->>'name',coalesce(t->>'destination',''),nullif(t->>'startDate','')::date,nullif(t->>'endDate','')::date);
    for item in select * from jsonb_array_elements(coalesce(t->'items','[]'::jsonb)) loop
      insert into public.trip_items(id,trip_id,user_id,name,packed,position) values ((item->>'id')::uuid,(t->>'id')::uuid,uid,item->>'name',coalesce((item->>'packed')::boolean,false),coalesce((item->>'position')::int,0));
    end loop;
  end loop;
end; $$;
grant execute on function public.replace_user_data(jsonb) to authenticated;
