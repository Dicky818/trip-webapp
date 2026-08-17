# Tabitime-Inspired Trip Portal — Adaptation Proposal

**Author:** Manus AI  
**Status:** Approval only — no application changes have been made  
**Reference reviewed:** Tabitime Check-in guest portal [1]

## 1. Recommended Design Direction

I recommend evolving Trip-WebApp from an internal-looking travel workspace into a **warm editorial trip portal**. The reference is effective because it concentrates the entire stay into one calm reading surface: a compact identity bar, one dark summary card, an ordered grid of next actions, and a highly visible support path. The proposed Trip-WebApp adaptation should retain that composure while preserving the richer planning, finance, offline, mapping, and collaboration capabilities that a travel-planning product requires.

The resulting product would be named visually as **「旅途作戰桌 / Trip Portal」**, but its tone would become less operational and more guest-facing: friendly, calm, decisive, and easy to scan while travelling. The existing functions would remain intact; this proposal concerns hierarchy, navigation, and surface design rather than any change to travel data, permissions, database logic, or AI behavior.

> **Core principle:** every screen should answer one question before presenting choices: *What matters now, and what is the one next action?*

## 2. What Should Be Borrowed from the Reference

The reference uses a deliberately narrow content column, a quiet warm backdrop, a prominent black information card, numbered cards with short labels, and a contrasting yellow support panel. It also uses language selection as a compact, always-available utility rather than a full settings screen. These patterns create clarity through rhythm and repetition rather than through many visible controls. [1]

| Reference pattern | Why it works | Proposed Trip-WebApp interpretation |
|---|---|---|
| Centered portal surface | Keeps attention on one trip rather than on browser chrome. | Use a readable `max-width` content column for the home portal; retain a wider workspace only for detailed itinerary and maps. |
| Ink-black stay card | Establishes the property, dates, and essential status as the page anchor. | Use a **Trip Pass** with destination, dates, travel day, next stop, team, base currency, and current spending. |
| Numbered two-column cards | Makes a large feature set feel ordered and finite. | Present the six most valuable trip tools as `01–06` cards with short labels and one-line explanations. |
| Warm yellow support panel | Makes help obvious without competing with the main content. | Use a full-width **Travel Support** card for AI guidance, offline/sync status, and urgent trip reminders. |
| Tiny editorial labels | Adds hierarchy without adding controls. | Apply compact labels such as `TRIP / IN PROGRESS`, `NOW / TODAY`, and `05 / GUIDE` consistently. |
| Language pills | Gives multilingual utility an immediately understandable place. | Keep the existing language control, styled as a compact segmented pill group only if multiple languages are operational. |

## 3. What Should *Not* Be Copied Directly

Tabitime is a single-property guest guide, so its nine-card sequence can be linear. Trip-WebApp manages a moving itinerary, shared finance, map planning, packing, and travel documents; it should not force those workflows into an accommodation-style checklist. The new portal must therefore preserve **bottom navigation**, deep links to active workspaces, map context, offline recovery, and the existing collaboration model.

The QR-code invitation, referral promotion, transport sales module, generic culture content, and commercial coupon panels from the reference are not recommended for this application. They would add visual weight without supporting the user’s core planning task. Likewise, yellow should remain a selective action color rather than becoming a decorative background across every card.

## 4. Proposed Information Architecture

### 4.1 Home: Trip Portal

The home screen becomes the primary entry point. It should be a mobile-first vertical journey, with only three content blocks above the existing trip list: the Trip Pass, the Tool Grid, and Travel Support. Users with multiple trips still see their trip cards below these blocks, but they no longer need to decide between several equally prominent blue actions.

| Order | Module | Content | Primary interaction |
|---:|---|---|---|
| 1 | **Identity bar** | Brand mark, “Trip Portal”, home/list link, language control. | Open trip list or switch language. |
| 2 | **Trip Pass** | Destination, date range, `第 N 天`, status, next stop, team, cumulative spend. | `查看今天行程` opens the active day itinerary. |
| 3 | **Tool Grid** | Six numbered high-frequency tools. | Open the selected workspace at its most relevant view. |
| 4 | **Travel Support** | AI help, sync status, pending offline entries, urgent reminder. | Open journey assistant or retry sync. |
| 5 | **My Trips** | Active and archived trip cards. | Open, share, or manage a trip. |

### 4.2 Proposed Tool Grid

The current five-card structure is close to the reference but should become six cards to separate route planning from map wayfinding. This reduces the amount of cognitive work hidden inside a single broad “Plan” label.

| Tile | Label | Emoji cue | Destination | Supporting line |
|---:|---|---|---|---|
| 01 / NOW | 今日路線 | 📍 | Current day itinerary | 下一站、時間與交通 |
| 02 / PLAN | 規劃路線 | 🗺️ | Full itinerary | 每一天的站點與備案 |
| 03 / SPEND | 記錄支出 | 💳 | Expenses | 收據、付款與分帳 |
| 04 / STAY | 航班與住宿 | ✈️ | Booking information | 入住、航班與確認資料 |
| 05 / PACK | 打包清單 | 🎒 | Packing list | 出發前的必要準備 |
| 06 / GUIDE | 旅程助手 | ✨ | AI advice | 依目前資料整理提醒 |

The first tile should always be selected visually. On an active trip, `01 / NOW` has an Ink Black surface with a Journey Yellow completion/status dot. The other five are Paper White cards. If no trip is active, the Trip Pass becomes a short onboarding panel and the first tile becomes `01 / CREATE`.

## 5. Visual System

The existing portal palette should be refined—not discarded—to better match the reference’s tactile editorial tone.

