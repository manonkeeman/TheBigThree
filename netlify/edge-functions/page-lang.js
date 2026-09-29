// Server-side taalversie van faq.html en colofon.html voor ?lang=en en ?lang=de.
// De pagina's bevatten alle drie de talen al (div.faq-lang / div.col-lang); de
// client-side setLang() wisselt alleen welke zichtbaar is. Crawlers die geen JS
// uitvoeren zouden op ?lang=de dus de Nederlandse versie zien. Deze functie zet
// de juiste taal actief en vertaalt meta-tags, hero en (FAQ) de JSON-LD.

const PAGES = {
  faq: {
    file: 'faq.html',
    blockClass: 'faq-lang',
    en: {
      title: 'Frequently asked questions · The Big Three Garage Nunspeet',
      description: 'Answers to frequently asked questions about import, maintenance, MOT, restoration, trade-ins, warranty and appointments at The Big Three Garage in Nunspeet, the Netherlands.',
      ids: {
        fqEyebrow: 'Questions &amp; answers',
        fqTitle: 'FREQUENTLY ASKED<br><em>QUESTIONS</em>',
        fqSub: 'Everything about import, maintenance, MOT, restoration, trade-ins and appointments. Can\'t find your question? Just call: +31 6 82 72 73 74.',
        fqCtaText: 'Can\'t find your question? Call David directly, he\'ll help you out.',
      },
    },
    de: {
      title: 'Häufig gestellte Fragen · The Big Three Garage Nunspeet',
      description: 'Antworten auf häufig gestellte Fragen zu Import, Wartung, Hauptuntersuchung, Restaurierung, Inzahlungnahme, Garantie und Terminen bei The Big Three Garage in Nunspeet (Niederlande).',
      ids: {
        fqEyebrow: 'Fragen &amp; Antworten',
        fqTitle: 'HÄUFIG GESTELLTE<br><em>FRAGEN</em>',
        fqSub: 'Alles über Import, Wartung, Hauptuntersuchung, Restaurierung, Inzahlungnahme und Termine. Ihre Frage ist nicht dabei? Rufen Sie einfach an: +31 6 82 72 73 74.',
        fqCtaText: 'Ihre Frage ist nicht dabei? Rufen Sie David direkt an, er hilft Ihnen weiter.',
      },
    },
  },
  colofon: {
    file: 'colofon.html',
    blockClass: 'col-lang',
    en: {
      title: 'Colophon - The Big Three Garage Nunspeet',
      description: 'Colophon of The Big Three Garage Nunspeet: company details, Chamber of Commerce and VAT number, and website credits.',
      ids: {
        colEyebrow: 'Transparency',
        colTitle: 'COLO<em>PHON</em>',
        navBack: '← Back to website',
        ftrPrivacy: 'Privacy policy',
        ftrTerms: 'Terms and conditions',
        ftrBack: 'Back to website',
      },
    },
    de: {
      title: 'Impressum - The Big Three Garage Nunspeet',
      description: 'Impressum der The Big Three Garage in Nunspeet: Angaben zum Unternehmen, Handelsregister, USt-IdNr. und Website-Credits.',
      ids: {
        colEyebrow: 'Transparenz',
        colTitle: 'IMPRES<em>SUM</em>',
        navBack: '← Zurück zur Website',
        ftrPrivacy: 'Datenschutzerklärung',
        ftrTerms: 'AGB',
        ftrBack: 'Zurück zur Website',
      },
    },
  },
};

function escAttr(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function htmlToText(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}

// Vervangt de inhoud van het (eerste) element met dit id. Alleen voor
// elementen zonder geneste tags van hetzelfde type (eyebrow, h1, p, a).
function replaceById(html, id, value) {
  const re = new RegExp(`(<([a-zA-Z0-9]+)\\b[^>]*\\sid="${id}"[^>]*>)[\\s\\S]*?(</\\2>)`);
  return html.replace(re, (_, open, _tag, close) => open + value + close);
}

// Het taalblok loopt tot aan het volgende taalblok of het einde van de container.
function extractBlock(html, blockClass, lang) {
  const start = html.search(new RegExp(`<div class="${blockClass}[^"]*" id="lang-${lang}">`));
  if (start === -1) return '';
  const rest = html.slice(start + 1);
  const next = rest.search(new RegExp(`<div class="${blockClass}[^"]*" id="lang-`));
  return next === -1 ? rest : rest.slice(0, next);
}

function faqJsonLd(block) {
  const items = [];
  const re = /<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(block))) {
    items.push({
      '@type': 'Question',
      name: htmlToText(m[1]),
      acceptedAnswer: { '@type': 'Answer', text: htmlToText(m[2]) },
    });
  }
  if (!items.length) return null;
  return JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items }, null, 2);
}

export default async (request, context) => {
  const url = new URL(request.url);
  const lang = url.searchParams.get('lang');
  if (lang !== 'en' && lang !== 'de') return context.next();

  const key = url.pathname.replace(/^\//, '').replace(/\.html$/, '');
  const page = PAGES[key];
  if (!page) return context.next();

  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const m = page[lang];
  const canonical = `https://thebigthree.nl/${page.file}?lang=${lang}`;
  let html = await response.text();

  html = html
    .replace('<html lang="nl">', `<html lang="${lang}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${m.title}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escAttr(m.description)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${canonical}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${canonical}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escAttr(m.title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escAttr(m.description)}">`);

  // Juiste taalblok zichtbaar maken
  html = html
    .replace(new RegExp(`class="${page.blockClass} active" id="lang-nl"`), `class="${page.blockClass}" id="lang-nl"`)
    .replace(new RegExp(`class="${page.blockClass}" id="lang-${lang}"`), `class="${page.blockClass} active" id="lang-${lang}"`);

  // Taalknoppen
  html = html
    .replace(/<button class="active" data-lang="nl">/g, '<button data-lang="nl">')
    .replace(new RegExp(`<button data-lang="${lang}">`, 'g'), `<button class="active" data-lang="${lang}">`);

  for (const [id, value] of Object.entries(m.ids)) {
    html = replaceById(html, id, value);
  }

  if (key === 'faq') {
    const ld = faqJsonLd(extractBlock(html, page.blockClass, lang));
    if (ld) {
      html = html.replace(
        /<script type="application\/ld\+json">\s*\{[\s\S]*?"@type": "FAQPage"[\s\S]*?<\/script>/,
        `<script type="application/ld+json">\n${ld}\n</script>`
      );
    }
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html, { status: response.status, headers });
};
