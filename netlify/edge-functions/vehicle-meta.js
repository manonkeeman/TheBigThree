const SUPABASE_URL = 'https://loolxbizdribqyulxbop.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nMu2RzoUWmaKnwjeR3kRPg_EzGzbVIg';

const OG_LOCALE = { nl: 'nl_NL', en: 'en_US', de: 'de_DE' };

const COPY = {
  nl: {
    fallbackTitle: 'Voorraad · The Big Three Garage Nunspeet',
    fallbackOgTitle: 'Voorraad · The Big Three Garage',
    fallbackDescription: 'Bekijk de actuele voorraad Amerikaanse campers, pickups en classics bij The Big Three Garage in Nunspeet.',
    priceAsk: 'Op aanvraag',
    priceBid: 'Bieden',
    title: (title) => `${title} te koop · The Big Three Garage Nunspeet`,
    ogTitle: (title) => `${title} · Te koop bij The Big Three Garage`,
    description: (metaLine, title, specsLine, priceText) =>
      `${[metaLine, title].filter(Boolean).join(' ')} te koop bij The Big Three Garage in Nunspeet.${specsLine ? ' ' + specsLine + '.' : ''} ${priceText}.`,
  },
  en: {
    fallbackTitle: 'Inventory · The Big Three Garage Nunspeet',
    fallbackOgTitle: 'Inventory · The Big Three Garage',
    fallbackDescription: 'Browse the current inventory of American campers, pickups and classics at The Big Three Garage in Nunspeet.',
    priceAsk: 'Price on request',
    priceBid: 'Make an offer',
    title: (title) => `${title} for sale · The Big Three Garage Nunspeet`,
    ogTitle: (title) => `${title} · For sale at The Big Three Garage`,
    description: (metaLine, title, specsLine, priceText) =>
      `${[metaLine, title].filter(Boolean).join(' ')} for sale at The Big Three Garage in Nunspeet.${specsLine ? ' ' + specsLine + '.' : ''} ${priceText}.`,
  },
  de: {
    fallbackTitle: 'Fahrzeugbestand · The Big Three Garage Nunspeet',
    fallbackOgTitle: 'Fahrzeugbestand · The Big Three Garage',
    fallbackDescription: 'Entdecken Sie den aktuellen Bestand an amerikanischen Campern, Pickups und Oldtimern bei The Big Three Garage in Nunspeet.',
    priceAsk: 'Preis auf Anfrage',
    priceBid: 'Gebot',
    title: (title) => `${title} zu verkaufen · The Big Three Garage Nunspeet`,
    ogTitle: (title) => `${title} · Zu verkaufen bei The Big Three Garage`,
    description: (metaLine, title, specsLine, priceText) =>
      `${[metaLine, title].filter(Boolean).join(' ')} zu verkaufen bei The Big Three Garage in Nunspeet.${specsLine ? ' ' + specsLine + '.' : ''} ${priceText}.`,
  },
};

