-- Trip-level traveler names and safe soft deletion.
-- Rental-car and insurance dates remain in expense_details.detail_data JSONB;
-- this migration only adds trip-owned settings that require column-level access.

BEGIN;

ALTER TABLE trip_planner.trips
  ADD COLUMN IF NOT EXISTS traveler_names jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE trip_planner.trips
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Existing trips with an owner display name should start with that creator.
UPDATE trip_planner.trips
SET traveler_names = jsonb_build_array(owner_display_name)
WHERE owner_display_name IS NOT NULL
  AND jsonb_typeof(traveler_names) = 'array'
  AND jsonb_array_length(traveler_names) = 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'trips_traveler_names_array_check'
      AND conrelid = 'trip_planner.trips'::regclass
  ) THEN
    ALTER TABLE trip_planner.trips
      ADD CONSTRAINT trips_traveler_names_array_check
      CHECK (jsonb_typeof(traveler_names) = 'array');
  END IF;
END $$;

-- Preserve the protected share_password_hash column while exposing only the
-- fields required by the authenticated frontend.
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
  traveler_names,
  deleted_at,
  created_at,
  updated_at
) ON TABLE trip_planner.trips TO authenticated;

GRANT UPDATE (
  trip_name,
  start_date,
  end_date,
  base_currency,
  share_code,
  owner_display_name,
  traveler_names,
  deleted_at,
  updated_at
) ON TABLE trip_planner.trips TO authenticated;

COMMIT;
