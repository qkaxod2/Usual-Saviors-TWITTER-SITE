# Usual Saviors Android

Version 1.0.2 pins the TWA provider to com.android.chrome. EntryActivity shows an on-device notification diagnostic on first launch after updating. The website's notification settings include an explicit-package intent link to reopen it. It reports this app's notification enablement, channel/group blocking, channel importance and a qualified interruption-filter warning; it does not claim to inspect another package's settings or prove a heads-up popup was rendered. Missing channels are unknown, not blocked. Settings buttons allow user-controlled changes; there is no automatic permission or channel alteration. Changing from Samsung Internet to Chrome may require sign-in and push subscription registration again. Server-side profile data remains unchanged.

Release builds can use US_SIGNING_STORE and US_SIGNING_PASSWORD_FILE to reuse existing credentials. A certificate mismatch against the site's assetlinks file aborts the build, preventing accidental incompatible updates. Never print or commit those credentials.

Signed Android APK for the existing site, using Android Browser Helper's Trusted Web Activity and notification delegation. Requires Android 6+ and a current compatible browser (Chrome recommended). Website updates do not require reinstalling the APK.

Build from the repository root:

```powershell
powershell -NoProfile -File scripts/app-icons.ps1
node scripts/build-android.mjs
```

The build script uses JDK 21, Android SDK 36 and Gradle 8.14.3. Override local paths with `US_JAVA_HOME`, `US_ANDROID_SDK`, and `US_GRADLE` (the Gradle executable path). Signing credentials are generated once in ignored `.local/android-signing.jks` and `.local/android-signing-password`; retain both securely for compatible future app updates. Never commit them. The certificate fingerprint is published in `public/.well-known/assetlinks.json`.

Output: `public/downloads/usual-saviors.apk`. Deploy that file and the domain association together. Android package: `com.usualsaviors.app`.

Version 1.0.1 also publishes `usual-saviors-1.0.1.apk` so downloads cannot reuse the original file. It registers `ManageDataLauncherActivity`, which Android Browser Helper toggles during startup. The original manifest omitted it. Keep this activity and its `MANAGE_SPACE_URL` when changing the launcher.

Run `node scripts/test-android.mjs` for Robolectric startup tests on API 28, 33 and 35. They verify the managed component exists and a cold start without a browser reaches the browser recovery dialog. These tests do not replace installation, Chrome launch or notification testing on a physical phone.

Push requires `PUSH_PUBLIC_KEY` and secret `PUSH_PRIVATE_KEY` in Sites runtime settings (P-256 uncompressed public key and 32-byte private key, base64url). Users opt in from Alerts or My Account. Registration belongs to the current login session; logout, password reset, account suspension and session expiry revoke delivery. The push service queues accepted messages for up to one day; a per-notification Topic collapses duplicate retries still waiting at the provider. Conversation grouping happens on the device, where timestamps prevent out-of-order network responses from hiding a newer reply.

The notification tray uses one card per account/conversation and keeps at most five app cards. A persisted timestamp permits sound/vibration at most once per minute; intervening messages update silently. Opaque seen IDs persist for seven days (up to 1,000), and conversation ordering prevents delayed older pushes from replacing newer cards. No notification body is stored in the deduplication cache. In-app notification history remains intact.

Each dispatch drains successive eight-job batches and retries transient failures with exponential backoff within a 22-second budget (at most 64 batches). The seven-second network timeout keeps the final batch inside the host's 30-second `waitUntil` lifetime. Retry-After is honored; permanent errors stop retries and expired endpoints are removed. Jobs not completed within that window remain in D1 and resume on a subsequent write or notification check. **This is not a durable scheduled retry service:** current Sites tools expose no cron/queue binding. Long outages and unusually large backlogs still need a separately configured scheduler/queue for guaranteed unattended continuation.

Device acceptance: install APK, sign in, enable notifications, send a test notification, then close the app and receive a reply from another account. Tap it to check that its full thread opens with ancestors expanded. Verify logout prevents subsequent notifications. Do not confuse successful APK compilation or encrypted transport tests with this physical-device check.


Idle-delivery hardening: visible Web Push messages request `urgency: high`; the one-day TTL and duplicate grouping remain unchanged. The service worker retries transient authenticated lookup failures up to three times (3.5-second timeout per request, 0.75/1.5-second backoff). Unauthorized or missing notifications never fall back to cached message contents. A seven-day login expiry still requires signing in again; this patch does not extend authentication or add an always-running Android service. Provider acceptance is not proof of device display; physical-device idle delivery remains a separate acceptance check.
