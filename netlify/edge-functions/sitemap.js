const SUPABASE_URL = 'https://loolxbizdribqyulxbop.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nMu2RzoUWmaKnwjeR3kRPg_EzGzbVIg';

function slugify(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function escXml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default async (request, context) => {
  const url = new URL(request.url);
  const staticResponse = await fetch(new URL('/sitemap-static.xml', url));
  let xml = await staticResponse.text();

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vehicles?select=title,updated_at&order=sort_order.asc`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    const vehicles = res.ok ? await res.json() : [];
    const seenSlugs = new Set();

    const entries = vehicles.map((v) => {
      const slug = slugify(v.title);
      if (!slug || seenSlugs.has(slug)) return '';
      seenSlugs.add(slug);
      const lastmod = v.updated_at ? String(v.updated_at).slice(0, 10) : new Date().toISOString().slice(0, 10);
      return `  <url>\n    <loc>https://thebigthree.nl/voorraad/${escXml(slug)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
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
