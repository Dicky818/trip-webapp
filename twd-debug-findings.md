# TWD display regression findings

Date: 2026-09-13

## Current observations

The supplied screenshot shows the `TRIP / RECOVERY` screen from the published app, meaning the root React error boundary was activated. The current source places that boundary in `src/main.tsx` and renders the recovery card when any render or lazy-load exception escapes the application tree.

A read-only Supabase query found three active, non-deleted trips visible to the authenticated account. All three currently have `base_currency = HKD`; one has 3 expenses, another 93, and another 134. The existing data contains no TWD expenses. Therefore the reported TWD condition is most likely the display-currency preference (`localStorage` key `trip_display_currency`) rather than stored TWD expense rows.

The current analysis page uses `displayCurrency` from localStorage, calls `api.getExchangeRate(base, display)`, then renders `exchangeRate.toFixed(4)` and converted totals. `getExchangeRate` returns an error result when the external exchangerate API fails, while the component currently keeps the previous rate and does not surface a safe fallback. The app should preserve analysis rendering in the base currency and show a non-blocking rate-unavailable notice instead of allowing a render exception.

Read-only production navigation with manually supplied trip ID returned `找不到此行程`; returning to the homepage then loaded the current three visible trips. This suggests the manually supplied route ID did not match the live account/session state and should not be treated as a TWD root cause.

## Safety

No test expenses or database records were inserted or modified. The attached user image was not re-read, per instruction.
