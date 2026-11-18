/* page-faq.js — Preguntas frecuentes editables desde administración */
(function () {
  'use strict';

  var D = window.DataService, I = window.AppIcons, UI = window.UI;
  var esc = D.escapeHtml;

  UI.ready.then(async function () {
    var root = document.getElementById('faq-root');
    if (!root) return;
    var cfg = await D.getConfig();
    var items = (cfg.faqs || []).filter(function (f) { return f.pregunta && f.respuesta; });

    root.innerHTML = '<div class="info-hero"><span class="hero__eyebrow">' + I.svg('info', { size: 14 }) +
      ' Ayuda</span><h1>Preguntas frecuentes</h1>' +
      '<p>Respuestas rápidas sobre el directorio, los comercios y cómo contactarlos.</p></div>' +

      (items.length
        ? '<div class="faq-toolbar"><div class="faq-search">' + I.svg('search', { size: 17 }) +
            '<input class="input" id="faq-search" type="search" placeholder="Buscar una pregunta…" aria-label="Buscar preguntas"></div>' +
            '<span class="tiny muted" id="faq-count">' + items.length + ' preguntas</span></div>' +
          '<div class="faq-list" id="faq-list">' + items.map(function (f, i) {
            return '<details class="faq-item" data-index="' + i + '">' +
              '<summary><span class="faq-item__num">' + String(i + 1).padStart(2, '0') + '</span>' +
                '<span>' + esc(f.pregunta) + '</span>' + I.svg('chevronDown', { size: 18 }) + '</summary>' +
              '<div class="faq-item__body">' + String(f.respuesta).split('\n').map(function (l) {
                return l.trim() ? '<p>' + esc(l) + '</p>' : '';
              }).join('') + '</div></details>';
          }).join('') + '</div>' +
          '<div class="coverage-note" style="margin-top:22px">' + I.svg('mail', { size: 16 }) +
            '<span>¿No encuentras tu respuesta? <a href="contacto.html">Escríbenos</a> y te ayudamos.</span></div>'
        : UI.empty({
            art: 'search',
            title: 'Aún no hay preguntas publicadas',
            text: 'Cuando el administrador agregue las preguntas frecuentes, aparecerán aquí.',
            action: { href: 'contacto.html', label: 'Consultar al equipo', icon: 'mail' }
          }));

    var search = document.getElementById('faq-search');
    if (!search) return;
    var nodes = UI.qsa ? UI.qsa('.faq-item') : Array.prototype.slice.call(document.querySelectorAll('.faq-item'));
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      var shown = 0;
      nodes.forEach(function (node) {
        var haystack = node.textContent.toLowerCase();
        var visible = !q || haystack.indexOf(q) !== -1;
        node.style.display = visible ? '' : 'none';
        if (visible) shown++;
      });
      var count = document.getElementById('faq-count');
      if (count) count.textContent = shown + (shown === 1 ? ' pregunta' : ' preguntas');
    });
  });
})();
