-- AUTH-5: one user cannot read or change another user's trips or items.
-- Paste into the Supabase SQL Editor (or run with psql). It runs in a transaction that is rolled back, so it leaves
-- nothing behind. Any leak stops it with an error starting "LEAK:". On success the last result row is
-- trips_a_sees = 1, items_a_sees = 1 and every other column 0.

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

-- Logged out: no access at all.
set local role anon;
do $$ begin
  perform 1 from public.trips;
  raise exception 'LEAK: anon can read trips';
exception when insufficient_privilege then null;
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

-- Reads and writes on B's rows match nothing.
with
  renamed as (update public.trips set name = 'hacked' where id = '10000000-0000-4000-8000-00000000000b' returning 1),
  edited as (update public.itinerary_items set title = 'hacked' where id = '20000000-0000-4000-8000-00000000000b' returning 1),
  wiped as (delete from public.itinerary_items where id = '20000000-0000-4000-8000-00000000000b' returning 1),
  dropped as (delete from public.trips where id = '10000000-0000-4000-8000-00000000000b' returning 1)
select
  (select count(*) from public.trips) as trips_a_sees,
  (select count(*) from public.trips where id = '10000000-0000-4000-8000-00000000000b') as b_trips_a_sees,
  (select count(*) from public.itinerary_items) as items_a_sees,
  (select count(*) from public.itinerary_items where id = '20000000-0000-4000-8000-00000000000b') as b_items_a_sees,
  (select count(*) from renamed) as b_trips_renamed,
  (select count(*) from edited) as b_items_edited,
  (select count(*) from wiped) as b_items_deleted,
  (select count(*) from dropped) as b_trips_deleted;

rollback;
