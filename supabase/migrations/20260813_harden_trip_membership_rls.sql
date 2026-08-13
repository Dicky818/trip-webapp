-- Create the owner membership inside the same database transaction as a new trip.
-- The trigger runs with definer privileges; direct client inserts remain unavailable.
CREATE OR REPLACE FUNCTION trip_planner.create_trip_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = trip_planner, public
AS $function$
DECLARE
  v_display_name text;
BEGIN
  SELECT COALESCE(
    NULLIF(NEW.owner_display_name, ''),
    (SELECT NULLIF(up.display_name, '') FROM trip_planner.user_profiles AS up WHERE up.id = NEW.user_id),
    '擁有者'
  )
  INTO v_display_name;

  INSERT INTO trip_planner.trip_members (trip_id, user_id, role, display_name)
  VALUES (NEW.id, NEW.user_id, 'owner', v_display_name)
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_create_trip_owner_membership ON trip_planner.trips;
CREATE TRIGGER trg_create_trip_owner_membership
AFTER INSERT ON trip_planner.trips
FOR EACH ROW
EXECUTE FUNCTION trip_planner.create_trip_owner_membership();

-- Verify credentials and create the collaborator record atomically. A trip ID
-- by itself is never sufficient for membership creation.
CREATE OR REPLACE FUNCTION trip_planner.join_trip_with_share_credentials(
  p_share_code text,
  p_password text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = trip_planner, extensions, public
AS $function$
DECLARE
  v_trip_id uuid;
  v_user_id uuid := auth.uid();
  v_display_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not logged in' USING ERRCODE = '28000';
  END IF;

  SELECT t.id
  INTO v_trip_id
  FROM trip_planner.trips AS t
  WHERE UPPER(t.share_code) = UPPER(BTRIM(p_share_code))
    AND t.share_password_hash = crypt(p_password, t.share_password_hash);

  IF v_trip_id IS NULL THEN
    RAISE EXCEPTION '分享碼或密碼不正確，請重新確認' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(NULLIF(up.display_name, ''), '協作者')
  INTO v_display_name
  FROM trip_planner.user_profiles AS up
  WHERE up.id = v_user_id;
  v_display_name := COALESCE(v_display_name, '協作者');

  INSERT INTO trip_planner.trip_members (trip_id, user_id, role, display_name)
  VALUES (v_trip_id, v_user_id, 'collaborator', v_display_name)
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  RETURN v_trip_id;
END;
$function$;

-- Direct inserts can otherwise bypass the password validation above.
DROP POLICY IF EXISTS tm_self_insert ON trip_planner.trip_members;

-- Clients may rename only their own membership row. They cannot create,
-- reassign, promote, or otherwise alter membership relationships directly.
REVOKE ALL ON TABLE trip_planner.trip_members FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE trip_planner.trip_members FROM authenticated;
GRANT SELECT ON TABLE trip_planner.trip_members TO authenticated;
GRANT UPDATE (display_name) ON TABLE trip_planner.trip_members TO authenticated;
GRANT DELETE ON TABLE trip_planner.trip_members TO authenticated;

-- Membership reads are only available to signed-in owners and collaborators.
DROP POLICY IF EXISTS tm_member_select ON trip_planner.trip_members;
CREATE POLICY tm_member_select
ON trip_planner.trip_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM trip_planner.trips AS t
    WHERE t.id = trip_members.trip_id
      AND t.user_id = auth.uid()
  )
  OR trip_planner.check_trip_membership(trip_members.trip_id, auth.uid())
);

-- Expose only the required authenticated functions; internal trigger helpers
-- and legacy credential functions must not be public RPC endpoints.
REVOKE ALL ON FUNCTION trip_planner.create_trip_owner_membership() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION trip_planner.join_trip_with_share_credentials(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION trip_planner.join_trip_with_share_credentials(text, text) TO authenticated;
REVOKE ALL ON FUNCTION trip_planner.get_trip_id_by_share_code(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION trip_planner.verify_trip_join_allowed(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION trip_planner.check_trip_membership(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION trip_planner.check_trip_membership(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION trip_planner.is_trip_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION trip_planner.is_trip_member(uuid) TO authenticated;
