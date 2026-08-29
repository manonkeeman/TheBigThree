
const SUPABASE_URL = 'https://loolxbizdribqyulxbop.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nMu2RzoUWmaKnwjeR3kRPg_EzGzbVIg';

const META = {
  nl: {
    title: 'The Big Three Garage - Amerikaanse voertuigen specialist Nunspeet',
    description: 'The Big Three Garage in Nunspeet: specialist in Amerikaanse campers, pickups en classics. Verkoop, onderhoud, APK, restauratie en import uit de VS. Bel +31 6 82 72 73 74.',
    ogTitle: 'The Big Three Garage - Amerikaanse voertuigen specialist Nunspeet',
    ogDescription: 'Specialist in Amerikaanse campers, pickups en classics. Verkoop, onderhoud, APK, restauratie en import uit de VS. Gevestigd in Nunspeet.',
    twitterTitle: 'The Big Three Garage - Amerikaanse voertuigen Nunspeet',
    twitterDescription: 'Specialist in Amerikaanse campers, pickups en classics. Verkoop, onderhoud, APK, restauratie en import uit de VS.',
    canonical: 'https://thebigthree.nl/',
    ogLocale: 'nl_NL',
  },
  en: {
    title: 'The Big Three Garage - American Vehicle Specialist Nunspeet',
    description: 'The Big Three Garage in Nunspeet: specialist in American campers, pickups and classics. Sales, maintenance, MOT (APK), restoration and import from the US. Call +31 6 82 72 73 74.',
    ogTitle: 'The Big Three Garage - American Vehicle Specialist Nunspeet',
    ogDescription: 'Specialist in American campers, pickups and classics. Sales, maintenance, MOT, restoration and import from the US. Based in Nunspeet, the Netherlands.',
    twitterTitle: 'The Big Three Garage - American Vehicles Nunspeet',
    twitterDescription: 'Specialist in American campers, pickups and classics. Sales, maintenance, MOT, restoration and import from the US.',
    canonical: 'https://thebigthree.nl/?lang=en',
    ogLocale: 'en_US',
  },
  de: {
    title: 'The Big Three Garage - Spezialist für amerikanische Fahrzeuge Nunspeet',
    description: 'The Big Three Garage in Nunspeet: Spezialist für amerikanische Camper, Pickups und Oldtimer. Verkauf, Wartung, Hauptuntersuchung, Restaurierung und Import aus den USA. Rufen Sie an: +31 6 82 72 73 74.',
    ogTitle: 'The Big Three Garage - Spezialist für amerikanische Fahrzeuge Nunspeet',
    ogDescription: 'Spezialist für amerikanische Camper, Pickups und Oldtimer. Verkauf, Wartung, Hauptuntersuchung, Restaurierung und Import aus den USA. Ansässig in Nunspeet.',
    twitterTitle: 'The Big Three Garage - Amerikanische Fahrzeuge Nunspeet',
    twitterDescription: 'Spezialist für amerikanische Camper, Pickups und Oldtimer. Verkauf, Wartung, Hauptuntersuchung, Restaurierung und Import aus den USA.',
    canonical: 'https://thebigthree.nl/?lang=de',
    ogLocale: 'de_DE',
  },
};

// Tags die in index.html met data-i18n / data-i18n-ph voorkomen hebben altijd
// een sluitende tag (zie grep-audit) — geen void elements zoals <br>/<img>.
const VOID_TAGS = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);

