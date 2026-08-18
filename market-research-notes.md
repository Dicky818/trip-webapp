# Market Research Notes — Travel Planning Benchmark

**Research date:** 2026-08-18. Sources below are official product pages and support documentation.

| Product | Evidence-backed patterns | Implication for Trip-WebApp |
|---|---|---|
| Wanderlog | Combines itinerary and map in one view; positions detailed itineraries, bookings, shared guides, collaboration, flight status, AI, route optimisation, offline access, reservations, packing, and budgeting in one planner. Its FAQ describes role-aware sharing, offline plan access, day filtering on maps, transport-mode changes, route optimisation, confirmation-email import, and print/PDF export. | The strongest direct comparator. Trip-WebApp already covers collaboration, maps, expenses, packing, AI, offline queuing, PDF export, and receipts. It needs clearer place discovery, a more deliberate day/map planning loop, role distinction, and faster booking ingestion. |
| TripIt | Builds a comprehensive itinerary from forwarded booking confirmations, then layers real-time flight alerts, reminders, and in-stop guidance. | The product benchmark is automation and confidence during travel, not merely itinerary storage. Trip-WebApp should prioritise manual confirmation forwarding/import before attempting broad email-account access, then add a trip-day alert surface. |
| Sygic Travel Maps / Tripomatic | Day-by-day itineraries automatically map hotels, activities, transfers, and notes; it describes day-load assessment, offline maps, cross-device sync, guides, and shared editable trips. | Trip-WebApp should calculate a practical daily load from existing start times, travel duration, and number of stops; optionally show “too tight” warnings. |
| Splitwise | Makes groups, equal or unequal splits, balances, debt simplification, default splits, offline mode, cloud sync, receipt scanning, category totals, multiple currencies, itemisation, export, and payment recording explicit. | Trip-WebApp is already unusually strong in contextual expense entry, receipt capture, offline queuing, and a signed-in-user split default. The high-value next gap is a transparent balance/settlement cockpit with explainable multi-currency totals and optional payment recording. |
| TravelSpend | Emphasises offline expense entry, automatic foreign-currency conversion, real-time collaborative sync, group balances, map-linked expenses, budgets, spending insights, and CSV export. | Trip-WebApp should make its existing exchange-rate, budget, receipt, and offline work more visible through a concise spend health panel and map-linked spend drill-down. |
| Google Calendar from Gmail | Gmail-derived events can cover flights, trains, buses, hotels, restaurants, and ticketed events; Google also highlights that privacy/visibility and opt-in settings matter. | Booking import should begin as an explicit, reviewable, least-privilege feature: forward a single confirmation or paste a confirmation text, show parsed fields, and require confirmation before writing trip data.

## URLs

1. Wanderlog homepage — https://wanderlog.com/
2. Wanderlog FAQ — https://wanderlog.com/blog/faq/
3. TripIt homepage — https://www.tripit.com/web
4. Sygic Travel Maps — https://www.sygic.com/travel
5. Splitwise product page — https://www.splitwise.com/
6. TravelSpend product page — https://travel-spend.com/
7. Google Calendar Help: Manage events from Gmail — https://support.google.com/calendar/answer/6084018?hl=en
