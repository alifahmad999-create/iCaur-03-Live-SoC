# iCaur Live SoC

The full source for the iCaur Live SOC PWA — live state-of-charge tracking,
route-aware arrival prediction (OSRM + Open-Elevation + weather), self-tuning
calibration, trip history and insights for the iCaur 03 / V23.

Live app: https://icaur-live-soc.alif-ahmad999.workers.dev/

`index.html` is a snapshot pulled directly from that live Cloudflare Worker
deployment (currently v10.4). This repo is not wired to auto-deploy — the
Worker keeps serving whatever was last uploaded there independently of this
repo, so pushes here are safe and won't affect the live `.dev` link. Deploy
changes by uploading the updated `index.html` to the Worker the same way it
was originally deployed (Cloudflare dashboard or `wrangler`).
