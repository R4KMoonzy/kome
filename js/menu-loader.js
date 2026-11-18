/* ============================================================
   menu-loader.js — Carga inteligente de menú/catálogo (3 modos)
   Compartido por registrar-negocio.html y mi-negocio.html.
   Todos los modos convergen en tarjetas editables uniformes.
   ============================================================ */
(function (global) {
  'use strict';

  var I = global.AppIcons;
  var D = global.DataService;
  var UI = global.UI;
  var esc = D.escapeHtml;

  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function newId() { return D.uid(); }

  function normalizePrice(value) {
    var raw = String(value == null ? '' : value).trim();
    if (!raw) return '';
    var scanner = global.AppAIMenuScanner;
    if (scanner && typeof scanner.parsePrice === 'function') {
      var parsed = scanner.parsePrice(raw);
      if (parsed) return parsed;
    }
    return raw.replace(/\s/g, '').replace(',', '.').replace(/[^\d.]/g, '');
  }

  var TAG_OPTIONS = ['', 'Nuevo', 'Más vendido', 'Agotado'];
  var CATEGORY_SUGGESTIONS = ['Platos Fuertes', 'Bebidas', 'Combos', 'Entradas', 'Postres', 'Pizzas', 'Rápida', 'General'];

  function categoryOptions() {
    return CATEGORY_SUGGESTIONS.map(function (c) {
      return '<option value="' + esc(c) + '"></option>';
    }).join('');
  }

  function tagOptions(selected) {
    return TAG_OPTIONS.map(function (t) {
      return '<option value="' + esc(t) + '" ' + (t === selected ? 'selected' : '') + '>' +
        (t || 'Sin etiqueta') + '</option>';
    }).join('');
  }

  function itemCard(item, index) {
    return '<div class="menu-item-card" data-index="' + index + '">' +
      '<div class="menu-item-card__top">' +
        '<label class="menu-item-card__photo" title="Cambiar foto">' +
          (item.imagen ? '<img src="' + esc(item.imagen) + '" alt="">' : I.svg('image', { size: 22 })) +
          '<input type="file" accept="image/*" data-card-image="' + index + '" hidden>' +
        '</label>' +
        '<div class="menu-item-card__fields">' +
          '<input class="input input--sm" data-field="nombre" data-index="' + index + '" value="' + esc(item.nombre || '') + '" placeholder="Nombre del producto">' +
          '<div class="menu-item-card__row">' +
            '<input class="input input--sm" data-field="categoria" data-index="' + index + '" list="ml-cat-suggestions" value="' + esc(item.categoria || '') + '" placeholder="Categoría">' +
            '<input class="input input--sm menu-item-card__price" data-field="precio" data-index="' + index + '" value="' + esc(item.precio || '') + '" inputmode="decimal" placeholder="Precio">' +
          '</div>' +
          '<textarea class="textarea textarea--sm" data-field="descripcion" data-index="' + index + '" placeholder="Descripción / ingredientes">' + esc(item.descripcion || '') + '</textarea>' +
          '<select class="select select--sm" data-field="etiqueta" data-index="' + index + '">' + tagOptions(item.etiqueta || '') + '</select>' +
        '</div>' +
        '<button type="button" class="icon-btn menu-item-card__del" data-remove="' + index + '" title="Quitar tarjeta" aria-label="Quitar">' + I.svg('trash', { size: 17 }) + '</button>' +
      '</div>' +
    '</div>';
  }

  function MountMenuLoader(container, options) {
    options = options || {};
    var items = Array.isArray(options.initialItems) ? options.initialItems.slice() : [];
    var activeTab = 'manual';
    var onChange = options.onChange || function () {};

    container.innerHTML =
      '<datalist id="ml-cat-suggestions">' + categoryOptions() + '</datalist>' +
      '<div class="ml-tabs" role="tablist">' +
        '<button type="button" class="ml-tab is-active" data-tab="manual" role="tab">' + I.svg('edit', { size: 17 }) + '<span>Carga manual</span></button>' +
        '<button type="button" class="ml-tab" data-tab="excel" role="tab">' + I.svg('file', { size: 17 }) + '<span>Excel / CSV</span></button>' +
        '<button type="button" class="ml-tab" data-tab="ia" role="tab">' + I.svg('sparkles', { size: 17 }) + '<span>Escaneo con IA</span></button>' +
      '</div>' +

      /* ---------- MODO 1: MANUAL ---------- */
      '<div class="ml-panel is-active" data-panel="manual">' +
        '<div class="ml-panel__intro">' + I.svg('edit', { size: 18 }) +
          '<span>Agrega producto por producto. La foto se comprime automáticamente en tu navegador.</span></div>' +
        '<div class="form-grid">' +
          '<div class="field ml-photo-field">' +
            '<label class="field__label">Foto del producto</label>' +
            '<label class="ml-drop ml-photo-drop" id="ml-photo-drop">' +
              '<input type="file" id="ml-photo" accept="image/*" hidden>' +
              '<span id="ml-photo-preview">' + I.svg('camera', { size: 26 }) + '<small>Toca para subir foto</small></span>' +
            '</label>' +
          '</div>' +
          '<div class="form-grid form-grid--1">' +
            '<div class="field"><label class="field__label">Nombre <span class="req">*</span></label><input class="input" id="ml-nombre" placeholder="Ej. Pollo asado con arroz"></div>' +
            '<div class="field"><label class="field__label">Categoría del menú</label>' +
              '<input class="input" id="ml-categoria" list="ml-cat-suggestions" placeholder="Ej. Platos Fuertes">' +
              '<button type="button" class="btn btn--ghost btn--sm" id="ml-new-category" style="margin-top:6px">' + I.svg('plus', { size: 14 }) + ' Crear categoría</button></div>' +
            '<div class="form-grid">' +
              '<div class="field"><label class="field__label">Precio (₡) <span class="req">*</span></label><input class="input" id="ml-precio" inputmode="decimal" placeholder="0.00"></div>' +
              '<div class="field"><label class="field__label">Etiqueta</label><select class="select" id="ml-etiqueta">' + tagOptions('') + '</select></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="field" style="margin-top:14px"><label class="field__label">Descripción de ingredientes</label>' +
          '<textarea class="textarea" id="ml-descripcion" placeholder="Ingredientes, tamaño o detalles…"></textarea></div>' +
        '<div class="form-actions"><button type="button" class="btn btn--primary" id="ml-add-manual">' + I.svg('plus', { size: 17 }) + 'Agregar tarjeta editable</button>' +
          '<button type="button" class="btn btn--ghost" id="ml-clear-manual">Limpiar campos</button></div>' +
      '</div>' +

      /* ---------- MODO 2: EXCEL / CSV ---------- */
      '<div class="ml-panel" data-panel="excel">' +
        '<div class="ml-panel__intro">' + I.svg('file', { size: 18 }) +
          '<span>Sube tu catálogo en Excel o CSV. Cada fila se convierte en una tarjeta que podrás revisar y corregir.</span></div>' +
        '<div class="ml-import-grid">' +
          '<div class="ml-drop" id="ml-excel-drop"><input type="file" id="ml-excel" accept=".xlsx,.xls,.csv" hidden>' +
            I.svg('upload', { size: 28 }) + '<strong>Arrastra tu archivo o haz clic</strong><small>.xlsx · .xls · .csv</small></div>' +
          '<div class="ml-template-card">' + I.svg('download', { size: 22 }) +
            '<strong>¿No tienes el archivo?</strong><p class="muted tiny">Descarga la plantilla con las columnas exactas: Nombre, Categoria, Precio y Descripcion.</p>' +
            '<button type="button" class="btn btn--blue btn--sm" id="ml-template">' + I.svg('download', { size: 15 }) + 'Descargar Plantilla Excel (.xlsx)</button></div>' +
        '</div>' +
        '<div class="ml-progress" id="ml-excel-progress"><div class="progress"><div class="progress__bar" id="ml-excel-bar"></div></div><span class="tiny muted" id="ml-excel-status"></span></div>' +
      '</div>' +

      /* ---------- MODO 3: IA ---------- */
      '<div class="ml-panel" data-panel="ia">' +
        '<div class="ml-panel__intro">' + I.svg('sparkles', { size: 18 }) +
          '<span>Sube o toma una foto clara de tu menú impreso, volante o pizarra. El escáner detecta productos y crea tarjetas editables.</span></div>' +
        '<div class="ml-import-grid">' +
          '<div class="ml-drop ml-drop--scan" id="ml-scan-drop">' +
            '<input type="file" id="ml-scan-image" accept="image/*" capture="environment" hidden>' +
            '<div id="ml-scan-placeholder">' + I.svg('scan', { size: 30 }) + '<strong>Tomar o subir foto del menú</strong><small>JPG, PNG o HEIC · buena iluminación</small></div>' +
            '<div class="ml-scan-view hidden" id="ml-scan-view">' +
              '<img id="ml-scan-img" alt="Vista previa del menú">' +
              '<div class="ml-scan-overlay hidden" id="ml-scan-overlay"><span class="ml-scan-line"></span><span class="ml-scan-label" id="ml-scan-label">Escaneando…</span></div>' +
            '</div>' +
          '</div>' +
          '<div class="ml-template-card">' + I.svg('camera', { size: 22 }) +
            '<strong>Consejos para mejor lectura</strong>' +
            '<p class="muted tiny">Evita reflejos, mantén el menú completo dentro del cuadro y usa buena luz. Revisa siempre los precios detectados antes de publicar.</p>' +
            '<button type="button" class="btn btn--blue btn--sm" id="ml-scan-start">' + I.svg('sparkles', { size: 15 }) + 'Escanear menú</button>' +
            '<div class="ml-gemini-note tiny muted" id="ml-gemini-note"></div>' +
            '<p class="ml-scan-warning tiny">' + I.svg('info', { size: 14 }) +
              'La lectura automática puede equivocarse en nombres, categorías o precios. Revisa cada tarjeta antes de publicar; también podrás editarlas después de que el equipo Kome autorice tu negocio.</p>' +
          '</div>' +
        '</div>' +
        '<div class="ml-progress" id="ml-ai-progress"><div class="progress"><div class="progress__bar" id="ml-ai-bar"></div></div><span class="tiny muted" id="ml-ai-status"></span></div>' +
        '<div class="ml-manual-text hidden" id="ml-manual-text">' +
          '<label class="field__label">El escáner automático no está disponible. Pega aquí el texto leído del menú:</label>' +
          '<textarea class="textarea" id="ml-ai-text" placeholder="Ej.&#10;Pollo asado .......... ₡4500&#10;Limonada natural .... ₡1200"></textarea>' +
          '<button type="button" class="btn btn--primary btn--sm" id="ml-ai-parse" style="margin-top:10px">' + I.svg('sparkles', { size: 15 }) + 'Generar tarjetas desde el texto</button>' +
        '</div>' +
      '</div>' +

      '<div class="ml-results">' +
        '<div class="ml-results__head"><h4>Tarjetas editables <span class="ml-count" id="ml-count">0</span></h4>' +
          '<button type="button" class="btn btn--ghost btn--sm" id="ml-remove-all" ' + (items.length ? '' : 'disabled') + '>' + I.svg('trash', { size: 14 }) + 'Borrar todas</button></div>' +
        '<div class="ml-scan-notice hidden" id="ml-scan-notice">' + I.svg('info', { size: 16 }) +
          '<span id="ml-scan-notice-text"></span></div>' +
        '<div class="ml-cards" id="ml-cards"></div>' +
        '<div class="ml-cards-empty" id="ml-cards-empty">' + I.svg('box', { size: 32, style: 'color:var(--text-3);margin:0 auto 10px' }) +
          '<p class="muted">Aún no hay productos. Usa cualquiera de los 3 modos para agregar el primero.</p></div>' +
      '</div>';

    var photoData = '';

    /* Categorías creadas por el usuario o detectadas al importar. */
    function registerCategories(list) {
      var changed = false;
      (list || []).forEach(function (cat) {
        var name = String(cat == null ? '' : cat).replace(/\s+/g, ' ').trim();
        if (!name || name.length > 48 || CATEGORY_SUGGESTIONS.indexOf(name) !== -1) return;
        CATEGORY_SUGGESTIONS.push(name);
        changed = true;
      });
      if (changed) q('#ml-cat-suggestions', container).innerHTML = categoryOptions();
    }

    function renderCards() {
      /* Agrupamos por categoría sin perder el índice real de cada tarjeta. */
      var groups = [];
      var indexes = {};
      items.forEach(function (it, index) {
        var cat = String(it.categoria || 'General').trim() || 'General';
        if (!indexes[cat]) { indexes[cat] = []; groups.push(cat); }
        indexes[cat].push(index);
      });
      q('#ml-cards', container).innerHTML = groups.map(function (cat) {
        return '<div class="ml-group">' +
          '<div class="ml-group__head">' + I.svg('tag', { size: 15 }) +
            '<strong>' + esc(cat) + '</strong><span class="ml-group__count">' + indexes[cat].length + '</span></div>' +
          indexes[cat].map(function (i) { return itemCard(items[i], i); }).join('') +
          '</div>';
      }).join('');
      q('#ml-count', container).textContent = items.length;
      q('#ml-cards-empty', container).classList.toggle('hidden', items.length > 0);
      q('#ml-remove-all', container).disabled = items.length === 0;
      onChange(items.slice());
    }

    function addMany(list) {
      var cats = [];
      list.forEach(function (it) {
        if (!it || !it.nombre) return;
        var cat = String(it.categoria || 'General').trim() || 'General';
        cats.push(cat);
        items.push({
          _uid: newId(),
          nombre: String(it.nombre || '').trim(),
          categoria: cat,
          precio: normalizePrice(it.precio),
          descripcion: String(it.descripcion || '').trim(),
          etiqueta: String(it.etiqueta || '').trim(),
          imagen: it.imagen || ''
        });
      });
      registerCategories(cats);
      renderCards();
    }

    function progress(hostId, barId, pct, status) {
      q('#' + barId, container).style.width = Math.max(0, Math.min(100, pct)) + '%';
      q('#' + hostId, container).classList.add('is-active');
      if (status) q('#' + hostId.replace('progress', 'status'), container).textContent = status;
    }

    /* --- Tabs --- */
    qa('.ml-tab', container).forEach(function (tab) {
      tab.addEventListener('click', function () {
        activeTab = tab.getAttribute('data-tab');
        qa('.ml-tab', container).forEach(function (t) { t.classList.toggle('is-active', t === tab); });
        qa('.ml-panel', container).forEach(function (p) { p.classList.toggle('is-active', p.getAttribute('data-panel') === activeTab); });
      });
    });

    /* --- Manual --- */
    q('#ml-photo', container).addEventListener('change', async function () {
      if (!this.files[0]) return;
      try {
        var compressed = await D.compressImage(this.files[0], 900, .74);
        photoData = await window.StorageService.upload(compressed, { folder: 'menu' });
        q('#ml-photo-preview', container).innerHTML = '<img src="' + photoData + '" alt="Vista previa">';
      } catch (e) { UI.toast(e.message, 'error'); }
    });

    q('#ml-new-category', container).addEventListener('click', function () {
      UI.openModal(UI.modalHead('Nueva categoría') +
        '<p class="muted tiny">Podrás usarla con este producto y con los siguientes.</p>' +
        '<div class="field" style="margin-top:12px"><label class="field__label">Nombre de la categoría</label>' +
        '<input class="input" id="ml-cat-new-name" placeholder="Ej. Postres caseros" maxlength="48"></div>' +
        '<div class="modal__foot"><button class="btn btn--ghost btn--block" data-modal-close>Cancelar</button>' +
        '<button type="button" class="btn btn--primary btn--block" id="ml-cat-new-save">Crear categoría</button></div>', function (wrap, close) {
          var input = q('#ml-cat-new-name', wrap);
          input.focus();
          function save() {
            var name = input.value.replace(/\s+/g, ' ').trim();
            if (!name) { UI.toast('Escribe el nombre de la categoría.', 'error'); return; }
            registerCategories([name]);
            q('#ml-categoria', container).value = name;
            close();
            UI.toast('Categoría «' + name + '» lista para usar.', 'success');
          }
          q('#ml-cat-new-save', wrap).addEventListener('click', save);
          input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); save(); } });
        });
    });

    q('#ml-add-manual', container).addEventListener('click', function () {
      var nombre = q('#ml-nombre', container).value.trim();
      var categoria = q('#ml-categoria', container).value.trim() || 'General';
      var precio = q('#ml-precio', container).value.trim();
      if (!nombre) { UI.toast('Escribe el nombre del producto.', 'error'); return; }
      registerCategories([categoria]);
      addMany([{
        nombre: nombre, categoria: categoria, precio: precio,
        descripcion: q('#ml-descripcion', container).value.trim(),
        etiqueta: q('#ml-etiqueta', container).value, imagen: photoData
      }]);
      ['#ml-nombre', '#ml-categoria', '#ml-precio', '#ml-descripcion'].forEach(function (s) { q(s, container).value = ''; });
      q('#ml-etiqueta', container).value = '';
      photoData = '';
      q('#ml-photo-preview', container).innerHTML = I.svg('camera', { size: 26 }) + '<small>Toca para subir foto</small>';
      UI.toast('Tarjeta agregada. Puedes editarla abajo.', 'success');
      renderCards();
    });

    q('#ml-clear-manual', container).addEventListener('click', function () {
      ['#ml-nombre', '#ml-categoria', '#ml-precio', '#ml-descripcion'].forEach(function (s) { q(s, container).value = ''; });
      q('#ml-etiqueta', container).value = ''; photoData = '';
      q('#ml-photo-preview', container).innerHTML = I.svg('camera', { size: 26 }) + '<small>Toca para subir foto</small>';
    });

    /* --- Excel / CSV --- */
    q('#ml-template', container).addEventListener('click', function () {
      if (!global.XLSX) { UI.toast('La librería Excel aún está cargando.', 'error'); return; }
      var wb = global.XLSX.utils.book_new();
      var ws = global.XLSX.utils.aoa_to_sheet([['Nombre', 'Categoria', 'Precio', 'Descripcion']]);
      ws['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 12 }, { wch: 48 }];
      global.XLSX.utils.book_append_sheet(wb, ws, 'Productos');
      global.XLSX.writeFile(wb, 'plantilla-productos.xlsx');
      UI.toast('Plantilla descargada', 'success');
    });

    function handleExcel(file) {
      if (!file) return;
      if (!global.XLSX) { UI.toast('La librería Excel aún está cargando.', 'error'); return; }
      progress('ml-excel-progress', 'ml-excel-bar', 8, 'Leyendo archivo…');
      var reader = new FileReader();
      reader.onload = function (e) {
        var timer = setInterval(function () {
          var bar = q('#ml-excel-bar', container);
          var pct = Math.min(88, parseInt(bar.style.width || 0, 10) + 11);
          bar.style.width = pct + '%';
        }, 110);
        try {
          var wb = global.XLSX.read(e.target.result, { type: 'array' });
          var sheet = wb.Sheets[wb.SheetNames[0]];
          var rows = global.XLSX.utils.sheet_to_json(sheet, { defval: '' });
          var normalized = rows.map(function (r) {
            var get = function (keys) {
              for (var i = 0; i < keys.length; i++) {
                var k = Object.keys(r).find(function (key) { return String(key).toLowerCase().replace(/\s/g, '') === keys[i]; });
                if (k) return r[k];
              }
              return '';
            };
            return {
              nombre: get(['nombre', 'producto', 'platillo', 'name']),
              categoria: get(['categoria', 'categoría', 'category']),
              precio: get(['precio', 'price', 'cost']),
              descripcion: get(['descripcion', 'descripción', 'description', 'ingredientes'])
            };
          }).filter(function (r) { return String(r.nombre).trim(); });
          clearInterval(timer);
          progress('ml-excel-progress', 'ml-excel-bar', 100, normalized.length + ' filas detectadas y convertidas en tarjetas.');
          addMany(normalized);
          UI.toast(normalized.length + ' productos importados', 'success');
        } catch (err) {
          clearInterval(timer);
          UI.toast('No se pudo leer el archivo: ' + err.message, 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    }
    q('#ml-excel', container).addEventListener('change', function () { handleExcel(this.files[0]); });
    var excelDrop = q('#ml-excel-drop', container);
    excelDrop.addEventListener('click', function () { q('#ml-excel', container).click(); });
    ['dragenter', 'dragover'].forEach(function (ev) { excelDrop.addEventListener(ev, function (e) { e.preventDefault(); excelDrop.classList.add('is-drag'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { excelDrop.addEventListener(ev, function (e) { e.preventDefault(); excelDrop.classList.remove('is-drag'); }); });
    excelDrop.addEventListener('drop', function (e) { if (e.dataTransfer.files[0]) handleExcel(e.dataTransfer.files[0]); });

    /* --- IA --- */
    var scanFile = null;
    var scanUrl = '';
    var scanning = false;
    var scanInput = q('#ml-scan-image', container);
    var scanButton = q('#ml-scan-start', container);
    q('#ml-gemini-note', container).textContent = global.AppAIMenuScanner.isGeminiReady()
      ? 'Visión Gemini Flash conectada. La foto se escanea automáticamente.' : 'OCR local activo. La foto se escanea automáticamente; si falla, podrás pegar el texto.';

    function setScanning(state) {
      scanning = state;
      scanButton.disabled = state;
      scanButton.innerHTML = state
        ? I.svg('scan', { size: 15 }) + 'Escaneando…'
        : I.svg('sparkles', { size: 15 }) + 'Escanear menú';
    }

    async function runScan(file) {
      if (!file) { UI.toast('Primero sube una foto del menú.', 'error'); return; }
      if (scanning) return;
      setScanning(true);
      var overlay = q('#ml-scan-overlay', container);
      overlay.classList.remove('hidden');
      q('#ml-manual-text', container).classList.add('hidden');
      q('#ml-ai-bar', container).style.width = '0%';
      q('#ml-scan-label', container).textContent = 'Escaneando menú…';
      try {
        var items = await global.AppAIMenuScanner.scanMenuImageWithAI(file, {
          onProgress: function (msg, pct) { progress('ml-ai-progress', 'ml-ai-bar', pct, msg); q('#ml-scan-label', container).textContent = msg; }
        });
        progress('ml-ai-progress', 'ml-ai-bar', 100, items.length + ' productos detectados.');
        if (!items.length) {
          q('#ml-manual-text', container).classList.remove('hidden');
          UI.toast('No se detectó texto. Pega el contenido del menú para continuar.', 'info');
        } else {
          addMany(items);
          var notice = q('#ml-scan-notice', container);
          q('#ml-scan-notice-text', container).innerHTML = '<strong>' + items.length +
            ' productos detectados.</strong> La lectura automática no es perfecta: revisa nombres, categorías y precios antes de publicar. Podrás editarlos después de que Kome autorice tu negocio.';
          notice.classList.remove('hidden');
          UI.toast('Escaneo listo. Revisa las tarjetas antes de publicar.', 'success');
        }
      } catch (err) {
        progress('ml-ai-progress', 'ml-ai-bar', 100, err.message);
        q('#ml-manual-text', container).classList.remove('hidden');
        UI.toast(err.message, 'error');
      } finally {
        overlay.classList.add('hidden');
        setScanning(false);
      }
    }

    function showScanImage(file, auto) {
      if (!file) return;
      scanFile = file;
      if (scanUrl) URL.revokeObjectURL(scanUrl);
      scanUrl = URL.createObjectURL(file);
      q('#ml-scan-img', container).src = scanUrl;
      q('#ml-scan-placeholder', container).classList.add('hidden');
      q('#ml-scan-view', container).classList.remove('hidden');
      if (auto !== false) runScan(file);
    }

    scanInput.addEventListener('change', function () {
      if (this.files[0]) showScanImage(this.files[0], true);
      this.value = '';
    });
    var scanDrop = q('#ml-scan-drop', container);
    scanDrop.addEventListener('click', function () {
      if (!scanning) scanInput.click();
    });
    ['dragenter', 'dragover'].forEach(function (ev) { scanDrop.addEventListener(ev, function (e) { e.preventDefault(); scanDrop.classList.add('is-drag'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { scanDrop.addEventListener(ev, function (e) { e.preventDefault(); scanDrop.classList.remove('is-drag'); }); });
    scanDrop.addEventListener('drop', function (e) { if (e.dataTransfer.files[0]) showScanImage(e.dataTransfer.files[0], true); });
    scanButton.addEventListener('click', function () { runScan(scanFile); });

    q('#ml-ai-parse', container).addEventListener('click', function () {
      var text = q('#ml-ai-text', container).value;
      var parsed = global.AppAIMenuScanner.parseMenuText(text);
      if (!parsed.length) { UI.toast('No se encontraron productos con precio en el texto.', 'error'); return; }
      addMany(parsed);
      UI.toast(parsed.length + ' tarjetas generadas', 'success');
    });

    /* --- Edición / borrado de tarjetas --- */
    q('#ml-cards', container).addEventListener('input', function (e) {
      var el = e.target;
      var field = el.getAttribute('data-field');
      var index = parseInt(el.getAttribute('data-index'), 10);
      if (!field || isNaN(index) || !items[index]) return;
      items[index][field] = el.value;
      onChange(items.slice());
    });
    q('#ml-cards', container).addEventListener('change', async function (e) {
      var el = e.target;
      if (el.getAttribute('data-field') === 'categoria') {
        var ci = parseInt(el.getAttribute('data-index'), 10);
        if (!isNaN(ci) && items[ci]) {
          items[ci].categoria = el.value.replace(/\s+/g, ' ').trim() || 'General';
          registerCategories([items[ci].categoria]);
          renderCards();
        }
        return;
      }
      var idx = parseInt(el.getAttribute('data-card-image'), 10);
      if (isNaN(idx) || !el.files[0]) return;
      try {
        var compressed = await D.compressImage(el.files[0], 700, .72);
        var data = await window.StorageService.upload(compressed, { folder: 'menu' });
        items[idx].imagen = data;
        el.closest('.menu-item-card__photo').querySelector('img') ||
          el.closest('.menu-item-card__photo').insertAdjacentHTML('afterbegin', '<img src="' + data + '" alt="">');
        var img = el.closest('.menu-item-card__photo').querySelector('img');
        if (img) img.src = data;
        onChange(items.slice());
      } catch (err) { UI.toast(err.message, 'error'); }
    });
    q('#ml-cards', container).addEventListener('click', function (e) {
      var del = e.target.closest('[data-remove]');
      if (!del) return;
      items.splice(parseInt(del.getAttribute('data-remove'), 10), 1);
      renderCards();
    });
    q('#ml-remove-all', container).addEventListener('click', function () {
      if (!items.length) return;
      UI.openModal(UI.modalHead('¿Borrar todas las tarjetas?') +
        '<p class="muted">Se eliminarán ' + items.length + ' productos de esta lista temporal. Esta acción no afecta lo que ya publicaste.</p>' +
        '<div class="modal__foot"><button class="btn btn--ghost btn--block" data-modal-close>Cancelar</button>' +
        '<button type="button" class="btn btn--danger btn--block" id="ml-confirm-clear">Borrar todo</button></div>', function (wrap, close) {
          q('#ml-confirm-clear', wrap).addEventListener('click', function () { items = []; renderCards(); close(); });
        });
    });

    registerCategories(items.map(function (it) { return it && it.categoria; }));
    renderCards();

    return {
      getItems: function () {
        return items.filter(function (it) { return it && it.nombre; }).map(function (it) {
          return {
            id: it._uid || it.id || newId(),
            nombre: it.nombre, categoria: it.categoria || 'General',
            precio: Number(it.precio) || 0, descripcion: it.descripcion || '',
            etiqueta: it.etiqueta || '', imagen: it.imagen || ''
          };
        });
      },
      setItems: function (list) { items = (list || []).map(function (it) { return Object.assign({ _uid: newId() }, it); }); renderCards(); },
      clear: function () { items = []; renderCards(); },
      count: function () { return items.length; },
      setTab: function (tab) {
        var btn = q('.ml-tab[data-tab="' + tab + '"]', container);
        if (btn) btn.click();
      }
    };
  }

  global.MountMenuLoader = MountMenuLoader;
})(window);
