// Gedeelde voertuigteksten: titel en specs zoals David ze in het admin-paneel
// invult (Nederlands, hoofdletters) vertaald naar EN/DE, plus een nette
// zoekmachinenaam ("1988 Ford Econoline E150 Explorer camper").
// Gebruikt door de client (index.html, auto-detail.html) én door de edge
// functions (homepage-meta.js, vehicle-meta.js), net als assets/i18n.js.
window.BTG_VEHICLE = (function () {
  // Langste frasen eerst, zodat "MOTOR & AUTOMAAT" vóór "AUTOMAAT" matcht.
  const PHRASES = {
    en: [
      ['MOTOR & AUTOMAAT', 'ENGINE & TRANSMISSION'],
      ['NIEUW & REVISIE', 'NEW & REBUILT'],
      ['VOORBUMPER HOES', 'FRONT BUMPER COVER'],
      ['NIEUWE IMPORT', 'NEW IMPORT'],
      ['FLORIDA AUTO', 'FLORIDA CAR'],
      ['VOL OPTIES', 'FULLY LOADED'],
      ['APK NIEUW', 'NEW MOT'],
      ['SET VAN 4', 'SET OF 4'],
      ['LAGE KM', 'LOW KM'],
      ['HEFBALKDAK', 'LIFT ROOF'],
      ['ROESTVRIJ', 'RUST-FREE'],
      ['AUTOMAAT', 'AUTOMATIC'],
      ['LAMPJES', 'LIGHTS'],
      ['VELGEN', 'WHEELS'],
      ['8-CIL', '8-CYL'],
      ['UNIEK', 'UNIQUE'],
      ['LEER', 'LEATHER'],
      ['APK', 'MOT'],
    ],
    de: [
      ['MOTOR & AUTOMAAT', 'MOTOR & AUTOMATIKGETRIEBE'],
      ['NIEUW & REVISIE', 'NEU & ÜBERHOLT'],
      ['VOORBUMPER HOES', 'STOSSSTANGENABDECKUNG VORNE'],
      ['NIEUWE IMPORT', 'NEUIMPORT'],
      ['FLORIDA AUTO', 'FLORIDA-FAHRZEUG'],
      ['VOL OPTIES', 'VOLL AUSGESTATTET'],
      ['APK NIEUW', 'HU NEU'],
      ['SET VAN 4', '4ER-SET'],
      ['LAGE KM', 'WENIG KM'],
      ['HEFBALKDAK', 'HUBDACH'],
      ['ROESTVRIJ', 'ROSTFREI'],
      ['AUTOMAAT', 'AUTOMATIK'],
      ['LAMPJES', 'LEUCHTEN'],
      ['VELGEN', 'FELGEN'],
      ['8-CIL', '8-ZYL'],
      ['UNIEK', 'EINZIGARTIG'],
      ['LEER', 'LEDER'],
      ['APK', 'HU'],
    ],
  };

  // Afkortingen/merknamen die in de nette naam in hoofdletters blijven.
  const KEEP_UPPER = new Set(['GMC', 'VIP', 'LWB', 'WB', 'LED', 'KM', 'RV', 'OEM', 'USA', 'US', 'LPG', 'V8', 'V6', 'APK', 'MOT', 'HU']);

  const CAMPER_WORD = { nl: 'camper', en: 'camper', de: 'Wohnmobil' };

  function clean(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  function escRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Vertaalt Nederlandse woorden in een (hoofdletter-)tekst; NL blijft ongewijzigd.
  function translate(s, lang) {
    let out = clean(s);
    const list = PHRASES[lang];
    if (!list || !out) return out;
    list.forEach(([from, to]) => {
      const re = new RegExp(`(^|[^A-Z0-9À-Ý])${escRe(from)}(?=$|[^A-Z0-9À-Ý])`, 'gi');
      out = out.replace(re, (m, pre) => pre + to);
    });
    return out;
  }

  function niceCase(s) {
    return clean(s).split(' ').map(w => {
      const bare = w.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!bare || /\d/.test(w) || KEEP_UPPER.has(bare)) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join(' ');
  }

  function isCamper(v) {
    return /camper/i.test(v.category || '');
  }

  // Bouwjaar en merk staan soms al in de titel ("2010 CHEVROLET EXPRESS ...").
  function fullName(v, lang) {
    const title = translate(v.title, lang);
    const upper = title.toUpperCase();
    const parts = [];
    if (v.year && !upper.includes(String(v.year))) parts.push(String(v.year));
    if (v.make && !upper.includes(clean(v.make).toUpperCase())) parts.push(clean(v.make));
    parts.push(title);
    return clean(parts.join(' '));
  }

  // "1988 Ford Econoline E150 Explorer camper": voor <title>, meta en JSON-LD.
  function seoName(v, lang) {
    let name = niceCase(fullName(v, lang));
    if (isCamper(v) && !/camper|wohnmobil/i.test(name)) name += ' ' + (CAMPER_WORD[lang] || CAMPER_WORD.nl);
    return name;
  }

  function title(v, lang) {
    return translate(v.title, lang);
  }

  function specs(v, lang) {
    return [v.spec1, v.spec2, v.spec3].map(s => translate(s, lang)).filter(Boolean);
  }

  // Eigen omschrijving uit het admin-paneel in de gevraagde taal (mag leeg zijn).
  function description(v, lang) {
    return clean(v['description_' + lang]);
  }

  const ALT_SUFFIX = {
    nl: 'te koop bij The Big Three Nunspeet',
    en: 'for sale at The Big Three Nunspeet',
    de: 'zu verkaufen bei The Big Three Nunspeet',
  };

  function alt(v, lang) {
    return `${seoName(v, lang)} ${ALT_SUFFIX[lang] || ALT_SUFFIX.nl}`;
  }

  function href(slug, lang) {
    return lang === 'en' || lang === 'de' ? `/voorraad/${slug}?lang=${lang}` : `/voorraad/${slug}`;
  }

  function escAttr(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  // data-vt-nl/en/de-attributen met de tekst in alle drie de talen, zodat de
  // taalknop op de homepage kaarten kan omzetten zonder voorraad opnieuw te laden.
  function langAttrs(fn) {
    return ['nl', 'en', 'de'].map(l => ` data-vt-${l}="${escAttr(fn(l))}"`).join('');
  }

  // Client: zet alle elementen met data-vt-* om naar `lang`.
  function applyLang(root, lang) {
    root.querySelectorAll('[data-vt-nl]').forEach(el => {
      const val = el.getAttribute('data-vt-' + lang) ?? el.getAttribute('data-vt-nl');
      if (el.tagName === 'IMG') el.alt = val;
      else if (el.tagName === 'A') el.setAttribute('href', val);
      else el.textContent = val;
    });
  }

  return { translate, niceCase, fullName, seoName, title, specs, description, alt, href, langAttrs, applyLang };
})();
