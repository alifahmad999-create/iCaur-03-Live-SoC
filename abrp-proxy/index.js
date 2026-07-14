/* ============================================================================
   ABRP TELEMETRY PROXY
   ----------------------------------------------------------------------------
   Standalone Worker. Accepts the iCaur Live SOC app's telemetry POST
   ({ soc, speed, lat, lon, is_charging, utc }) and forwards it to ABRP's
   (A Better Route Planner / Iternio) Telemetry API so ABRP's routing can use
   the app's accurate SOC instead of its own generic estimate.

   ABRP contract (https://api.iternio.com/1/tlm/send — confirmed against
   Iternio's own reference client, github.com/iternio/autopi-link):
     POST, application/x-www-form-urlencoded body with three fields:
       api_key  — app-level key (per-integration, from Iternio)
       token    — the ABRP user's own telemetry token
       tlm      — JSON-encoded telemetry object
     Both api_key and token are read from this Worker's secrets (never from
     the request), so the iCaur app itself never needs to know them.

   Unit/shape differences this proxy accounts for — the app's payload is
   built from the browser's Geolocation API and plain JS values, which don't
   match ABRP's tlm schema directly:
     - speed:       Geolocation coords.speed is METERS/SECOND; ABRP's tlm
                    "speed" field is KM/H. Converted below (× 3.6).
     - is_charging: the app sends a JS boolean; ABRP expects 0 or 1.
   ========================================================================== */

const ABRP_TLM_URL = 'https://api.iternio.com/1/tlm/send';

const CORS = {
  'Access-Control-Allow-Origin': '*',   // tighten to your domain(s) for launch
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405);
    }
    if (!env.ABRP_TOKEN || !env.ABRP_API_KEY) {
      return json({ error: 'proxy_not_configured' }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: 'invalid_json' }, 400);
    }

    // Build ABRP's tlm object — only include fields we actually got, and only
    // in the shape/units ABRP expects (see header comment).
    const tlm = {};
    if (typeof body.utc === 'number') tlm.utc = Math.round(body.utc);
    if (typeof body.soc === 'number') tlm.soc = body.soc;
    if (typeof body.speed === 'number') tlm.speed = body.speed * 3.6;   // m/s -> km/h
    if (typeof body.lat === 'number') tlm.lat = body.lat;
    if (typeof body.lon === 'number') tlm.lon = body.lon;
    tlm.is_charging = body.is_charging ? 1 : 0;

    const params = new URLSearchParams();
    params.set('api_key', env.ABRP_API_KEY);
    params.set('token', env.ABRP_TOKEN);
    params.set('tlm', JSON.stringify(tlm));

    try {
      const abrpRes = await fetch(ABRP_TLM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const text = await abrpRes.text();
      // Relay ABRP's own response through — useful for debugging from the
      // app side, even though the app's sender ignores it (fail-silent by design).
      return new Response(text, {
        status: abrpRes.status,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    } catch (e) {
      return json({ error: 'abrp_unreachable' }, 502);
    }
  },
};
