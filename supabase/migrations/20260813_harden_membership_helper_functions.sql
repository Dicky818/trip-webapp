-- Membership lookups may only answer questions about the caller’s own access.
CREATE OR REPLACE FUNCTION trip_planner.check_trip_membership(p_trip_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = trip_planner, auth, public
AS $function$
  SELECT p_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM trip_planner.trip_members
      WHERE trip_id = p_trip_id
        AND user_id = auth.uid()
    );
$function$;

ALTER FUNCTION trip_planner.is_trip_member(uuid)
  SET search_path = trip_planner, auth, public;
ALTER FUNCTION trip_planner.verify_trip_join_allowed(uuid, uuid)
  SET search_path = trip_planner, auth, public;
ALTER FUNCTION trip_planner.verify_share_password(text, text)
  SET search_path = trip_planner, extensions, public;

-- Internal verification helpers must not be exposed as public RPC endpoints.
REVOKE ALL ON FUNCTION trip_planner.verify_share_password(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION trip_planner.verify_trip_join_allowed(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION trip_planner.can_manage_global_categories() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION trip_planner.can_manage_global_categories() TO authenticated;
