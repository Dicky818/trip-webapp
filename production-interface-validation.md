# Production Interface Validation — 2026-09-08

## Access recovery

The published application now uses the active Supabase publishable key. A fresh authenticated production session loaded the `2026 8月 大阪京都` workspace and displayed only the 01–10 tool-card landing screen. The hero More menu opened above the card grid and showed both `匯出小冊子` and `編輯行程` actions completely within the viewport.

## Numbered tool details

The initial click-through test verified that cards 01–04 and 06–10 each navigate to their own `/tool/<number>` URL and show a `返回工具卡` button. Card 05 was not located during one fast return-to-grid cycle. After the base route completed its render, `05 / STAY` was individually clicked and correctly opened `/tool/05`, with the independent 航班與住宿 detail screen and `返回工具卡` action present.

No trip, expense, booking, receipt, membership, or authentication data was changed during this validation.

## Confirmed production flows

The `返回工具卡` action on the individual Stay detail page returned correctly to the card-only 01–10 screen. The homepage then loaded both requested existing trip cards and the new visible `新增行程` control. The list remains limited to the two current trip cards; opening the New Trip control will be tested without submitting its form.

The `新增行程` control opened an accessible modal with required trip name, start date, end date, and base currency fields, plus `取消` and `建立行程` actions. The form was cancelled without submission. No third trip was created. The live workspace also retained only the 01–10 tool-card landing screen before a card was selected, and its More menu displayed both actions fully above the content.
