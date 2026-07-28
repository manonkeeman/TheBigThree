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

function escAttr(s) {
  return String(s).replace(/"/g, '&quot;');
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

  const headers = new Headers(response.headers);
  headers.delete('content-length');

  return new Response(html, { status: response.status, headers });
};
