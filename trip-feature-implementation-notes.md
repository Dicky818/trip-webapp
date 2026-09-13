# Trip feature implementation notes

This change preserves the existing Tabitime-inspired Trip Portal and existing account-based collaboration model. Rental-car and insurance date ranges remain embedded in the existing `expense_details.detail_data` JSONB record so old expenses and existing RLS remain compatible. Rental cars use `rental_pickup_date` and `rental_return_date`; insurance uses `insurance_start_date` and `insurance_end_date`.

Date ranges are inclusive. A same-day range counts as one billable day. The analysis view allocates amounts in cents and applies any rounding remainder to the final day. This changes analysis presentation only; settlement and per-person split calculations continue to use the original expense total.

Trip-level creator-managed traveler names are stored separately from `trip_members` so collaborators can remain authenticated collaborators without being forced into the traveler list. The database will add `traveler_names` and `deleted_at` to `trip_planner.trips`; only the trip owner can update these settings or soft-delete the trip. Normal trip reads exclude soft-deleted rows.

No test rows, expense records, traveler names, or deletions are written during validation. The migration is idempotent where practical and retains the existing share-code/password RPC flow.


## Follow-up implementation: travelers, historical currency, multi-segment flights

- Creator-managed traveler names are normalized case-insensitively and deduplicated. The creator remains mandatory. Names are merged into expense payer and splitter choices; authenticated collaborators retain UUID mappings where available, while name-only travelers use their display name for settlement.
- Settlement and expense analysis now resolve each expense independently: a stored original amount in the requested currency wins; base currency uses the stored base amount; otherwise the original amount is multiplied by a historical rate for the expense date. Missing rates are excluded from converted totals and reported as `—`/a warning, never mislabeled as the requested currency.
- Historical rates are cached by source currency, target currency, and expense date. Requests are abortable and do not alter stored expense data.
- A flight expense may contain a `segments` JSON array. Each segment stores direction, route, departure date, arrival date, departure/arrival times, departure/arrival offsets, computed duration, and flight number. Legacy flat flight fields are normalized into segments on read and retained for compatibility on write.
- Duration uses local arrival minus local departure minus the arrival-offset minus departure-offset difference. If the arrival instant is earlier than departure, 24 hours is added before applying the offset difference.
- The overview renders the requested columns: direction, route, date, time, flight hours, and flight number.
