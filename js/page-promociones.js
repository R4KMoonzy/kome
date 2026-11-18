/* page-promociones.js — Ofertas vigentes */
(function () {
  'use strict';
  var D = window.DataService, I = window.AppIcons, UI = window.UI;
  var esc = D.escapeHtml;

  UI.ready.then(async function () {
    var list = await D.getActivePromotions();
    var businesses = await D.getBusinesses();
    var host = document.getElementById('promo-list');
    document.getElementById('promo-count-label').textContent = list.length + (list.length === 1 ? ' oferta vigente' : ' ofertas vigentes');

    if (!list.length) {
      host.innerHTML = UI.empty({
        art: 'promo', title: 'No hay promociones publicadas',
        text: 'Cuando los comercios o el administrador publiquen ofertas, combos y descuentos aparecerán aquí con su fecha de vigencia.',
        action: { href: 'registrar-negocio.html', label: 'Tengo una promoción para publicar', icon: 'tag' }
      });
      return;
    }

    host.innerHTML = '<div class="promo-grid stagger">' + list.map(function (p, i) {
      var b = businesses.find(function (x) { return x.id === p.businessId; });
      var wa = b && (b.whatsapp || b.phone)
        ? 'https://wa.me/' + String(b.whatsapp || b.phone).replace(/\D/g, '') + '?text=' + encodeURIComponent('Hola ' + b.name + ', vi la promoción "' + p.titulo + '" en ' + UI.getConfig().appName + '. ¿Sigue vigente?')
        : '';
      var bg = ['var(--gradient-pill)', 'var(--gradient-hero)', 'linear-gradient(135deg,#7C3AED,#FF2A85)'][i % 3];
      return '<article class="promo-card">' +
        '<div class="promo-card__banner" style="background:' + bg + '">' + I.svg('gift', { size: 52 }) +
          (p.descuento ? '<span class="promo-card__off">' + esc(p.descuento) + '</span>' : '') + '</div>' +
        '<div class="promo-card__body">' +
          '<h3 class="promo-card__title">' + esc(p.titulo) + '</h3>' +
          '<p class="promo-card__biz">' + (b ? '<a href="comercio.html?id=' + esc(b.id) + '">' + esc(b.name) + '</a>' : 'Promoción de la plataforma') + '</p>' +
          '<p class="promo-card__desc">' + esc(p.descripcion || '') + '</p>' +
          '<div class="promo-card__foot">' +
            '<span class="promo-card__exp">' + (p.vence ? 'Vence: ' + new Date(p.vence).toLocaleDateString('es-CR') : 'Sin fecha de vencimiento') + '</span>' +
            (wa ? '<a class="btn btn--whatsapp btn--sm" target="_blank" rel="noopener" href="' + wa + '">' + I.svg('whatsapp', { size: 14 }) + 'Consultar</a>'
                : (b ? '<a class="btn btn--ghost btn--sm" href="comercio.html?id=' + esc(b.id) + '">Ver local</a>' : '')) +
          '</div>' +
        '</div></article>';
    }).join('') + '</div>';
  });
})();
