/* page-contacto.js — Contacto con los desarrolladores + bandeja de soporte */
(function () {
  'use strict';

  var D = window.DataService, I = window.AppIcons, UI = window.UI;
  var esc = D.escapeHtml;

  function waLink(value) {
    var digits = String(value || '').replace(/\D/g, '');
    return digits ? 'https://wa.me/' + digits : '';
  }
  function webLink(value) {
    var v = String(value || '').trim();
    if (!v) return '';
    return /^https?:\/\//i.test(v) ? v : 'https://' + v;
  }
  function link(icon, label, value, href) {
    if (!value || !href) return '';
    return '<a class="contact-link" href="' + esc(href) + '"' +
      (/^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : '') + '>' +
      I.svg(icon, { size: 18 }) + '<span><strong>' + esc(label) + '</strong><br>' + esc(value) + '</span></a>';
  }
  function setLoading(btn, loading) {
    btn.classList.toggle('is-loading', !!loading);
    btn.disabled = !!loading;
  }

  UI.ready.then(async function () {
    var root = document.getElementById('contacto-root');
    if (!root) return;
    var cfg = await D.getConfig();

    var developer = [
      cfg.contactDeveloperName, cfg.contactDeveloperRole, cfg.contactEmail,
      cfg.supportWhatsapp, cfg.contactPhone, cfg.contactWeb, cfg.contactAddress,
      cfg.instagram, cfg.facebook
    ].some(Boolean);

    var links = link('mail', 'Correo electrónico', cfg.contactEmail,
      cfg.contactEmail ? 'mailto:' + encodeURIComponent(cfg.contactEmail) : '') +
      link('whatsapp', 'WhatsApp', cfg.supportWhatsapp, waLink(cfg.supportWhatsapp)) +
      link('phone', 'Teléfono', cfg.contactPhone, cfg.contactPhone ? 'tel:' + cfg.contactPhone.replace(/\s/g, '') : '') +
      link('globe', 'Sitio web', cfg.contactWeb, webLink(cfg.contactWeb)) +
      link('instagram', 'Instagram', cfg.instagram, cfg.instagram ? webLink(cfg.instagram) : '') +
      link('facebook', 'Facebook', cfg.facebook, cfg.facebook ? webLink(cfg.facebook) : '');

    var meta = '';
    if (cfg.contactAddress || cfg.contactHours || cfg.contactResponseTime) {
      meta = '<div class="review-summary" style="margin-top:16px">' +
        (cfg.contactAddress ? '<div><strong>Dirección</strong><span>' + esc(cfg.contactAddress) + '</span></div>' : '') +
        (cfg.contactHours ? '<div><strong>Horario</strong><span>' + esc(cfg.contactHours) + '</span></div>' : '') +
        (cfg.contactResponseTime ? '<div><strong>Respuesta</strong><span>' + esc(cfg.contactResponseTime) + '</span></div>' : '') +
        '</div>';
    }

    root.innerHTML = '<div class="info-hero"><span class="hero__eyebrow">' + I.svg('mail', { size: 14 }) +
      ' Contacto</span><h1>Habla con el equipo</h1>' +
      '<p>' + esc(cfg.contactIntro || '¿Tienes una pregunta, una idea o necesitas ayuda? Escríbenos y te responderemos.') + '</p></div>' +

      '<div class="contact-layout">' +
        '<div class="card" style="padding:24px">' +
          '<h2 style="font-size:1.15rem;margin-bottom:6px">Envíanos un mensaje</h2>' +
          '<p class="muted tiny" style="margin-bottom:18px">Tu mensaje queda registrado en el apartado de soporte de la administración.</p>' +
          '<form id="contact-form">' +
            '<div class="form-grid">' +
              '<div class="field"><label class="field__label">Tu nombre <span class="req">*</span></label>' +
                '<input class="input" name="nombre" required maxlength="80" placeholder="Cómo te llamas"></div>' +
              '<div class="field"><label class="field__label">Correo electrónico <span class="req">*</span></label>' +
                '<input class="input" name="email" type="email" required maxlength="120" placeholder="tu@correo.com"></div>' +
            '</div>' +
            '<div class="field" style="margin-top:14px"><label class="field__label">Asunto</label>' +
              '<input class="input" name="asunto" maxlength="120" placeholder="¿En qué podemos ayudarte?"></div>' +
            '<div class="field" style="margin-top:14px"><label class="field__label">Mensaje <span class="req">*</span></label>' +
              '<textarea class="textarea" name="mensaje" rows="5" required maxlength="2000" placeholder="Escribe aquí tu mensaje"></textarea></div>' +
            '<button class="btn btn--primary" id="contact-submit" type="submit" style="margin-top:18px">' +
              I.svg('arrowRight', { size: 16 }) + 'Enviar mensaje</button>' +
          '</form>' +
        '</div>' +

        '<aside class="contact-side">' +
          '<div class="side-card">' +
            '<h3>' + I.svg('users', { size: 17 }) + ' Equipo de desarrollo</h3>' +
            (developer
              ? '<p style="font-weight:700;margin-bottom:2px">' + esc(cfg.contactDeveloperName || 'Equipo de desarrollo') + '</p>' +
                '<p class="muted tiny" style="margin-bottom:14px">' + esc(cfg.contactDeveloperRole || 'Responsables de la plataforma') + '</p>' +
                '<div class="contact-links">' + links + '</div>' + meta
              : UI.empty({ art: 'business', title: 'Datos por publicar', text: 'El administrador aún no ha publicado los datos de contacto del equipo.' })) +
          '</div>' +
          '<div class="coverage-note" style="margin-top:14px">' + I.svg('info', { size: 16 }) +
            '<span>Los mensajes se guardan en la bandeja de soporte y también puedes escribirnos directamente a los canales publicados.</span></div>' +
        '</aside>' +
      '</div>';

    var form = document.getElementById('contact-form');
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var nombre = String(data.get('nombre') || '').trim();
      var email = String(data.get('email') || '').trim();
      var mensaje = String(data.get('mensaje') || '').trim();
      if (nombre.length < 2) { UI.toast('Escribe tu nombre.', 'error'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { UI.toast('Revisa el correo electrónico.', 'error'); return; }
      if (mensaje.length < 10) { UI.toast('Escribe un mensaje un poco más largo.', 'error'); return; }
      var btn = document.getElementById('contact-submit');
      setLoading(btn, true);
      try {
        await D.sendSupportMessage({
          nombre: nombre,
          email: email,
          asunto: String(data.get('asunto') || '').trim(),
          mensaje: mensaje,
          estado: 'pendiente'
        }, UI.getSession());
        form.reset();
        UI.toast(UI.getSession()
          ? 'Mensaje enviado. La respuesta aparecerá en tu centro de mensajes.'
          : 'Mensaje enviado. Gracias por escribirnos.', 'success');
      } catch (err) {
        UI.toast('No se pudo enviar el mensaje. Inténtalo de nuevo.', 'error');
      } finally {
        setLoading(btn, false);
      }
    });
  });
})();
