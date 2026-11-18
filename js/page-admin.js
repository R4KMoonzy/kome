/* page-admin.js — Panel Super-Admin protegido */
(function () {
  'use strict';
  var D = window.DataService, I = window.AppIcons, UI = window.UI;
  var esc = D.escapeHtml;

  UI.ready.then(async function () {
    var root = document.getElementById('admin-root');
    var unlocked = await D.isAdminUnlocked();
    if (!unlocked) { renderGate(); return; }
    renderPanel();

    function renderGate() {
      var session = window.AuthService && AuthService.current();
      root.innerHTML = '<div class="admin-gate"><div class="card admin-gate__card">' +
        I.svg('lock', { size: 46, strokeWidth: 1.6 }) +
        '<h1 style="font-size:1.35rem;margin-bottom:6px">Acceso administrativo</h1>' +
        '<p class="muted tiny" style="margin-bottom:20px">' +
          (session
            ? 'Tu cuenta (' + esc(session.email) + ') no tiene permisos de administrador. El rol se configura en Firestore → users → ' + esc(session.uid) + ' → role: admin.'
            : 'Ingresa con una cuenta que tenga el rol de administrador para moderar el directorio y configurar la plataforma.') +
        '</p>' +
        '<a class="btn btn--primary btn--block" href="login.html?next=admin.html">' +
          (session ? 'Cambiar de cuenta' : 'Ingresar') + '</a>' +
        '</div></div>';
    }

    async function renderPanel() {
      var cfg = await D.getConfig();

      /* Migración única: si el logo antiguo sigue como base64 en Firestore,
         lo sube a Appwrite y deja solo una URL corta en la configuración. */
      if (window.StorageService && window.StorageService.isDataUrl(cfg.logoUrl)) {
        try {
          var migrated = await window.StorageService.upload(cfg.logoUrl, { folder: 'brand' });
          if (window.StorageService.isRemote(migrated)) {
            cfg = await D.saveConfig({ logoUrl: migrated });
            UI.applyBrand(cfg);
            UI.toast('Logo migrado a Appwrite Storage', 'success');
          }
        } catch (e) { /* se reintentará en el próximo acceso */ }
      }

      var stats = await D.getStats();
      var messages = await D.getMessages();
      var pendingMessages = messages.filter(function (m) { return m.estado === 'pendiente'; }).length;
      root.innerHTML =
        '<div class="panel-head"><div><h1 style="font-size:1.4rem;font-weight:900">Panel Super-Admin</h1>' +
          '<p class="muted tiny">Configuración global, moderación y edición total</p></div>' +
          '<button class="btn btn--ghost btn--sm" id="admin-lock">' + I.svg('lock', { size: 15 }) + 'Cerrar sesión</button></div>' +
        '<div class="stat-grid">' +
          '<div class="card stat-box"><strong>' + stats.businesses + '</strong><span>Locales aprobados</span></div>' +
          '<div class="card stat-box"><strong>' + stats.requests + '</strong><span>Solicitudes pendientes</span></div>' +
          '<div class="card stat-box"><strong>' + stats.promotions + '</strong><span>Promociones</span></div>' +
          '<div class="card stat-box"><strong>' + stats.reviews + '</strong><span>Reseñas</span></div>' +
        '</div>' +
        '<div class="admin-tabs">' +
          '<button class="is-active" data-admin-tab="config">Identidad de marca</button>' +
          '<button data-admin-tab="requests">Solicitudes <span id="tab-req-count">' + stats.requests + '</span></button>' +
          '<button data-admin-tab="businesses">Negocios</button>' +
          '<button data-admin-tab="promos">Promociones</button>' +
          '<button data-admin-tab="catalogos">Catálogos</button>' +
          '<button data-admin-tab="paginas">Páginas web</button>' +
          '<button data-admin-tab="faq">Preguntas frecuentes</button>' +
          '<button data-admin-tab="soporte">Soporte <span id="tab-msg-count">' + pendingMessages + '</span></button>' +
        '</div>' +
        '<div class="admin-section is-active" data-admin-section="config">' +
          '<div class="config-banner">' + I.svg('sparkles', { size: 18, style: 'color:var(--brand-coral);margin-bottom:8px' }) +
            '<strong>Llave maestra white-label</strong><p class="tiny muted">Cambia el nombre, eslogan, logo y aviso superior. Se actualiza en TODAS las páginas al guardar.</p></div>' +
          '<div class="card" style="padding:22px;max-width:760px"><div class="form-grid">' +
            '<div class="field"><label class="field__label">Nombre de la plataforma <span class="req">*</span></label><input class="input" id="cfg-name" value="' + esc(cfg.appName) + '"></div>' +
            '<div class="field"><label class="field__label">Color principal</label><input class="input" id="cfg-color" type="color" value="' + esc(cfg.primaryColor || '#FF2E00') + '" style="padding:4px;height:44px"></div>' +
          '</div>' +
          '<div class="field" style="margin-top:14px"><label class="field__label">Eslogan</label><input class="input" id="cfg-slogan" value="' + esc(cfg.slogan) + '"></div>' +
          '<div class="field" style="margin-top:14px"><label class="field__label">Aviso superior</label><input class="input" id="cfg-notice" value="' + esc(cfg.topNotice) + '" placeholder="Ej. ¡Nuevos comercios cada semana!"></div>' +
          '<div class="switch-row" style="margin-top:10px"><div><strong>Mostrar aviso superior</strong></div>' +
            '<div class="switch ' + (cfg.noticeEnabled ? 'is-on' : '') + '" id="cfg-notice-switch"></div></div>' +

          '<div class="brand-logo-config">' +
            '<div class="brand-logo-config__info"><strong>Logo de la plataforma</strong>' +
              '<p class="tiny muted">Aparece en el encabezado, el pie, las páginas de acceso y como icono del sitio. PNG o JPG; se ajusta automáticamente.</p></div>' +
            '<div class="brand-logo-config__preview" id="cfg-logo-preview">' +
              (cfg.logoUrl ? '<img src="' + esc(cfg.logoUrl) + '" alt="Logo actual">' : I.svg('compass', { size: 28, style: 'color:var(--brand-coral)' })) +
            '</div>' +
            '<div class="brand-logo-config__actions">' +
              '<label class="btn btn--outline btn--sm">' + I.svg('upload', { size: 15 }) + 'Subir logo' +
                '<input type="file" id="cfg-logo-file" accept="image/*" hidden></label>' +
              '<button class="btn btn--ghost btn--sm" id="cfg-logo-clear">Quitar logo</button>' +
            '</div>' +
          '</div>' +

          '<div class="coverage-config">' +
            '<div class="coverage-config__head">' + I.svg('location', { size: 18 }) +
              '<div><strong>Cobertura piloto</strong><span>Define dónde estamos activos. Amplía las zonas cuando quieras, sin tocar código.</span></div></div>' +
            '<div class="switch-row"><div><strong>Activar alertas por cobertura</strong></div>' +
              '<div class="switch ' + (cfg.coverageEnabled !== false ? 'is-on' : '') + '" id="cfg-coverage-switch"></div></div>' +
            '<div class="field"><label class="field__label">Zonas con cobertura (separadas por |)</label>' +
              '<input class="input" id="cfg-coverage-zones" value="' + esc((cfg.coverageZones || []).join(' | ')) + '" placeholder="Cañas, Guanacaste | Liberia"></div>' +
            '<div class="field" style="margin-top:12px"><label class="field__label">Mensaje de la alerta</label>' +
              '<textarea class="textarea" id="cfg-coverage-msg" rows="2">' + esc(cfg.coverageMessage || '') + '</textarea></div>' +
            '<p class="tiny muted" style="margin:8px 0 0">Geolocalización: se acepta dentro de un radio desde el centro. Déjalo en 0 para no limitar por coordenadas.</p>' +
            '<div class="form-grid" style="margin-top:10px">' +
              '<div class="field"><label class="field__label">Latitud del centro</label><input class="input" id="cfg-coverage-lat" type="number" step="any" value="' + esc((cfg.coverageCenter || {}).lat) + '"></div>' +
              '<div class="field"><label class="field__label">Longitud del centro</label><input class="input" id="cfg-coverage-lng" type="number" step="any" value="' + esc((cfg.coverageCenter || {}).lng) + '"></div>' +
              '<div class="field"><label class="field__label">Radio (km)</label><input class="input" id="cfg-coverage-radius" type="number" min="0" step="any" value="' + esc(cfg.coverageRadiusKm) + '"></div>' +
            '</div>' +
          '</div>' +

          '<div class="form-grid" style="margin-top:12px">' +
            '<div class="field"><label class="field__label">WhatsApp de soporte</label><input class="input" id="cfg-wa" value="' + esc(cfg.supportWhatsapp || '') + '"></div>' +
            '<div class="field"><label class="field__label">Correo de contacto</label><input class="input" id="cfg-email" value="' + esc(cfg.contactEmail || '') + '"></div>' +
          '</div>' +
          '<button class="btn btn--primary" id="cfg-save" style="margin-top:18px">' + I.svg('check', { size: 16 }) + 'Guardar y aplicar en toda la plataforma</button>' +
          '</div></div>' +
        '<div class="admin-section" data-admin-section="requests"><div class="card" style="padding:20px" id="admin-requests"></div></div>' +
        '<div class="admin-section" data-admin-section="businesses"><div class="card" style="padding:20px" id="admin-businesses"></div></div>' +
        '<div class="admin-section" data-admin-section="promos"><div class="card" style="padding:20px" id="admin-promos"></div></div>' +
        '<div class="admin-section" data-admin-section="catalogos"><div class="card" style="padding:20px" id="admin-catalogos"></div></div>' +
        '<div class="admin-section" data-admin-section="paginas"><div id="admin-paginas"></div></div>' +
        '<div class="admin-section" data-admin-section="faq"><div id="admin-faq"></div></div>' +
        '<div class="admin-section" data-admin-section="soporte"><div id="admin-soporte"></div></div>';

      UI.qsa('[data-admin-tab]', root).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var name = btn.getAttribute('data-admin-tab');
          UI.qsa('[data-admin-tab]', root).forEach(function (b) { b.classList.toggle('is-active', b === btn); });
          UI.qsa('[data-admin-section]', root).forEach(function (sec) { sec.classList.toggle('is-active', sec.getAttribute('data-admin-section') === name); });
        });
      });
      document.getElementById('admin-lock').addEventListener('click', function () {
        if (window.AuthService) {
          AuthService.signOut().then(function () { window.location.href = 'index.html'; });
        } else {
          window.location.href = 'index.html';
        }
      });

      var noticeOn = !!cfg.noticeEnabled;
      var noticeSwitch = document.getElementById('cfg-notice-switch');
      noticeSwitch.addEventListener('click', function () { noticeOn = !noticeOn; noticeSwitch.classList.toggle('is-on', noticeOn); });

      var logoData = cfg.logoUrl || '';
      var logoPreview = document.getElementById('cfg-logo-preview');
      var logoFile = document.getElementById('cfg-logo-file');
      function renderLogoPreview() {
        logoPreview.innerHTML = logoData
          ? '<img src="' + esc(logoData) + '" alt="Logo actual">'
          : I.svg('compass', { size: 28, style: 'color:var(--brand-coral)' });
      }
      logoFile.addEventListener('change', async function () {
        var file = this.files && this.files[0];
        if (!file) return;
        try {
          var compressed = await D.compressImage(file, 512, .85);
          logoData = await window.StorageService.upload(compressed, { folder: 'brand' });
          renderLogoPreview();
          UI.toast(window.StorageService.isRemote(logoData)
            ? 'Logo subido. Guarda los cambios para aplicarlo.'
            : 'Logo cargado. Guarda los cambios para aplicarlo.', 'info');
        } catch (e) { UI.toast(e.message || 'No se pudo leer la imagen.', 'error'); }
      });
      document.getElementById('cfg-logo-clear').addEventListener('click', function () {
        logoData = ''; logoFile.value = ''; renderLogoPreview();
        UI.toast('Logo quitado. Guarda los cambios para aplicarlo.', 'info');
      });

      var coverageOn = cfg.coverageEnabled !== false;
      var coverageSwitch = document.getElementById('cfg-coverage-switch');
      coverageSwitch.addEventListener('click', function () { coverageOn = !coverageOn; coverageSwitch.classList.toggle('is-on', coverageOn); });

      document.getElementById('cfg-save').addEventListener('click', async function () {
        var name = document.getElementById('cfg-name').value.trim();
        if (name.length < 2) { UI.toast('El nombre no puede estar vacío.', 'error'); return; }
        var rawZones = document.getElementById('cfg-coverage-zones').value;
        var zones = rawZones.split('|').map(function (z) { return z.trim(); }).filter(Boolean);
        if (!zones.length) zones = rawZones.split(',').map(function (z) { return z.trim(); }).filter(Boolean);
        if (coverageOn && !zones.length) { UI.toast('Agrega al menos una zona con cobertura.', 'error'); return; }
        var lat = Number(document.getElementById('cfg-coverage-lat').value);
        var lng = Number(document.getElementById('cfg-coverage-lng').value);
        var radius = Number(document.getElementById('cfg-coverage-radius').value);
        if (!isFinite(lat) || !isFinite(lng) || !isFinite(radius) || radius < 0) {
          UI.toast('Revisa el centro y el radio de cobertura.', 'error'); return;
        }
        await D.saveConfig({
          appName: name,
          slogan: document.getElementById('cfg-slogan').value.trim(),
          logoUrl: logoData,
          topNotice: document.getElementById('cfg-notice').value.trim(),
          noticeEnabled: noticeOn,
          primaryColor: document.getElementById('cfg-color').value,
          supportWhatsapp: document.getElementById('cfg-wa').value.trim(),
          contactEmail: document.getElementById('cfg-email').value.trim(),
          coverageEnabled: coverageOn,
          coverageZones: zones,
          coverageMessage: document.getElementById('cfg-coverage-msg').value.trim(),
          coverageCenter: { lat: lat, lng: lng },
          coverageRadiusKm: radius
        });
        var updated = await D.getConfig();
        UI.applyBrand(updated);
        UI.toast('Configuración aplicada en todas las vistas', 'success');
      });

      await renderRequests();
      await renderBusinesses();
      await renderPromos();
      renderCatalogos();
      renderPaginas();
      renderFaq();
      await renderSupport();
    }

    async function renderRequests() {
      var host = document.getElementById('admin-requests');
      if (!host) return;
      var list = (await D.getRequests()).filter(function (r) { return r.estado === 'pendiente'; });
      var cfg = await D.getConfig();
      var label = document.getElementById('tab-req-count'); if (label) label.textContent = list.length;
      host.innerHTML = '<h2 style="font-size:1.05rem;margin-bottom:12px">Solicitudes pendientes de moderación</h2>' +
        (list.length ? '<div style="overflow:auto"><table class="admin-table"><thead><tr><th>Negocio</th><th>Rubro</th><th>Zona</th><th>Responsable</th><th>Enlace</th><th>Acciones</th></tr></thead><tbody>' +
          list.map(function (r) {
            return '<tr><td><strong>' + esc(r.name) + '</strong><br><span class="tiny muted">' + esc(r.tipo || 'negocio') + '</span></td>' +
              '<td>' + esc(D.categoryById(r.category).label) + '</td>' +
              '<td>' + esc(r.zone) + ((r.fueraDeCobertura || !D.isCoveredZone(r.zone, cfg))
                ? ' <span class="badge badge--coverage">Fuera de cobertura</span>' : '') + '</td>' +
              '<td>' + esc(r.contactName || r.email) + '</td>' +
              '<td><a href="' + esc(r.website || '#') + '" target="_blank" rel="noopener" style="color:var(--brand-blue)">Verificar</a></td>' +
              '<td><div style="display:flex;gap:6px"><button class="btn btn--whatsapp btn--sm" data-approve="' + esc(r.id) + '">Aprobar</button>' +
              '<button class="btn btn--danger btn--sm" data-reject="' + esc(r.id) + '">Rechazar</button>' +
              '<button class="icon-btn" data-view-req="' + esc(r.id) + '" title="Ver detalle">' + I.svg('eye', { size: 16 }) + '</button></div></td></tr>';
          }).join('') + '</tbody></table></div>'
          : UI.empty({ art: 'checkCircle', title: 'Todo al día', text: 'No hay solicitudes pendientes de revisión.' }));

      UI.qsa('[data-approve]', host).forEach(function (b) {
        b.addEventListener('click', async function () {
          var id = b.getAttribute('data-approve');
          var req = (await D.getRequests()).find(function (r) { return r.id === id; });
          await D.approveRequest(id);
          if (req) { try { await D.notifyRequestStatus(req, 'aprobado'); } catch (e) { /* aviso auxiliar */ } }
          UI.toast('Solicitud aprobada y aviso enviado al centro de mensajes', 'success');
          await renderRequests(); await renderBusinesses();
        });
      });
      UI.qsa('[data-reject]', host).forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-reject');
          UI.openModal(UI.modalHead('¿Rechazar solicitud?') +
            '<p class="muted">La solicitud se marcará como rechazada y no será visible públicamente.</p>' +
            '<div class="modal__foot"><button class="btn btn--ghost btn--block" data-modal-close>Cancelar</button>' +
            '<button class="btn btn--danger btn--block" id="admin-reject-confirm">Rechazar</button></div>', function (w, close) {
              document.getElementById('admin-reject-confirm').addEventListener('click', async function () {
                var req = (await D.getRequests()).find(function (r) { return r.id === id; });
                if (req) {
                  req.estado = 'rechazado';
                  await D.saveRequest(req);
                  try { await D.notifyRequestStatus(req, 'rechazado'); } catch (e) { /* aviso auxiliar */ }
                }
                close(); UI.toast('Solicitud rechazada y aviso enviado', 'info'); renderRequests();
              });
            });
        });
      });
      UI.qsa('[data-view-req]', host).forEach(function (b) {
        b.addEventListener('click', async function () {
          var r = (await D.getRequests()).find(function (x) { return x.id === b.getAttribute('data-view-req'); });
          if (!r) return;
          UI.openModal(UI.modalHead('Solicitud: ' + r.name) +
            '<div class="review-summary">' + Object.keys(r).filter(function (k) { return k !== 'logo' && k !== 'cover'; }).map(function (k) {
              return '<div><strong>' + esc(k) + '</strong>' + esc(typeof r[k] === 'object' ? JSON.stringify(r[k]) : r[k]) + '</div>';
            }).join('') + '</div>' +
            (r.logo ? '<img src="' + esc(r.logo) + '" style="max-height:180px;border-radius:12px;margin-top:14px" alt="Fachada">' : '') +
            '<div class="modal__foot"><button class="btn btn--ghost btn--block" data-modal-close>Cerrar</button></div>');
        });
      });
    }

    async function renderBusinesses() {
      var host = document.getElementById('admin-businesses');
      if (!host) return;
      var list = await D.getBusinesses();
      var cfg = await D.getConfig();
      host.innerHTML = '<div class="panel-head"><h2 style="font-size:1.05rem">Locales aprobados (' + list.length + ')</h2></div>' +
        (list.length ? '<div style="overflow:auto"><table class="admin-table"><thead><tr><th>Local</th><th>Rubro</th><th>Zona</th><th>Dueño</th><th>Productos</th><th>Acciones</th></tr></thead><tbody>' +
          list.map(function (b) {
            return '<tr><td><strong>' + esc(b.name) + '</strong>' + (b.destacado ? ' <span class="badge badge--hot">Destacado</span>' : '') + '</td>' +
              '<td>' + esc(D.categoryById(b.category).label) + '</td>' +
              '<td>' + esc(b.zone || '—') + ((b.fueraDeCobertura || !D.isCoveredZone(b.zone, cfg))
                ? ' <span class="badge badge--coverage">Fuera de cobertura</span>' : '') + '</td>' +
              '<td>' + esc(b.ownerEmail || '—') + '</td><td>' + (b.menu || []).length + '</td>' +
              '<td><div style="display:flex;gap:5px;flex-wrap:wrap">' +
                '<button class="btn btn--ghost btn--sm" data-edit-biz="' + esc(b.id) + '">Editar</button>' +
                '<button class="btn btn--blue btn--sm" data-edit-menu="' + esc(b.id) + '">Menú</button>' +
                '<a class="btn btn--outline btn--sm" href="comercio.html?id=' + esc(b.id) + '">Ver</a>' +
                '<button class="icon-btn" data-del-biz="' + esc(b.id) + '" style="color:#e11d48">' + I.svg('trash', { size: 16 }) + '</button>' +
              '</div></td></tr>';
          }).join('') + '</tbody></table></div>'
          : UI.empty({ art: 'business', title: 'Sin locales aprobados', text: 'Aprueba una solicitud para que aparezca aquí y en el directorio público.' }));

      UI.qsa('[data-edit-biz]', host).forEach(function (btn) {
        btn.addEventListener('click', async function () {
          var b = await D.getBusiness(btn.getAttribute('data-edit-biz'));
          UI.openModal(UI.modalHead('Edición total: ' + b.name) +
            '<div class="form-grid">' +
              '<div class="field"><label class="field__label">Nombre</label><input class="input" id="ab-name" value="' + esc(b.name) + '"></div>' +
              '<div class="field"><label class="field__label">Rubro</label><select class="select" id="ab-cat">' +
                D.CATEGORIES.map(function (c) { return '<option value="' + c.id + '" ' + (c.id === b.category ? 'selected' : '') + '>' + esc(c.label) + '</option>'; }).join('') + '</select></div>' +
              '<div class="field"><label class="field__label">Zona</label><input class="input" id="ab-zone" value="' + esc(b.zone || '') + '"></div>' +
              '<div class="field"><label class="field__label">Teléfono</label><input class="input" id="ab-phone" value="' + esc(b.phone || '') + '"></div>' +
              '<div class="field"><label class="field__label">WhatsApp</label><input class="input" id="ab-wa" value="' + esc(b.whatsapp || '') + '"></div>' +
              '<div class="field"><label class="field__label">Correo del dueño</label><input class="input" id="ab-owner" value="' + esc(b.ownerEmail || '') + '"></div>' +
            '</div>' +
            '<div class="field" style="margin-top:12px"><label class="field__label">Descripción</label><textarea class="textarea" id="ab-desc">' + esc(b.description || '') + '</textarea></div>' +
            '<div class="switch-row"><div><strong>Destacado</strong></div><div class="switch ' + (b.destacado ? 'is-on' : '') + '" id="ab-hot"></div></div>' +
            '<div class="switch-row"><div><strong>Abierto hoy</strong></div><div class="switch ' + (b.openToday !== false ? 'is-on' : '') + '" id="ab-open"></div></div>' +
            '<div class="modal__foot"><button class="btn btn--ghost btn--block" data-modal-close>Cancelar</button>' +
            '<button class="btn btn--primary btn--block" id="ab-save">Guardar cambios</button></div>', function (w, close) {
              var hot = !!b.destacado, openNow = b.openToday !== false;
              var s1 = w.querySelector('#ab-hot'), s2 = w.querySelector('#ab-open');
              s1.addEventListener('click', function () { hot = !hot; s1.classList.toggle('is-on', hot); });
              s2.addEventListener('click', function () { openNow = !openNow; s2.classList.toggle('is-on', openNow); });
              w.querySelector('#ab-save').addEventListener('click', async function () {
                await D.updateBusiness(b.id, {
                  name: w.querySelector('#ab-name').value.trim(),
                  category: w.querySelector('#ab-cat').value,
                  zone: w.querySelector('#ab-zone').value.trim(),
                  phone: w.querySelector('#ab-phone').value.trim(),
                  whatsapp: w.querySelector('#ab-wa').value.trim(),
                  ownerEmail: w.querySelector('#ab-owner').value.trim(),
                  description: w.querySelector('#ab-desc').value.trim(),
                  destacado: hot, openToday: openNow
                });
                close(); UI.toast('Local actualizado', 'success'); renderBusinesses();
              });
            });
        });
      });

      UI.qsa('[data-edit-menu]', host).forEach(function (btn) {
        btn.addEventListener('click', async function () {
          var b = await D.getBusiness(btn.getAttribute('data-edit-menu'));
          var items = (b.menu || []).slice();
          function renderItems(w) {
            w.querySelector('#admin-menu-items').innerHTML = items.length ? items.map(function (it, i) {
              return '<div class="menu-item-card" style="margin-bottom:8px"><div class="menu-item-card__top">' +
                '<div class="menu-item-card__fields">' +
                '<input class="input input--sm" data-i="' + i + '" data-k="nombre" value="' + esc(it.nombre) + '">' +
                '<div class="menu-item-card__row"><input class="input input--sm" data-i="' + i + '" data-k="categoria" value="' + esc(it.categoria || '') + '">' +
                '<input class="input input--sm" data-i="' + i + '" data-k="precio" value="' + esc(it.precio) + '"></div>' +
                '<textarea class="textarea textarea--sm" data-i="' + i + '" data-k="descripcion">' + esc(it.descripcion || '') + '</textarea>' +
                '</div><button class="icon-btn" data-del-item="' + i + '" style="color:#e11d48">' + I.svg('trash', { size: 16 }) + '</button></div></div>';
            }).join('') : '<p class="muted tiny">Este local no tiene productos.</p>';
            w.querySelectorAll('[data-i]').forEach(function (inp) {
              inp.addEventListener('input', function () { items[+inp.dataset.i][inp.dataset.k] = inp.value; });
            });
            w.querySelectorAll('[data-del-item]').forEach(function (d) {
              d.addEventListener('click', function () { items.splice(+d.dataset.delItem, 1); renderItems(w); });
            });
          }
          UI.openModal(UI.modalHead('Edición total del menú: ' + b.name) +
            '<div id="admin-menu-items"></div>' +
            '<button class="btn btn--ghost btn--sm" id="admin-add-item" style="margin-top:10px">' + I.svg('plus', { size: 14 }) + 'Agregar producto</button>' +
            '<div class="modal__foot"><button class="btn btn--ghost btn--block" data-modal-close>Cancelar</button>' +
            '<button class="btn btn--primary btn--block" id="admin-save-menu">Guardar menú</button></div>', function (w, close) {
              renderItems(w);
              w.querySelector('#admin-add-item').addEventListener('click', function () {
                items.push({ id: D.uid(), nombre: 'Nuevo producto', categoria: 'General', precio: 0, descripcion: '' });
                renderItems(w);
              });
              w.querySelector('#admin-save-menu').addEventListener('click', async function () {
                await D.updateBusiness(b.id, { menu: items });
                close(); UI.toast('Menú actualizado', 'success'); renderBusinesses();
              });
            });
        });
      });

      UI.qsa('[data-del-biz]', host).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-del-biz');
          UI.openModal(UI.modalHead('¿Eliminar este local?') +
            '<p class="muted">Se eliminará del directorio junto con su menú. Esta acción no se puede deshacer.</p>' +
            '<div class="modal__foot"><button class="btn btn--ghost btn--block" data-modal-close>Cancelar</button>' +
            '<button class="btn btn--danger btn--block" id="admin-del-confirm">Eliminar</button></div>', function (w, close) {
              w.querySelector('#admin-del-confirm').addEventListener('click', async function () {
                await D.deleteBusiness(id); close(); UI.toast('Local eliminado', 'info'); renderBusinesses();
              });
            });
        });
      });
    }

    async function renderPromos() {
      var host = document.getElementById('admin-promos');
      if (!host) return;
      var list = await D.getPromotions();
      var businesses = await D.getBusinesses();
      host.innerHTML = '<div class="panel-head"><h2 style="font-size:1.05rem">Todas las promociones (' + list.length + ')</h2>' +
        '<button class="btn btn--blue btn--sm" id="admin-new-promo">' + I.svg('plus', { size: 14 }) + 'Nueva promoción global</button></div>' +
        (list.length ? '<div style="overflow:auto"><table class="admin-table"><thead><tr><th>Título</th><th>Local</th><th>Descuento</th><th>Vence</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>' +
          list.map(function (p) {
            var b = businesses.find(function (x) { return x.id === p.businessId; });
            return '<tr><td><strong>' + esc(p.titulo) + '</strong></td><td>' + esc(b ? b.name : 'Plataforma') + '</td>' +
              '<td>' + esc(p.descuento || '—') + '</td><td>' + (p.vence ? new Date(p.vence).toLocaleDateString('es-CR') : '—') + '</td>' +
              '<td><span class="badge ' + (p.activa !== false ? 'badge--open' : 'badge--closed') + '">' + (p.activa !== false ? 'Activa' : 'Inactiva') + '</span></td>' +
              '<td><div style="display:flex;gap:5px">' +
              '<button class="btn btn--ghost btn--sm" data-toggle-promo="' + esc(p.id) + '">' + (p.activa !== false ? 'Desactivar' : 'Activar') + '</button>' +
              '<button class="icon-btn" data-del-promo-admin="' + esc(p.id) + '" style="color:#e11d48">' + I.svg('trash', { size: 16 }) + '</button></div></td></tr>';
          }).join('') + '</tbody></table></div>'
          : UI.empty({ art: 'promo', title: 'Sin promociones', text: 'Crea la primera oferta global o espera a que un local publique la suya.' }));

      document.getElementById('admin-new-promo').addEventListener('click', function () {
        UI.openModal(UI.modalHead('Nueva promoción global') +
          '<div class="field"><label class="field__label">Título</label><input class="input" id="np-titulo"></div>' +
          '<div class="field" style="margin-top:12px"><label class="field__label">Descripción</label><textarea class="textarea" id="np-desc"></textarea></div>' +
          '<div class="field" style="margin-top:12px"><label class="field__label">Descuento</label><input class="input" id="np-off"></div>' +
          '<div class="field" style="margin-top:12px"><label class="field__label">Vence</label><input class="input" id="np-vence" type="date"></div>' +
          '<div class="modal__foot"><button class="btn btn--ghost btn--block" data-modal-close>Cancelar</button>' +
          '<button class="btn btn--primary btn--block" id="np-save">Publicar</button></div>', function (w, close) {
            w.querySelector('#np-save').addEventListener('click', async function () {
              var t = w.querySelector('#np-titulo').value.trim();
              if (!t) { UI.toast('Escribe un título', 'error'); return; }
              await D.savePromotion({ titulo: t, descripcion: w.querySelector('#np-desc').value.trim(), descuento: w.querySelector('#np-off').value.trim(), vence: w.querySelector('#np-vence').value, businessId: null, activa: true });
              close(); UI.toast('Promoción publicada', 'success'); renderPromos();
            });
          });
      });
      UI.qsa('[data-toggle-promo]', host).forEach(function (b) {
        b.addEventListener('click', async function () {
          var p = await D.getPromotion(b.getAttribute('data-toggle-promo'));
          await D.savePromotion(Object.assign({}, p, { activa: p.activa === false }));
          renderPromos(); UI.toast('Estado actualizado', 'success');
        });
      });
      UI.qsa('[data-del-promo-admin]', host).forEach(function (b) {
        b.addEventListener('click', async function () {
          await D.deletePromotion(b.getAttribute('data-del-promo-admin'));
          renderPromos(); UI.toast('Promoción eliminada', 'info');
        });
      });
    }

    async function renderPaginas() {
      var host = document.getElementById('admin-paginas');
      if (!host) return;
      var cfg = await D.getConfig();
      var nav = cfg.nav || {};
      var navDefaults = [
        ['inicio', 'Inicio', 'index.html'],
        ['explorar', 'Explorar', 'explorar.html'],
        ['promociones', 'Promociones', 'promociones.html'],
        ['nosotros', 'Quiénes somos', 'nosotros.html'],
        ['faq', 'Preguntas frecuentes', 'preguntas-frecuentes.html'],
        ['contacto', 'Contacto', 'contacto.html']
      ];
      var navRows = navDefaults.map(function (r) {
        var entry = nav[r[0]] || {};
        return '<div class="nav-editor__row" data-nav-row="' + r[0] + '">' +
          '<div><strong>' + esc(r[1]) + '</strong><span class="tiny muted">' + esc(r[2]) + '</span></div>' +
          '<input class="input input--sm" data-nav-label="' + r[0] + '" value="' + esc(entry.label || r[1]) + '">' +
          '<div class="switch ' + (entry.visible !== false ? 'is-on' : '') + '" data-nav-switch="' + r[0] + '" title="Mostrar u ocultar"></div></div>';
      }).join('');

      function inputField(id, label, value) {
        return '<div class="field"><label class="field__label">' + esc(label) + '</label>' +
          '<input class="input" id="' + id + '" value="' + esc(value || '') + '"></div>';
      }
      function textField(id, label, value, rows) {
        return '<div class="field" style="margin-top:12px"><label class="field__label">' + esc(label) + '</label>' +
          '<textarea class="textarea" id="' + id + '" rows="' + (rows || 3) + '">' + esc(value || '') + '</textarea></div>';
      }
      function fieldHtml(cfgField, i, f, value) {
        var attrs = 'class="' + (f[2] === 'long' ? 'textarea textarea--sm' : 'input input--sm') + '"' +
          ' data-list="' + cfgField + '" data-i="' + i + '" data-k="' + f[0] + '" placeholder="' + esc(f[1]) + '"';
        return f[2] === 'long'
          ? '<textarea ' + attrs + '>' + esc(value || '') + '</textarea>'
          : '<input ' + attrs + ' value="' + esc(value || '') + '">';
      }

      var lists = {
        aboutValues: (cfg.aboutValues || []).slice(),
        aboutTeam: (cfg.aboutTeam || []).slice()
      };
      var schemas = {
        aboutValues: [['titulo', 'Título del valor'], ['texto', 'Descripción', 'long']],
        aboutTeam: [['nombre', 'Nombre'], ['rol', 'Rol / puesto'], ['bio', 'Biografía corta', 'long']]
      };

      host.innerHTML = '<div class="config-banner">' + I.svg('menu', { size: 18, style: 'color:var(--brand-coral)' }) +
        '<strong>Contenido web y menú</strong><p class="tiny muted">Edita las etiquetas y la visibilidad del menú, y los textos de «Quiénes somos» y «Contacto». El menú se aplica al recargar.</p></div>' +
        '<div class="card" style="padding:22px;max-width:820px">' +
          '<h2 style="font-size:1.05rem;margin-bottom:4px">Menú de navegación</h2>' +
          '<p class="tiny muted" style="margin-bottom:14px">Cambia el texto o apaga el interruptor para ocultar una sección.</p>' +
          '<div class="nav-editor">' + navRows + '</div>' +

          '<h2 style="font-size:1.05rem;margin:26px 0 4px">Página «Quiénes somos»</h2>' +
          '<p class="tiny muted" style="margin-bottom:14px">Si dejas un texto vacío, esa sección no se muestra en la página pública.</p>' +
          '<div class="form-grid">' + inputField('pg-about-title', 'Título principal', cfg.aboutTitle) + '</div>' +
          textField('pg-about-intro', 'Introducción', cfg.aboutIntro, 3) +
          textField('pg-about-history', 'Historia', cfg.aboutHistory, 4) +
          textField('pg-about-mission', 'Misión', cfg.aboutMission, 3) +
          textField('pg-about-vision', 'Visión', cfg.aboutVision, 3) +
          '<div class="list-editor__head"><strong>Valores</strong><span class="tiny muted">Cada valor se muestra como una tarjeta.</span></div>' +
          '<div data-list-box="aboutValues"></div>' +
          '<div class="list-editor__head"><strong>Equipo</strong><span class="tiny muted">Personas detrás del proyecto.</span></div>' +
          '<div data-list-box="aboutTeam"></div>' +

          '<h2 style="font-size:1.05rem;margin:26px 0 4px">Página «Contacto a desarrolladores»</h2>' +
          textField('pg-contact-intro', 'Texto de presentación', cfg.contactIntro, 3) +
          '<div class="form-grid" style="margin-top:12px">' +
            inputField('pg-dev-name', 'Nombre del desarrollador', cfg.contactDeveloperName) +
            inputField('pg-dev-role', 'Rol / equipo', cfg.contactDeveloperRole) +
            inputField('pg-dev-email', 'Correo de respuestas', cfg.contactEmail) +
            inputField('pg-dev-whatsapp', 'WhatsApp', cfg.supportWhatsapp) +
            inputField('pg-dev-phone', 'Teléfono', cfg.contactPhone) +
            inputField('pg-dev-web', 'Sitio web', cfg.contactWeb) +
          '</div>' +
          textField('pg-contact-address', 'Dirección', cfg.contactAddress, 2) +
          '<div class="form-grid" style="margin-top:12px">' +
            inputField('pg-contact-hours', 'Horario de atención', cfg.contactHours) +
            inputField('pg-contact-response', 'Tiempo de respuesta', cfg.contactResponseTime) +
            inputField('pg-contact-ig', 'Instagram', cfg.instagram) +
            inputField('pg-contact-fb', 'Facebook', cfg.facebook) +
          '</div>' +
          '<button class="btn btn--primary" id="pg-save" style="margin-top:18px">' + I.svg('check', { size: 16 }) + 'Guardar páginas y menú</button>' +
        '</div>';

      function renderList(key) {
        var box = host.querySelector('[data-list-box="' + key + '"]');
        if (!box) return;
        var items = lists[key];
        box.innerHTML = '<div class="list-editor">' + items.map(function (it, i) {
          return '<div class="list-editor__row">' + schemas[key].map(function (f) {
            return fieldHtml(key, i, f, it[f[0]]);
          }).join('') +
            '<button class="icon-btn" data-list-del="' + key + '" data-i="' + i + '" style="color:#e11d48" aria-label="Eliminar">' + I.svg('trash', { size: 15 }) + '</button></div>';
        }).join('') + '<button class="btn btn--ghost btn--sm" data-list-add="' + key + '">' + I.svg('plus', { size: 14 }) + 'Agregar</button></div>';
      }
      renderList('aboutValues');
      renderList('aboutTeam');

      host.addEventListener('click', function (e) {
        var sw = e.target.closest('[data-nav-switch]');
        if (sw) { sw.classList.toggle('is-on'); return; }
        var add = e.target.closest('[data-list-add]');
        if (add) {
          var key = add.getAttribute('data-list-add');
          var blank = {};
          schemas[key].forEach(function (f) { blank[f[0]] = ''; });
          lists[key].push(blank); renderList(key); return;
        }
        var del = e.target.closest('[data-list-del]');
        if (del) {
          lists[del.getAttribute('data-list-del')].splice(+del.getAttribute('data-i'), 1);
          renderList(del.getAttribute('data-list-del'));
        }
      });
      host.addEventListener('input', function (e) {
        var el = e.target;
        var key = el.getAttribute('data-list');
        if (!key) return;
        lists[key][+el.getAttribute('data-i')][el.getAttribute('data-k')] = el.value;
      });

      document.getElementById('pg-save').addEventListener('click', async function () {
        var nextNav = {};
        UI.qsa('[data-nav-row]', host).forEach(function (row) {
          var key = row.getAttribute('data-nav-row');
          nextNav[key] = {
            label: row.querySelector('[data-nav-label]').value.trim() || key,
            visible: row.querySelector('[data-nav-switch]').classList.contains('is-on')
          };
        });
        await D.saveConfig({
          nav: nextNav,
          aboutTitle: document.getElementById('pg-about-title').value.trim(),
          aboutIntro: document.getElementById('pg-about-intro').value.trim(),
          aboutHistory: document.getElementById('pg-about-history').value.trim(),
          aboutMission: document.getElementById('pg-about-mission').value.trim(),
          aboutVision: document.getElementById('pg-about-vision').value.trim(),
          aboutValues: lists.aboutValues,
          aboutTeam: lists.aboutTeam,
          contactIntro: document.getElementById('pg-contact-intro').value.trim(),
          contactDeveloperName: document.getElementById('pg-dev-name').value.trim(),
          contactDeveloperRole: document.getElementById('pg-dev-role').value.trim(),
          contactEmail: document.getElementById('pg-dev-email').value.trim(),
          supportWhatsapp: document.getElementById('pg-dev-whatsapp').value.trim(),
          contactPhone: document.getElementById('pg-dev-phone').value.trim(),
          contactWeb: document.getElementById('pg-dev-web').value.trim(),
          contactAddress: document.getElementById('pg-contact-address').value.trim(),
          contactHours: document.getElementById('pg-contact-hours').value.trim(),
          contactResponseTime: document.getElementById('pg-contact-response').value.trim(),
          instagram: document.getElementById('pg-contact-ig').value.trim(),
          facebook: document.getElementById('pg-contact-fb').value.trim()
        });
        UI.applyBrand(await D.getConfig());
        UI.toast('Páginas y menú actualizados', 'success');
        setTimeout(function () { window.location.reload(); }, 900);
      });
    }

    async function renderFaq() {
      var host = document.getElementById('admin-faq');
      if (!host) return;
      var cfg = await D.getConfig();
      var items = (cfg.faqs || []).slice();
      host.innerHTML = '<div class="config-banner">' + I.svg('info', { size: 18, style: 'color:var(--brand-blue)' }) +
        '<strong>Preguntas frecuentes</strong><p class="tiny muted">Las preguntas se muestran en la página pública. Puedes agregar, editar y eliminar todas las que quieras.</p></div>' +
        '<div class="card" style="padding:22px;max-width:820px"><div id="admin-faq-list"></div>' +
        '<button class="btn btn--ghost btn--sm" id="faq-add">' + I.svg('plus', { size: 14 }) + 'Agregar pregunta</button>' +
        '<button class="btn btn--primary" id="faq-save" style="margin-top:18px">' + I.svg('check', { size: 16 }) + 'Guardar preguntas frecuentes</button></div>';
      var list = document.getElementById('admin-faq-list');
      function paint() {
        list.innerHTML = items.length ? '<div class="list-editor">' + items.map(function (it, i) {
          return '<div class="list-editor__row"><span class="list-editor__num">' + (i + 1) + '</span>' +
            '<input class="input input--sm" data-faq-i="' + i + '" data-faq-k="pregunta" value="' + esc(it.pregunta || '') + '" placeholder="Pregunta">' +
            '<textarea class="textarea textarea--sm" data-faq-i="' + i + '" data-faq-k="respuesta" placeholder="Respuesta">' + esc(it.respuesta || '') + '</textarea>' +
            '<button class="icon-btn" data-faq-del="' + i + '" style="color:#e11d48" aria-label="Eliminar">' + I.svg('trash', { size: 15 }) + '</button></div>';
        }).join('') + '</div>' : '<p class="muted tiny" style="margin-bottom:14px">Aún no hay preguntas. Agrega la primera.</p>';
      }
      paint();
      list.addEventListener('input', function (e) {
        var el = e.target;
        if (!el.hasAttribute('data-faq-i')) return;
        items[+el.getAttribute('data-faq-i')][el.getAttribute('data-faq-k')] = el.value;
      });
      list.addEventListener('click', function (e) {
        var del = e.target.closest('[data-faq-del]');
        if (del) { items.splice(+del.getAttribute('data-faq-del'), 1); paint(); }
      });
      document.getElementById('faq-add').addEventListener('click', function () {
        items.push({ pregunta: '', respuesta: '' }); paint();
      });
      document.getElementById('faq-save').addEventListener('click', async function () {
        var clean = items.filter(function (it) { return it.pregunta.trim() && it.respuesta.trim(); });
        if (clean.length !== items.length) UI.toast('Se omitieron preguntas incompletas.', 'info');
        await D.saveConfig({ faqs: clean });
        UI.toast('Preguntas frecuentes actualizadas', 'success');
      });
    }

    async function renderSupport() {
      var host = document.getElementById('admin-soporte');
      if (!host) return;
      var list = (await D.getMessages()).filter(function (m) { return !m.tipo || m.tipo === 'soporte'; });
      host.innerHTML = '<div class="config-banner">' + I.svg('chat', { size: 18, style: 'color:var(--brand-blue)' }) +
        '<strong>Bandeja de soporte</strong><p class="tiny muted">Mensajes enviados desde Contacto. Responde aquí y la respuesta quedará guardada en el centro de mensajes de la persona.</p></div>' +
        '<div class="card" style="padding:20px" id="admin-support-list"></div>' +
        '<p class="tiny muted" style="margin-top:10px">Bandeja local: los mensajes se guardan en este navegador hasta conectar Firestore. Al conectar el servicio se sincronizarán aquí.</p>';
      var box = document.getElementById('admin-support-list');
      function paint() {
        box.innerHTML = list.length ? list.map(function (m) {
          var done = m.estado === 'resuelto' || m.estado === 'respondido';
          var badge = done ? 'badge--open' : m.estado === 'leido' ? 'badge--new' : 'badge--hot';
          var label = m.estado === 'respondido' ? 'Respondido' : m.estado === 'resuelto' ? 'Resuelto' : m.estado === 'leido' ? 'Leído' : 'Pendiente';
          return '<div class="support-msg" data-msg="' + esc(m.id) + '">' +
            '<div class="support-msg__head"><div><strong>' + esc(m.nombre || 'Sin nombre') + '</strong>' +
              '<span class="tiny muted">' + esc(m.email || 'Sin correo') + '</span></div>' +
              '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
                '<span class="badge ' + badge + '">' + label + '</span>' +
                '<span class="tiny muted">' + new Date(m.createdAt).toLocaleString('es-CR') + '</span></div></div>' +
            (m.asunto ? '<p class="support-msg__subject">' + esc(m.asunto) + '</p>' : '') +
            '<p class="support-msg__body">' + esc(m.mensaje || '').replace(/\n/g, '<br>') + '</p>' +
            (m.respuesta ? '<div class="support-msg__reply"><strong>Respuesta enviada:</strong><br>' +
              esc(m.respuesta).replace(/\n/g, '<br>') + '</div>' : '') +
            '<div class="support-msg__actions">' +
              (m.estado === 'pendiente' ? '<button class="btn btn--ghost btn--sm" data-msg-act="leido" data-msg-id="' + esc(m.id) + '">Marcar leído</button>' : '') +
              (!done ? '<button class="btn btn--blue btn--sm" data-msg-act="responder" data-msg-id="' + esc(m.id) + '">' + I.svg('chat', { size: 14 }) + 'Responder en el buzón</button>' : '') +
              (m.email ? '<a class="btn btn--outline btn--sm" href="mailto:' + encodeURIComponent(m.email) + '?subject=' + encodeURIComponent('Re: ' + (m.asunto || 'Tu mensaje')) + '">' + I.svg('mail', { size: 14 }) + 'Correo</a>' : '') +
              (done ? '<button class="btn btn--ghost btn--sm" data-msg-act="resuelto" data-msg-id="' + esc(m.id) + '">Marcar resuelto</button>' : '') +
              '<button class="icon-btn" data-msg-act="eliminar" data-msg-id="' + esc(m.id) + '" style="color:#e11d48" aria-label="Eliminar mensaje">' + I.svg('trash', { size: 15 }) + '</button>' +
            '</div></div>';
        }).join('') : UI.empty({ art: 'business', title: 'Sin mensajes', text: 'Cuando alguien use el formulario de Contacto, su mensaje aparecerá aquí.' });
        var count = list.filter(function (m) { return m.estado === 'pendiente'; }).length;
        var badgeCount = document.getElementById('tab-msg-count');
        if (badgeCount) badgeCount.textContent = count;
      }
      paint();
      box.addEventListener('click', async function (e) {
        var btn = e.target.closest('[data-msg-act]');
        if (!btn) return;
        var id = btn.getAttribute('data-msg-id');
        var act = btn.getAttribute('data-msg-act');
        if (act === 'responder') {
          var original = list.find(function (m) { return m.id === id; });
          UI.openModal(UI.modalHead('Responder a ' + (original && original.nombre ? original.nombre : 'la persona')) +
            '<p class="muted tiny">La respuesta se guardará en el centro de mensajes de ' +
            (original && original.uid ? 'esta cuenta' : (original && original.email ? esc(original.email) : 'la persona')) + '.</p>' +
            '<div class="field" style="margin-top:12px"><label class="field__label">Tu respuesta</label>' +
            '<textarea class="textarea" id="admin-reply-text" rows="5" maxlength="2000" placeholder="Escribe aquí tu respuesta…"></textarea></div>' +
            '<div class="modal__foot"><button class="btn btn--ghost btn--block" data-modal-close>Cancelar</button>' +
            '<button type="button" class="btn btn--primary btn--block" id="admin-reply-send">Enviar respuesta</button></div>', function (w, close) {
              var send = function () {
                var text = document.getElementById('admin-reply-text').value.trim();
                if (!text) { UI.toast('Escribe la respuesta.', 'error'); return; }
                D.replyToMessage(id, text).then(function () {
                  close();
                  UI.toast('Respuesta enviada al centro de mensajes', 'success');
                  renderSupport();
                }).catch(function (err) { UI.toast(err.message || 'No se pudo enviar la respuesta.', 'error'); });
              };
              document.getElementById('admin-reply-send').addEventListener('click', send);
            });
          return;
        }
        if (act === 'eliminar') {
          await D.deleteMessage(id);
          list = list.filter(function (m) { return m.id !== id; });
        } else {
          var updated = await D.updateMessage(id, { estado: act });
          if (updated) list = list.map(function (m) { return m.id === id ? updated : m; });
        }
        paint(); UI.toast('Mensaje actualizado', 'success');
      });
    }

    function renderCatalogos() {
      var host = document.getElementById('admin-catalogos');
      host.innerHTML = '<h2 style="font-size:1.05rem;margin-bottom:10px">Catálogos base</h2>' +
        '<p class="muted tiny" style="margin-bottom:16px">Rubros y zonas disponibles en el directorio. Los productos y locales siempre inician vacíos.</p>' +
        '<div class="review-summary" style="margin-bottom:18px"><div><strong>Rubros (' + D.CATEGORIES.length + ')</strong>' +
          D.CATEGORIES.map(function (c) { return esc(c.label); }).join(' · ') + '</div>' +
          '<div><strong>Zonas (' + D.ZONES.length + ')</strong>' + D.ZONES.map(esc).join(' · ') + '</div></div>' +
        '<div class="code-display">' + I.svg('shield', { size: 17 }) +
          '<span>Estado del backend: ' + (window.FirebaseConfig.isConfigured() ? 'Firestore conectado' : 'localStorage (sin conexión externa)') + '</span></div>' +
        '<p class="tiny muted" style="margin-top:12px">Conectores listos: <code>js/firebase-config.js</code> y <code>js/appwrite-config.js</code>. Visión IA en <code>js/ai-menu-scanner.js</code>.</p>';
    }
  });
})();
