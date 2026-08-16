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

## Production Validation

The deployed redesigned home screen now renders the selected task-rail direction: a dark active-trip panel names the current trip and its next context, while the two secondary actions are clearly labelled as joining a shared trip or creating a new one. Active and completed trip cards remain visible below the action panel but no longer compete with the primary continuation route. The production bundle was confirmed after clearing a stale service worker in the review browser.

The redesigned desktop trip workspace renders a persistent journey sidebar, a compact dark trip header, an explicit current-section panel, and a high-contrast overview status block. The expense section retains its existing data and settlement capabilities but is now entered through the clearer “記錄支出” route. The redesigned new-expense form is structured as: optional receipt scan, identify the item, record amount and payer, then an optional disclosure for splitters, exchange-rate adjustment, and booking state. No production data was created during review.

Opening the new-expense form in production confirmed that the receipt action, category selectors, currency selector, all five trip members as payer controls, and the optional split/rate/booking disclosure are available before submission. The review browser reported no client-console errors. The form was not completed or saved.

## Mobile Cache Follow-up

An iPhone screenshot showed the pre-redesign layout even though the current production service worker precaches the redesigned `index-B4MMNiaS.js` bundle. A clean review session registered the active production worker with no waiting worker and verified that its precache manifest contains that redesigned bundle. The discrepancy is therefore isolated to an existing iOS Safari/PWA cache on the affected device rather than a failed GitHub Pages deployment. A safe remediation should preserve current offline caching while making post-deployment update checks more explicit for future releases; the affected installation still needs a one-time local website-data or Home Screen app reset.

The post-remedy deployment publishes a new main bundle and retains the previous worker until an existing client performs its one-time update transition. A review session deliberately controlled by the immediately preceding worker continued to serve the preceding bundle, confirming that users who are already pinned to an old iOS worker still need the one-time local reset described above. Once the updated client is installed, foreground and focus events perform an update check with `updateViaCache: 'none'` for future releases.

After unregistering the previous worker and clearing its two browser caches in a controlled review session, the production route loaded the redesigned home shell again. This verifies that the deployment is reachable after a one-time reset; the initial data request naturally begins with the empty-state shell before the authenticated trip list resolves.

The clean production session subsequently resolved both authenticated trips and ran `index-Bk4Vvk-k.js`, the bundle that contains the foreground service-worker update check. The new service worker is active and controls the current `/trip-webapp/` scope.

## Google Maps Follow-up

The itinerary map error was reproduced from the authenticated production trip workspace. The affected map uses the Google Maps JavaScript API directly from the browser with a public client key and loads the Places and Geocoding libraries. The visible Google diagnostic indicates a Google Cloud project authorization or billing restriction rather than a missing itinerary coordinate or ordinary React rendering failure. The next diagnostic step is to capture the precise Maps JavaScript API error from the browser console and compare it against the allowed referrer and enabled-API configuration.

The map tab renders its markers, tiles, and control surface but overlays Google’s “this website cannot load Google Maps correctly” owner dialog. This confirms that the API key reaches the Maps JavaScript API and that the failure is associated with the project behind the key, not with an absent browser key value. The map currently requests the Maps JavaScript API with both `places` and `geocoding` libraries.

The authenticated Google Cloud console is reachable for the key’s project, labelled “My First Project.” Its Maps Platform overview records requests for Routes, Geocoding, and Places APIs, while Maps JavaScript API has no successful request value. The initial account evidence therefore points to Maps JavaScript API being disabled, blocked by API-key restrictions, or blocked by the project’s billing configuration; the enabled-APIs and key-restriction pages remain the authoritative checks before any configuration change.

The APIs and services catalog is now fully loaded and shows an enabled product grid. The specific Maps JavaScript API product is not visible in the initial viewport, so its enabled status must still be determined with the catalog filter before making any changes.

The API catalog confirms that Maps JavaScript API is enabled: the product presents a “Disable” control rather than an enable action. This rules out a disabled Maps JavaScript API as the immediate cause. The remaining likely account-side causes are an API key restricted to an incorrect browser referrer, a key that excludes Maps JavaScript API, or a missing/suspended billing account. The initial Maps-specific credential URL did not preserve the project context, so the standard project credentials route will be used for the restriction check.

The standard Cloud credentials route failed to resolve a project context despite the valid project identifier in the URL, so it cannot presently expose the key restriction details. Because the Maps JavaScript API is confirmed enabled and the in-map diagnostic includes the development-use warning, the billing state is now the highest-probability cause to verify through the working Google Maps Platform navigation.

The direct Maps JavaScript API loader check returns `UrlAuthenticationCommonError` when no approved browser referrer is sent. This is compatible with an intentionally restricted browser key and does not by itself establish a production failure. The next safe diagnostic is to repeat the loader request with the exact deployed GitHub Pages origin as the referrer; a failure there would confirm that the authorized referrer list is missing or malformed for the production site.

