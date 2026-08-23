// Geplande taak (draait dagelijks, zie config.schedule) die automatisch
// voertuigen verbergt waarvan de gekoppelde Marktplaats-advertentie
// verlopen/verwijderd is (HTTP 404/410). Verbergt alleen (hidden=true in
// Supabase) — verwijdert nooit iets, en zet een eenmaal verborgen voertuig
// ook nooit automatisch terug op zichtbaar (dat blijft een keuze voor David
// in het adminpaneel), zodat een foutieve check nooit meer schade doet dan
// één voertuig ten onrechte van de site af.
//
// Vereist de env var SUPABASE_SERVICE_ROLE_KEY in het Netlify dashboard
// (Site settings → Environment variables). Te vinden in Supabase Dashboard
// → Settings → API → service_role secret. Zonder die key doet deze functie
// niets (logt een waarschuwing en stopt) — activeert zichzelf dus pas
// zodra de key is toegevoegd.

const SUPABASE_URL = 'https://loolxbizdribqyulxbop.supabase.co';
const MP_PREFIX = 'https://www.marktplaats.nl/';

export const config = { schedule: '@daily' };

export default async () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.warn('auto-hide-marktplaats: SUPABASE_SERVICE_ROLE_KEY niet ingesteld, sla over.');
    return new Response('skipped: no service role key configured', { status: 200 });
  }

  const listRes = await fetch(
    `${SUPABASE_URL}/rest/v1/vehicles?select=id,marktplaats_url&hidden=eq.false&marktplaats_url=not.is.null`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  if (!listRes.ok) {
    console.error('auto-hide-marktplaats: kon voertuigen niet ophalen', listRes.status);
    return new Response('failed to list vehicles', { status: 500 });
  }
  const vehicles = await listRes.json();
  const candidates = vehicles.filter((v) => typeof v.marktplaats_url === 'string' && v.marktplaats_url.startsWith(MP_PREFIX));

  const goneIds = [];
  await Promise.all(candidates.map(async (v) => {
    try {
      const res = await fetch(v.marktplaats_url, {
        method: 'HEAD',
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TheBigThreeGarage/1.0; +https://thebigthree.nl)' },
      });
      if (res.status === 404 || res.status === 410) goneIds.push(v.id);
    } catch {
      // netwerkfout: niet aannemen dat de advertentie weg is, gewoon overslaan
    }
  }));

  if (!goneIds.length) {
    console.log('auto-hide-marktplaats: niets te verbergen,', candidates.length, 'gecheckt.');
    return new Response(JSON.stringify({ checked: candidates.length, hidden: 0 }), { status: 200 });
  }

  const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/vehicles?id=in.(${goneIds.join(',')})`, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'content-type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ hidden: true }),
  });
  if (!updateRes.ok) {
    console.error('auto-hide-marktplaats: verbergen mislukt', updateRes.status);
    return new Response('failed to hide vehicles', { status: 500 });
  }

  console.log('auto-hide-marktplaats: verborgen:', goneIds.length, 'van', candidates.length, 'gecheckt.');
  return new Response(JSON.stringify({ checked: candidates.length, hidden: goneIds.length, ids: goneIds }), { status: 200 });
};