-- Browser roles may read normal trip metadata only. Password hashes are used
-- exclusively by SECURITY DEFINER RPCs that generate or validate share access.
REVOKE SELECT ON TABLE trip_planner.trips FROM anon, authenticated;

GRANT SELECT (
  id,
  user_id,
  trip_name,
  start_date,
  end_date,
  base_currency,
  share_code,
  owner_display_name,
  created_at,
  updated_at
) ON TABLE trip_planner.trips TO authenticated;
