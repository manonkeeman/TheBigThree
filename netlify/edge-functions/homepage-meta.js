
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
  return String(s).replace(/"/g, '&quot;');
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
  if (lang === 'nl' || !contentType.includes('text/html')) return response;

  let html = await response.text();
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

  const dict = await loadTranslations(url.origin);
  if (dict && dict[lang]) {
    html = applyI18nToHtml(html, dict[lang]);
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');

  return new Response(html, { status: response.status, headers });
};
