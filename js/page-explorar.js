/* page-explorar.js — Catálogo filtrable */
(function () {
  'use strict';
  var D = window.DataService, I = window.AppIcons, UI = window.UI;
  var esc = D.escapeHtml;

  UI.ready.then(async function () {
    var params = new URLSearchParams(window.location.search);
    var state = {
      cat: params.get('cat') || '',
      q: params.get('q') || '',
      zone: params.get('zone') || window.localStorage.getItem('mgl:zone') || '',
      openNow: params.get('open') === '1',
      express: params.get('express') === '1',
      sort: params.get('sort') || 'relevancia'
    };

    var catSelect = document.getElementById('f-cat');
    catSelect.innerHTML = '<option value="">Todos los rubros</option>' + D.CATEGORIES.map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.label) + '</option>';
    }).join('');
    var zoneSelect = document.getElementById('f-zone');
    zoneSelect.innerHTML = '<option value="">Todas las zonas</option>' + D.ZONES.map(function (z) {
      return '<option value="' + esc(z) + '">' + esc(z) + '</option>';
    }).join('') + (state.zone && D.ZONES.indexOf(state.zone) === -1
      ? '<option value="' + esc(state.zone) + '">' + esc(state.zone) + '</option>' : '');

    document.getElementById('f-q').value = state.q;
    catSelect.value = state.cat;
    zoneSelect.value = state.zone;
    document.getElementById('f-sort').value = state.sort;
    syncToggle();

    function syncToggle() {
      document.getElementById('f-open').classList.toggle('is-active', state.openNow);
      document.getElementById('f-express').classList.toggle('is-active', state.express);
    }

    function renderCoverage() {
      var host = document.getElementById('explorar-coverage');
      if (!host) return;
      var cfg = UI.getConfig();
      if (!cfg.coverageEnabled || !state.zone || D.isCoveredZone(state.zone, cfg)) {
        host.innerHTML = '';
        return;
      }
      var label = D.coverageLabels(cfg)[0];
      host.innerHTML = '<div class="coverage-banner">' + I.svg('info', { size: 16 }) +
        '<span>Estamos en fase piloto: todavía no hay cobertura en <strong>' + esc(state.zone) + '</strong>. ' + esc(D.coverageMessage(cfg)) + '</span>' +
        '<button class="btn btn--ghost btn--sm" id="explorar-use-coverage">Usar ' + esc(label) + '</button></div>';
      document.getElementById('explorar-use-coverage').addEventListener('click', function () {
        state.zone = label;
        zoneSelect.value = label;
        window.localStorage.setItem('mgl:zone', label);
        UI.refreshZoneLabels();
        renderCoverage();
        render();
      });
    }

    async function render() {
      var list = await D.queryBusinesses({
        category: state.cat, zone: state.zone, q: state.q,
        openNow: state.openNow, express: state.express, sort: state.sort
      });
      document.getElementById('results-count').textContent = list.length + (list.length === 1 ? ' local' : ' locales');
      var host = document.getElementById('explorar-results');
      host.innerHTML = list.length
        ? '<div class="biz-grid stagger">' + list.map(UI.businessCard).join('') + '</div>'
        : UI.empty({
            art: 'search',
            title: 'No encontramos locales con esos filtros',
            text: 'Prueba quitando algún filtro, cambiando la zona o explorando todos los rubros. El directorio se llena con negocios verificados.',
            action: { href: 'explorar.html', label: 'Limpiar filtros', icon: 'refresh' }
          });
      UI.syncFavorites(host);
    }

    function bind(id, key) {
      var el = document.getElementById(id);
      el.addEventListener('change', function () {
        state[key] = this.value;
        if (key === 'zone') renderCoverage();
        render();
      });
    }
    bind('f-cat', 'cat'); bind('f-zone', 'zone'); bind('f-sort', 'sort');

    var searchTimer;
    document.getElementById('f-q').addEventListener('input', function () {
      var v = this.value; clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { state.q = v; render(); }, 220);
    });
    document.getElementById('f-open').addEventListener('click', function () { state.openNow = !state.openNow; syncToggle(); render(); });
    document.getElementById('f-express').addEventListener('click', function () { state.express = !state.express; syncToggle(); render(); });
    document.getElementById('f-clear').addEventListener('click', function () {
      state = { cat: '', q: '', zone: '', openNow: false, express: false, sort: 'relevancia' };
      ['f-q', 'f-cat', 'f-zone', 'f-sort'].forEach(function (id) { document.getElementById(id).value = ''; });
      syncToggle(); renderCoverage(); render();
    });
    document.getElementById('explorar-cats').innerHTML = UI.categoryRail(state.cat);
    renderCoverage();
    await render();
  });
})();
