/* page-registro.js — Wizard de solicitud de negocio (anti-trolls) */
(function () {
  'use strict';
  var D = window.DataService, I = window.AppIcons, UI = window.UI;
  var esc = D.escapeHtml;
  var STEP_LABELS = ['Datos', 'Verificación', 'Menú', 'Revisión'];
  var startedAt = Date.now();

  UI.ready.then(function () {
    if (!UI.requireAuth('registrar-negocio.html' + window.location.search)) return;
    var step = 1;
    var loader = null;
    var facadeData = '';
    var params = new URLSearchParams(window.location.search);
    var tipo = params.get('tipo') || 'restaurante';

    var tipoText = { restaurante: 'Restaurante / Soda / Cafetería', tienda: 'Tienda / Supermercado / Farmacia', pauta: 'Pauta con nosotros' };
    document.getElementById('reg-tipo').textContent = tipoText[tipo] || tipoText.restaurante;
    if (tipo === 'pauta') document.getElementById('reg-tipo-label').textContent = 'Datos de la empresa o proyecto';

    document.getElementById('reg-cat').innerHTML = '<option value="">Elegir rubro…</option>' +
      D.CATEGORIES.map(function (c) { return '<option value="' + c.id + '">' + esc(c.label) + '</option>'; }).join('');
    document.getElementById('reg-zone').innerHTML = '<option value="">Elegir zona…</option>' +
      D.ZONES.map(function (z) { return '<option value="' + esc(z) + '">' + esc(z) + '</option>'; }).join('');

    var savedZone = window.localStorage.getItem('mgl:zone');
    if (savedZone) document.getElementById('reg-zone').value = savedZone;
    var s = UI.getSession();
    if (s) {
      document.getElementById('reg-email').value = s.email || '';
      document.getElementById('reg-nombre-contacto').value = s.name || '';
    }

    function renderSteps() {
      document.getElementById('wizard-steps').innerHTML = STEP_LABELS.map(function (label, i) {
        var n = i + 1;
        return '<div class="wizard-step ' + (n === step ? 'is-active' : '') + (n < step ? ' is-done' : '') + '">' +
          '<div class="wizard-step__dot">' + (n < step ? I.svg('check', { size: 16, strokeWidth: 2.6 }) : n) + '</div>' +
          '<small>' + label + '</small></div>';
      }).join('');
      UI.qsa('[data-step]', document).forEach(function (el) {
        el.classList.toggle('hidden', parseInt(el.getAttribute('data-step'), 10) !== step);
      });
      document.getElementById('wizard-prev').disabled = step === 1;
      document.getElementById('wizard-next').style.display = step === 4 ? 'none' : '';
      document.getElementById('wizard-submit').style.display = step === 4 ? '' : 'none';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function fail(msg) { UI.toast(msg, 'error'); return false; }

    function validateStep1() {
      var f = document.getElementById('reg-form');
      var name = f.nombre.value.trim(), cat = f.categoria.value, zone = f.zona.value;
      var phone = f.telefono.value.trim(), wa = f.whatsapp.value.trim();
      var email = f.email.value.trim(), contact = f['nombre-contacto'].value.trim();
      if (name.length < 3) return fail('Escribe el nombre del negocio (mínimo 3 caracteres).');
      if (!cat) return fail('Elige un rubro.');
      if (!zone) return fail('Elige una zona.');
      if (phone.replace(/\D/g, '').length < 8) return fail('Ingresa un teléfono válido (mínimo 8 dígitos).');
      if (wa && wa.replace(/\D/g, '').length < 8) return fail('El WhatsApp no es válido.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Ingresa un correo electrónico válido.');
      if (contact.length < 3) return fail('Escribe tu nombre como responsable.');
      return true;
    }

    function validateStep2() {
      var enlace = document.getElementById('reg-enlace').value.trim();
      if (!facadeData) return fail('La foto de fachada o logo es obligatoria para verificar tu solicitud.');
      if (enlace.length < 8) return fail('Agrega un enlace verificable (sitio web, Instagram, Facebook o Maps).');
      try { var u = new URL(enlace.indexOf('http') === 0 ? enlace : 'https://' + enlace); if (!u.hostname.includes('.')) throw 0; }
      catch (e) { return fail('El enlace verificable no es válido.'); }
      if (document.getElementById('reg-honeypot').value) return fail('Solicitud rechazada por el filtro anti-bots.');
      if (Date.now() - startedAt < 4000) return fail('Completa el formulario con calma e inténtalo de nuevo.');
      return true;
    }

    /* Subida de fachada/logo */
    var facadeInput = document.getElementById('reg-fachada');
    facadeInput.addEventListener('change', async function () {
      if (!this.files[0]) return;
      try {
        facadeData = await D.compressImage(this.files[0], 1100, .76);
        document.getElementById('reg-fachada-preview').innerHTML = '<img src="' + facadeData + '" alt="Fachada o logo">';
      } catch (e) { UI.toast(e.message, 'error'); }
    });

    /* Loader compartido de menú */
    var menuHost = document.getElementById('reg-menu-loader');
    loader = MountMenuLoader(menuHost, {
      onChange: function () { /* las tarjetas se leen al enviar */ }
    });

    function buildSummary() {
      var f = document.getElementById('reg-form');
      var data = {
        'Nombre del negocio': f.nombre.value,
        'Rubro': D.categoryById(f.categoria.value).label,
        'Zona': f.zona.value + (D.isCoveredZone(f.zona.value, UI.getConfig()) ? '' : ' (fuera de cobertura)'),
        'Dirección': f.direccion.value || 'No indicada',
        'Teléfono': f.telefono.value,
        'WhatsApp': f.whatsapp.value || 'No indicado',
        'Correo': f.email.value,
        'Responsable': f['nombre-contacto'].value,
        'Enlace verificable': document.getElementById('reg-enlace').value,
        'Productos en menú': loader.count()
      };
      document.getElementById('reg-summary').innerHTML = '<div class="review-summary">' + Object.keys(data).map(function (k) {
        return '<div><strong>' + esc(k) + '</strong>' + esc(data[k]) + '</div>';
      }).join('') + '</div>';
    }

    var coverageOverride = false;

    function advance() {
      if (step === 2 && !validateStep2()) return;
      if (step === 3 && !loader.count()) {
        UI.openModal(UI.modalHead('¿Continuar sin menú?') +
          '<p class="muted">Podrás cargar el menú después desde «Mi negocio» una vez aprobado. La solicitud no se pierde.</p>' +
          '<div class="modal__foot"><button class="btn btn--ghost btn--block" data-modal-close>Volver a cargar productos</button>' +
          '<button class="btn btn--primary btn--block" id="reg-skip-menu">Continuar sin menú</button></div>', function (w, close) {
            document.getElementById('reg-skip-menu').addEventListener('click', function () { close(); step = 4; renderSteps(); buildSummary(); });
          });
        return;
      }
      step++;
      if (step === 4) buildSummary();
      renderSteps();
    }

    document.getElementById('wizard-next').addEventListener('click', function () {
      if (step === 1 && !validateStep1()) return;
      if (step === 1 && !coverageOverride) {
        var zone = document.getElementById('reg-form').zona.value;
        if (!D.isCoveredZone(zone, UI.getConfig())) {
          UI.coverageAlert({
            zone: zone,
            title: 'Tu negocio está fuera de la cobertura actual',
            description: 'Por ahora solo estamos activos en ' + D.coverageLabels(UI.getConfig())[0] +
              '. Puedes enviar la solicitud de todos modos: la marcaremos como «fuera de cobertura» para que la revisemos cuando lleguemos a tu zona.',
            actions: [
              { label: 'Volver y elegir otra zona', kind: 'ghost' },
              { label: 'Continuar con la solicitud', kind: 'primary', onClick: function () { coverageOverride = true; advance(); } }
            ]
          });
          return;
        }
      }
      advance();
    });
    document.getElementById('wizard-prev').addEventListener('click', function () {
      if (step > 1) { step--; renderSteps(); }
    });

    document.getElementById('wizard-submit').addEventListener('click', async function () {
      if (!document.getElementById('reg-terms').checked) return fail('Debes aceptar que la información es veraz.');
      var f = document.getElementById('reg-form');
      var session = UI.getSession();
      var req = {
        tipo: tipo,
        name: f.nombre.value.trim(),
        category: f.categoria.value,
        zone: f.zona.value,
        address: f.direccion.value.trim(),
        phone: f.telefono.value.trim(),
        whatsapp: f.whatsapp.value.trim(),
        email: f.email.value.trim(),
        contactName: f['nombre-contacto'].value.trim(),
        instagram: f.instagram.value.trim(),
        facebook: f.facebook.value.trim(),
        mapsUrl: f.mapsurl.value.trim(),
        website: document.getElementById('reg-enlace').value.trim(),
        description: f.descripcion.value.trim(),
        logo: facadeData, cover: facadeData,
        express: false,
        menu: loader.getItems(),
        ownerEmail: f.email.value.trim(),
        ownerId: session ? session.uid : null,
        fueraDeCobertura: !D.isCoveredZone(f.zona.value, UI.getConfig()),
        estado: 'pendiente'
      };
      this.disabled = true;
      await D.saveRequest(req);
      UI.toast('Solicitud enviada. Queda pendiente de revisión.', 'success');
      window.setTimeout(function () { window.location.href = 'index.html'; }, 1400);
    });

    renderSteps();
  });
})();
