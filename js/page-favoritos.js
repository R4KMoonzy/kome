/* page-favoritos.js — Comercios guardados */
(function () {
  'use strict';
  var D = window.DataService, UI = window.UI;

  UI.ready.then(async function () {
    if (!UI.requireAuth('favoritos.html')) return;
    var ids = await D.getFavorites();
    var all = await D.getBusinesses();
    var list = all.filter(function (b) { return ids.indexOf(b.id) !== -1; });
    document.getElementById('fav-count').textContent = list.length + (list.length === 1 ? ' local guardado' : ' locales guardados');
    var host = document.getElementById('fav-list');
    host.innerHTML = list.length
      ? '<div class="biz-grid stagger">' + list.map(UI.businessCard).join('') + '</div>'
      : UI.empty({
          art: 'heart', title: 'Aún no tienes favoritos',
          text: 'Toca el corazón en cualquier local para guardarlo aquí y tener su menú y contacto siempre a la mano.',
          action: { href: 'explorar.html', label: 'Descubrir locales', icon: 'compass' }
        });
    UI.syncFavorites(host);
  });
})();
