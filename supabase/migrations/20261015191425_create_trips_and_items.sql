-- Tripboard V1 schema: trips and their itinerary items (technical doc §5).
-- Every row belongs to one signed-in user. Logged-out visitors get nothing: the demo never touches the database.

-- Trips ---------------------------------------------------------------------------------------------------------------

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  start_date date not null,
  end_date date not null,
  destinations text[] not null default '{}',
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  total_budget numeric(12, 2) check (total_budget >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_end_not_before_start check (end_date >= start_date)
);

create index trips_user_id_idx on public.trips (user_id);

-- Itinerary items -----------------------------------------------------------------------------------------------------

create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  type text not null check (type in ('flight', 'stay', 'activity')),
  title text not null check (length(trim(title)) > 0),
  notes text,
  -- The trip day the item is shown on (check-in day for stays).
  day date not null,
  -- True when the day is known but not the time.
  is_flexible boolean not null default false,
  -- UTC, with the IANA zone saved alongside.
  start_at timestamptz,
  end_at timestamptz,
  start_timezone text,
  end_timezone text,
  start_location_name text,
  start_address text,
  start_lat double precision check (start_lat between -90 and 90),
  start_lng double precision check (start_lng between -180 and 180),
  end_location_name text,
  end_address text,
  end_lat double precision check (end_lat between -90 and 90),
  end_lng double precision check (end_lng between -180 and 180),
  estimated_cost numeric(12, 2) check (estimated_cost >= 0),
  actual_cost numeric(12, 2) check (actual_cost >= 0),
  -- Booking status.
  status text not null default 'planned' check (status in ('idea', 'planned', 'reserved')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  confirmation_number text,
  -- Order within a day.
  position double precision not null,
  -- Type-specific extras, e.g. flight number or room.
  metadata jsonb not null default '{}' check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A paid item is always reserved, so it always counts in the budget (ITEM-7).
  constraint itinerary_items_paid_is_reserved check (payment_status <> 'paid' or status = 'reserved'),
  constraint itinerary_items_end_not_before_start check (start_at is null or end_at is null or end_at >= start_at)
);

-- Reads are one trip at a time, ordered by day then position. Leading with trip_id also covers the foreign key.
create index itinerary_items_trip_day_position_idx on public.itinerary_items (trip_id, day, position);

-- updated_at ----------------------------------------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

create trigger itinerary_items_set_updated_at
  before update on public.itinerary_items
  for each row execute function public.set_updated_at();

-- Access: signed-in users, and only their own rows (AUTH-5) -----------------------------------------------------------

-- New tables are not exposed to the Data API automatically in this project, so grant explicitly.
revoke all on public.trips, public.itinerary_items from anon;
grant select, insert, update, delete on public.trips, public.itinerary_items to authenticated;

alter table public.trips enable row level security;
alter table public.itinerary_items enable row level security;

create policy "Users read their own trips" on public.trips
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users create their own trips" on public.trips
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update their own trips" on public.trips
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own trips" on public.trips
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- An item is the user's when its trip is. The check on update also stops an item moving to someone else's trip.
create policy "Users read items on their trips" on public.itinerary_items
  for select to authenticated
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())));

create policy "Users create items on their trips" on public.itinerary_items
  for insert to authenticated
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())));

create policy "Users update items on their trips" on public.itinerary_items
  for update to authenticated
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())));

create policy "Users delete items on their trips" on public.itinerary_items
  for delete to authenticated
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())));
