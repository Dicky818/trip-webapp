# Receipt Image Analysis Investigation — 2026-08-19

## Scope and privacy

The supplied receipt image was inspected only as evidence of the client failure. No expense record was created, and no supplied receipt image was stored in the application, database, or this report.

## Findings

The supplied iPhone PNG was 21,453,438 bytes at 3024 × 4032 pixels. The previous client only began compression above 6 MB and allowed a 5 MB prepared image. After base64 encoding, such a payload can grow by roughly one third, increasing the risk of a request-gateway failure before the Edge Function returns a useful response.

The `receipt-analysis` Edge Function was active and its CORS preflight allowed the production GitHub Pages origin. The function was nevertheless capable of spending up to approximately 39 seconds on three Gemini requests and retry waits, while the browser invocation allowed only 30 seconds. A client-side abort therefore surfaced as the generic `Failed to send a request to the Edge Function` message.

## Repair

The frontend now compresses receipt images above 2 MB to a maximum prepared target of 1.5 MB and a maximum dimension of 1600 pixels before base64 transport. The Edge Function is deployed at version 5 with two provider attempts of at most 8 seconds each, safely inside the 30-second browser limit. The client now translates an unexpected transport failure into a Traditional Chinese recovery message instead of exposing the raw library error.

## Validation result

An authenticated, non-persistent health check reached the live Edge Function and received structured provider responses rather than a browser transport failure. The current Gemini provider response was `429` (temporary quota / rate limit), followed by `502` on a later attempt. The function now returns these conditions as actionable user-facing errors instead of timing out. Successful OCR will require the configured Gemini provider quota and service availability to recover; no change to trip or expense data was made during validation.

## Follow-up revalidation

After a two-minute cooldown, a generated synthetic receipt request again reached the active version 5 function but received `429`, initially indicating a one-second retry delay and then a further twenty-second provider delay. This confirms that the remaining blocker is the configured Gemini provider quota or availability, not the browser request, image transport, CORS, authentication, or expense-writing path.
