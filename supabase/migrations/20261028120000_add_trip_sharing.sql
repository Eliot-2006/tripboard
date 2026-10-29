-- Read-only share links. A trip is shared while trips.share_token is set; the link is /share/<token>.
-- Logged-out visitors still get no table access (no anon grant, no anon policy). They read through one SECURITY
-- DEFINER function that returns a fixed list of fields, so private data cannot leave by adding a column later.

-- The token --------------------------------------------------------------------------------------------------------

-- Null means not shared. Unique, so a token names one trip. The owner turns sharing on and off with their existing
-- update policy; nothing else about access to trips changes.
alter table public.trips add column share_token uuid unique;

-- The database picks every token. A client can ask for a new one by writing any value, but never chooses it, so a
-- token is always unguessable and an owner cannot probe for other trips' tokens through the unique constraint.
create function public.set_share_token()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.share_token is not null and (tg_op = 'INSERT' or new.share_token is distinct from old.share_token) then
    new.share_token := gen_random_uuid();
  end if;
  return new;
end;
$$;

create trigger trips_set_share_token
  before insert or update of share_token on public.trips
  for each row execute function public.set_share_token();

-- The public read -----------------------------------------------------------------------------------------------------

-- Returns the shared trip and its items as {trip, items}, or null for an unknown, null or revoked token.
-- Every field is listed here. Never returned: user_id, share_token, total_budget, estimated_cost, actual_cost,
-- payment_status, confirmation_number, notes, timestamps, and all metadata except the restaurant category, which is
-- the only metadata key the page reads.
create function public.get_shared_trip(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'trip', jsonb_build_object(
      'name', t.name,
      'start_date', t.start_date,
      'end_date', t.end_date,
      'destinations', t.destinations,
      'currency', t.currency
    ),
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', i.id,
            'type', i.type,
            'title', i.title,
            'day', i.day,
            'is_flexible', i.is_flexible,
            'start_at', i.start_at,
            'end_at', i.end_at,
            'start_timezone', i.start_timezone,
            'end_timezone', i.end_timezone,
            'start_location_name', i.start_location_name,
            'start_address', i.start_address,
            'start_lat', i.start_lat,
            'start_lng', i.start_lng,
            'end_location_name', i.end_location_name,
            'end_address', i.end_address,
            'end_lat', i.end_lat,
            'end_lng', i.end_lng,
            'status', i.status,
            'position', i.position,
            'metadata', case
              when i.metadata ->> 'category' = 'restaurant' then jsonb_build_object('category', 'restaurant')
              else '{}'::jsonb
            end
          )
          order by i.day, i.position
        )
        from public.itinerary_items i
        where i.trip_id = t.id
      ),
      '[]'::jsonb
    )
  )
  from public.trips t
  -- A null token matches nothing, and neither does a trip that is not shared (its share_token is null).
  where t.share_token = p_token;
$$;

-- New functions are executable by everyone (and exposed by the Data API) until revoked. Only this one is public.
revoke all on function public.get_shared_trip(uuid) from public, anon, authenticated;
grant execute on function public.get_shared_trip(uuid) to anon, authenticated;
