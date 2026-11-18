/* page-comercio.js — Perfil detallado y contacto directo */
(function () {
  'use strict';
  var D = window.DataService, I = window.AppIcons, UI = window.UI;
  var esc = D.escapeHtml;

  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function waLink(phone, message) {
    return 'https://wa.me/' + digits(phone) + '?text=' + encodeURIComponent(message);
  }
  function mapsQuery(b) { return encodeURIComponent((b.name || '') + ' ' + (b.address || '') + ' ' + (b.zone || '')); }

  UI.ready.then(async function () {
    var id = new URLSearchParams(window.location.search).get('id');
    var b = await D.getBusiness(id);
    var host = document.getElementById('comercio-root');
    var cfg = UI.getConfig();

    if (!b) {
      host.innerHTML = '<div class="section">' + UI.empty({
        art: 'business', title: 'No encontramos este local',
        text: 'Es posible que el enlace sea incorrecto o que el comercio haya sido retirado del directorio.',
        action: { href: 'explorar.html', label: 'Explorar locales', icon: 'compass' }
      }) + '</div>';
      return;
    }

    var cat = D.categoryById(b.category);
    var open = D.isOpenNow(b);
    var initial = (b.name || '?').charAt(0).toUpperCase();
    var rating = D.ratingOf(b);

    document.getElementById('comercio-cover').style.background = b.cover
      ? 'url(' + esc(b.cover) + ') center/cover' : '';
    var coverImg = document.getElementById('comercio-cover-img');
    if (b.cover) { coverImg.style.backgroundImage = 'url(' + esc(b.cover) + ')'; coverImg.classList.remove('hidden'); }

    document.getElementById('comercio-logo').innerHTML = b.logo ? '<img src="' + esc(b.logo) + '" alt="">' : esc(initial);
    document.getElementById('comercio-name').textContent = b.name;
    document.getElementById('comercio-cat').textContent = cat.label;
    document.getElementById('comercio-zone').innerHTML = I.svg('location', { size: 14 }) + ' ' + esc(b.zone || 'Zona no definida');
    document.getElementById('comercio-rating').innerHTML = I.svg('starFilled', { size: 14, style: 'color:#FFB800' }) +
      ' ' + (b.ratingCount ? rating.toFixed(1) + ' (' + b.ratingCount + ' reseñas)' : 'Sin reseñas aún');
    document.getElementById('comercio-status').innerHTML = '<span class="badge ' + (open ? 'badge--open' : 'badge--closed') + '">' +
      '<span class="status-dot ' + (open ? '' : 'status-dot--closed') + '"></span>' + (open ? 'Abierto ahora' : 'Cerrado ahora') + '</span>';
    document.getElementById('comercio-desc').textContent = b.description || 'Este comercio aún no ha agregado una descripción.';
    document.getElementById('comercio-fav').setAttribute('data-fav', b.id);

    /* Horarios */
    var todayKey = D.DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1].key;
    document.getElementById('comercio-hours').innerHTML = '<table class="hours-table">' + D.DAYS.map(function (d) {
      var h = (b.hours || {})[d.key] || {};
      var text = h.closed ? 'Cerrado' : (h.open && h.close ? h.open + ' – ' + h.close : 'Sin definir');
      return '<tr class="' + (d.key === todayKey ? 'today' : '') + '"><td>' + d.label + '</td><td>' + esc(text) + '</td></tr>';
    }).join('') + '</table>' + (b.openToday === false ? '<p class="tiny" style="color:#e11d48;margin-top:8px">Cerrado temporalmente por el comercio</p>' : '');

    /* Acciones de contacto */
    var actions = document.getElementById('comercio-actions');
    var html = '';
    if (b.whatsapp || b.phone) {
      html += '<a class="btn btn--whatsapp" href="' + waLink(b.whatsapp || b.phone, 'Hola ' + b.name + ', vi tu perfil en ' + cfg.appName + ' y quisiera consultar disponibilidad y precios.') +
        '" target="_blank" rel="noopener">' + I.svg('whatsapp', { size: 18 }) + 'Consultar por WhatsApp</a>';
    }
    if (b.phone) html += '<a class="btn btn--outline" href="tel:' + esc(digits(b.phone)) + '">' + I.svg('phone', { size: 17 }) + 'Llamar</a>';
    html += '<a class="btn btn--blue" href="' + (b.mapsUrl || 'https://www.google.com/maps/search/?api=1&query=' + mapsQuery(b)) + '" target="_blank" rel="noopener">' +
      I.svg('maps', { size: 17 }) + 'Google Maps</a>';
    html += '<a class="btn btn--ghost" href="https://www.waze.com/ul?query=' + mapsQuery(b) + '" target="_blank" rel="noopener">' +
      I.svg('waze', { size: 17 }) + 'Waze</a>';
    actions.innerHTML = html;

    var social = document.getElementById('comercio-social');
    var links = '';
    if (b.instagram) links += '<a class="contact-link" href="' + esc(b.instagram) + '" target="_blank" rel="noopener">' + I.svg('instagram', { size: 17 }) + 'Instagram ' + I.svg('external', { size: 14, style: 'margin-left:auto' }) + '</a>';
    if (b.facebook) links += '<a class="contact-link" href="' + esc(b.facebook) + '" target="_blank" rel="noopener">' + I.svg('facebook', { size: 17 }) + 'Facebook ' + I.svg('external', { size: 14, style: 'margin-left:auto' }) + '</a>';
    if (b.address) links += '<div class="contact-link">' + I.svg('pin', { size: 17 }) + '<span>' + esc(b.address) + '</span></div>';
    social.innerHTML = links || '<p class="tiny muted">Este local no ha publicado redes sociales.</p>';

    /* Promociones vigentes del local */
    var promos = await D.getActivePromotions(b.id);
    var promoHost = document.getElementById('comercio-promos');
    if (promos.length) {
      promoHost.innerHTML = promos.map(function (p) {
        return '<div class="side-card card" style="border-left:4px solid var(--brand-blue)">' +
          '<span class="badge badge--hot">' + I.svg('tag', { size: 12 }) + ' Promoción</span>' +
          '<h3 style="margin-top:8px">' + esc(p.titulo) + '</h3>' +
          '<p class="tiny muted" style="margin-top:6px">' + esc(p.descripcion || '') + '</p>' +
          (p.descuento ? '<p style="color:var(--brand-coral);font-weight:800;margin-top:6px">' + esc(p.descuento) + '</p>' : '') + '</div>';
      }).join('');
    } else promoHost.innerHTML = '';

    /* Menú categorizado */
    var items = b.menu || [];
    var menuHost = document.getElementById('comercio-menu');
    if (!items.length) {
      menuHost.innerHTML = UI.empty({
        art: 'menuBook', title: 'Este local aún no publicó su menú',
        text: 'Cuando el comercio cargue sus productos o platillos podrás consultar precios y escribirle directamente por WhatsApp.',
        action: { href: 'mi-negocio.html', label: 'Soy el dueño y quiero cargarlo', icon: 'upload' }
      });
    } else {
      var groups = {};
      items.forEach(function (it) { (groups[it.categoria || 'General'] = groups[it.categoria || 'General'] || []).push(it); });
      var keys = Object.keys(groups);
      document.getElementById('menu-tabs').innerHTML = keys.map(function (k, i) {
        return '<button class="chip ' + (i === 0 ? 'is-active' : '') + '" data-menu-group="' + esc(k) + '">' + esc(k) + '</button>';
      }).join('');
      menuHost.innerHTML = keys.map(function (k) {
        return '<div class="menu-group" data-group="' + esc(k) + '">' +
          '<h3 class="menu-group__title">' + esc(k) + '</h3>' +
          groups[k].map(function (it) {
            var msg = 'Hola ' + b.name + ', quisiera consultar por **' + it.nombre + '** (₡' + Number(it.precio).toLocaleString('es-CR') + ') que vi en ' + cfg.appName + '. ¿Está disponible?';
            var wa = (b.whatsapp || b.phone) ? waLink(b.whatsapp || b.phone, msg) : '#';
            return '<article class="dish">' +
              '<div class="dish__img">' + (it.imagen ? '<img src="' + esc(it.imagen) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:12px">' : I.svg('menuBook', { size: 26 })) + '</div>' +
              '<div class="dish__body"><div class="dish__title">' + esc(it.nombre) +
                (it.etiqueta ? '<span class="badge ' + (it.etiqueta === 'Agotado' ? 'badge--closed' : 'badge--new') + '">' + esc(it.etiqueta) + '</span>' : '') + '</div>' +
                (it.descripcion ? '<p class="dish__desc">' + esc(it.descripcion) + '</p>' : '') +
                '<div class="dish__foot"><span class="dish__price">' + D.formatMoney(it.precio) + '</span>' +
                '<a class="dish__wa" href="' + wa + '" target="_blank" rel="noopener" ' + (wa === '#' ? 'onclick="return false" style="opacity:.5"' : '') + '>' +
                  I.svg('whatsapp', { size: 14 }) + 'Consultar / Pedir por WhatsApp</a></div>' +
              '</div></article>';
          }).join('') + '</div>';
      }).join('');
      document.getElementById('menu-tabs').addEventListener('click', function (e) {
        var btn = e.target.closest('[data-menu-group]'); if (!btn) return;
        var group = btn.getAttribute('data-menu-group');
        UI.qsa('[data-menu-group]', this).forEach(function (x) { x.classList.toggle('is-active', x === btn); });
        UI.qsa('[data-group]', menuHost).forEach(function (g) {
          g.style.display = g.getAttribute('data-group') === group ? '' : 'none';
        });
      });
    }

    /* Reseñas */
    var reviews = await D.getReviews(b.id);
    var reviewHost = document.getElementById('comercio-reviews');
    reviewHost.innerHTML = reviews.length ? reviews.map(function (r) {
      var stars = '';
      for (var i = 1; i <= 5; i++) stars += I.svg(i <= r.rating ? 'starFilled' : 'star', { size: 14, style: i <= r.rating ? 'color:#FFB800' : 'color:var(--text-3)' });
      return '<div class="review"><div class="review__head">' +
        '<div class="review__avatar">' + esc((r.name || 'U').charAt(0).toUpperCase()) + '</div>' +
        '<div><strong style="font-size:.85rem">' + esc(r.name) + '</strong><div class="review__stars">' + stars + '</div></div>' +
        '<span class="tiny muted" style="margin-left:auto">' + new Date(r.createdAt).toLocaleDateString('es-CR') + '</span></div>' +
        (r.comment ? '<p>' + esc(r.comment) + '</p>' : '') + '</div>';
    }).join('') : '<p class="muted tiny">Todavía no hay reseñas. Sé la primera persona en compartir tu experiencia.</p>';
    document.getElementById('review-count').textContent = reviews.length;

    document.getElementById('review-submit').addEventListener('click', async function () {
      var s = UI.getSession();
      if (!s) { UI.openLoginModal(); return; }
      var rating = parseInt(document.getElementById('review-rating').value, 10);
      var comment = document.getElementById('review-comment').value.trim();
      if (!rating) { UI.toast('Elige una calificación.', 'error'); return; }
      await D.addReview({ businessId: b.id, name: s.name, rating: rating, comment: comment });
      UI.toast('¡Gracias por tu reseña!', 'success');
      window.location.reload();
    });

    document.getElementById('comercio-share').addEventListener('click', function () {
      var url = window.location.href;
      if (navigator.share) navigator.share({ title: b.name, url: url }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { UI.toast('Enlace copiado', 'success'); });
      else UI.toast('No se pudo compartir en este navegador.', 'error');
    });

    UI.syncFavorites();
  });
})();
