const SUPABASE_URL = 'https://qjatfptkggabgdddqnkv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXRmcHRrZ2dhYmdkZGRxbmt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NTk1MjQsImV4cCI6MjEwNDQzNTUyNH0.QeZiJxuq8g-ouVmjjEJb4IUexYk9JLTlg9qM5UdPJ_8';

const OG_LOCALE = { nl: 'nl_NL', en: 'en_US', de: 'de_DE' };

const COPY = {
  nl: {
    fallbackTitle: 'Voorraad · The Big Three Garage Nunspeet',
    fallbackOgTitle: 'Voorraad · The Big Three Garage',
    fallbackDescription: 'Bekijk de actuele voorraad Amerikaanse campers, pickups en classics bij The Big Three Garage in Nunspeet.',
    priceAsk: 'Op aanvraag',
    priceBid: 'Bieden',
    status: { available: 'VOORRAAD', reserved: 'GERESERVEERD', service: 'IN SERVICE', part: 'ONDERDEEL', sold: 'VERKOCHT' },
    title: (name) => `${name} te koop · The Big Three Nunspeet`,
    ogTitle: (name) => `${name} · Te koop bij The Big Three Garage`,
    description: (name, specsLine, priceText) =>
      `${name} te koop bij The Big Three Garage in Nunspeet.${specsLine ? ' ' + specsLine + '.' : ''} ${priceText}. Bezichtigen op afspraak.`,
  },
  en: {
    fallbackTitle: 'Inventory · The Big Three Garage Nunspeet',
    fallbackOgTitle: 'Inventory · The Big Three Garage',
    fallbackDescription: 'Browse the current inventory of American campers, pickups and classics at The Big Three Garage in Nunspeet.',
    priceAsk: 'Price on request',
    priceBid: 'Make an offer',
    status: { available: 'IN STOCK', reserved: 'RESERVED', service: 'IN SERVICE', part: 'PART', sold: 'SOLD' },
    title: (name) => `${name} for sale · The Big Three Nunspeet (NL)`,
    ogTitle: (name) => `${name} · For sale at The Big Three Garage`,
    description: (name, specsLine, priceText) =>
      `${name} for sale at The Big Three Garage in Nunspeet, the Netherlands.${specsLine ? ' ' + specsLine + '.' : ''} ${priceText}. Viewing by appointment.`,
  },
  de: {
    fallbackTitle: 'Fahrzeugbestand · The Big Three Garage Nunspeet',
    fallbackOgTitle: 'Fahrzeugbestand · The Big Three Garage',
    fallbackDescription: 'Entdecken Sie den aktuellen Bestand an amerikanischen Campern, Pickups und Oldtimern bei The Big Three Garage in Nunspeet.',
    priceAsk: 'Preis auf Anfrage',
    priceBid: 'Gebot',
    status: { available: 'VERFÜGBAR', reserved: 'RESERVIERT', service: 'IN SERVICE', part: 'ERSATZTEIL', sold: 'VERKAUFT' },
    title: (name) => `${name} kaufen · The Big Three Nunspeet (NL)`,
    ogTitle: (name) => `${name} · Zu verkaufen bei The Big Three Garage`,
    description: (name, specsLine, priceText) =>
      `${name} zu verkaufen bei The Big Three Garage in Nunspeet, Niederlande.${specsLine ? ' ' + specsLine + '.' : ''} ${priceText}. Besichtigung nach Vereinbarung.`,
  },
};

