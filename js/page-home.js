/* page-home.js — Portada */
(function () {
  'use strict';
  var D = window.DataService, I = window.AppIcons, UI = window.UI;
  var esc = D.escapeHtml;

  UI.ready.then(async function () {
    var cfg = UI.getConfig(), session = UI.getSession();
    var greeting = D.greeting() + (session ? ', ' + session.name.split(' ')[0] : '');
    var hg = document.getElementById('hero-greeting');
    if (hg) hg.textContent = greeting;
    var hs = document.getElementById('hero-slogan');
    if (hs) hs.textContent = cfg.slogan;

    var rail = document.getElementById('home-categories');
    if (rail) rail.innerHTML = UI.categoryRail();

    /* Lo más buscado: términos genéricos de búsqueda, sin locales inventados */
    var terms = ['Restaurantes', 'Sodas típicas', 'Pizza', 'Café', 'Comida rápida', 'Farmacia', 'Repostería', 'Supermercado', 'Licores'];
    var chips = document.getElementById('home-trending');
    if (chips) chips.innerHTML = terms.map(function (t, i) {
      return '<a class="chip" href="explorar.html?q=' + encodeURIComponent(t) + '">' +
        (i < 3 ? I.svg('flame', { size: 14, style: 'color:var(--brand-coral)' }) : I.svg('search', { size: 14 })) + esc(t) + '</a>';
    }).join('');

    /* Los 10 más elegidos */
    var top = document.getElementById('home-top');
    var featured = await D.getFeatured(10);
    if (top) {
      if (!featured.length) {
        top.innerHTML = '<div style="grid-column:1/-1">' + UI.empty({
          art: 'star', title: 'Aún no hay locales destacados',
          text: 'Cuando los comercios reciban reseñas aparecerán aquí. Sé el primero en sumarte al directorio.',
          action: { href: 'registrar-negocio.html', label: 'Registrar mi negocio', icon: 'store' }
        }) + '</div>';
      } else {
        top.innerHTML = featured.map(function (b) {
          var initial = (b.name || '?').charAt(0).toUpperCase();
          return '<a class="top-pick" href="comercio.html?id=' + encodeURIComponent(b.id) + '">' +
            '<div class="top-pick__ring"><div class="top-pick__inner">' +
              (b.logo ? '<img src="' + esc(b.logo) + '" alt="">' : esc(initial)) + '</div></div>' +
            '<div class="top-pick__name">' + esc(b.name) + '</div>' +
            '<div class="top-pick__meta">' + esc(D.categoryById(b.category).label) + '</div></a>';
        }).join('');
      }
    }

    /* Feed por zona */
    var zone = window.localStorage.getItem('mgl:zone') || '';
    var zoneLabel = document.getElementById('home-zone-label');
    if (zoneLabel) zoneLabel.textContent = zone ? 'en ' + zone : 'cerca de ti';
    var list = await D.queryBusinesses({ zone: zone || undefined, sort: 'recientes' });
    var feed = document.getElementById('home-feed');
    if (feed) {
      feed.innerHTML = list.length
        ? '<div class="biz-grid stagger">' + list.map(UI.businessCard).join('') + '</div>'
        : UI.empty({
            art: 'business',
            title: zone ? 'Todavía no hay locales registrados en ' + zone : 'El directorio está esperando su primer local',
            text: 'Esta plataforma es informativa: cuando un comercio se registre y sea aprobado podrás ver su menú y contactarlo directamente.',
            action: { href: 'registrar-negocio.html', label: 'Registrar un negocio', icon: 'plus' }
          });
    }

    /* Buscador del hero */
    var heroInput = document.getElementById('hero-query');
    document.getElementById('hero-search-btn')?.addEventListener('click', function () {
      if (heroInput && heroInput.value.trim()) UI.go('explorar.html?q=' + encodeURIComponent(heroInput.value.trim()));
    });
    if (heroInput) heroInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && this.value.trim()) UI.go('explorar.html?q=' + encodeURIComponent(this.value.trim()));
    });

    var heroCoverage = document.getElementById('hero-coverage');
    if (heroCoverage) {
      if (cfg.coverageEnabled) {
        heroCoverage.innerHTML = window.AppIcons.svg('info', { size: 15 }) +
          '<span>' + esc(D.coverageMessage(cfg)) +
          ' <strong>Cobertura: ' + esc(D.coverageLabels(cfg)[0]) + '</strong></span>';
      } else {
        heroCoverage.classList.add('hidden');
      }
    }

    var heroZone = document.getElementById('hero-zone');
    var heroZoneBtn = document.getElementById('hero-zone-btn');
    if (heroZone && heroZone.value) heroZone.value = zone;
    if (heroZoneBtn) heroZoneBtn.addEventListener('click', function () { UI.openZoneModal(); });

    window.addEventListener('mgl:zone-changed', function () { window.location.reload(); });
  });
})();
