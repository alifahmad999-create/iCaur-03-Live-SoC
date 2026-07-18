# abrp-proxy

Cloudflare Worker that proxies the iCaur Live SoC PWA's live telemetry push
to ABRP's Telemetry API (`https://api.iternio.com/1/tlm/send`), so the ABRP
`api_key` and `token` never ship inside the PWA.

The PWA POSTs a JSON telemetry object (`soc`, `speed`, `lat`, `lon`,
`is_charging`, `utc`) to this Worker; it forwards that object as `tlm` to
ABRP with the `api_key`/`token` query params attached, and returns ABRP's
JSON response as-is.

## Deploying

```
cd abrp-proxy
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... npx wrangler deploy
npx wrangler secret put ABRP_API_KEY
npx wrangler secret put ABRP_TOKEN
```

Set the PWA's "ABRP proxy URL" setting to the resulting
`https://abrp-proxy.<subdomain>.workers.dev` URL.
