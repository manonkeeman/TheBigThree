// Checkt server-side (om CORS te omzeilen) of gekoppelde Marktplaats-advertenties
// nog bestaan. Marktplaats geeft een schone 404/410 voor advertenties die
// verlopen, verwijderd of afgesloten zijn — dat gebruiken we als signaal.
// Wordt alleen aangeroepen vanuit het adminpaneel via de "Check advertenties"-knop,
// nooit automatisch, en verwijdert zelf niets.

const MP_PREFIX = 'https://www.marktplaats.nl/';
const MAX_ITEMS = 60;

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  let items;
  try {
    const body = await req.json();
    items = Array.isArray(body.items) ? body.items : [];
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  items = items
    .filter((it) => it && typeof it.id === 'string' && typeof it.url === 'string' && it.url.startsWith(MP_PREFIX))
    .slice(0, MAX_ITEMS);

  const results = await Promise.all(items.map(async (it) => {
    try {
      const res = await fetch(it.url, {
        method: 'HEAD',
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TheBigThreeGarage/1.0; +https://thebigthree.nl)' },
      });
      if (res.status === 200) return { id: it.id, state: 'active' };
      if (res.status === 404 || res.status === 410) return { id: it.id, state: 'gone' };
      return { id: it.id, state: 'unknown', status: res.status };
    } catch {
      return { id: it.id, state: 'unknown' };
    }
  }));

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};