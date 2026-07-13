# iCaur Live SoC

The full source for the iCaur Live SOC PWA — live state-of-charge tracking,
route-aware arrival prediction (OSRM + Open-Elevation + weather), self-tuning
calibration, trip history and insights for the iCaur 03 / V23.

Live app: https://icaur-live-soc.alif-ahmad999.workers.dev/

`public/index.html` is the single source of truth for the app — it's what
Wrangler deploys as-is (this is a static-assets Worker, no backend logic).

## Deploying

```
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... npx wrangler deploy
```

`wrangler.toml` is configured to match the existing Worker's settings
(compatibility date, no bindings, `workers.dev` subdomain, preview URLs
disabled) so deploying never changes the live `.dev` link.
