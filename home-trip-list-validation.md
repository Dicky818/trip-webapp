# Homepage Trip List Validation — 2026-09-08

The former homepage restriction explicitly filtered the authenticated trip list to `2026 8月 大阪京都` and `2026 6月京都`. The source now renders every non-deleted trip returned by the existing owner-and-collaborator query, retaining descending start-date ordering and the existing RLS protections.

The fresh authenticated production check shows four trip cards: `2027 Sapporo`, `2027`, `2026 8月 大阪京都`, and `2026 6月京都`. The two new 2027 trips therefore exist and are now visible. No trip records were modified during the check.
