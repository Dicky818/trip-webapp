# Trip-WebApp UX Redesign Audit

## Observed Current-State Friction

The current authenticated landing page presents a sparse list of trip cards inside a narrow centered container. Although the actions to create or join a trip are present, the page does not explain the workflow or help a new user choose the next action. The same compact card treatment is used for both active and completed trips, which makes the current trip and its next task less prominent than it should be.

The global header exposes only the trip list and account menu. Once a user opens a trip, orientation, progress, collaboration state, and common actions are dispersed across the trip header, equally weighted tab strip, hidden hover controls, and individual tab pages. On touch devices, hover-only card controls and horizontally scrolling tabs reduce discoverability.

## Redesign Priorities

1. Put one clear primary action in each context: create a trip on an empty home, continue the active trip on a populated home, and add a relevant item inside a trip.
2. Replace feature-based tab discovery with a staged planning flow: Overview, Plan, Spend, Pack, and AI support.
3. Surface collaboration, invitation, progress, and offline states as contextual information rather than hidden utilities.
4. Reduce form overload through progressive disclosure, grouped defaults, photo-first expense entry, and explicit save review.
5. Establish a mobile-first persistent navigation pattern that preserves location and makes the next action reachable with one thumb.
