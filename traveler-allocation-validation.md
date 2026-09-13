
## Production homepage validation — 2026-09-13

Release URL: https://dicky818.github.io/trip-webapp/?release=75a15bb&cache=202609130810

The authenticated production homepage loaded successfully without the recovery screen. It displayed three accessible trips in the current account session: 2027 Sapporo, 2026 8月 大阪京都, and 2026 6月京都. The homepage displayed 新增行程, and owner cards exposed 分享行程 and 移除行程 controls. No write action was performed during this check.

## Production overview validation

The latest release opened the 01 / OVERVIEW route successfully. The owner view showed the creator Dicky, an input field labelled 輸入同行者姓名／名稱, and an 加入 button with the message that additions sync to payer, split members, and settlement. No write action was performed.

The same view rendered the flight table with columns 方向, 航線, 日期, 時間, 飛行小時, 航班編號. Existing segments without stored time-zone offsets safely displayed `—` for duration rather than inventing a duration.

## Production spend-list validation

The latest 04 / SPEND route loaded successfully with three existing expenses: flight HKD 3,706.00, rental car HKD 746.90, and insurance HKD 408.00. The page exposed 支出分析 and 分帳結算 tabs. No expense was edited or created during validation.

## Production expense-analysis validation

After switching the display currency to HKD for a no-write check, the analysis rendered the existing total HKD 4,860.90. The rental-car row showed HKD 746.90 on 1/13 and the insurance row showed HKD 408.00 on 1/13 because the current existing records have only one effective item date; the analysis kept the complete totals and did not alter settlement data. The TWD state remained safe: before switching back, the page showed a missing-rate warning and `—` rather than a mislabeled TWD value.
