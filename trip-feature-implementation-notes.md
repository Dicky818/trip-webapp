# Trip feature implementation notes

This change preserves the existing Tabitime-inspired Trip Portal and existing account-based collaboration model. Rental-car and insurance date ranges remain embedded in the existing `expense_details.detail_data` JSONB record so old expenses and existing RLS remain compatible. Rental cars use `rental_pickup_date` and `rental_return_date`; insurance uses `insurance_start_date` and `insurance_end_date`.

Date ranges are inclusive. A same-day range counts as one billable day. The analysis view allocates amounts in cents and applies any rounding remainder to the final day. This changes analysis presentation only; settlement and per-person split calculations continue to use the original expense total.

Trip-level creator-managed traveler names are stored separately from `trip_members` so collaborators can remain authenticated collaborators without being forced into the traveler list. The database will add `traveler_names` and `deleted_at` to `trip_planner.trips`; only the trip owner can update these settings or soft-delete the trip. Normal trip reads exclude soft-deleted rows.

No test rows, expense records, traveler names, or deletions are written during validation. The migration is idempotent where practical and retains the existing share-code/password RPC flow.
