# Supabase Access Recovery — 2026-09-08

## Confirmed cause

After the Autotrader_Pro cleanup, the PostgREST exposed-schema setting still referred to the removed schema. The stale setting caused `503` schema-cache failures. The dedicated schema exposure was reset to `public, trip_planner` and all user-facing role search paths now use `trip_planner, public`.

The locally recovered legacy anon API key was also rejected by the live Data API even though it was marked enabled in the management inventory. The active publishable key successfully completed an authenticated, RLS-protected no-write request to `trip_planner.trips`.

## Applied recovery

1. Restored `authenticated` SELECT on `trip_planner.trips`; RLS remains enabled on all Trip Planner application tables.
2. Configured PostgREST to expose only `public, trip_planner`.
3. Rebuilt and published the frontend with the active Supabase publishable key.

## Production check

The fresh authenticated production session loads `2026 8月 大阪京都` correctly and renders the card-only `01 / OVERVIEW` through `10 / DEPARTURE` workspace. No trip, expense, booking, membership, receipt, or authentication data was modified during browser validation.