The production-referrer test was also rejected with `UrlAuthenticationCommonError` when sent with `https://dicky818.github.io/trip-webapp/`. The deployed site’s actual browser origin is therefore not authorized for the configured map key. Maps JavaScript API is already enabled; the required remedy is an API-key website-referrer correction, not a frontend code change. The key should remain application-restricted to `https://dicky818.github.io/*` and API-restricted to only the Maps products used by the app.

The user has approved the least-privilege referrer correction. The authenticated Google Maps Platform project console is open; changing the key restriction and saving it remains the only planned external configuration action.

The browser key configuration confirms the key currently uses website restrictions and contains the literal entry `https://dicky818.github.io/trip-webapp/`. It is API-restricted to 33 APIs. Since the production-referrer loader test still fails, the existing exact-path restriction is not being accepted reliably by the Google Maps loader. The approved correction will replace it with the origin-wide but still domain-locked rule `https://dicky818.github.io/*`; the existing API restrictions will not be broadened during this change.

The approved referrer correction has been saved successfully. The key remains website-restricted and continues to expose the same 33 API restrictions; only the authorized referrer changed from the exact GitHub Pages path to `https://dicky818.github.io/*`. Google Cloud notes that key restriction updates may take up to five minutes to propagate, so production verification will be repeated after the change reaches the Maps JavaScript API edge.

An immediate loader test still returns `UrlAuthenticationCommonError`, which is expected during the documented propagation interval. No additional API restrictions have been removed and no source code or deployment change is required for this account-side remedy.

Further production-bundle inspection identified the remaining root cause: both Maps loader variables in the live itinerary chunk were compiled as empty strings. The Google Cloud key was therefore correctly restricted but never supplied to the browser script. With the user’s approval, the same browser-restricted key has been added through a single shared client configuration module and imported by both the map canvas and Places autocomplete loaders. The Google Cloud configuration confirms the replacement key remains constrained to `https://dicky818.github.io/*` and retains its existing API restrictions. The corrected build completes successfully and all 17 automated tests pass.

The corrected build has been committed as `92756bd` and published to GitHub Pages. A clean production browser session loads the current redesigned application bundle and renders the authenticated trip list successfully; itinerary-map verification is the remaining validation step.

The newly deployed production map now receives the configured browser key and renders Google map tiles, navigation controls, route markers, and itinerary points. However, Google still overlays its authorization dialog and the direct Maps JavaScript API loader test still yields `UrlAuthenticationCommonError`. The Google Cloud project has a billing account linked. The remaining diagnostic is to verify the active key’s explicit API allow-list; no further restriction will be relaxed without the user’s confirmation.

Google Cloud’s credential UI confirmed that the active key permits Maps JavaScript API among its selected APIs and displays the documented exact-origin syntax for a single domain. With the user’s approval, the website restriction was tightened from `https://dicky818.github.io/*` to `https://dicky818.github.io`; all existing API restrictions remain unchanged. Google indicates that the saved setting may take up to five minutes to take effect, so final production verification is pending propagation.

After an initial three-minute propagation interval, the Maps JavaScript loader still reports the generic `UrlAuthenticationCommonError`. The linked Cloud Billing account is visible in the Maps Platform billing area. A separate Geocoding REST probe is intentionally rejected because that server-oriented endpoint cannot use a referer-restricted browser key; this does not invalidate the Maps JavaScript API configuration. Final verification will use a fresh browser session only after the full Google-documented propagation interval.

After the full propagation window, a fresh production browser session confirms the repair: the itinerary map renders tiles, navigation controls, itinerary markers, and the location list without the Google authorization dialog. The browser console is clean. The final security posture remains a browser-visible but Google-restricted key, restricted to the exact `https://dicky818.github.io` origin and to the existing selected Maps APIs.

## First interaction release — completed

The first interaction release implements three high-frequency feedback loops: offline work is now represented by a persistent status card that explains whether work is stored locally, waiting to sync, or actively syncing; new online expense saves return the user to the list, highlight the created record, and offer a time-bounded safe undo; and the four overview summary cards now provide keyboard-accessible routes into the relevant workspace. The global toast primitive now supports an optional recovery action and uses responsive placement so it clears the mobile bottom navigation.

Production validation used a clean explicit `index.html` entry after removing stale test-browser service-worker assets. The summary-card path from total spend to the expense workspace worked, and an offline browser event displayed the expected persistent copy without creating or altering any production expense. A provider-order regression in the first implementation caused a blank app shell because `OfflineIndicator` consumed the app feedback context outside `AppProvider`; it was fixed by placing the indicator inside the authenticated provider, then rebuilding, type-checking, testing, and republishing. The final local and production builds mounted successfully.

