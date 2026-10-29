-- AUTH-5: one user cannot read or change another user's trips or items.
-- Share links: logged-out visitors read nothing from the tables, and get_shared_trip() returns no private fields.
-- Paste into the Supabase SQL Editor (or run with psql). It runs in a transaction that is rolled back, so it leaves
-- nothing behind. Any leak stops it with an error starting "LEAK:" (or "FAIL:"). On success the last result row
-- reads "rls_isolation: all checks passed".

begin;

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-00000000000a', 'rls-a@tripboard.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-00000000000b', 'rls-b@tripboard.test', 'authenticated', 'authenticated');
insert into public.trips (id, user_id, name, start_date, end_date) values
  ('10000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000a', 'A trip', '2027-04-10', '2027-04-12'),
  ('10000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000b', 'B trip', '2027-04-10', '2027-04-12');
insert into public.itinerary_items (id, trip_id, type, title, day, position) values
  ('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'activity', 'A item', '2027-04-10', 1000),
  ('20000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-00000000000b', 'activity', 'B item', '2027-04-10', 1000);

-- Trip A is shared, and its item holds every kind of private data. The database picks the token.
update public.itinerary_items
  set notes = 'SECRET-NOTES', confirmation_number = 'SECRET-CONF', estimated_cost = 111.11, actual_cost = 222.22,
      status = 'reserved', payment_status = 'paid', start_location_name = 'Public place',
      start_lat = 35.5, start_lng = 139.5, metadata = '{"category":"restaurant","seat":"SECRET-SEAT"}'
  where id = '20000000-0000-4000-8000-00000000000a';
update public.trips set share_token = gen_random_uuid(), total_budget = 9999 where id = '10000000-0000-4000-8000-00000000000a';
select set_config('app.token', (select share_token::text from public.trips where id = '10000000-0000-4000-8000-00000000000a'), true);

-- Logged out: no access to the tables at all.
set local role anon;
do $$ begin
  perform 1 from public.trips;
  raise exception 'LEAK: anon can read trips';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  perform 1 from public.itinerary_items;
  raise exception 'LEAK: anon can read items';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  perform share_token from public.trips;
  raise exception 'LEAK: anon can read share_token';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  update public.trips set share_token = null;
  raise exception 'LEAK: anon can update trips';
exception when insufficient_privilege then null;
end $$;

-- Logged out with the right token: the trip and its items, and nothing private.
do $$
declare
  shared jsonb := public.get_shared_trip(current_setting('app.token')::uuid);
  hidden text;
begin
  if shared is null then raise exception 'FAIL: a valid token returned nothing'; end if;
  -- IS DISTINCT FROM, not <>: a missing field is SQL null, and `null <> x` would let the check pass.
  if shared #>> '{trip,name}' is distinct from 'A trip' or jsonb_array_length(shared -> 'items') is distinct from 1 then
    raise exception 'FAIL: wrong trip or items: %', shared;
  end if;
  if shared #>> '{items,0,title}' is distinct from 'A item'
     or shared #>> '{items,0,start_location_name}' is distinct from 'Public place'
     or (shared #>> '{items,0,start_lat}')::float8 is distinct from 35.5
     or shared #>> '{items,0,metadata,category}' is distinct from 'restaurant' then
    raise exception 'FAIL: display fields missing: %', shared;
  end if;
  -- Field names (as JSON keys) and values that must never appear anywhere in the result.
  foreach hidden in array array[
    'user_id', 'share_token', 'total_budget', 'estimated_cost', 'actual_cost', 'payment_status', 'confirmation_number',
    'notes', 'seat', 'created_at', 'updated_at', 'trip_id'
  ] loop
    if shared::text like '%"' || hidden || '"%' then raise exception 'LEAK: shared trip has the key %', hidden; end if;
  end loop;
  foreach hidden in array array[
    'SECRET-NOTES', 'SECRET-CONF', 'SECRET-SEAT', '111.11', '222.22', '9999',
    '00000000-0000-4000-8000-00000000000a', current_setting('app.token'), '10000000-0000-4000-8000-00000000000a'
  ] loop
    if shared::text like '%' || hidden || '%' then raise exception 'LEAK: shared trip contains %', hidden; end if;
  end loop;
  if shared #> '{items,0,metadata}' is distinct from '{"category":"restaurant"}'::jsonb then
    raise exception 'LEAK: metadata not reduced to the category: %', shared #> '{items,0,metadata}';
  end if;
end $$;

-- A wrong, null or unshared token returns nothing, and so does B's trip, which is not shared.
do $$ begin
  if public.get_shared_trip('ffffffff-ffff-4fff-8fff-ffffffffffff') is not null then raise exception 'LEAK: unknown token'; end if;
  if public.get_shared_trip(null) is not null then raise exception 'LEAK: null token'; end if;
  if public.get_shared_trip('10000000-0000-4000-8000-00000000000b') is not null then raise exception 'LEAK: a trip id works as a token'; end if;
end $$;

-- Only anon and signed-in users may run it, not the PUBLIC pseudo-role (it is fine to be listed by the Data API).
do $$ begin
  if exists (
    select 1 from pg_proc p, aclexplode(p.proacl) a
    where p.oid = 'public.get_shared_trip(uuid)'::regprocedure and a.grantee = 0
  ) then raise exception 'LEAK: get_shared_trip is granted to PUBLIC'; end if;
  if not has_function_privilege('anon', 'public.get_shared_trip(uuid)', 'execute')
     or not has_function_privilege('authenticated', 'public.get_shared_trip(uuid)', 'execute') then
    raise exception 'FAIL: anon and authenticated must be able to run get_shared_trip';
  end if;
end $$;

-- Signed in as A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

do $$ begin
  insert into public.itinerary_items (trip_id, type, title, day, position)
    values ('10000000-0000-4000-8000-00000000000b', 'activity', 'Injected', '2027-04-10', 2000);
  raise exception 'LEAK: A added an item to B''s trip';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  insert into public.trips (user_id, name, start_date, end_date)
    values ('00000000-0000-4000-8000-00000000000b', 'Planted', '2027-04-10', '2027-04-12');
  raise exception 'LEAK: A created a trip owned by B';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  update public.trips set user_id = '00000000-0000-4000-8000-00000000000b' where id = '10000000-0000-4000-8000-00000000000a';
  raise exception 'LEAK: A handed a trip to B';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  update public.itinerary_items set trip_id = '10000000-0000-4000-8000-00000000000b' where id = '20000000-0000-4000-8000-00000000000a';
  raise exception 'LEAK: A moved an item into B''s trip';
exception when insufficient_privilege then null;
end $$;

-- A cannot choose a token: the database replaces whatever is written, and a share cannot be set on B's trip.
do $$
declare chosen constant uuid := 'ffffffff-ffff-4fff-8fff-ffffffffffff'; stored uuid; touched int;
begin
  update public.trips set share_token = chosen where id = '10000000-0000-4000-8000-00000000000a' returning share_token into stored;
  if stored is null or stored = chosen or stored::text = current_setting('app.token') then
    raise exception 'LEAK: the owner chose or kept the token (%)', stored;
  end if;
  -- That was a rotation: the old link is dead, the new one is live.
  perform set_config('app.old_token', current_setting('app.token'), true);
  perform set_config('app.token', stored::text, true);
  update public.trips set share_token = gen_random_uuid() where id = '10000000-0000-4000-8000-00000000000b';
  get diagnostics touched = row_count;
  if touched <> 0 then raise exception 'LEAK: A shared B''s trip'; end if;
end $$;

-- Revoking: the new link works until A sets the token to null, then it returns nothing. The old link never worked again.
set local role anon;
do $$ begin
  if public.get_shared_trip(current_setting('app.old_token')::uuid) is not null then raise exception 'LEAK: a rotated token still works'; end if;
  if public.get_shared_trip(current_setting('app.token')::uuid) is null then raise exception 'FAIL: the new token does not work'; end if;
end $$;
set local role authenticated;
do $$ begin
  update public.trips set share_token = null where id = '10000000-0000-4000-8000-00000000000a';
  if (select share_token from public.trips where id = '10000000-0000-4000-8000-00000000000a') is not null then
    raise exception 'FAIL: A could not revoke sharing';
  end if;
end $$;
set local role anon;
do $$ begin
  if public.get_shared_trip(current_setting('app.token')::uuid) is not null then raise exception 'LEAK: a revoked token still works'; end if;
end $$;
set local role authenticated;

-- Reads and writes on B's rows match nothing.
do $$
declare counts int[];
begin
  with
    renamed as (update public.trips set name = 'hacked' where id = '10000000-0000-4000-8000-00000000000b' returning 1),
    edited as (update public.itinerary_items set title = 'hacked' where id = '20000000-0000-4000-8000-00000000000b' returning 1),
    wiped as (delete from public.itinerary_items where id = '20000000-0000-4000-8000-00000000000b' returning 1),
    dropped as (delete from public.trips where id = '10000000-0000-4000-8000-00000000000b' returning 1)
  select array[
    (select count(*) from public.trips),
    (select count(*) from public.trips where id = '10000000-0000-4000-8000-00000000000b'),
    (select count(*) from public.itinerary_items),
    (select count(*) from public.itinerary_items where id = '20000000-0000-4000-8000-00000000000b'),
    (select count(*) from renamed),
    (select count(*) from edited),
    (select count(*) from wiped),
    (select count(*) from dropped)
  ] into counts;
  -- A sees their own trip and item, and nothing of B's.
  if counts is distinct from array[1, 0, 1, 0, 0, 0, 0, 0] then
    raise exception 'LEAK: A reached B''s rows. [trips, B trips, items, B items, renamed, edited, deleted items, deleted trips] = %', counts;
  end if;
end $$;

select 'rls_isolation: all checks passed' as result;

rollback;
