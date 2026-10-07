# Usual Saviors source backup

Snapshot date: 2026-10-07 (Asia/Seoul).

Site: https://chronicle-atlas.qkaxdo2.chatgpt.site/

Sites version: 46. Source commit: `9f1583214948e40c9f0e51b151dce6293fd820e3`.

This repository contains the current tracked frontend, Worker backend, database schema and migrations, tests, build output, and Android APK/source (1.0.2). This is a source snapshot, not a copy of prior Git history.

Not included: live database rows (accounts, posts, character uploads), runtime secrets, push private keys, Android signing keystore/password, local development databases, or installed dependencies. The database schema alone does not restore community content. Keep the original signing key securely elsewhere to create compatible future APK updates.

## Local use

Use Node.js 24 or another compatible runtime with `node:sqlite` support.

```sh
npm ci
npm test
node tests/push-ui.mjs
npm run build
npm run dev
```

Local development binds to 127.0.0.1:5178 and uses a development-only administrator password. Do not expose that development server publicly.

The production backend requires the Sites/Cloudflare bindings and runtime configuration; this is not a GitHub Pages static-only application. `.openai/hosting.json` identifies the existing Site and must not be treated as authorization to overwrite it. GitHub backup does not redeploy or modify the live Site.

See `android/README.md` for APK build requirements and signing, and `PUSH_DIAGNOSTICS.md` for push diagnostic details.