## No-write browser validation — completed

The current production test session is running `index-DubFzUBo.js`, the corrected interaction-release bundle. The four overview cards are exposed as keyboard-accessible buttons; the total-expense card opened the expense workspace and the travel-duration card opened the itinerary workspace without creating, editing, or deleting trip data. A synthetic browser offline event displayed the persistent “離線儲存已開啟” message with the local-save explanation. The corresponding online event completed with an empty queue and did not write data. The next validation step is limited to opening, but not submitting, the expense form to confirm that the recovery-facing entry point remains available.

The production new-expense form opened correctly, retained its progressive two-step structure and explicit “你確認後才會儲存” message, and exposed the final cancel and save controls. The form was closed through its Cancel control with no field input and no submission. The post-save auto-location, highlight, and seven-second undo are covered by the compiled type-checked success path, but were deliberately not executed against the user’s real expense data during no-write validation.

## Approved end-to-end recovery validation — in progress

With explicit user authorization, a zero-value test expense was prepared in the production form using the note “測試：互動驗證（將立即復原）”. The form retained the default date, default main category, default payer, and `0` amount. The input values were checked immediately before submitting through the form’s Save control. The following validation steps must observe the expected list focus/highlight and undo control, then invoke undo and prove that this temporary record no longer remains.

The first save attempt did not submit because the transport subcategory remained empty, so no test record had yet been written. The form requirement was inspected, the temporary record was assigned the valid “巴士” subcategory, and the user-approved save was retried. This preserves the test’s scope while also confirming that the progressive form does not silently write incomplete expense data.

The retried test confirmed a validation mismatch: the amount input exposed `min="0"`, but the save guard rejected `0`. The guard has been corrected to accept finite values of zero or above and to continue rejecting blank, invalid, and negative amounts. The updated production build and TypeScript check passed, and all 17 automated tests remain green. The correction must be published before retrying the approved end-to-end test.

The corrected release was published and fetched from the GitHub Pages entry as `index-iXaJNc32.js`. The isolated production browser initially displayed a stale blank screenshot, but DOM inspection confirmed that the current bundle had mounted the authenticated workspace. The expense workspace and its Add Expense action were then available in the fresh current bundle for the retried approved test.

The corrected production form accepted and saved the approved `HKD 0.00` record with the labelled note and valid “交通／巴士” category. The list navigated to the newly created 2026-08-16 record and showed it as the newest item, confirming the save and list-focus path. The follow-up inspection occurred after the seven-second recovery interval, so the temporary undo control was no longer available. The test record must now be removed through the approved cleanup path, and the undo timing needs a deliberately immediate retry after cleanup.

The expired temporary record was removed through its normal delete confirmation, using the user-approved cleanup path. A subsequent production DOM check returned no remaining occurrence of the labelled test note. The next iteration will submit the same zero-value record and inspect/click the undo control within its seven-second window.

On the second iteration, the current production form saved another zero-value test record successfully. The initial 700ms check was too early for the asynchronous list refresh and toast rendering; a subsequent DOM check confirmed the record, while the recovery window had then expired. Source inspection confirms that the `復原` action is attached to the success toast only after the list refresh completes. A final retry will monitor the DOM continuously after save and invoke the recovery action immediately when it appears.

The second expired test record was removed through the normal confirmation flow. No real expense information was modified; the remaining final retry will use the same labelled zero-value record and an in-browser polling check so that it can invoke the recovery control as soon as the asynchronous success toast appears.

The final approved retry completed successfully. The zero-value record was saved, appeared in the list, and received the intended focus/highlight treatment (`bg-blue-50/70`, blue border, blue focus ring, and shadow). The asynchronous `復原` action appeared after approximately 924ms, was invoked immediately, and the temporary record was absent again approximately 1.23 seconds after save. This confirms the end-to-end saved-item focus, visual feedback, seven-second recovery action, and deletion cleanup flow. No labelled test record remains.

## Minimal interaction redesign audit — current scope

The active trip workspace currently has multiple competing navigation signals: a global trip header, a five-item desktop sidebar, a separate current-location card with a second “next action,” four interactive summary cards, and a five-item bottom navigation on mobile. This gives users useful orientation, but it repeats the same decision at several levels. The redesign should retain the five core destinations while giving each page one obvious primary action and moving low-frequency tools behind contextual menus.

The Overview duplicates trip status in both the workspace header and the status panel, then expands all members, flights, accommodations, and bookings in a single scrolling surface. This causes the most time-sensitive information to compete with reference details. The redesign should lead with a single “Today / next stop” card and one compact trip-health row; flight, stay, and booking details should become condensed, expandable groups with an explicit view-all path.

