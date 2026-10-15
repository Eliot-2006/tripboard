-- The project's default privileges also give signed-in users TRUNCATE, TRIGGER and REFERENCES. TRUNCATE ignores RLS,
-- so keep their access to the reads and writes the policies govern.
revoke truncate, trigger, references on public.trips, public.itinerary_items from authenticated;
