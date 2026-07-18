// Proxies live telemetry from the iCaur Live SoC PWA to ABRP's Telemetry API,
// keeping the ABRP api_key/token server-side instead of embedding them in the
// PWA (which is a static-assets Worker with no secret storage of its own).

const ABRP_TLM_URL = 'https://api.iternio.com/1/tlm/send';
const ALLOWED_ORIGIN = 'https://icaur-live-soc.alif-ahmad999.workers.dev';

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (origin === ALLOWED_ORIGIN) {
    headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGIN;
  }
  return headers;
}

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request.headers.get('Origin') || '');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405, cors);
    }

    if (!env.ABRP_API_KEY || !env.ABRP_TOKEN) {
      return json({ error: 'proxy_not_configured' }, 500, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch (err) {
      return json({ error: 'invalid_json' }, 400, cors);
    }

    // Whitelist and normalize into ABRP's expected tlm shape: it wants
    // speed in km/h, but the PWA's geolocation API reports m/s.
    const tlm = {};
    if (typeof body.utc === 'number') tlm.utc = Math.round(body.utc);
    if (typeof body.soc === 'number') tlm.soc = body.soc;
    if (typeof body.speed === 'number') tlm.speed = body.speed * 3.6;
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
      return new Response(text, {
        status: abrpRes.status,
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    } catch (err) {
      return json({ error: 'abrp_unreachable' }, 502, cors);
    }
  },
};