function slugify(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function escAttr(s) {
  return String(s || '').replace(/"/g, '&quot;');
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function pickLang(url) {
  const lang = url.searchParams.get('lang');
  return (lang === 'en' || lang === 'de') ? lang : 'nl';
}

function hreflangBlock(basePath) {
  return [
    `<link rel="alternate" hreflang="nl" href="https://thebigthree.nl${basePath}">`,
    `<link rel="alternate" hreflang="en" href="https://thebigthree.nl${basePath}?lang=en">`,
    `<link rel="alternate" hreflang="de" href="https://thebigthree.nl${basePath}?lang=de">`,
    `<link rel="alternate" hreflang="x-default" href="https://thebigthree.nl${basePath}">`,
  ].join('\n');
}

function canonicalFor(basePath, lang) {
  return lang === 'nl'
    ? `https://thebigthree.nl${basePath}`
    : `https://thebigthree.nl${basePath}?lang=${lang}`;
}

function fallbackMeta(html, basePath, lang) {
  const c = COPY[lang];
  return html
    .replace(/__LANG__/g, lang)
    .replace(/__TITLE__/g, c.fallbackTitle)
    .replace(/__OG_TITLE__/g, c.fallbackOgTitle)
    .replace(/__DESCRIPTION__/g, c.fallbackDescription)
    .replace(/__CANONICAL__/g, canonicalFor(basePath, lang))
    .replace(/__HREFLANG__/g, hreflangBlock(basePath))
    .replace(/__OG_LOCALE__/g, OG_LOCALE[lang])
    .replace(/__IMAGE__/g, 'https://thebigthree.nl/assets/og-image.png')
    .replace('__JSONLD__', JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": c.fallbackTitle,
    }));
}

export default async (request, context) => {
  const url = new URL(request.url);
  const lang = pickLang(url);
  const isVoorraadPath = url.pathname.startsWith('/voorraad/');
  const slug = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '');
  const basePath = isVoorraadPath ? `/voorraad/${slug}` : url.pathname;
  const canonical = canonicalFor(basePath, lang);

  const originResponse = await fetch(new URL('/auto-detail.html', url));
  let html = await originResponse.text();

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vehicles?select=*&hidden=eq.false`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    const vehicles = res.ok ? await res.json() : [];
    const vehicle = vehicles.find((v) => slugify(v.title) === slug);

    if (!vehicle) {
      html = fallbackMeta(html, basePath, lang);
    } else {
      const c = COPY[lang];
      const priceText = vehicle.price_type === 'fixed' && vehicle.price
        ? `€ ${Number(vehicle.price).toLocaleString('nl-NL')}`
        : (vehicle.price_type === 'ask' ? c.priceAsk : c.priceBid);
      const metaLine = [vehicle.year, vehicle.make].filter(Boolean).join(' ');
      const specsLine = [vehicle.spec1, vehicle.spec2, vehicle.spec3].filter(Boolean).join(' · ');
      const description = c.description(metaLine, vehicle.title, specsLine, priceText).slice(0, 300);
      const ogTitle = c.ogTitle(vehicle.title);
      const image = vehicle.image_url || 'https://thebigthree.nl/assets/og-image.png';

      const hasFixedPrice = vehicle.price_type === 'fixed' && !!vehicle.price;

      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Vehicle",
        "name": vehicle.title,
        "description": description,
        "vehicleModelDate": vehicle.year ? String(vehicle.year) : undefined,
        "brand": vehicle.make ? { "@type": "Brand", "name": vehicle.make } : undefined,
        "image": image,
        "offers": hasFixedPrice ? {
          "@type": "Offer",
          "price": String(vehicle.price),
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
          "shippingDetails": {
            "@type": "OfferShippingDetails",
            "shippingRate": { "@type": "MonetaryAmount", "value": "0", "currency": "EUR" },
            "shippingDestination": { "@type": "DefinedRegion", "addressCountry": "NL" },
            "deliveryTime": {
              "@type": "ShippingDeliveryTime",
              "handlingTime": { "@type": "QuantitativeValue", "minValue": 0, "maxValue": 1, "unitCode": "DAY" },
              "transitTime": { "@type": "QuantitativeValue", "minValue": 0, "maxValue": 0, "unitCode": "DAY" },
            },
          },
          "hasMerchantReturnPolicy": {
            "@type": "MerchantReturnPolicy",
            "returnPolicyCategory": "https://schema.org/MerchantReturnNotPermitted",
            "returnPolicyCountry": "NL",
          },
        } : undefined,
      };

      html = html
        .replace(/__LANG__/g, lang)
        .replace(/__TITLE__/g, escHtml(c.title(vehicle.title)))
        .replace(/__OG_TITLE__/g, escAttr(ogTitle))
        .replace(/__DESCRIPTION__/g, escAttr(description))
        .replace(/__CANONICAL__/g, canonical)
        .replace(/__HREFLANG__/g, hreflangBlock(basePath))
        .replace(/__OG_LOCALE__/g, OG_LOCALE[lang])
        .replace(/__IMAGE__/g, image)
        .replace('__JSONLD__', JSON.stringify(jsonLd).replace(/</g, '\\u003c'));
    }
  } catch (e) {
    html = fallbackMeta(html, basePath, lang);
  }

  const headers = new Headers(originResponse.headers);
  headers.delete('content-length');

  return new Response(html, { status: originResponse.status, headers });
};
