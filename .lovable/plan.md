## Problem

Submitting the order form returns 404. `src/lib/order.functions.ts` hand-calls `https://email.lovable.dev/api/v1/send`, which is not the current managed-send endpoint — hence the 404. The `@lovable.dev/email-js` SDK is already installed and is the supported path.

## Fix

Update `src/lib/order.functions.ts`:

1. Replace the raw `fetch("https://email.lovable.dev/api/v1/send", …)` call with `sendLovableEmail` from `@lovable.dev/email-js`.
2. Send with:
   - `from: "KB Curated Co <orders@notify.kbcuratedco.com>"` (verified delegated sender subdomain — required for delivery)
   - `fromDisplay: "orders@kbcuratedco.com"` so the inbox still shows the branded address
   - `to: ["orders@kbcuratedco.com"]`
   - `replyTo: [data.customerEmail]`
   - `subject`, `html`, `text` as today
   - `idempotencyKey: orderId` to dedupe retries
3. Handle the SDK's typed errors: on `EmailAPIError` with `code === "domain_not_verified"` or `code === "emails_disabled"`, surface a friendly "email isn't active yet" message; on `status === 429`, ask the user to retry in a moment; otherwise the existing generic error.
4. Remove the manual `LOVABLE_API_KEY` fetch/headers block — the SDK reads it from `process.env` inside the handler.

No UI, schema, or other files change.
