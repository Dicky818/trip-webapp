# Autotrader_Pro Deletion Inventory

**Read-only inventory completed:** 2026-09-08

## Preserved Trip Planner boundary

The active Trip Planner application data is isolated in the `trip_planner` schema. It contains the two trips, members, itinerary, flights, accommodation, expenses, categories, and the related operational tables. These objects are excluded from every proposed deletion.

## Confirmed Autotrader_Pro schema

The dedicated `autotrader_pro` schema contains 18 tables and **31,986 rows** in total. The proposed schema-level removal would delete all of the following tables and their related schema objects:

| Tables with data | Rows |
|---|---:|
| `users` | 1 |
| `bots` | 5 |
| `orders` | 556 |
| `positions` | 549 |
| `equity_snapshots` | 17,352 |
| `alerts` | 933 |
| `user_settings` | 1 |
| `api_credentials` | 2 |
| `trading_logs` | 12,496 |
| `allocation_settings` | 1 |
| `asset_universe` | 45 |
| `asset_scores` | 45 |

The same schema also has seven zero-row tables: `price_cache`, `circuit_breaker_events`, `recon_logs`, `geo_risk_events`, `sentiment_cache`, and `news_sentiment`.

> **Security finding:** RLS is disabled on `autotrader_pro.allocation_settings`, `asset_universe`, and `asset_scores`. Because these tables are in the schema proposed for deletion, no separate RLS remediation is recommended unless the user decides to retain Autotrader_Pro.

## Associated legacy public tables

The `public` schema also contains legacy Autotrader-style table names. All but `public.user_settings` have zero rows. The final deletion confirmation must explicitly choose whether to remove these tables as well, because deleting only `autotrader_pro` would not meet a strict interpretation of “only Trip Planner data remains.”

`storage.buckets` is empty, so no file bucket or stored object needs removal.

## Proposed deletion choices

1. **Schema only:** `DROP SCHEMA autotrader_pro CASCADE;` This removes the confirmed 18-table, 31,986-row dedicated Autotrader_Pro schema only.
2. **Trip Planner only:** Remove the `autotrader_pro` schema **and** the listed legacy public Autotrader-style tables. Supabase platform schemas (`auth`, `storage`, `realtime`, etc.) and `trip_planner` stay intact.

No deletion has been performed.
