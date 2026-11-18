/* page-login.js — Ingreso con Firebase Auth (o modo demostración) */
(function () {
  'use strict';

  var D = window.DataService;
  var I = window.AppIcons;
  var UI = window.UI;
  var A = window.AuthService;
  var esc = D.escapeHtml;

  function svg(name, size) { return I.svg(name, { size: size || 18 }); }

  /* Evita redirecciones externas manipulando ?next= */
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
    var f1 = document.getElementById('auth-feature-1'); if (f1) f1.innerHTML = svg('heart', 18);
    var f2 = document.getElementById('auth-feature-2'); if (f2) f2.innerHTML = svg('store', 18);
    var f3 = document.getElementById('auth-feature-3'); if (f3) f3.innerHTML = svg('whatsapp', 18);

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

  function openReset(emailValue) {
    UI.openModal(
      UI.modalHead('Recuperar contraseña') +
        '<p class="muted tiny" style="margin-bottom:14px">Escribe el correo de tu cuenta. ' +
        (A && A.isDemo() ? 'En modo demo no se envían correos reales.' : 'Te enviaremos un enlace para crear una contraseña nueva.') + '</p>' +
        '<form id="reset-form">' +
          '<div class="field"><label class="field__label">Correo electrónico</label>' +
          '<input class="input" type="email" name="email" required placeholder="tu@correo.com" value="' + esc(emailValue || '') + '"></div>' +
          '<div class="modal__foot" style="margin-top:18px">' +
            '<button type="button" class="btn btn--ghost btn--block" data-modal-close>Cancelar</button>' +
            '<button type="submit" class="btn btn--primary btn--block" id="reset-submit">Enviar enlace</button>' +
          '</div>' +
        '</form>',
      function (wrap, close) {
        wrap.querySelector('#reset-form').addEventListener('submit', async function (e) {
          e.preventDefault();
          var email = new FormData(e.target).get('email');
          var btn = wrap.querySelector('#reset-submit');
          setLoading(btn, true);
          try {
            var res = await A.sendReset(email);
            close();
            UI.toast(res && res.demo
              ? 'Modo demostración: no se envió ningún correo. Usa una contraseña que recuerdes.'
              : 'Te enviamos un correo para restablecer tu contraseña.', res && res.demo ? 'info' : 'success');
          } catch (err) {
            UI.toast(A.friendlyError(err), 'error');
          } finally {
            setLoading(btn, false);
          }
        });
      }
    );
  }

  function render(root, next) {
    var registerHref = 'registro.html?next=' + encodeURIComponent(next);
    root.innerHTML =
      '<div class="auth-card__head">' +
        '<div class="auth-avatar">' + svg('lock', 26) + '</div>' +
        '<h2>Bienvenido de nuevo</h2>' +
        '<p>Ingresa para continuar con tu cuenta y tus locales guardados.</p>' +
      '</div>' +

      '<div class="auth-mode-badge" id="auth-mode-badge">' + svg('info', 14) + '<span>Verificando modo de acceso…</span></div>' +

      '<form id="login-form" class="auth-form" novalidate>' +
        '<div class="field auth-field">' +
          '<label class="field__label" for="login-email">Correo electrónico</label>' +
          '<div class="auth-input-wrap">' +
            '<span class="auth-input-icon">' + svg('mail', 18) + '</span>' +
            '<input class="input auth-input" id="login-email" type="email" name="email" autocomplete="email" inputmode="email" placeholder="tu@correo.com" required>' +
          '</div>' +
        '</div>' +
        '<div class="field auth-field">' +
          '<div class="auth-field__row">' +
            '<label class="field__label" for="login-password">Contraseña</label>' +
            '<button type="button" class="auth-link" id="forgot-link">¿Olvidaste tu contraseña?</button>' +
          '</div>' +
          '<div class="auth-input-wrap">' +
            '<span class="auth-input-icon">' + svg('key', 18) + '</span>' +
            '<input class="input auth-input" id="login-password" type="password" name="password" autocomplete="current-password" placeholder="••••••••" required>' +
            '<button type="button" class="auth-input-toggle" id="toggle-password" aria-label="Mostrar contraseña">' + svg('eye', 17) + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="auth-error" id="auth-error" role="alert" hidden></div>' +
        '<button class="btn btn--primary btn--block auth-submit" id="login-submit" type="submit">' +
          '<span class="auth-submit__label">Ingresar</span><span class="auth-spinner" aria-hidden="true"></span>' +
        '</button>' +
      '</form>' +

      '<div class="auth-divider"><span>o</span></div>' +
      '<p class="auth-switch">¿Aún no tienes cuenta? <a href="' + registerHref + '">Crear cuenta gratis</a></p>' +
      '<div class="auth-hint">' + svg('shield', 16) +
        '<span>Tu sesión se mantiene activa. Si cierras esta pestaña, puedes volver a ingresar cuando quieras.</span></div>';

    var badge = root.querySelector('#auth-mode-badge');
    if (A && A.isDemo()) {
      badge.classList.add('auth-mode-badge--demo');
      badge.querySelector('span').textContent = 'Modo demostración · sin credenciales de Firebase';
    } else {
      badge.classList.add('auth-mode-badge--secure');
      badge.querySelector('span').textContent = 'Acceso con Firebase Auth';
    }

    var pw = root.querySelector('#login-password');
    var toggle = root.querySelector('#toggle-password');
    toggle.addEventListener('click', function () {
      var show = pw.type === 'password';
      pw.type = show ? 'text' : 'password';
      toggle.innerHTML = svg(show ? 'close' : 'eye', 17);
      toggle.classList.toggle('is-visible', show);
      toggle.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
      pw.focus();
    });

    root.querySelector('#forgot-link').addEventListener('click', function () {
      openReset(root.querySelector('#login-email').value.trim());
    });

    root.querySelector('#login-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var email = root.querySelector('#login-email').value.trim();
      var password = pw.value;
      var btn = root.querySelector('#login-submit');
      showError(root, '');

      if (!email || !password) {
        showError(root, 'Ingresa tu correo y contraseña.');
        return;
      }
      setLoading(btn, true);
      try {
        var session = await A.signIn(email, password);
        UI.toast('¡Bienvenido, ' + String(session.name || '').trim().split(' ')[0] + '!', 'success');
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
