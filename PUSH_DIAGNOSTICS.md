# Mobile push diagnostics

This release instruments explicit test notifications only. It does not change ordinary notification delivery, permissions, notification grouping or Android browser selection.

## Reproduction

1. Open the installed APK and sign in.
2. Open Alerts or My Account, then use the existing test-notification button.
3. The page updates the service worker and verifies `push-diag-v1` before sending. If the worker cannot update, it asks the user to close and reopen the app instead of running an uninstrumented test.
4. Record the eight-character diagnostic reference and the status shown on the page. Check the phone notification tray as well as any popup/banner.

## Server evidence

Read recent Sites Worker logs with `errors_only=false`. Search the `push_diagnostic` messages for the matching ID. Client receipts have sequence numbers because log arrival can be out of order.

- `send_started` → `provider_accepted`: provider accepted transport, not proof of device delivery.
- `received`: the service worker started the test push handler.
- `lookup_ok`: authenticated lookup returned parsable JSON, not yet proof of a matching account.
- `account_missing` / `account_mismatch`: display intentionally suppressed by existing account protection.
- `lookup_http_error` / `lookup_error`: HTTP failure or fetch/JSON failure; bounded retries remain unchanged.
- `display_started` → `display_error`: actual browser display API rejected, with an allowlisted exception name and current web permission.
- `display_ok`: the browser resolved `showNotification`; not proof that Android showed a banner, played sound, or enabled the native app notification channel.
- `cleanup_error`: display resolved, but existing post-display housekeeping failed.
- Missing receipts: inconclusive; push transport, worker execution, or diagnostic-upload connectivity could have failed. The page's 20-second timeout does not label this as a confirmed transport failure.

## Privacy and security

No notification body/title, account ID, subscription endpoint, authentication cookie or signing secret is added to diagnostic records. Client exception messages are never sent. Only explicit test payloads carry the diagnostic capability. Receipts use an HMAC-signed random ID with a 15-minute expiry, solely authorizing allowlisted diagnostic logging. They can therefore report missing login without granting access to account or notification data. Existing same-origin checks remain enforced; receipts are limited to 40 per diagnostic ID. Diagnostic-upload failure never prevents notification display. Logs follow the hosting provider's existing retention; no new persistent user table is added.

The tests simulate browser outcomes. Physical-device reproduction is still required to diagnose the reported phone, especially when the browser resolves display but the OS shows nothing.
