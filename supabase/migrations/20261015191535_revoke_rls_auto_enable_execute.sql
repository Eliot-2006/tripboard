-- rls_auto_enable() backs the project's "Enable automatic RLS" event trigger. It is SECURITY DEFINER in the exposed
-- schema, so the Data API lists it as callable. Nobody needs to call it: event triggers fire it without this grant.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