function escAttr(s) {
  return String(s || '').replace(/"/g, '&quot;');
}

function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function slugify(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Meerdere voertuigen kunnen dezelfde titel hebben en zouden dan zonder
// disambiguatie dezelfde /voorraad/-URL delen. Moet identiek zijn aan de
// logica in index.html, sitemap.js en vehicle-meta.js.
function slugMap(vehicles) {
  const counts = {};
  vehicles.forEach(v => {
    const s = slugify(v.title);
    counts[s] = (counts[s] || 0) + 1;
  });
  const map = {};
  vehicles.forEach(v => {
    const s = slugify(v.title);
    map[v.id] = counts[s] > 1 ? `${s}-${v.id.slice(0, 6)}` : s;
  });
  return map;
}

// Eén gedeelde vertaalbron: assets/i18n.js (window.I18N = {...}) wordt door
// zowel de browser als deze edge function gebruikt, zodat er geen tweede
// kopie van de vertalingen kan ontstaan die uit sync raakt.
async function loadTranslations(origin) {
  const res = await fetch(new URL('/assets/i18n.js', origin));
  if (!res.ok) return null;
  const src = await res.text();
  try {
    const fn = new Function('window', src + '\nreturn window.I18N;');
    return fn({});
  } catch {
    return null;
  }
}

// Best-effort cache tussen "warme" invocaties van dezelfde edge function
// isolate, zodat niet elke paginaweergave opnieuw Supabase belast.
let _vehicleCache = null;
const VEHICLE_CACHE_TTL_MS = 60_000;

async function loadVehicles() {
  const now = Date.now();
  if (_vehicleCache && (now - _vehicleCache.ts) < VEHICLE_CACHE_TTL_MS) {
    return _vehicleCache.data;
  }
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/vehicles?select=*&order=sort_order.asc,created_at.desc`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  const data = res.ok ? await res.json() : [];
  _vehicleCache = { ts: now, data };
  return data;
}

// Server-side equivalent van de client-side _renderCard() in index.html.
function renderCard(v, dict, slug) {
  const statusMap = {
    available: ['', 'card.status'],
    reserved: ['reserved', 'card.reserved'],
    service: ['service', 'card.service'],
    part: ['part', 'card.part'],
  };
  const [stClass, stKey] = statusMap[v.status] || statusMap.available;
  const stText = dict?.[stKey] || 'VOORRAAD';
  const ctaText = dict?.['card.cta'] || 'Bekijk ›';

  let priceHtml;
  if (v.price_type === 'fixed' && v.price) {
    priceHtml = `<strong>€ ${Number(v.price).toLocaleString('nl-NL')}</strong>`;
  } else if (v.price_type === 'ask') {
    priceHtml = `<strong data-i18n="card.price.ask">${escHtml(dict?.['card.price.ask'] || 'Op aanvraag')}</strong>`;
  } else {
    priceHtml = `<strong data-i18n="card.price.bid">${escHtml(dict?.['card.price.bid'] || 'Bieden')}</strong>`;
  }

  const meta = [v.year, v.make].filter(Boolean).join(' · ');
  const alt = [v.year, v.make, v.title, 'te koop The Big Three Nunspeet'].filter(Boolean).join(' ');
  const specs = [v.spec1, v.spec2, v.spec3].filter(Boolean).map(s => `<span>${escHtml(s)}</span>`).join('');
  const href = `/voorraad/${slug}`;
  const mpText = dict?.['card.mp'] || "Meer foto's";
  const mpBadge = v.marktplaats_url
    ? `<span class="card-mp-badge" title="${escHtml(mpText)} op Marktplaats"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.4" stroke="currentColor" stroke-width="1.6"/></svg><span data-i18n="card.mp">${escHtml(mpText)}</span></span>`
    : '';
  const imgHtml = v.image_url
    ? `<img loading="lazy" src="${escHtml(v.image_url)}" alt="${escHtml(alt)}">`
    : `<div class="card-img-placeholder"><img loading="lazy" src="/assets/logo.png" alt="${escHtml(alt)}"></div>`;

  return `<a href="${escHtml(href)}" class="card" data-cat="${escHtml(v.category || 'camper')}">
      <div class="card-img">
        ${imgHtml}
        ${mpBadge}
        <span class="card-status ${stClass}" data-i18n="${stKey}">${escHtml(stText)}</span>
      </div>
      <div class="card-body">
        <div class="card-meta">${escHtml(meta)}</div>
        <h3>${escHtml(v.title)}</h3>
        <div class="card-specs">${specs}</div>
        <div class="card-price">${priceHtml}<small data-i18n="card.cta">${escHtml(ctaText)}</small></div>
      </div>
    </a>`;
}

// Zet de lege grid + verborgen "geen aanbod"-blok uit de statische HTML om
// in echt gerenderde, vertaalde voertuigkaarten (of maakt het "geen aanbod"
// -blok zichtbaar als de voorraad leeg is). Dit is precies de content die
// een crawler zonder JS-executie anders nooit te zien kreeg, in geen enkele
// taal — de client-side loadInventory() ververst 'm meteen daarna opnieuw,
// dit verandert daar niets aan voor gewone bezoekers.
async function injectInventory(html, dict) {
  const vehicles = await loadVehicles();
  if (vehicles.length) {
    const slugs = slugMap(vehicles);
    const cardsHtml = vehicles.map(v => renderCard(v, dict, slugs[v.id])).join('\n');
    return html.replace(
      '<div class="grid" id="voorraadGrid">\n    </div>',
      `<div class="grid" id="voorraadGrid">\n${cardsHtml}\n    </div>`
    );
  }
  return html.replace(
    '<div class="inv-empty" id="invEmpty" hidden>',
    '<div class="inv-empty" id="invEmpty">'
  );
}

// Vindt de index van de sluitende tag die hoort bij de openende tag die
// eindigt op `searchFrom`, met inachtneming van geneste tags van dezelfde naam.
function findMatchingClose(html, tagName, searchFrom) {
  const openRe = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
  const closeRe = new RegExp(`</${tagName}\\s*>`, 'gi');
  let depth = 1;
  let pos = searchFrom;
  while (depth > 0) {
    openRe.lastIndex = pos;
    closeRe.lastIndex = pos;
    const nextOpen = openRe.exec(html);
    const nextClose = closeRe.exec(html);
    if (!nextClose) return -1;
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++;
      pos = nextOpen.index + nextOpen[0].length;
    } else {
      depth--;
      if (depth === 0) return nextClose.index;
      pos = nextClose.index + nextClose[0].length;
    }
  }
  return -1;
}

// Server-side equivalent van de client-side applyLang(): vervangt de
// zichtbare tekst van elk [data-i18n]-element en de placeholder van elk
// [data-i18n-ph]-element, zodat crawlers die geen JS uitvoeren de vertaalde
// pagina zien op /?lang=de en /?lang=en, niet alleen vertaalde meta-tags.
function applyI18nToHtml(html, dict) {
  let out = '';
  let lastIndex = 0;
  const attrRe = /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)\sdata-i18n="([^"]+)"([^>]*)>/g;
  let m;
  while ((m = attrRe.exec(html))) {
    const [full, tagName, , key] = m;
    const openTagEnd = m.index + full.length;
    if (openTagEnd < lastIndex) continue;
    out += html.slice(lastIndex, openTagEnd);
    const value = dict[key];
    if (value !== undefined && !VOID_TAGS.has(tagName.toLowerCase())) {
      const closeIdx = findMatchingClose(html, tagName, openTagEnd);
      if (closeIdx !== -1) {
        out += value;
        lastIndex = closeIdx;
        attrRe.lastIndex = closeIdx;
        continue;
      }
    }
    lastIndex = openTagEnd;
  }
  out += html.slice(lastIndex);

  out = out.replace(/<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)\sdata-i18n-ph="([^"]+)"([^>]*)>/g, (full, tagName, before, key, after) => {
    const value = dict[key];
    if (value === undefined) return full;
    if (/\splaceholder="[^"]*"/.test(before) || /\splaceholder="[^"]*"/.test(after)) {
      return full.replace(/\splaceholder="[^"]*"/, ` placeholder="${escAttr(value)}"`);
    }
    return `<${tagName}${before} data-i18n-ph="${key}" placeholder="${escAttr(value)}"${after}>`;
  });

  return out;
}

