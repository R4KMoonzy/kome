/* ============================================================
   ui-core.js — Motor compartido en TODAS las páginas
   Inyecta shell, nombre white-label, drawer, dark mode, toasts,
   búsqueda omnicanal y componentes reutilizables.
   ============================================================ */
(function (global) {
  'use strict';

  var D = global.DataService;
  var I = global.AppIcons;
  var esc = D.escapeHtml;
  var config = D.DEFAULT_CONFIG;
  var session = null;

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------------- Toasts ---------------- */
  function toast(message, type) {
    type = type || 'info';
    var root = qs('#toast-root');
    if (!root) return;
    var icon = type === 'success' ? 'check' : type === 'error' ? 'alert' : 'info';
    var el = document.createElement('div');
    el.className = 'toast toast--' + type;
    el.innerHTML = '<span class="toast__icon">' + I.svg(icon, { size: 16, strokeWidth: 2.4 }) + '</span><span>' + esc(message) + '</span>';
    root.appendChild(el);
    setTimeout(function () {
      el.classList.add('is-out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 280);
    }, 3600);
  }

  /* ---------------- Modal ---------------- */
  function openModal(html, onMount) {
    var root = qs('#modal-root');
    var wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
    root.appendChild(wrap);
    function close() { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    qsa('[data-modal-close]', wrap).forEach(function (b) { b.addEventListener('click', close); });
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
    });
    if (onMount) onMount(wrap, close);
    return { element: wrap, close: close };
  }

  function modalHead(title) {
    return '<div class="modal__head"><h3 class="modal__title">' + esc(title) + '</h3>' +
      '<button class="icon-btn" data-modal-close aria-label="Cerrar">' + I.svg('close', { size: 18 }) + '</button></div>';
  }

  /* ---------------- Nombre dinámico / white-label ---------------- */
  function applyBrand(cfg) {
    config = cfg;
    document.title = cfg.appName + ' — ' + cfg.slogan;
    qsa('[data-app-name]').forEach(function (el) {
      var parts = cfg.appName.split(' ');
      if (parts.length > 1) {
        el.innerHTML = '<em>' + esc(parts[0]) + '</em> ' + esc(parts.slice(1).join(' '));
      } else {
        el.innerHTML = '<em>' + esc(cfg.appName) + '</em>';
      }
    });
    qsa('[data-app-slogan]').forEach(function (el) { el.textContent = cfg.slogan || ''; });
    var showNotice = !!(cfg.noticeEnabled && cfg.topNotice && String(cfg.topNotice).trim());
    qsa('[data-app-notice]').forEach(function (el) { el.innerHTML = showNotice ? esc(cfg.topNotice) : ''; });
    document.documentElement.style.setProperty('--brand-coral', cfg.primaryColor || '#FF2E00');

    /* Logo subido desde admin, con respaldo al marcador SVG original */
    qsa('[data-brand-mark]').forEach(function (el) {
      if (!el.getAttribute('data-mark-default')) el.setAttribute('data-mark-default', el.innerHTML);
      el.innerHTML = cfg.logoUrl
        ? '<img src="' + esc(cfg.logoUrl) + '" alt="">'
        : el.getAttribute('data-mark-default');
      el.classList.toggle('has-image', !!cfg.logoUrl);
    });

    var letter = (cfg.appName || 'M').charAt(0).toUpperCase();
    var favicon = cfg.logoUrl || ('data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FF2E00"/><stop offset=".5" stop-color="#FF6B00"/><stop offset="1" stop-color="#FF0055"/></linearGradient></defs><rect width="64" height="64" rx="18" fill="url(#g)"/><text x="32" y="43" font-family="Arial" font-size="36" font-weight="bold" text-anchor="middle" fill="white">' + letter + '</text></svg>'
    ));
    var link = qs('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link'); link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = favicon;

    var notice = qs('#top-notice');
    if (notice) {
      notice.classList.toggle('is-visible', showNotice);
      document.body.classList.toggle('has-notice', showNotice);
    }
  }

  /* ---------------- Navegación editable ---------------- */
  var NAV_ITEMS = [
    { key: 'inicio', href: 'index.html', label: 'Inicio', icon: 'compass' },
    { key: 'explorar', href: 'explorar.html', label: 'Explorar', icon: 'search' },
    { key: 'promociones', href: 'promociones.html', label: 'Promociones', icon: 'gift' },
    { key: 'nosotros', href: 'nosotros.html', label: 'Quiénes somos', icon: 'users' },
    { key: 'faq', href: 'preguntas-frecuentes.html', label: 'Preguntas frecuentes', icon: 'info' },
    { key: 'contacto', href: 'contacto.html', label: 'Contacto', icon: 'mail' }
  ];
  function navItems() {
    var nav = config.nav || {};
    return NAV_ITEMS.filter(function (n) {
      var entry = nav[n.key];
      return !entry || entry.visible !== false;
    }).map(function (n) {
      var entry = nav[n.key] || {};
      return { key: n.key, href: n.href, icon: n.icon, label: entry.label || n.label };
    });
  }
  function markActiveNav() {
    var file = global.location.pathname.split('/').pop() || 'index.html';
    qsa('[data-nav], .app-footer a[href], .menu-item[href]').forEach(function (el) {
      var raw = el.getAttribute('data-nav') || el.getAttribute('href') || '';
      var target = raw.split('?')[0].split('#')[0];
      var on = !!target && target === file;
      el.classList.toggle('is-active', on);
      if (on) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
    });
  }

  /* ---------------- Tema ---------------- */
  function currentTheme() { return global.localStorage.getItem(D.KEYS.theme) || 'light'; }
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    global.localStorage.setItem(D.KEYS.theme, theme);
    qsa('[data-theme-toggle]').forEach(function (b) {
      b.innerHTML = I.svg(theme === 'dark' ? 'sun' : 'moon', { size: 19 });
      b.setAttribute('aria-label', theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro');
    });
  }
  function toggleTheme() { applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'); }

  /* ---------------- Drawer ---------------- */
  function buildDrawer() {
    var catLinks = D.CATEGORIES.map(function (c) {
      return '<button class="drawer-link" data-nav="explorar.html?cat=' + c.id + '">' +
        I.category(c.icon, c.color, { size: 34 }) + '<span>' + esc(c.label) + '</span>' +
        '<span class="drawer-link__chev">' + I.svg('chevronRight', { size: 15 }) + '</span></button>';
    }).join('');

    return '<div class="drawer-backdrop" data-drawer-close></div>' +
      '<aside class="drawer" id="app-drawer-panel" aria-label="Menú principal">' +
        '<div class="drawer__head">' +
          '<button class="icon-btn drawer__close" data-drawer-close aria-label="Cerrar menú">' + I.svg('close', { size: 20 }) + '</button>' +
          '<div class="drawer__hello">' + D.greeting() + ',</div>' +
          '<div class="drawer__name" id="drawer-user">Invitado</div>' +
        '</div>' +
        '<div class="drawer__body">' +
          '<a class="drawer-promo" href="promociones.html">' + I.svg('gift', { size: 24 }) +
            '<span><strong>Descubre nuestras promociones</strong><small>Ofertas publicadas por tus locales</small></span></a>' +
          (session ? '' : '<div class="drawer-auth-cta">' +
            '<a class="btn btn--primary btn--block" href="login.html">' + I.svg('lock', { size: 16 }) + 'Ingresar</a>' +
            '<a class="btn btn--ghost btn--block" href="registro.html">' + I.svg('user', { size: 16 }) + 'Crear cuenta</a></div>') +
          '<div class="drawer-group__title">Navegación</div>' +
            navItems().map(function (n) {
              return '<button class="drawer-link" data-nav="' + esc(n.href) + '">' +
                I.svg(n.icon, { size: 19 }) + '<span>' + esc(n.label) + '</span></button>';
            }).join('') +
          '<div class="drawer-group__title">Rubros</div>' + catLinks +
          '<div class="drawer-group__title">Otros</div>' +
          '<button class="drawer-link" data-nav="registrar-negocio.html?tipo=restaurante">' + I.svg('store', { size: 19 }) + '<span>Registra tu restaurante</span></button>' +
          '<button class="drawer-link" data-nav="registrar-negocio.html?tipo=tienda">' + I.svg('box', { size: 19 }) + '<span>Registra tu tienda</span></button>' +
          '<button class="drawer-link" data-nav="registrar-negocio.html?tipo=pauta">' + I.svg('chart', { size: 19 }) + '<span>Pauta con nosotros</span></button>' +
          '<button class="drawer-link" data-nav="admin.html">' + I.svg('shield', { size: 19 }) + '<span>Acceso Administrativo</span></button>' +
          '<div class="drawer-zone">' + I.svg('location', { size: 15, style: 'display:inline-block;vertical-align:-3px;margin-right:5px' }) +
            'Tu zona: <strong id="drawer-zone">No definida</strong>' +
            '<div class="drawer-coverage" id="drawer-coverage">Cobertura actual: Cañas, Guanacaste</div></div>' +
        '</div>' +
      '</aside>';
  }

  function openDrawer() {
    var d = qs('#app-drawer-panel'); var b = qs('.drawer-backdrop');
    if (d) d.classList.add('is-open');
    if (b) b.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    var d = qs('#app-drawer-panel'); var b = qs('.drawer-backdrop');
    if (d) d.classList.remove('is-open');
    if (b) b.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  /* ---------------- Header ---------------- */
  function avatarHtml(s) {
    if (!s) return '<a class="auth-trigger" href="login.html" data-login>' + I.svg('user', { size: 17 }) + '<span>Ingresar</span></a>';
    var initial = (s.name || 'U').trim().charAt(0).toUpperCase();
    return '<button class="avatar" data-profile-toggle aria-label="Mi cuenta">' +
      (s.photo ? '<img src="' + esc(s.photo) + '" alt="">' : esc(initial)) + '</button>';
  }

  function buildHeader() {
    return '<header class="app-header" id="app-header-bar">' +
      '<button class="icon-btn icon-btn--menu" data-drawer-open aria-label="Abrir menú">' + I.svg('menu', { size: 21 }) + '</button>' +
      '<a class="brand" href="index.html" aria-label="Inicio">' +
        '<span class="brand__mark" data-brand-mark>' + I.svg('compass', { size: 22, strokeWidth: 2, style: 'color:#fff' }) + '</span>' +
        '<span class="brand__name" data-app-name>MiGuía Local</span></a>' +
      '<button class="header-location" data-zone>' + I.svg('location', { size: 17 }) +
        '<span id="header-zone-label">Ingresar mi ubicación</span>' + I.svg('chevronDown', { size: 14 }) + '</button>' +
      '<div class="header-search">' +
        '<span class="header-search__icon">' + I.svg('search', { size: 18 }) + '</span>' +
        '<input class="header-search__input" id="global-search" type="search" placeholder="Busca locales o platillos…" autocomplete="off" aria-label="Buscar">' +
        '<div id="search-results" class="search-results hidden"></div>' +
      '</div>' +
      '<div class="header-actions">' +
        '<button class="icon-btn" data-theme-toggle aria-label="Cambiar tema">' + I.svg('moon', { size: 19 }) + '</button>' +
        '<a class="icon-btn" href="favoritos.html" aria-label="Favoritos">' + I.svg('heart', { size: 19 }) + '</a>' +
        '<div class="profile-wrap" id="profile-wrap">' + avatarHtml(session) +
          '<div class="profile-menu hidden" id="profile-menu">' +
            '<div class="profile-menu__head"><div class="profile-menu__name">' + esc(session ? session.name : '') + '</div>' +
            '<div class="profile-menu__mail">' + esc(session ? session.email : '') + '</div></div>' +
            '<a class="menu-item" href="cuenta.html">' + I.svg('user', { size: 17 }) + 'Mi cuenta</a>' +
            '<a class="menu-item" href="favoritos.html">' + I.svg('heart', { size: 17 }) + 'Mis favoritos</a>' +
            '<a class="menu-item" href="mi-negocio.html">' + I.svg('store', { size: 17 }) + 'Mi negocio</a>' +
            '<a class="menu-item" href="admin.html">' + I.svg('shield', { size: 17 }) + 'Administración</a>' +
            '<div class="menu-divider"></div>' +
            '<button class="menu-item menu-item--danger" data-logout>' + I.svg('logout', { size: 17 }) + 'Cerrar sesión</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</header>';
  }

  function buildFooter() {
    return '<footer class="app-footer"><div class="container">' +
      '<div class="app-footer__grid">' +
        '<div><div class="brand" style="margin-bottom:10px"><span class="brand__mark" data-brand-mark>' + I.svg('compass', { size: 20, style: 'color:#fff' }) + '</span>' +
          '<span class="brand__name" data-app-name>MiGuía Local</span></div>' +
          '<p class="muted tiny" data-app-slogan style="max-width:280px"></p></div>' +
        '<div><h4>Explorar</h4><a href="explorar.html">Todos los rubros</a><a href="promociones.html">Promociones</a><a href="favoritos.html">Mis favoritos</a></div>' +
        '<div><h4>Comercios</h4><a href="registrar-negocio.html">Registra tu negocio</a><a href="mi-negocio.html">Panel de mi negocio</a><a href="admin.html">Acceso administrativo</a></div>' +
        '<div><h4>Plataforma</h4>' +
          navItems().filter(function (n) { return n.key !== 'inicio' && n.key !== 'explorar'; }).map(function (n) {
            return '<a href="' + esc(n.href) + '">' + esc(n.label) + '</a>';
          }).join('') +
          '<a href="cuenta.html">Mi cuenta</a><button data-zone>Cambiar zona</button></div>' +
      '</div>' +
      '<div class="app-footer__bottom"><span>© ' + new Date().getFullYear() + ' <span data-app-name>MiGuía Local</span>. Directorio informativo.</span>' +
      '<span>Sin carrito · Sin cobros internos · Contacto directo</span></div>' +
    '</div></footer>';
  }

  function zoneLabel() {
    var s = global.localStorage.getItem('mgl:zone');
    return s || '';
  }

  function refreshZoneLabels() {
    var z = zoneLabel();
    var h = qs('#header-zone-label'); if (h) h.textContent = z || 'Ingresar mi ubicación';
    var d = qs('#drawer-zone'); if (d) d.textContent = z || 'No definida';
    var c = qs('#drawer-coverage');
    if (c) {
      var labels = D.coverageLabels(config);
      c.textContent = config.coverageEnabled
        ? 'Cobertura actual: ' + (labels[0] || 'Cañas, Guanacaste')
        : 'Cobertura nacional (sin restricciones)';
    }
  }

  function saveZone(value) {
    global.localStorage.setItem('mgl:zone', value);
    refreshZoneLabels();
    toast('Zona guardada: ' + value, 'success');
    global.dispatchEvent(new Event('mgl:zone-changed'));
  }

  /** Alerta de cobertura piloto reutilizable (ubicación y negocios) */
  function coverageAlert(details) {
    details = details || {};
    var labels = D.coverageLabels(config);
    var primary = labels[0] || 'Cañas, Guanacaste';
    var actions = details.actions;
    if (!actions) {
      actions = [{ label: details.closeLabel || 'Entendido', kind: 'ghost' }];
      if (details.onUseCoverage) {
        actions.push({ label: 'Usar ' + primary, kind: 'primary', onClick: function () { details.onUseCoverage(primary); } });
      }
    }
    openModal(modalHead(details.title || 'Fuera de nuestra cobertura actual') +
      '<div class="coverage-alert">' +
        '<div class="coverage-alert__icon">' + I.svg('location', { size: 30 }) + '</div>' +
        '<p class="coverage-alert__text">' + esc(details.description || D.coverageMessage(config)) + '</p>' +
        (details.zone ? '<div class="coverage-alert__zone"><span>Zona indicada</span><strong>' + esc(details.zone) + '</strong></div>' : '') +
        '<div class="coverage-note">' + I.svg('info', { size: 15 }) +
          '<span>Cobertura actual: <strong>' + esc(labels[0] || 'Cañas, Guanacaste') + '</strong></span></div>' +
      '</div>' +
      '<div class="modal__foot">' + actions.map(function (a, i) {
        return '<button class="btn btn--' + (a.kind || 'ghost') + ' btn--block" data-coverage-action="' + i + '">' + esc(a.label) + '</button>';
      }).join('') + '</div>', function (wrap, close) {
        qsa('[data-coverage-action]', wrap).forEach(function (btn) {
          btn.addEventListener('click', function () {
            var action = actions[+btn.getAttribute('data-coverage-action')];
            close();
            if (action && action.onClick) action.onClick();
          });
        });
      });
  }

  function openZoneModal() {
    var zones = D.ZONES.map(function (z) { return '<option value="' + esc(z) + '">' + esc(z) + '</option>'; }).join('');
    var current = zoneLabel();
    var labels = D.coverageLabels(config);
    var banner = config.coverageEnabled
      ? '<div class="coverage-note coverage-note--modal">' + I.svg('info', { size: 16 }) +
        '<span>' + esc(D.coverageMessage(config)) + '</span></div>' : '';

    openModal(modalHead('¿Dónde estás?') +
      '<p class="muted tiny" style="margin-bottom:12px">Guardamos tu zona para mostrarte locales cercanos. No usamos tu ubicación para cobros ni seguimiento.</p>' +
      banner +
      '<div class="field" style="margin-top:14px"><label class="field__label">Selecciona tu zona</label>' +
      '<select class="select" id="zone-select"><option value="">Elegir zona…</option>' + zones + '</select></div>' +
      '<div class="field" style="margin-top:12px"><label class="field__label">O escribe tu barrio / dirección</label>' +
      '<input class="input" id="zone-custom" placeholder="Ej. Cañas centro" value="' + esc(current && D.ZONES.indexOf(current) === -1 ? current : '') + '"></div>' +
      '<div class="form-actions"><button class="btn btn--blue btn--block" id="zone-use-geo">' + I.svg('location', { size: 17 }) + 'Usa tu ubicación actual</button></div>' +
      '<div class="modal__foot"><button class="btn btn--ghost btn--block" data-modal-close>Cancelar</button><button class="btn btn--primary btn--block" id="zone-save">Guardar zona</button></div>',
      function (wrap, close) {
        var sel = qs('#zone-select', wrap), custom = qs('#zone-custom', wrap);
        if (D.ZONES.indexOf(current) !== -1) sel.value = current;

        qs('#zone-save', wrap).addEventListener('click', function () {
          var value = custom.value.trim() || sel.value;
          if (!value) { toast('Elige o escribe una zona.', 'error'); return; }
          if (!D.isCoveredZone(value, config)) {
            coverageAlert({
              zone: value,
              description: 'Estamos en fase piloto y todavía no tenemos cobertura en esa zona. No guardaremos una ubicación donde aún no hay comercios verificados.',
              onUseCoverage: function (label) { saveZone(label); }
            });
            return;
          }
          saveZone(value); close();
        });

        qs('#zone-use-geo', wrap).addEventListener('click', function () {
          if (!navigator.geolocation) { toast('Tu navegador no soporta geolocalización.', 'error'); return; }
          toast('Obteniendo ubicación…', 'info');
          navigator.geolocation.getCurrentPosition(function (pos) {
            var lat = pos.coords.latitude, lng = pos.coords.longitude;
            var label = 'Ubicación actual (' + lat.toFixed(4) + ', ' + lng.toFixed(4) + ')';
            if (!D.isCoveredCoordinates(lat, lng, config)) {
              coverageAlert({
                zone: label,
                description: 'Tu ubicación actual parece estar fuera del área piloto. Pronto llegaremos a más zonas; mientras tanto puedes explorar con ' + labels[0] + '.',
                onUseCoverage: function (coverageLabel) { saveZone(coverageLabel); }
              });
              return;
            }
            saveZone(label); close();
          }, function () { toast('No pudimos acceder a tu ubicación.', 'error'); }, { timeout: 10000 });
        });
      });
  }

  function openLoginModal(next) {
    var target = next || (global.location.pathname.split('/').pop() + global.location.search);
    go(global.AuthService ? global.AuthService.loginUrl(target) : 'login.html?next=' + encodeURIComponent(target));
  }
  function requireAuth(next) {
    if (session) return true;
    openLoginModal(next);
    return false;
  }

  function renderSession() {
    var wrap = qs('#profile-wrap');
    if (wrap) wrap.innerHTML = avatarHtml(session) +
      '<div class="profile-menu hidden" id="profile-menu">' +
        '<div class="profile-menu__head"><div class="profile-menu__name">' + esc(session ? session.name : '') + '</div>' +
        '<div class="profile-menu__mail">' + esc(session ? session.email : '') + '</div></div>' +
        '<a class="menu-item" href="cuenta.html">' + I.svg('user', { size: 17 }) + 'Mi cuenta</a>' +
        '<a class="menu-item" href="favoritos.html">' + I.svg('heart', { size: 17 }) + 'Mis favoritos</a>' +
        '<a class="menu-item" href="mi-negocio.html">' + I.svg('store', { size: 17 }) + 'Mi negocio</a>' +
        '<a class="menu-item" href="admin.html">' + I.svg('shield', { size: 17 }) + 'Administración</a>' +
        '<div class="menu-divider"></div>' +
        '<button class="menu-item menu-item--danger" data-logout>' + I.svg('logout', { size: 17 }) + 'Cerrar sesión</button>' +
      '</div>';
    var du = qs('#drawer-user'); if (du) du.textContent = session ? session.name : 'Invitado';
  }

  /* ---------------- Búsqueda omnicanal ---------------- */
  var searchTimer = null;
  async function runSearch(value) {
    var box = qs('#search-results');
    if (!box) return;
    var q = value.trim();
    if (q.length < 2) { box.classList.add('hidden'); box.innerHTML = ''; return; }
    var businesses = await D.queryBusinesses({ q: q });
    var direct = businesses.slice(0, 5);
    var dishMatches = [];
    for (var i = 0; i < businesses.length && dishMatches.length < 4; i++) {
      (businesses[i].menu || []).forEach(function (m) {
        if (dishMatches.length < 4 && (m.nombre + ' ' + (m.descripcion || '')).toLowerCase().indexOf(q.toLowerCase()) !== -1) {
          dishMatches.push({ business: businesses[i], item: m });
        }
      });
    }
    var html = '';
    if (direct.length) {
      html += '<div class="search-results__label">Locales</div>' + direct.map(function (b) {
        return '<a class="search-result" href="comercio.html?id=' + encodeURIComponent(b.id) + '">' +
          '<span class="search-result__thumb">' + (b.logo ? '<img src="' + esc(b.logo) + '" alt="" style="border-radius:10px">' : I.svg('store', { size: 18 })) + '</span>' +
          '<span><span class="search-result__title">' + esc(b.name) + '</span><br><span class="search-result__meta">' +
          esc(D.categoryById(b.category).label) + ' · ' + esc(b.zone || 'Zona no definida') + '</span></span></a>';
      }).join('');
    }
    if (dishMatches.length) {
      html += '<div class="search-results__label">Platillos / productos</div>' + dishMatches.map(function (d) {
        return '<a class="search-result" href="comercio.html?id=' + encodeURIComponent(d.business.id) + '">' +
          '<span class="search-result__thumb">' + (d.item.imagen ? '<img src="' + esc(d.item.imagen) + '" alt="" style="border-radius:10px">' : I.svg('menuBook', { size: 18 })) + '</span>' +
          '<span><span class="search-result__title">' + esc(d.item.nombre) + '</span><br><span class="search-result__meta">' +
          esc(d.business.name) + ' · ' + D.formatMoney(d.item.precio) + '</span></span></a>';
      }).join('');
    }
    if (!html) html = '<div class="search-results__empty">' + I.svg('search', { size: 30, style: 'margin:0 auto 10px;color:var(--text-3)' }) +
      'Sin coincidencias para “' + esc(q) + '”</div>';
    html += '<a class="menu-item" style="justify-content:center;color:var(--brand-blue);font-weight:600" href="explorar.html?q=' + encodeURIComponent(q) + '">Ver todos los resultados ' + I.svg('arrowRight', { size: 15 }) + '</a>';
    box.innerHTML = html;
    box.classList.remove('hidden');
  }

  /* ---------------- Componentes reutilizables ---------------- */
  function empty(opts) {
    opts = opts || {};
    var art = I.emptyArt(opts.art || 'business');
    return '<div class="empty-state">' +
      '<div class="empty-state__art">' + art + '</div>' +
      '<h3 class="empty-state__title">' + esc(opts.title || 'Aún no hay contenido') + '</h3>' +
      '<p class="empty-state__text">' + esc(opts.text || 'Cuando se publique contenido aquí, podrás verlo en esta sección.') + '</p>' +
      (opts.action ? '<a class="btn btn--primary" href="' + esc(opts.action.href) + '">' +
        (opts.action.icon ? I.svg(opts.action.icon, { size: 17 }) : '') + esc(opts.action.label) + '</a>' : '') +
      '</div>';
  }

  function favoriteButton(businessId, large) {
    return '<button class="' + (large ? 'icon-btn' : 'icon-btn') + ' fav-btn" data-fav="' + esc(businessId) + '" aria-label="Guardar en favoritos" title="Guardar en favoritos">' +
      I.svg('heart', { size: large ? 20 : 18 }) + '</button>';
  }

  function syncFavorites(root) {
    D.getFavorites().then(function (ids) {
      qsa('[data-fav]', root || document).forEach(function (b) {
        var active = ids.indexOf(b.getAttribute('data-fav')) !== -1;
        b.style.color = active ? 'var(--brand-magenta)' : '';
        b.innerHTML = I.svg(active ? 'heartFilled' : 'heart', { size: b.classList.contains('fav-btn--lg') ? 22 : 18 });
      });
    });
  }

  function heartBurst(el) {
    el.classList.add('heart-burst', 'is-bursting');
    for (var i = 0; i < 7; i++) {
      var p = document.createElement('span');
      var angle = (Math.PI * 2 * i) / 7;
      p.className = 'heart-particle';
      p.style.setProperty('--px', Math.cos(angle) * 26 + 'px');
      p.style.setProperty('--py', Math.sin(angle) * 26 + 'px');
      el.appendChild(p);
      setTimeout(function (node) { return function () { if (node.parentNode) node.parentNode.removeChild(node); }; }(p), 650);
    }
    setTimeout(function () { el.classList.remove('is-bursting'); }, 560);
  }

  function businessCard(b) {
    var open = D.isOpenNow(b);
    var cat = D.categoryById(b.category);
    var promo = '';
    return '<article class="biz-card stagger-item" data-href="comercio.html?id=' + esc(b.id) + '">' +
      '<div class="biz-card__cover" style="background:' + (b.cover ? 'url(' + esc(b.cover) + ') center/cover' : cat.color + '22') + '">' +
        '<span class="biz-card__cat" style="background:' + cat.color + '">' + esc(cat.label) + '</span>' +
        '<span class="badge ' + (open ? 'badge--open' : 'badge--closed') + '" style="position:absolute;left:12px;bottom:12px;background:var(--surface)">' +
          '<span class="status-dot ' + (open ? '' : 'status-dot--closed') + '"></span>' + (open ? 'Abierto' : 'Cerrado') + '</span>' +
        favoriteButton(b.id) +
      '</div>' +
      '<div class="biz-card__body">' +
        '<h3 class="biz-card__title">' + esc(b.name) + '</h3>' +
        '<p class="biz-card__meta">' + I.svg('location', { size: 13 }) + ' ' + esc(b.zone || 'Zona no definida') +
          (b.express ? ' · <span style="color:var(--brand-blue);font-weight:700">Express propio</span>' : '') + '</p>' +
        (b.description ? '<p class="biz-card__desc">' + esc(b.description.slice(0, 92)) + (b.description.length > 92 ? '…' : '') + '</p>' : '') +
        '<div class="biz-card__foot">' +
          '<span class="biz-card__rating">' + I.svg('starFilled', { size: 14, style: 'color:#FFB800' }) +
            (b.ratingCount ? (D.ratingOf(b)).toFixed(1) + ' (' + b.ratingCount + ')' : 'Sin reseñas') + '</span>' +
          '<span class="biz-card__go">' + I.svg('arrowRight', { size: 16 }) + '</span>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function categoryRail(active) {
    return '<div class="cat-rail">' + D.CATEGORIES.map(function (c) {
      return '<a href="explorar.html?cat=' + c.id + '" class="cat-item ' + (active === c.id ? 'is-active' : '') + '">' +
        I.category(c.icon, c.color, { size: 62 }) + '<span>' + esc(c.label) + '</span></a>';
    }).join('') + '</div>';
  }

  function go(href) {
    if (!href) return;
    if (href.indexOf('http') === 0) global.open(href, '_blank', 'noopener');
    else global.location.href = href;
  }

  /* ---------------- Arranque del shell ---------------- */
  async function init() {
    /* El shell se monta ANTES de cualquier await: header, menú, botones y
       footer aparecen de inmediato con la config por defecto. La config real
       de Firestore y la sesión se resuelven en paralelo más abajo. */
    applyTheme(currentTheme());

    var mount = function (id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; };
    mount('top-notice', '<span class="top-notice__icon">' + I.svg('bell', { size: 14 }) + '</span>' +
      '<span data-app-notice></span><button class="top-notice__close" data-notice-close aria-label="Cerrar aviso">' + I.svg('close', { size: 13 }) + '</button>');
    mount('app-header', buildHeader());
    mount('app-drawer', buildDrawer());
    mount('app-footer', buildFooter());
    mount('promo-pill', '<a class="promo-pill" href="promociones.html"><span class="promo-pill__badge" id="promo-count">0</span>' +
      I.svg('gift', { size: 21 }) + '<span>Promociones</span>' + I.svg('arrowRight', { size: 16 }) + '</a>');
    mount('cookie-bar', '<p><strong>Tu privacidad importa.</strong> Usamos almacenamiento local para recordar tus preferencias, favoritos y zona. No hay cobros ni rastreo publicitario.</p>' +
      '<button class="btn btn--blue btn--sm" id="cookie-accept">Aceptar</button>');
    mount('toast-root', '');
    mount('modal-root', '');

    applyBrand(config);
    markActiveNav();
    refreshZoneLabels();

    /* Red en paralelo: antes eran dos esperas consecutivas (~460ms + ~250ms). */
    var configTask = D.getConfig().then(function (real) {
      config = real || config;
      applyBrand(config);
      return config;
    }).catch(function () { return config; });

    var authTask = (global.AuthService
      ? global.AuthService.init().then(function (state) { return state && state.session; })
      : Promise.resolve(null)).then(function (authSession) {
        return authSession || D.getSession();
      }).then(function (s) { session = s || null; return session; });

    renderSession();

    if (!global.localStorage.getItem(D.KEYS.cookies)) {
      var cb = qs('#cookie-bar'); if (cb) cb.classList.add('is-visible');
    }
    qs('#cookie-accept') && qs('#cookie-accept').addEventListener('click', function () {
      global.localStorage.setItem(D.KEYS.cookies, '1');
      qs('#cookie-bar').classList.remove('is-visible');
      toast('Preferencias guardadas', 'success');
    });
    qs('[data-notice-close]') && qs('[data-notice-close]').addEventListener('click', function () {
      D.saveConfig({ noticeEnabled: false }).then(applyBrand);
    });

    /* Eventos delegados */
    document.addEventListener('click', function (e) {
      var t = e.target;
      var closest = function (sel) { return t.closest ? t.closest(sel) : null; };

      var drawerOpen = closest('[data-drawer-open]'); if (drawerOpen) { openDrawer(); return; }
      if (closest('[data-drawer-close]')) { closeDrawer(); return; }
      if (closest('[data-theme-toggle]')) { toggleTheme(); return; }
      if (closest('[data-zone]')) { openZoneModal(); return; }
      if (closest('[data-login]')) {
        e.preventDefault();
        var next = global.location.pathname.split('/').pop() + global.location.search;
        go(global.AuthService ? global.AuthService.loginUrl(next) : 'login.html?next=' + encodeURIComponent(next));
        return;
      }
      if (closest('[data-logout]')) {
        var logoutTask = global.AuthService ? global.AuthService.signOut() : D.logout();
        Promise.resolve(logoutTask).then(function () {
          session = null; renderSession(); toast('Sesión cerrada', 'info'); global.location.href = 'index.html';
        });
        return;
      }
      var nav = closest('[data-nav]'); if (nav) { closeDrawer(); go(nav.getAttribute('data-nav')); return; }
      var fav = closest('[data-fav]');
      if (fav) {
        e.preventDefault(); e.stopPropagation();
        if (!session) {
          toast('Inicia sesión para guardar favoritos.', 'info');
          var next = global.location.pathname.split('/').pop() + global.location.search;
          setTimeout(function () {
            go(global.AuthService ? global.AuthService.loginUrl(next) : 'login.html?next=' + encodeURIComponent(next));
          }, 700);
          return;
        }
        D.toggleFavorite(fav.getAttribute('data-fav')).then(function (added) {
          if (added) heartBurst(fav);
          syncFavorites();
          toast(added ? 'Guardado en favoritos' : 'Eliminado de favoritos', added ? 'success' : 'info');
        });
        return;
      }
      var card = closest('[data-href]');
      if (card && !closest('a') && !closest('button')) { go(card.getAttribute('data-href')); return; }
      var profileBtn = closest('[data-profile-toggle]');
      if (profileBtn) {
        e.stopPropagation();
        var menu = qs('#profile-menu'); if (menu) menu.classList.toggle('hidden');
        return;
      }
      if (!closest('#profile-menu')) { var m = qs('#profile-menu'); if (m) m.classList.add('hidden'); }
      if (!closest('#search-results') && !closest('#global-search')) {
        var box = qs('#search-results'); if (box) box.classList.add('hidden');
      }

      /* Ripple */
      var rippleHost = closest('.btn, .icon-btn, .cat-item');
      if (rippleHost) {
        var r = document.createElement('span');
        r.className = 'ripple-ink';
        var rect = rippleHost.getBoundingClientRect();
        r.style.left = (e.clientX - rect.left) + 'px';
        r.style.top = (e.clientY - rect.top) + 'px';
        rippleHost.style.position = rippleHost.style.position || 'relative';
        rippleHost.style.overflow = 'hidden';
        rippleHost.appendChild(r);
        setTimeout(function () { if (r.parentNode) r.parentNode.removeChild(r); }, 640);
      }
    });

    var searchInput = qs('#global-search');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        clearTimeout(searchTimer);
        var v = this.value;
        searchTimer = setTimeout(function () { runSearch(v); }, 170);
      });
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && this.value.trim()) go('explorar.html?q=' + encodeURIComponent(this.value.trim()));
        if (e.key === 'Escape') { qs('#search-results').classList.add('hidden'); this.blur(); }
      });
    }

    window.addEventListener('scroll', function () {
      var h = qs('#app-header-bar'); if (h) h.classList.toggle('is-scrolled', window.scrollY > 8);
    }, { passive: true });

    global.addEventListener('mgl:auth-changed', function (e) {
      session = (e.detail && e.detail.session) || null;
      renderSession();
    });

    global.addEventListener('mgl:data-changed', function () {
      D.getActivePromotions().then(function (list) {
        var c = qs('#promo-count'); if (c) c.textContent = list.length;
      });
      syncFavorites();
    });

    /* Solo aquí esperamos a la red: el shell y los eventos ya están listos. */
    await Promise.all([configTask, authTask]);

    D.getActivePromotions().then(function (list) {
      var c = qs('#promo-count'); if (c) c.textContent = list.length;
    });
    syncFavorites();
    renderSession();
    applyBrand(config);

    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  global.UI = {
    init: init, toast: toast, openModal: openModal, modalHead: modalHead,
    empty: empty, businessCard: businessCard, categoryRail: categoryRail,
    favoriteButton: favoriteButton, syncFavorites: syncFavorites, heartBurst: heartBurst,
    openDrawer: openDrawer, closeDrawer: closeDrawer, openZoneModal: openZoneModal,
    coverageAlert: coverageAlert, requireAuth: requireAuth,
    openLoginModal: openLoginModal, applyBrand: applyBrand, applyTheme: applyTheme,
    toggleTheme: toggleTheme, runSearch: runSearch, go: go,
    getConfig: function () { return config; },
    getSession: function () { return session; },
    setSession: function (s) { session = s; renderSession(); },
    refreshZoneLabels: refreshZoneLabels,
    qs: qs, qsa: qsa
  };

  var ready = (document.readyState === 'loading')
    ? new Promise(function (resolve) {
        document.addEventListener('DOMContentLoaded', function () { resolve(init()); }, { once: true });
      })
    : init();
  global.UI.ready = ready;
})(window);