The Expense list exposes four equal-weight sub-tabs, a three-button toolbar, per-row settled/drag/edit/delete controls, and a detailed progressive form. Its frequent task is recording a new expense; category management and CSV export are low-frequency utilities and should be consolidated into an overflow menu. The list needs a single prominent “Add expense” action and a lighter row treatment where secondary controls appear only on hover, focus, or a touch-friendly overflow menu.

The Itinerary uses a day selector, list/map/timetable modes, per-item drag, map, edit, and delete controls, plus batch movement, copying, alternatives, weather, and transport affordances. All capabilities are valuable but should not be exposed concurrently. The redesign should frame the screen around the selected day, use a compact three-way view switcher, surface only the primary “Add stop” action, and put item management into a contextual menu or deliberate edit mode. Emoji may be used sparingly as a scan cue in labels such as “📍 下一站,” “💳 新增支出,” and “🎒 打包,” but every emoji must retain a textual label and no control should rely on emoji alone.

The published minimalist release was confirmed in a clean production session after clearing the previous production service worker cache. The trip header now shows only identity, status, dates, and a compact “更多” menu; the desktop rail uses concise emoji-plus-text destinations rather than repeated descriptions. The overview leads with one “📍 查看今天路線” action and a compact three-part health row. The expense workspace presents “💳 新增支出” as its visible primary action, while category management and CSV export sit in a contextual menu; each expense row now groups edit and delete beneath a touch-friendly overflow control.

The itinerary workspace now loads with one visible “📍 加一站” primary action, a compact list/map/timetable switcher, and a contextual menu for cross-day movement, duplication, and calendar export. Existing day-level actions, map behavior, item content, weather status, and transport information remain available; the redesign changes their visual priority rather than removing travel data or planning capabilities.

## iOS Safari-sized preview — pending refinements

Authenticated iPhone-sized captures at 393×852 CSS pixels confirm that the header, primary overview action, three-item health row, segmented controls, compact tool menus, and five-item bottom navigation all fit without horizontal overflow. The primary actions remain reachable above the bottom navigation, and the high-contrast Route Blue action treatment is legible on the small screen.

Two refinements are warranted before final mobile sign-off. First, the persistent PWA install prompt occupies a large portion of the lower viewport and obscures the first expense rows and itinerary details; it should be converted to a shorter mobile prompt placed above the navigation safe area. Second, the per-day plus button in the itinerary header duplicates the new global “📍 加一站” action; removing the redundant day-level control will reduce mobile decision noise without reducing the ability to add a stop to the selected day. The bottom navigation should also receive explicit `safe-area-inset-bottom` padding for standalone iOS installations.

The PWA prompt has been refined into a single-line mobile install cue: it now uses a compact icon, “離線也能使用” label, one clear install action, and an accessible close control rather than separate install and defer actions. It is positioned above the existing safe-area-aware bottom navigation. The redundant per-day add button has been removed, leaving the contextual “📍 加一站” action as the single itinerary creation point. The existing mobile navigation already applies `env(safe-area-inset-bottom)` padding; this was confirmed in source during the review. The refined build, TypeScript check, and all 17 automated tests passed.

After publication, iPhone-sized authenticated captures confirmed the refinements. The compact install prompt now occupies a small single-row band above the bottom navigation rather than covering the expense and itinerary workspaces. The expense screen retains a visible add action and readable segmented controls, while the itinerary screen now shows only one “📍 加一站” action beside its compact utility menu. The five-item bottom navigation remains visible and separated from content at the safe area. No horizontal overflow or clipped controls appeared in the 393×852 CSS-pixel review captures.

## Horizontal lane and split-default update

Daily itinerary stops and date-grouped expense records now render as snap-aligned horizontal card lanes. Each card uses a 78vw maximum touch width, intentionally leaves the next card partially visible, and presents a small “↔ 滑動” cue when a lane contains more than one item. The existing drag handles are retained for reordering while the surrounding lane remains swipeable; transport cards follow their corresponding itinerary stops in the same lane. New expenses now select only the signed-in trip member as the default split participant, with a visible “預設：你本人” explanation and unchanged collaborator toggles for users who need to share the expense. The verified build, TypeScript check, and 17 automated tests passed.

The initial 393×852 mobile capture confirmed that expense cards occupy an appropriate touch width and the horizontal lane is available. It also found that the itinerary header’s inline swipe cue can wrap alongside a two-line activity count. The cue will be moved to its own small line immediately above the itinerary lane so the day header remains visually stable.

The final 393×852 production capture confirms the corrected treatment: “7 項活動” now remains on a single compact line in the day header, while the dedicated “← 左右滑動查看下一站 →” cue remains legible beneath the accommodation selector. The expense and itinerary lanes expose the intended snap-enabled horizontal scrolling without horizontal page overflow or clipped primary controls.
