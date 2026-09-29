const SUPABASE_URL = 'https://qjatfptkggabgdddqnkv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXRmcHRrZ2dhYmdkZGRxbmt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NTk1MjQsImV4cCI6MjEwNDQzNTUyNH0.QeZiJxuq8g-ouVmjjEJb4IUexYk9JLTlg9qM5UdPJ_8';

function slugify(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Meerdere voertuigen kunnen dezelfde titel hebben en zouden dan zonder
// disambiguatie dezelfde /voorraad/-URL delen. Moet identiek zijn aan de
// logica in index.html en vehicle-meta.js, anders wijst de sitemap naar
// een andere pagina dan waar de kaart op de site zelf naartoe linkt.
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

function escXml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default async (request, context) => {
  const url = new URL(request.url);
  let xml;
  try {
    const staticResponse = await fetch(new URL('/sitemap-static.xml', url));
    xml = await staticResponse.text();
  } catch {
    // Origin-fetch mislukt (transiënt netwerkprobleem) — val terug op een
    // lege maar geldige sitemap i.p.v. de hele functie te laten crashen.
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n</urlset>';
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vehicles?select=id,title,updated_at&order=sort_order.asc`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    const vehicles = res.ok ? await res.json() : [];
    const slugs = slugMap(vehicles);

    // Elke taalversie krijgt een eigen <url> met de volledige set alternates,
    // gelijk aan hreflangBlock() in vehicle-meta.js.
    const entries = vehicles.map((v) => {
      const slug = slugs[v.id];
      if (!slug) return '';
      const lastmod = v.updated_at ? String(v.updated_at).slice(0, 10) : new Date().toISOString().slice(0, 10);
      const base = `https://thebigthree.nl/voorraad/${escXml(slug)}`;
      const alternates =
        `    <xhtml:link rel="alternate" hreflang="nl" href="${base}"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="en" href="${base}?lang=en"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="de" href="${base}?lang=de"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${base}"/>\n`;
      return [base, `${base}?lang=en`, `${base}?lang=de`].map((loc) =>
        `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n${alternates}  </url>\n`
      ).join('');
    }).join('');

    xml = xml.replace('</urlset>', entries + '</urlset>');
  } catch (e) {
    // Bij een fout blijft de statische basis-sitemap behouden.
  }

  return new Response(xml, {
    status: 200,
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
};