export default async (request, context) => {
  const url = new URL(request.url);
  const langParam = url.searchParams.get('lang');
  const lang = (langParam === 'en' || langParam === 'de') ? langParam : 'nl';

  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  let html = await response.text();

  if (lang !== 'nl') {
    const m = META[lang];
    html = html
      .replace('<html lang="nl">', `<html lang="${lang}">`)
      .replace(/<title>[^<]*<\/title>/, `<title>${escAttr(m.title)}</title>`)
      .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escAttr(m.description)}">`)
      .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${m.canonical}">`)
      .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${m.canonical}">`)
      .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escAttr(m.ogTitle)}">`)
      .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escAttr(m.ogDescription)}">`)
      .replace(/<meta property="og:locale" content="[^"]*">/, `<meta property="og:locale" content="${m.ogLocale}">`)
      .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escAttr(m.twitterTitle)}">`)
      .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escAttr(m.twitterDescription)}">`);
  }

  // Vertalingen zijn ook nodig om de voertuigkaarten te renderen (card.cta,
  // card.status, ...), dus altijd ophalen — ook voor nl.
  const dict = await loadTranslations(url.origin);

  if (lang !== 'nl' && dict && dict[lang]) {
    html = applyI18nToHtml(html, dict[lang]);
  }

  try {
    html = await injectInventory(html, dict?.[lang]);
  } catch {
    // Supabase niet bereikbaar of onverwachte data: pagina blijft werken,
    // de bestaande client-side loadInventory() vult de voorraad dan alsnog.
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');

  return new Response(html, { status: response.status, headers });
};
