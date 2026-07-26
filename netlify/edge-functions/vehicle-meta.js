const SUPABASE_URL = 'https://loolxbizdribqyulxbop.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nMu2RzoUWmaKnwjeR3kRPg_EzGzbVIg';

function slugify(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function escAttr(s) {
  return String(s || '').replace(/"/g, '&quot;');
}

function fallbackMeta(html, canonical) {
  return html
    .replace(/__TITLE__/g, 'Voorraad · The Big Three Garage Nunspeet')
    .replace(/__OG_TITLE__/g, 'Voorraad · The Big Three Garage')
    .replace(/__DESCRIPTION__/g, 'Bekijk de actuele voorraad Amerikaanse campers, pickups en classics bij The Big Three Garage in Nunspeet.')
    .replace(/__CANONICAL__/g, canonical)
    .replace(/__IMAGE__/g, 'https://thebigthree.nl/assets/og-image.png')
    .replace('__JSONLD__', JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Voorraad · The Big Three Garage"
    }));
}

export default async (request, context) => {
  const url = new URL(request.url);
  const isVoorraadPath = url.pathname.startsWith('/voorraad/');
  const slug = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '');
  const canonical = isVoorraadPath
    ? `https://thebigthree.nl/voorraad/${slug}`
    : `https://thebigthree.nl${url.pathname}`;

  const originResponse = await fetch(new URL('/auto-detail.html', url));
  let html = await originResponse.text();

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vehicles?select=*`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    const vehicles = res.ok ? await res.json() : [];
    const vehicle = vehicles.find((v) => slugify(v.title) === slug);

    if (!vehicle) {
      html = fallbackMeta(html, canonical);
    } else {
      const priceText = vehicle.price_type === 'fixed' && vehicle.price
        ? `€ ${Number(vehicle.price).toLocaleString('nl-NL')}`
        : (vehicle.price_type === 'ask' ? 'Op aanvraag' : 'Bieden');
      const metaLine = [vehicle.year, vehicle.make].filter(Boolean).join(' ');
      const specsLine = [vehicle.spec1, vehicle.spec2, vehicle.spec3].filter(Boolean).join(' · ');
      const description = `${[metaLine, vehicle.title].filter(Boolean).join(' ')} te koop bij The Big Three Garage in Nunspeet.${specsLine ? ' ' + specsLine + '.' : ''} ${priceText}.`.slice(0, 300);
      const ogTitle = `${vehicle.title} · Te koop bij The Big Three Garage`;
      const image = vehicle.image_url || 'https://thebigthree.nl/assets/og-image.png';

      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Vehicle",
        "name": vehicle.title,
        "vehicleModelDate": vehicle.year ? String(vehicle.year) : undefined,
        "brand": vehicle.make ? { "@type": "Brand", "name": vehicle.make } : undefined,
        "image": image,
        "offers": {
          "@type": "Offer",
          "price": vehicle.price_type === 'fixed' && vehicle.price ? String(vehicle.price) : undefined,
          "priceCurrency": "EUR",
          "availability": vehicle.status === 'available' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          "seller": {
            "@type": "AutoDealer",
            "name": "The Big Three Garage",
            "telephone": "+31682727374",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "Hullerweg 115",
              "addressLocality": "Nunspeet",
              "addressCountry": "NL",
            },
          },
        },
      };

      html = html
        .replace(/__TITLE__/g, escAttr(`${vehicle.title} te koop · The Big Three Garage Nunspeet`))
        .replace(/__OG_TITLE__/g, escAttr(ogTitle))
        .replace(/__DESCRIPTION__/g, escAttr(description))
        .replace(/__CANONICAL__/g, canonical)
        .replace(/__IMAGE__/g, image)
        .replace('__JSONLD__', JSON.stringify(jsonLd).replace(/</g, '\\u003c'));
    }
  } catch (e) {
    html = fallbackMeta(html, canonical);
  }

  const headers = new Headers(originResponse.headers);
  headers.delete('content-length');

  return new Response(html, { status: originResponse.status, headers });
};