| Token | Value | Intended use |
|---|---:|---|
| Canvas Ivory | `#F5F2E8` | Global background and long-form page surface. |
| Paper White | `#FFFFFF` | Secondary cards, sheets, dialogs, and entry fields. |
| Ink Black | `#111111` | Trip Pass, selected tool card, active bottom-nav state, high-priority information. |
| Journey Yellow | `#FFC91A` | One primary CTA per surface, “today”, completed step, support emphasis. |
| Aged Gold | `#9A7100` | Secondary action text, muted yellow labels, metadata. |
| Route Blue | `#2563EB` | Map data, external links, keyboard focus, informational state only. |
| Quiet Gray | `#78766F` | Descriptions and non-critical metadata. |

The surface model should rely on **large radii, thin warm-gray borders, and low-opacity shadows**. Ink Black panels should contain a very subtle route-grid pattern and a restrained radial yellow glow, never a broad gradient. White cards should lift by 1–2 pixels on desktop hover, while touch devices use a brief pressed state only.

Typography remains **Noto Sans TC** for Chinese and **DM Sans** for English, dates, prices, and labels. The editorial feeling should come from casing, letter spacing, and weight rather than importing another display font. English labels remain short and tracked, for example `01 / PLAN`, `TRIP / ACTIVE`, and `TODAY / 08.17`.

## 6. Per-Screen Adaptation

| Screen | Recommended composition | Controls to reduce or relocate |
|---|---|---|
| Home / portal | Trip Pass → tool grid → support card → trip list. | Keep create/join as secondary text actions beneath the grid. |
| Trip overview | Compact Trip Pass followed by “Today”, team/spend strip, and a small editorial card set. | Move export and edit into `更多`; avoid repeating large summary metrics. |
| Daily itinerary | Black micro-header, current-day context, segmented view switcher, one Journey Yellow `加一站` button. | Keep batch move, duplicate, and calendar export inside contextual tools. |
| Expenses | Date cards scroll horizontally, content vertical within each date; one yellow `新增支出` button. | Keep category management and CSV export inside `更多`. |
| Flights / stays | A compact booking pass with key dates and confirmation state, followed by vertical detail sections. | Avoid multiple equal-weight edit buttons. |
| AI assistant | A yellow support banner leading into a calm white conversation or recommendations surface. | Avoid decorative widgets not tied to a user question or trip reminder. |

## 7. Mobile Interaction Rules

The reference succeeds because every module feels like a complete touch target. Trip-WebApp should adopt the same discipline.

| Interaction | Specification |
|---|---|
| Touch target | Every tappable card and control has at least a 44×44 px reachable area. |
| Primary action | One Journey Yellow primary action per visible workspace surface; use black text and a visible pressed state. |
| Horizontal movement | Only day/date cards move horizontally. Items inside those cards stay vertical, preserving timeline readability. |
| Bottom navigation | Keep five labels with emoji plus text; active state uses Ink Black with Journey Yellow text or indicator. |
| Long press / secondary actions | Use `⋯` menus for low-frequency actions rather than repeating icons beside every row. |
| Install prompt | Show only from the Home Portal; suppress in active trip workspaces so it never covers planning content. |
| Motion | Use 150–220 ms opacity/transform transitions; respect reduced-motion preferences. |

## 8. Accessibility and Content Safeguards

The visual adaptation should preserve text labels beside every emoji and retain contrast between Journey Yellow and Ink Black. Card grids must have meaningful button labels such as `01 / PLAN — 規劃路線` rather than exposing only the emoji. Keyboard focus remains Route Blue, as that distinction is more discoverable than a yellow-only focus ring.

No visual change should alter the existing secure join flow, collaborator permissions, share-password handling, offline queue, receipt-confirmation requirement, or database behavior. The reference should inform **presentation and progressive disclosure only**.

## 9. Recommended Implementation Order

I recommend a measured three-release approach so the highest-value entry experience can be tested before detailed workspaces change.

| Release | Scope | Success criterion |
|---|---|---|
| 1 | Home Portal, Trip Pass, six-tile grid, palette, global header. | A first-time user can identify the active trip and next action in under five seconds. |
| 2 | Trip overview, itinerary, expenses, and support panel hierarchy. | Every high-frequency screen has one unmistakable primary action. |
| 3 | Flight/stay pass, AI support surface, subtle motion and content polish. | The visual rhythm stays consistent without obscuring critical travel data. |

## 10. Decisions Required Before Implementation

Please confirm or amend the following decisions. No interface work will start until you explicitly approve them.

| ID | Decision | Recommended default |
|---|---|---|
| A | Portal label | Keep the existing brand `旅途作戰桌`, with `TRIP PORTAL` as editorial microcopy rather than renaming the product. |
| B | Tool-card count | Expand from five to **six** tools so `今日路線` and `規劃路線` are separate. |
| C | Primary CTA color | Retain Journey Yellow `#FFC91A` as the single primary action color. |
| D | Support card | Add a full-width Journey Yellow support panel for AI, offline status, and reminders; no promotions or coupons. |
| E | Desktop layout | Use a centered, portal-style reading column on Home; retain a wider detail canvas for maps and itinerary workspace. |
| F | Current redesign | Replace the current five-card home layout with the reference-inspired six-card portal rather than layering both systems together. |
| G | Scope boundary | Start with Home, overview, itinerary, expenses, flight/stay, and AI; leave database schemas, RLS, and AI prompts unchanged. |

## References

[1]: https://checkin.tabitime.jp/HMRSYD5KEY "Tabitime Check-in Guest Portal"
