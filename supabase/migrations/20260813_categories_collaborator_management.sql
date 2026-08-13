-- Shared categories are visible to authenticated users. Write access is limited
-- to authenticated users who belong to at least one trip, including collaborators.
CREATE OR REPLACE FUNCTION trip_planner.can_manage_global_categories()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = trip_planner, auth, public
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM trip_planner.trip_members AS tm
      WHERE tm.user_id = auth.uid()
    );
$function$;

GRANT EXECUTE ON FUNCTION trip_planner.can_manage_global_categories() TO authenticated;

DROP POLICY IF EXISTS categories_collaborator_insert ON trip_planner.categories;
DROP POLICY IF EXISTS categories_collaborator_update ON trip_planner.categories;

CREATE POLICY categories_collaborator_insert
ON trip_planner.categories
FOR INSERT
TO authenticated
WITH CHECK (
  trip_planner.can_manage_global_categories()
  AND trip_id IS NULL
  AND NULLIF(BTRIM(name), '') IS NOT NULL
  AND NULLIF(BTRIM(main_category), '') IS NOT NULL
  AND NULLIF(BTRIM(sub_category), '') IS NOT NULL
);

CREATE POLICY categories_collaborator_update
ON trip_planner.categories
FOR UPDATE
TO authenticated
USING (trip_planner.can_manage_global_categories())
WITH CHECK (
  trip_planner.can_manage_global_categories()
  AND trip_id IS NULL
  AND NULLIF(BTRIM(name), '') IS NOT NULL
  AND NULLIF(BTRIM(main_category), '') IS NOT NULL
  AND NULLIF(BTRIM(sub_category), '') IS NOT NULL
);
