/* page-registro-usuario.js — Registro de cuenta con Firebase Auth (o modo demo) */
(function () {
  'use strict';

  var D = window.DataService;
  var I = window.AppIcons;
  var UI = window.UI;
  var A = window.AuthService;
  var esc = D.escapeHtml;

  var STRENGTH_LABELS = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Excelente'];

  function svg(name, size) { return I.svg(name, { size: size || 18 }); }

  function safeNext(value) {
    var v = String(value || '').trim();
    if (!v || /^(https?:)?\/\//i.test(v) || /^[\/\\]/.test(v) || v.indexOf('..') !== -1) return 'index.html';
    return v;
  }

  function setBrandDecor(cfg) {
    var mark = document.getElementById('auth-logo-mark');
    if (mark) {
      var logoUrl = cfg && cfg.logoUrl;
      mark.innerHTML = logoUrl ? '<img src="' + esc(logoUrl) + '" alt="">' : svg('compass', 21);
      mark.classList.toggle('has-image', !!logoUrl);
    }
    var f1 = document.getElementById('auth-feature-1'); if (f1) f1.innerHTML = svg('shield', 18);
    var f2 = document.getElementById('auth-feature-2'); if (f2) f2.innerHTML = svg('refresh', 18);
    var f3 = document.getElementById('auth-feature-3'); if (f3) f3.innerHTML = svg('store', 18);

    var pilot = document.getElementById('auth-pilot');
    if (pilot) {
      var demo = !!(A && A.isDemo());
      pilot.textContent = demo ? 'MODO DEMO' : 'ACCESO SEGURO';
      pilot.classList.toggle('auth-pilot--demo', demo);
    }
    var cov = document.querySelector('[data-auth-coverage]');
    if (cov) {
      var zones = (cfg && cfg.coverageZones) || [];
      cov.textContent = zones.length ? zones.join(' · ') : 'Zona piloto por definir';
    }
  }

  function showError(root, message) {
    var el = root.querySelector('#auth-error');
    if (!el) return;
    el.textContent = message || '';
    el.hidden = !message;
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.classList.toggle('is-loading', !!loading);
    btn.disabled = !!loading;
  }

  function scorePassword(value) {
    if (!value) return 0;
    var score = 0;
    if (value.length >= 6) score++;
    if (value.length >= 10) score++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
    if (/\d/.test(value) || /[^A-Za-z0-9]/.test(value)) score++;
    return Math.max(1, Math.min(score, 4));
  }

  function render(root, next) {
    var loginHref = 'login.html?next=' + encodeURIComponent(next);
    root.innerHTML =
      '<div class="auth-card__head">' +
        '<div class="auth-avatar auth-avatar--blue">' + svg('user', 26) + '</div>' +
        '<h2>Crea tu cuenta</h2>' +
        '<p>Es gratis. Solo necesitas un correo y una contraseña.</p>' +
      '</div>' +

      '<div class="auth-mode-badge" id="auth-mode-badge">' + svg('info', 14) + '<span>Verificando modo de acceso…</span></div>' +

      '<form id="register-form" class="auth-form" novalidate>' +
        '<div class="field auth-field">' +
          '<label class="field__label" for="reg-name">Nombre</label>' +
          '<div class="auth-input-wrap">' +
            '<span class="auth-input-icon">' + svg('user', 18) + '</span>' +
            '<input class="input auth-input" id="reg-name" type="text" name="name" autocomplete="name" placeholder="Tu nombre" required>' +
          '</div>' +
        '</div>' +
        '<div class="field auth-field">' +
          '<label class="field__label" for="reg-email">Correo electrónico</label>' +
          '<div class="auth-input-wrap">' +
            '<span class="auth-input-icon">' + svg('mail', 18) + '</span>' +
            '<input class="input auth-input" id="reg-email" type="email" name="email" autocomplete="email" inputmode="email" placeholder="tu@correo.com" required>' +
          '</div>' +
        '</div>' +
        '<div class="field auth-field">' +
          '<label class="field__label" for="reg-password">Contraseña</label>' +
          '<div class="auth-input-wrap">' +
            '<span class="auth-input-icon">' + svg('key', 18) + '</span>' +
            '<input class="input auth-input" id="reg-password" type="password" name="password" autocomplete="new-password" placeholder="Mínimo 6 caracteres" required>' +
            '<button type="button" class="auth-input-toggle" id="toggle-password" aria-label="Mostrar contraseña">' + svg('eye', 17) + '</button>' +
          '</div>' +
          '<div class="auth-strength" id="pw-strength">' +
            '<div class="auth-strength__bars"><i></i><i></i><i></i><i></i></div>' +
            '<span class="auth-strength__label">Mínimo 6 caracteres</span>' +
          '</div>' +
        '</div>' +
        '<div class="field auth-field">' +
          '<label class="field__label" for="reg-confirm">Confirmar contraseña</label>' +
          '<div class="auth-input-wrap">' +
            '<span class="auth-input-icon">' + svg('lock', 18) + '</span>' +
            '<input class="input auth-input" id="reg-confirm" type="password" name="confirm" autocomplete="new-password" placeholder="Repite tu contraseña" required>' +
            '<button type="button" class="auth-input-toggle" id="toggle-confirm" aria-label="Mostrar confirmación">' + svg('eye', 17) + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="auth-error" id="auth-error" role="alert" hidden></div>' +
        '<button class="btn btn--primary btn--block auth-submit" id="register-submit" type="submit">' +
          '<span class="auth-submit__label">Crear cuenta</span><span class="auth-spinner" aria-hidden="true"></span>' +
        '</button>' +
      '</form>' +

      '<div class="auth-divider"><span>o</span></div>' +
      '<p class="auth-switch">¿Ya tienes cuenta? <a href="' + loginHref + '">Ingresar</a></p>' +
      '<div class="auth-hint">' + svg('info', 16) +
        '<span>Después de crear tu cuenta podrás guardar favoritos y solicitar el alta de tu negocio.</span></div>';

    var badge = root.querySelector('#auth-mode-badge');
    if (A && A.isDemo()) {
      badge.classList.add('auth-mode-badge--demo');
      badge.querySelector('span').textContent = 'Modo demostración · sin credenciales de Firebase';
    } else {
      badge.classList.add('auth-mode-badge--secure');
      badge.querySelector('span').textContent = 'Tu cuenta se creará con Firebase Auth';
    }

    function bindToggle(inputId, buttonId) {
      var input = root.querySelector(inputId);
      var btn = root.querySelector(buttonId);
      btn.addEventListener('click', function () {
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.innerHTML = svg(show ? 'close' : 'eye', 17);
        btn.classList.toggle('is-visible', show);
        btn.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
        input.focus();
      });
    }
    bindToggle('#reg-password', '#toggle-password');
    bindToggle('#reg-confirm', '#toggle-confirm');

    var pw = root.querySelector('#reg-password');
    var meter = root.querySelector('#pw-strength');
    var bars = Array.prototype.slice.call(meter.querySelectorAll('i'));
    var label = meter.querySelector('.auth-strength__label');
    pw.addEventListener('input', function () {
      var score = scorePassword(pw.value);
      meter.className = 'auth-strength' + (pw.value ? ' is-s' + score : '');
      bars.forEach(function (bar, i) { bar.classList.toggle('is-on', i < score); });
      label.textContent = pw.value ? STRENGTH_LABELS[score] : 'Mínimo 6 caracteres';
    });

    root.querySelector('#register-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var name = root.querySelector('#reg-name').value.trim();
      var email = root.querySelector('#reg-email').value.trim();
      var password = pw.value;
      var confirm = root.querySelector('#reg-confirm').value;
      var btn = root.querySelector('#register-submit');
      showError(root, '');

      if (name.length < 2) { showError(root, 'Escribe tu nombre (mínimo 2 caracteres).'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError(root, 'Ingresa un correo electrónico válido.'); return; }
      if (password.length < 6) { showError(root, 'La contraseña debe tener al menos 6 caracteres.'); return; }
      if (password !== confirm) { showError(root, 'Las contraseñas no coinciden.'); return; }

      setLoading(btn, true);
      try {
        var session = await A.signUp(name, email, password);
        UI.toast('¡Cuenta creada! Bienvenido, ' + String(session.name || '').trim().split(' ')[0] + '.', 'success');
        window.location.replace(next);
      } catch (err) {
        showError(root, A.friendlyError(err));
        setLoading(btn, false);
      }
    });
  }

  UI.ready.then(function () {
    setBrandDecor(UI.getConfig());
    var next = safeNext(new URLSearchParams(window.location.search).get('next'));
    var root = document.getElementById('auth-root');
    if ((A && A.current()) || UI.getSession()) {
      window.location.replace(next);
      return;
    }
    render(root, next);
  });
})();
