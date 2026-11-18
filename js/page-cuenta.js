/* page-cuenta.js — Perfil del usuario */
(function () {
  'use strict';
  var D = window.DataService, I = window.AppIcons, UI = window.UI;
  var esc = D.escapeHtml;

  UI.ready.then(async function () {
    if (!UI.requireAuth('cuenta.html')) return;
    var s = UI.getSession();
    var host = document.getElementById('cuenta-root');

    var favs = await D.getFavorites();
    var initial = (s.name || 'U').charAt(0).toUpperCase();
    host.innerHTML =
      '<div class="account-hero"><div class="avatar" id="cuenta-avatar">' + (s.photo ? '<img src="' + esc(s.photo) + '" alt="">' : esc(initial)) + '</div>' +
        '<div><h1>Hola, ' + esc(s.name) + '</h1><p>' + esc(s.email) + '</p></div>' +
        '<button class="btn btn--ghost" id="cuenta-cambiar-foto" style="margin-left:auto">' + I.svg('camera', { size: 16 }) + 'Cambiar foto</button>' +
        '<input type="file" id="cuenta-foto-input" accept="image/*" hidden></div>' +
      '<div class="stat-grid">' +
        '<div class="card stat-box"><strong>' + favs.length + '</strong><span>Favoritos guardados</span></div>' +
        '<div class="card stat-box"><strong>' + esc(window.localStorage.getItem('mgl:zone') || '—') + '</strong><span>Zona guardada</span></div>' +
        '<div class="card stat-box"><strong>' + esc(s.role || 'usuario') + '</strong><span>Tipo de cuenta</span></div>' +
      '</div>' +
      '<div class="card" style="padding:22px;max-width:620px">' +
        '<h2 style="font-size:1.05rem;margin-bottom:16px">Editar perfil</h2>' +
        '<form id="cuenta-form"><div class="form-grid">' +
          '<div class="field"><label class="field__label">Nombre</label><input class="input" name="name" value="' + esc(s.name) + '" required></div>' +
          '<div class="field"><label class="field__label">Correo electrónico</label><input class="input" type="email" name="email" value="' + esc(s.email) + '" required></div>' +
        '</div><div class="field" style="margin-top:14px"><label class="field__label">Zona guardada</label>' +
          '<select class="select" name="zone" id="cuenta-zone"><option value="">Sin definir</option>' +
          D.ZONES.map(function (z) { return '<option value="' + esc(z) + '">' + esc(z) + '</option>'; }).join('') + '</select></div>' +
          '<div class="form-actions"><button class="btn btn--primary" type="submit">Guardar cambios</button>' +
          '<button class="btn btn--danger" type="button" id="cuenta-logout">' + I.svg('logout', { size: 16 }) + 'Cerrar sesión</button></div>' +
        '</form></div>';

    var currentZone = window.localStorage.getItem('mgl:zone') || '';
    var zoneSel = document.getElementById('cuenta-zone');
    if (D.ZONES.indexOf(currentZone) !== -1) zoneSel.value = currentZone;
    else if (currentZone) zoneSel.add(new Option(currentZone, currentZone, true, true));

    document.getElementById('cuenta-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = new FormData(e.target);
      var zone = String(f.get('zone') || '');
      await D.updateProfile({ name: String(f.get('name')).trim(), email: String(f.get('email')).trim(), zone: zone });
      window.localStorage.setItem('mgl:zone', zone);
      UI.setSession(await D.getSession());
      UI.refreshZoneLabels();
      UI.toast('Perfil actualizado', 'success');
    });
    document.getElementById('cuenta-logout').addEventListener('click', function () {
      D.logout().then(function () { UI.setSession(null); window.location.href = 'index.html'; });
    });
    document.getElementById('cuenta-cambiar-foto').addEventListener('click', function () {
      document.getElementById('cuenta-foto-input').click();
    });
    document.getElementById('cuenta-foto-input').addEventListener('change', async function () {
      if (!this.files[0]) return;
      try {
        var compressed = await D.compressImage(this.files[0], 400, .78);
        var photo = await window.StorageService.upload(compressed, { folder: 'avatars' });
        await D.updateProfile({ photo: photo });
        UI.setSession(await D.getSession());
        document.getElementById('cuenta-avatar').innerHTML = '<img src="' + photo + '" alt="">';
        UI.toast('Foto actualizada', 'success');
      } catch (err) { UI.toast(err.message, 'error'); }
    });
  });
})();
