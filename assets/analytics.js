// Eén bron voor Google Analytics-laadlogica + event tracking, gebruikt door
// alle pagina's. Voorheen stond deze code alleen in index.html: op
// auto-detail.html, privacy.html, voorwaarden.html, colofon.html en
// 404.html toonden de cookiebanners wel een "Statistieken"-toggle, maar
// werd GA nooit daadwerkelijk geladen als iemand akkoord gaf.
//
// GA vuurt pas na expliciete toestemming (btg_consent.analytics === true).
// window.BTG.trackEvent is altijd veilig aan te roepen: als er geen
// toestemming is (of GA niet geladen kon worden) gebeurt er niets.
(function () {
  const GA_MEASUREMENT_ID = 'G-Y3RZJLKKSQ';

  function loadGoogleAnalytics() {
    if (window._gaLoaded || GA_MEASUREMENT_ID.includes('XXXXXXXXXX')) return;
    window._gaLoaded = true;
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });
  }

  function trackEvent(name, params) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params || {});
    }
  }

  window.BTG = window.BTG || {};
  window.BTG.loadGoogleAnalytics = loadGoogleAnalytics;
  window.BTG.trackEvent = trackEvent;

  // Automatische event tracking via delegatie, zodat elke pagina die dit
  // bestand laadt meteen call-/WhatsApp-/formulier-/FAQ-interacties meet,
  // zonder dat elke pagina zijn eigen tracking-code hoeft te schrijven.
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    if (link.href.startsWith('tel:')) {
      trackEvent('click_call', { link_url: link.href, page_path: location.pathname });
    } else if (link.href.startsWith('https://wa.me/')) {
      trackEvent('click_whatsapp', { link_url: link.href, page_path: location.pathname });
    }
  });

  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (form && form.tagName === 'FORM' && form.getAttribute('name') === 'afspraak') {
      trackEvent('generate_lead', { form_name: 'afspraak', page_path: location.pathname });
    }
  });

  // 'toggle' bubbelt niet, maar is wel te vangen tijdens de capture-fase.
  document.addEventListener('toggle', (e) => {
    const details = e.target;
    if (details.tagName === 'DETAILS' && details.classList.contains('faq-item') && details.open) {
      const summary = details.querySelector('summary');
      trackEvent('faq_open', { question: summary ? summary.textContent.trim() : '', page_path: location.pathname });
    }
  }, true);
})();