function slugify(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Meerdere voertuigen kunnen dezelfde titel hebben en zouden dan zonder
// disambiguatie dezelfde /voorraad/-URL delen. Moet identiek zijn aan de
// logica in index.html en sitemap.js, anders matcht deze functie de
// verkeerde auto bij de URL die de sitemap/kaart daadwerkelijk gebruikt.
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

// Zoekt bij een onbekende slug de auto waar die URL eerder bij hoorde:
// "titel-abc123" (achtervoegsel = begin van het id) of "titel" zonder
// achtervoegsel. Bij meerdere auto's met die titel de oudste: de URL zonder
// achtervoegsel bestond toen die auto nog de enige met die titel was.
function findMovedVehicle(vehicles, slugs, slug) {
  const m = slug.match(/^(.*)-([0-9a-f]{6})$/);
  if (m) {
    const byId = vehicles.find((v) => v.id.startsWith(m[2]) && slugify(v.title) === m[1]);
    if (byId) return byId;
  }
  const sameTitle = vehicles
    .filter((v) => slugify(v.title) === slug)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  return sameTitle[0] || null;
}

function escAttr(s) {
  return String(s || '').replace(/"/g, '&quot;');
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Gedeelde voertuigteksten (vertaalde titel/specs, nette naam): dezelfde
// bron als de browser gebruikt, zie assets/vehicle-text.js.
async function loadVehicleText(origin) {
  try {
    const res = await fetch(new URL('/assets/vehicle-text.js', origin));
    if (!res.ok) return null;
    const src = await res.text();
    const fn = new Function('window', src + '\nreturn window.BTG_VEHICLE;');
    return fn({});
  } catch {
    return null;
  }
}

// Zonder vehicle-text.js (fetch mislukt) valt alles terug op de ruwe velden.
const RAW_VEHICLE_TEXT = {
  seoName: (v) => [v.year, v.make, v.title].filter(Boolean).join(' '),
  title: (v) => v.title || '',
  specs: (v) => [v.spec1, v.spec2, v.spec3].filter(Boolean),
  description: () => '',
};

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

  let originResponse, html;
  try {
    originResponse = await fetch(new URL('/auto-detail.html', url));
    html = await originResponse.text();
  } catch {
    // Origin-fetch mislukt (transiënt netwerkprobleem) — laat Netlify de
    // pagina gewoon normaal serveren i.p.v. de hele functie te laten crashen.
    return context.next();
  }

  // Verkocht/verwijderd voertuig op een /voorraad/-URL: blijft anders een
  // generieke pagina met status 200 tonen, wat voor Google een soft 404 is
  // (URL blijft eindeloos hangen in "Gevonden - niet geïndexeerd"). Alleen
  // van toepassing op /voorraad/-paden — andere pagina's die deze functie
  // gebruikt (zoals index.html) mogen nooit een 404 krijgen.
  let vehicleNotFound = false;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vehicles?select=*`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    const vehicles = res.ok ? await res.json() : [];
    const VT = (await loadVehicleText(url)) || RAW_VEHICLE_TEXT;
    const slugs = slugMap(vehicles);
    const vehicle = vehicles.find((v) => slugs[v.id] === slug);

    // De slug krijgt een id-achtervoegsel zodra twee auto's dezelfde titel
    // hebben, en verliest het weer als er één verkocht is. De oude URL zou dan
    // 404 geven terwijl de auto er nog staat: stuur door naar de huidige URL.
    const moved = !vehicle && isVoorraadPath && findMovedVehicle(vehicles, slugs, slug);
    if (moved) {
      const target = new URL(`/voorraad/${encodeURIComponent(slugs[moved.id])}`, url);
      if (lang !== 'nl') target.searchParams.set('lang', lang);
      return Response.redirect(target.toString(), 301);
    }

    if (!vehicle) {
      html = fallbackMeta(html, basePath, lang);
      vehicleNotFound = isVoorraadPath;
    } else {
      const c = COPY[lang];
      const priceText = vehicle.price_type === 'fixed' && vehicle.price
        ? `€ ${Number(vehicle.price).toLocaleString('nl-NL')}`
        : (vehicle.price_type === 'ask' ? c.priceAsk : c.priceBid);
      const name = VT.seoName(vehicle, lang);
      const specs = VT.specs(vehicle, lang);
      const specsLine = specs.join(' · ');
      const ownText = VT.description(vehicle, lang);
      const description = c.description(name, specsLine, priceText).slice(0, 300);
      const ogTitle = c.ogTitle(name);
      const image = vehicle.image_url || 'https://thebigthree.nl/assets/og-image.png';

      const hasFixedPrice = vehicle.price_type === 'fixed' && !!vehicle.price;

      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Vehicle",
        "name": name,
        "url": canonical,
        "description": ownText ? `${ownText} ${description}`.slice(0, 500) : description,
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
        .replace(/__TITLE__/g, escHtml(c.title(name)))
        .replace(/__OG_TITLE__/g, escAttr(ogTitle))
        .replace(/__DESCRIPTION__/g, escAttr(description))
        .replace(/__CANONICAL__/g, canonical)
        .replace(/__HREFLANG__/g, hreflangBlock(basePath))
        .replace(/__OG_LOCALE__/g, OG_LOCALE[lang])
        .replace(/__IMAGE__/g, image)
        .replace('__JSONLD__', JSON.stringify(jsonLd).replace(/</g, '\\u003c'))
        // auto-detail.html staat standaard op noindex (veilig als het bestand
        // ooit direct wordt opgevraagd) — alleen een bevestigd voertuig mag
        // geïndexeerd worden.
        .replace('<meta name="robots" content="noindex, follow">', '<meta name="robots" content="index, follow">')
        // Zichtbare kern alvast server-side in de juiste taal, zodat crawlers
        // en AI-zoekmachines zonder JavaScript ook titel en specs zien.
        .replace('<span id="crumbTitle">…</span>', `<span id="crumbTitle">${escHtml(VT.title(vehicle, lang))}</span>`)
        .replace('<div class="detail-meta" id="dMeta">…</div>', `<div class="detail-meta" id="dMeta">${escHtml([vehicle.year, vehicle.make].filter(Boolean).join(' · '))}</div>`)
        .replace('<h1 id="dTitle">…</h1>', `<h1 id="dTitle">${escHtml(VT.title(vehicle, lang))}</h1>`)
        .replace('<span class="status-pill" id="dStatus">VOORRAAD</span>', `<span class="status-pill" id="dStatus">${escHtml(c.status[vehicle.status] || c.status.available)}</span>`)
        .replace('<div class="price-tag" id="dPrice">…</div>', `<div class="price-tag" id="dPrice">${escHtml(priceText)}</div>`)
        .replace('<div class="features" id="dSpecs"></div>', `<div class="features" id="dSpecs">${specs.map(s => `<div class="feature">${escHtml(s)}</div>`).join('')}${ownText ? `<p>${escHtml(ownText)}</p>` : ''}</div>`);
    }
  } catch (e) {
    html = fallbackMeta(html, basePath, lang);
  }

  const headers = new Headers(originResponse.headers);
  headers.delete('content-length');

  const status = vehicleNotFound ? 404 : originResponse.status;

  return new Response(html, { status, headers });
};
