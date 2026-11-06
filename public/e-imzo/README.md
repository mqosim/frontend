# Vendored E-IMZO browser client

These files are copied verbatim from the official integration guide
[qo0p/e-imzo-doc](https://github.com/qo0p/e-imzo-doc)
(`example.uz/php/demo/`):

- `e-imzo.js` — the tiny Base64 helper used by the client.
- `e-imzo-client.js` — the `CAPIWS` WebSocket bridge and the `EIMZOClient`
  helpers that talk to the locally installed E-IMZO desktop app.

They are loaded lazily (only when the E-IMZO sign-in method is opened) as plain
classic scripts, so no npm dependency is added. To update them, re-download the
same two files from the upstream `example.uz/php/demo/` directory.

The domain → API-KEY mapping is **not** part of these files; it lives in
`src/features/auth/infrastructure/eimzo/apiKeys.ts` so it is easy to extend.
