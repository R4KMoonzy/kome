/* page-mensajes.js — Centro de mensajes del usuario */
(function () {
  'use strict';

  var D = window.DataService, I = window.AppIcons, UI = window.UI;
  var esc = D.escapeHtml;

  var TYPE_LABELS = {
    solicitud: 'Solicitud', soporte: 'Soporte', respuesta: 'Respuesta', general: 'Aviso'
  };

  function typeIcon(tipo) {
    if (tipo === 'solicitud') return 'checkCircle';
    if (tipo === 'respuesta') return 'chat';
    if (tipo === 'soporte') return 'mail';
    return 'bell';
  }

  function dateLabel(msg) {
    var raw = msg && (msg.fecha || msg.createdAt);
    if (!raw) return '';
    var d = new Date(raw);
    return isNaN(d.getTime()) ? '' : d.toLocaleString('es-CR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  UI.ready.then(function () {
    if (!UI.requireAuth('mensajes.html')) return;

    var root = document.getElementById('mensajes-root');
    if (!root) return;
    var session = UI.getSession();
    var list = [];
    var filter = 'todos';
    var selectedId = null;

    function visible() {
      if (filter === 'nuevos') return list.filter(function (m) { return !m.leido; });
      if (filter === 'solicitudes') return list.filter(function (m) { return m.tipo === 'solicitud'; });
      if (filter === 'soporte') return list.filter(function (m) {
        return m.tipo === 'soporte' || m.tipo === 'respuesta';
      });
      return list;
    }

    function selected() {
      return list.find(function (m) { return m.id === selectedId; }) || null;
    }

    function detailHtml(msg) {
      if (!msg) {
        return '<div class="inbox-detail__empty">' + I.svg('chat', { size: 40, style: 'color:var(--text-3);margin:0 auto 12px' }) +
          '<h3>Tus mensajes aparecen aquí</h3>' +
          '<p class="muted tiny">Te avisaremos cuando enviemos una solicitud, cuando sea autorizada y cuando el equipo Kome responda tus mensajes de soporte.</p>' +
          '<a class="btn btn--primary btn--sm" href="contacto.html" style="margin-top:14px">' + I.svg('mail', { size: 15 }) + 'Escribir al soporte</a></div>';
      }
      var action = msg.tipo === 'solicitud'
        ? '<a class="btn btn--blue btn--sm" href="mi-negocio.html">' + I.svg('store', { size: 15 }) + 'Ir a mi negocio</a>'
        : '<a class="btn btn--blue btn--sm" href="contacto.html">' + I.svg('mail', { size: 15 }) + 'Nuevo mensaje de soporte</a>';
      return '<div class="inbox-detail__head">' +
          '<div class="inbox-detail__icon">' + I.svg(typeIcon(msg.tipo), { size: 22 }) + '</div>' +
          '<div><span class="badge ' + (msg.leido ? 'badge--open' : 'badge--hot') + '">' +
            (msg.leido ? 'Leído' : 'Nuevo') + '</span>' +
            '<h2>' + esc(msg.titulo || 'Mensaje') + '</h2>' +
            '<p class="tiny muted">' + esc(TYPE_LABELS[msg.tipo] || 'Aviso') +
              (dateLabel(msg) ? ' · ' + esc(dateLabel(msg)) : '') + '</p></div></div>' +
        '<div class="inbox-detail__body">' + esc(msg.cuerpo || '').replace(/\n/g, '<br>') + '</div>' +
        '<div class="inbox-detail__foot">' + action +
          (msg.referencia ? '<span class="tiny muted">Referencia: ' + esc(msg.referencia) + '</span>' : '') +
        '</div>';
    }

    function render() {
      var shown = visible();
      var unread = list.filter(function (m) { return !m.leido; }).length;
      var tabs = [
        { key: 'todos', label: 'Todos (' + list.length + ')' },
        { key: 'nuevos', label: 'No leídos (' + unread + ')' },
        { key: 'solicitudes', label: 'Solicitudes' },
        { key: 'soporte', label: 'Soporte' }
      ];

      root.innerHTML = '<div class="info-hero"><span class="hero__eyebrow">' + I.svg('chat', { size: 14 }) +
          ' Centro de mensajes</span><h1>Tu bandeja de entrada</h1>' +
          '<p>Aquí recibes los avisos de tus solicitudes y las respuestas del equipo Kome. ' +
          'Nada se pierde: los mensajes quedan guardados en tu cuenta.</p></div>' +

        '<div class="inbox-toolbar">' +
          '<div class="inbox-tabs">' + tabs.map(function (t) {
            return '<button type="button" class="inbox-tab' + (filter === t.key ? ' is-active' : '') +
              '" data-filter="' + t.key + '">' + esc(t.label) + '</button>';
          }).join('') + '</div>' +
          '<div class="inbox-toolbar__actions">' +
            '<button type="button" class="btn btn--ghost btn--sm" id="inbox-refresh">' + I.svg('refresh', { size: 15 }) + 'Actualizar</button>' +
            '<a class="btn btn--primary btn--sm" href="contacto.html">' + I.svg('plus', { size: 15 }) + 'Escribir al soporte</a>' +
          '</div></div>' +

        '<div class="inbox-layout">' +
          '<div class="inbox-list">' + (shown.length ? shown.map(function (m) {
            return '<button type="button" class="inbox-item' + (!m.leido ? ' is-unread' : '') +
              (m.id === selectedId ? ' is-selected' : '') + '" data-open="' + esc(m.id) + '">' +
              '<span class="inbox-item__icon">' + I.svg(typeIcon(m.tipo), { size: 18 }) + '</span>' +
              '<span class="inbox-item__main"><strong>' + esc(m.titulo || 'Mensaje') + '</strong>' +
                '<span class="inbox-item__preview">' + esc((m.cuerpo || '').slice(0, 90)) + '</span></span>' +
              '<span class="inbox-item__meta">' + esc(TYPE_LABELS[m.tipo] || 'Aviso') +
                '<small>' + esc(dateLabel(m)) + '</small></span>' +
              (!m.leido ? '<span class="inbox-item__dot"></span>' : '') +
            '</button>';
          }).join('') : UI.empty({ art: 'chat', title: 'Sin mensajes en esta vista', text: 'Cuando tengas novedades, aparecerán aquí.' })) + '</div>' +
          '<div class="card inbox-detail">' + detailHtml(selected()) + '</div>' +
        '</div>';
    }

    function open(id) {
      selectedId = id;
      var msg = list.find(function (m) { return m.id === id; });
      if (msg && !msg.leido) {
        msg.leido = true;
        D.markInboxRead(session.uid, id);
      }
      render();
    }

    root.addEventListener('click', function (e) {
      var tab = e.target.closest('[data-filter]');
      if (tab) { filter = tab.getAttribute('data-filter'); render(); return; }
      var item = e.target.closest('[data-open]');
      if (item) { open(item.getAttribute('data-open')); return; }
      if (e.target.closest('#inbox-refresh')) {
        var btn = document.getElementById('inbox-refresh');
        if (btn) { btn.disabled = true; }
        load().then(function () {
          if (btn) { btn.disabled = false; }
          UI.toast('Bandeja actualizada', 'success');
        });
      }
    });

    async function load() {
      try {
        list = await D.getInbox(session.uid);
        if (!list.some(function (m) { return m.id === selectedId; })) {
          selectedId = list.length ? list[0].id : null;
        }
        render();
      } catch (err) {
        root.innerHTML = '<div class="card" style="padding:24px">' +
          UI.empty({ art: 'info', title: 'No se pudo cargar la bandeja', text: 'Revisa tu conexión e inténtalo de nuevo.' }) +
          '<button type="button" class="btn btn--primary btn--sm" id="inbox-retry">Reintentar</button></div>';
        var retry = document.getElementById('inbox-retry');
        if (retry) retry.addEventListener('click', load);
      }
    }

    load();
  });
})();
