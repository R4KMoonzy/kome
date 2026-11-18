/* page-mi-negocio.js — Panel de autogestión del comercio */
(function () {
  'use strict';
  var D = window.DataService, I = window.AppIcons, UI = window.UI;
  var esc = D.escapeHtml;

  UI.ready.then(async function () {
    if (!UI.requireAuth('mi-negocio.html')) return;
    var root = document.getElementById('mine-root');
    var session = UI.getSession();

    var businesses = await D.getBusinesses();
    var business = businesses.find(function (b) {
      return (session.email && b.ownerEmail === session.email) || (session.uid && b.ownerId === session.uid);
    });

    if (!business) {
      root.innerHTML = UI.empty({
        art: 'store', title: 'Aún no tienes un negocio aprobado',
        text: 'Cuando envíes tu solicitud y el administrador la apruebe, podrás editar horarios, promociones y cargar tu menú desde aquí.',
        action: { href: 'registrar-negocio.html', label: 'Registrar mi negocio', icon: 'plus' }
      });
      return;
    }

    var loader = null;
    var promos = await D.getActivePromotions(business.id);

    root.innerHTML =
      '<div class="panel-head"><div><h1 style="font-size:1.4rem;font-weight:900">Mi negocio: ' + esc(business.name) + '</h1>' +
        '<p class="muted tiny">Panel de autogestión · cambios guardados en este dispositivo</p></div>' +
        '<a class="btn btn--outline btn--sm" href="comercio.html?id=' + esc(business.id) + '">Ver perfil público ' + I.svg('external', { size: 14 }) + '</a></div>' +
      '<div class="stat-grid">' +
        '<div class="card stat-box"><strong>' + (business.menu || []).length + '</strong><span>Productos publicados</span></div>' +
        '<div class="card stat-box"><strong>' + promos.length + '</strong><span>Promociones activas</span></div>' +
        '<div class="card stat-box"><strong>' + (business.ratingCount || 0) + '</strong><span>Reseñas recibidas</span></div>' +
      '</div>' +
      '<div class="panel-layout">' +
        '<nav class="card panel-nav">' +
          '<button class="is-active" data-panel-btn="resumen">' + I.svg('chart', { size: 17 }) + 'Resumen</button>' +
          '<button data-panel-btn="horarios">' + I.svg('clock', { size: 17 }) + 'Horario y estado</button>' +
          '<button data-panel-btn="menu">' + I.svg('menuBook', { size: 17 }) + 'Menú / Catálogo</button>' +
          '<button data-panel-btn="promos">' + I.svg('tag', { size: 17 }) + 'Promociones</button>' +
          '<button data-panel-btn="datos">' + I.svg('settings', { size: 17 }) + 'Datos del local</button>' +
        '</nav>' +
        '<div>' +
          '<section class="panel-section is-active" data-panel="resumen">' +
            '<div class="card" style="padding:22px"><h2 style="font-size:1.1rem;margin-bottom:12px">' + esc(business.name) + '</h2>' +
              '<p class="muted">' + esc(business.description || 'Sin descripción') + '</p>' +
              '<div class="review-summary" style="margin-top:18px">' +
                '<div><strong>Rubro</strong>' + esc(D.categoryById(business.category).label) + '</div>' +
                '<div><strong>Zona</strong>' + esc(business.zone || 'No definida') + '</div>' +
                '<div><strong>Teléfono</strong>' + esc(business.phone || 'No definido') + '</div>' +
                '<div><strong>WhatsApp</strong>' + esc(business.whatsapp || 'No definido') + '</div>' +
              '</div></div></section>' +

          '<section class="panel-section" data-panel="horarios">' +
            '<div class="card" style="padding:22px"><h2 style="font-size:1.1rem;margin-bottom:8px">Horario y estado de hoy</h2>' +
              '<div class="switch-row"><div><strong>Abierto hoy</strong><br><span class="tiny muted">Desactívalo si estás cerrado temporalmente.</span></div>' +
                '<div class="switch ' + (business.openToday !== false ? 'is-on' : '') + '" id="mine-open-switch" role="switch" aria-checked="' + (business.openToday !== false) + '"></div></div>' +
              '<div class="switch-row"><div><strong>Express propio</strong><br><span class="tiny muted">Entrega propia coordinada con el cliente.</span></div>' +
                '<div class="switch ' + (business.express ? 'is-on' : '') + '" id="mine-express-switch" role="switch"></div></div>' +
              '<h3 style="font-size:.9rem;margin:20px 0 10px">Horarios semanales</h3>' +
              '<div class="hours-editor">' + D.DAYS.map(function (d) {
                var h = (business.hours || {})[d.key] || {};
                return '<div class="hours-row"><span>' + d.label + '</span>' +
                  '<input class="input" type="time" data-hour="' + d.key + '" data-part="open" value="' + esc(h.open || '') + '">' +
                  '<input class="input" type="time" data-hour="' + d.key + '" data-part="close" value="' + esc(h.close || '') + '">' +
                  '<button class="icon-btn" data-toggle-closed="' + d.key + '" title="Marcar cerrado">' +
                    I.svg(h.closed ? 'checkCircle' : 'close', { size: 16 }) + '</button></div>';
              }).join('') + '</div>' +
              '<p class="tiny muted" style="margin-top:8px">Deja ambos campos vacíos para «Sin definir». El botón marca el día como cerrado.</p>' +
              '<button class="btn btn--primary" id="mine-save-hours" style="margin-top:16px">Guardar horario y estado</button>' +
            '</div></section>' +

          '<section class="panel-section" data-panel="menu">' +
            '<div class="card" style="padding:22px"><h2 style="font-size:1.1rem;margin-bottom:6px">Carga inteligente de menú</h2>' +
              '<p class="muted tiny" style="margin-bottom:18px">Elige manual, Excel/CSV o foto con IA. Todas las filas se convierten en tarjetas editables antes de publicar.</p>' +
              '<div id="mine-menu-loader"></div>' +
              '<button class="btn btn--whatsapp btn--block" id="mine-save-menu" style="margin-top:20px">' + I.svg('check', { size: 17 }) + 'Publicar menú (' + (business.menu || []).length + ' productos)</button>' +
            '</div></section>' +

          '<section class="panel-section" data-panel="promos">' +
            '<div class="card" style="padding:22px"><h2 style="font-size:1.1rem;margin-bottom:14px">Publicar promoción</h2>' +
              '<div class="form-grid">' +
                '<div class="field"><label class="field__label">Título <span class="req">*</span></label><input class="input" id="promo-titulo" placeholder="Ej. Combo familiar"></div>' +
                '<div class="field"><label class="field__label">Descuento</label><input class="input" id="promo-descuento" placeholder="Ej. 20% OFF"></div>' +
              '</div>' +
              '<div class="field" style="margin-top:12px"><label class="field__label">Descripción</label><textarea class="textarea" id="promo-descripcion" placeholder="Detalles de la oferta"></textarea></div>' +
              '<div class="field" style="margin-top:12px"><label class="field__label">Vence (opcional)</label><input class="input" id="promo-vence" type="date"></div>' +
              '<button class="btn btn--blue" id="promo-save" style="margin-top:14px">' + I.svg('plus', { size: 16 }) + 'Publicar promoción</button>' +
              '<h3 style="font-size:.9rem;margin:24px 0 10px">Promociones vigentes</h3><div id="promo-admin-list"></div>' +
            '</div></section>' +

          '<section class="panel-section" data-panel="datos">' +
            '<div class="card" style="padding:22px"><h2 style="font-size:1.1rem;margin-bottom:14px">Datos de contacto públicos</h2>' +
              '<div class="form-grid">' +
                '<div class="field"><label class="field__label">Teléfono</label><input class="input" id="biz-phone" value="' + esc(business.phone || '') + '"></div>' +
                '<div class="field"><label class="field__label">WhatsApp</label><input class="input" id="biz-whatsapp" value="' + esc(business.whatsapp || '') + '"></div>' +
                '<div class="field"><label class="field__label">Instagram</label><input class="input" id="biz-instagram" value="' + esc(business.instagram || '') + '"></div>' +
                '<div class="field"><label class="field__label">Facebook</label><input class="input" id="biz-facebook" value="' + esc(business.facebook || '') + '"></div>' +
              '</div>' +
              '<div class="field" style="margin-top:12px"><label class="field__label">Descripción</label><textarea class="textarea" id="biz-descripcion">' + esc(business.description || '') + '</textarea></div>' +
              '<button class="btn btn--primary" id="biz-save" style="margin-top:14px">Guardar datos</button>' +
            '</div></section>' +
        '</div>' +
      '</div>';

    /* Navegación de panel */
    UI.qsa('[data-panel-btn]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var name = btn.getAttribute('data-panel-btn');
        UI.qsa('[data-panel-btn]', root).forEach(function (b) { b.classList.toggle('is-active', b === btn); });
        UI.qsa('[data-panel]', root).forEach(function (p) { p.classList.toggle('is-active', p.getAttribute('data-panel') === name); });
      });
    });

    /* Horarios */
    var closedDays = {};
    D.DAYS.forEach(function (d) { closedDays[d.key] = !!(business.hours && business.hours[d.key] && business.hours[d.key].closed); });
    UI.qsa('[data-toggle-closed]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-toggle-closed');
        closedDays[k] = !closedDays[k];
        b.innerHTML = I.svg(closedDays[k] ? 'checkCircle' : 'close', { size: 16 });
        b.style.color = closedDays[k] ? 'var(--brand-coral)' : '';
      });
    });
    function switchBind(id, initial, cb) {
      var el = document.getElementById(id);
      var on = initial;
      el.addEventListener('click', function () { on = !on; el.classList.toggle('is-on', on); el.setAttribute('aria-checked', String(on)); cb(on); });
      return function () { return on; };
    }
    var getOpen = switchBind('mine-open-switch', business.openToday !== false, function () {});
    var getExpress = switchBind('mine-express-switch', !!business.express, function () {});

    document.getElementById('mine-save-hours').addEventListener('click', async function () {
      var hours = {};
      UI.qsa('[data-hour]', root).forEach(function (input) {
        var k = input.getAttribute('data-hour');
        hours[k] = hours[k] || {};
        hours[k][input.getAttribute('data-part')] = input.value;
        hours[k].closed = !!closedDays[k];
      });
      await D.updateBusiness(business.id, { hours: hours, openToday: getOpen(), express: getExpress() });
      business = await D.getBusiness(business.id);
      UI.toast('Horario y estado actualizados', 'success');
    });

    /* Menú */
    loader = MountMenuLoader(document.getElementById('mine-menu-loader'), { initialItems: business.menu || [] });
    document.getElementById('mine-save-menu').addEventListener('click', async function () {
      var items = loader.getItems();
      if (!items.length) { UI.toast('Agrega al menos un producto antes de publicar.', 'error'); return; }
      await D.updateBusiness(business.id, { menu: items });
      business = await D.getBusiness(business.id);
      this.textContent = 'Publicar menú (' + items.length + ' productos)';
      UI.toast(items.length + ' productos publicados', 'success');
    });

    /* Promociones */
    function renderPromos() {
      var host = document.getElementById('promo-admin-list');
      host.innerHTML = promos.length ? promos.map(function (p) {
        return '<div class="switch-row"><div><strong>' + esc(p.titulo) + '</strong><br><span class="tiny muted">' +
          esc(p.descripcion || '') + (p.vence ? ' · Vence ' + new Date(p.vence).toLocaleDateString('es-CR') : '') + '</span></div>' +
          '<button class="icon-btn" data-del-promo="' + esc(p.id) + '" style="color:#e11d48">' + I.svg('trash', { size: 16 }) + '</button></div>';
      }).join('') : '<p class="muted tiny">No hay promociones publicadas.</p>';
      UI.qsa('[data-del-promo]', host).forEach(function (b) {
        b.addEventListener('click', async function () {
          await D.deletePromotion(b.getAttribute('data-del-promo'));
          promos = await D.getActivePromotions(business.id); renderPromos(); UI.toast('Promoción eliminada', 'info');
        });
      });
    }
    renderPromos();
    document.getElementById('promo-save').addEventListener('click', async function () {
      var titulo = document.getElementById('promo-titulo').value.trim();
      if (!titulo) { UI.toast('Escribe el título de la promoción.', 'error'); return; }
      await D.savePromotion({
        businessId: business.id, titulo: titulo,
        descripcion: document.getElementById('promo-descripcion').value.trim(),
        descuento: document.getElementById('promo-descuento').value.trim(),
        vence: document.getElementById('promo-vence').value, activa: true
      });
      ['promo-titulo', 'promo-descripcion', 'promo-descuento', 'promo-vence'].forEach(function (id) { document.getElementById(id).value = ''; });
      promos = await D.getActivePromotions(business.id); renderPromos(); UI.toast('Promoción publicada', 'success');
    });

    /* Datos */
    document.getElementById('biz-save').addEventListener('click', async function () {
      await D.updateBusiness(business.id, {
        phone: document.getElementById('biz-phone').value.trim(),
        whatsapp: document.getElementById('biz-whatsapp').value.trim(),
        instagram: document.getElementById('biz-instagram').value.trim(),
        facebook: document.getElementById('biz-facebook').value.trim(),
        description: document.getElementById('biz-descripcion').value.trim()
      });
      UI.toast('Datos actualizados', 'success');
    });
  });
})();
