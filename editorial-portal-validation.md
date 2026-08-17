# Editorial Portal Redesign — Validation Record

## Desktop production review

The published portal redesign was reviewed in an authenticated production session after a browser-level cache-bypassing reload. The previous PWA/browser bundle remained visible until a hard reload, after which the current build rendered correctly.

The home screen now presents an Ink Black journey pass with the active trip name, date range, trip-day status, next stop, team count, cumulative base-currency spend, and a single Journey Yellow route CTA. Below it, the five approved numbered tool cards render in the expected editorial order: PLAN, SPEND, PACK, STAY & FLIGHT, and ASSIST. The first card carries Ink Black emphasis; the remaining cards use Paper White, subtle borders, and restrained lift-on-hover.

The compact installation prompt is visually subordinate above the bottom edge, uses a Journey Yellow install action, and does not cover the journey pass or tool cards in the desktop review. No production travel data was created or changed during this visual review.

## iPhone-sized review

At a 393×852 touch viewport, the home portal preserves the intended editorial hierarchy: the journey pass has a clear safe margin, all five tool cards remain readable in a two-column grid, the fifth card retains its intended single-column width, and the secondary collaboration actions do not compete with the primary route CTA. The active and archived trip cards remain fully legible below the portal surface.

The workspace pass, day-route segmented control, Journey Yellow add-stop control, and bottom dock all fit without horizontal overflow. One issue was found: the global install prompt can cover the active itinerary’s day context in a detailed trip workspace. The prompt should therefore remain available from the home portal but stay suppressed while a user is actively planning or recording data inside a trip.

After the focused-workspace prompt refinement, the iPhone-sized trip capture confirms that the itinerary header, selected-day context, add-stop action, vertical daily content, and bottom navigation all remain unobstructed. The install prompt is available from the home portal but no longer intrudes during active trip planning. No production travel data was created or changed during the mobile review.
