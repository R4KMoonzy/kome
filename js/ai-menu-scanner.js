/* ============================================================
   ai-menu-scanner.js — Escaneo inteligente de menús impresos
   ------------------------------------------------------------
   1) Gemini Flash vía proxy /api/gemini -> visión real (JSON).
   2) Si el proxy falla -> OCR en cliente con Tesseract.js + parser.
   3) Si no hay OCR -> acepta texto pegado por el usuario.
   La API KEY nunca viaja al navegador: vive en el servidor.
   NUNCA inventa platillos: solo devuelve lo que se detecta/pega.
   ============================================================ */
(function (global) {
  'use strict';

  var AppAIConfig = {
    geminiProxy: '/api/gemini',
    useClientOCR: true,
    ocrLanguage: 'spa'
  };

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result).split(',')[1] || ''); };
      reader.onerror = function () { reject(new Error('No se pudo leer la imagen.')); };
      reader.readAsDataURL(file);
    });
  }

  /* Comprime antes de enviar: evita bodies gigantes y recortes por límite. */
  function prepareImage(file) {
    var fallback = function () {
      return fileToBase64(file).then(function (data) {
        return { data: data, mime: file.type || 'image/jpeg' };
      });
    };
    if (!global.DataService || typeof global.DataService.compressImage !== 'function') return fallback();
    return global.DataService.compressImage(file, 1400, .78).then(function (dataUrl) {
      var match = /^data:([^;]+);base64,/.exec(String(dataUrl || ''));
      return { data: String(dataUrl).split(',')[1] || '', mime: match ? match[1] : (file.type || 'image/jpeg') };
    }).catch(fallback);
  }

  function stripFences(text) {
    return String(text || '').replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  }

  /* Gemini a veces agrega texto antes/después del JSON. Devuelve TODOS los
     bloques balanceados válidos para no quedarse con un array anidado. */
  function extractJsonCandidates(text) {
    var s = stripFences(text);
    var out = [];
    try { out.push(JSON.parse(s)); } catch (e) { /* se buscan bloques */ }

    for (var i = 0; i < s.length; i++) {
      if (s.charAt(i) !== '{' && s.charAt(i) !== '[') continue;
      var open = s.charAt(i);
      var close = open === '{' ? '}' : ']';
      var depth = 0, inString = false, escaped = false;
      for (var j = i; j < s.length; j++) {
        var ch = s.charAt(j);
        if (inString) {
          if (escaped) escaped = false;
          else if (ch === '\\') escaped = true;
          else if (ch === '"') inString = false;
          continue;
        }
        if (ch === '"') { inString = true; continue; }
        if (ch === open) depth++;
        else if (ch === close) {
          depth--;
          if (depth === 0) {
            try { out.push(JSON.parse(s.slice(i, j + 1))); } catch (e2) { /* bloque inválido */ }
            break;
          }
        }
      }
    }
    return out;
  }

  function cleanText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  /* Evita que un precio o un número acabe escrito en la categoría. */
  function safeCategory(value, fallback) {
    var cat = cleanText(value).replace(/^[:•\-\s]+|[:•\-\s]+$/g, '');
    if (!cat || /^[\d\s.,₡$€¢]+$/.test(cat) || cat.length > 48) {
      return cleanText(fallback) || 'General';
    }
    return cat;
  }

  function normalizeItems(raw, defaultCategory) {
    if (!Array.isArray(raw)) return [];
    return raw.map(function (it) {
      if (!it || typeof it !== 'object') return null;
      var nombre = cleanText(it.nombre || it.name || it.producto || it.platillo);
      /* Descarta bits sueltos que no son productos (precio sin nombre). */
      if (!nombre || /^[\d\s.,₡$€¢]+$/.test(nombre)) return null;
      return {
        nombre: nombre.charAt(0).toUpperCase() + nombre.slice(1),
        categoria: safeCategory(it.categoria || it.category, defaultCategory),
        precio: parsePrice(it.precio || it.price),
        descripcion: cleanText(it.descripcion || it.description || it.detalle),
        etiqueta: cleanText(it.etiqueta || it.tag)
      };
    }).filter(Boolean);
  }

  /* Acepta la forma agrupada nueva y también respuestas planas anteriores. */
  function flattenGeminiPayload(payload) {
    var out = [];
    if (Array.isArray(payload)) return normalizeItems(payload, 'General');
    if (!payload || typeof payload !== 'object') return [];

    var groups = payload.categorias || payload.categories || payload.secciones || payload.sections;
    if (Array.isArray(groups)) {
      groups.forEach(function (g) {
        if (!g || typeof g !== 'object') return;
        var categoria = safeCategory(g.categoria || g.category || g.nombre || g.name || g.titulo || g.title, 'General');
        var productos = g.productos || g.products || g.items || g.platillos || [];
        out = out.concat(normalizeItems(productos, categoria));
      });
      if (out.length) return out;
    }

    var categoriaDirecta = safeCategory(payload.categoria || payload.category, 'General');
    var productos = payload.productos || payload.products || payload.items || payload.platillos;
    if (Array.isArray(productos)) return normalizeItems(productos, categoriaDirecta);
    return [];
  }

  function flattenGeminiText(text) {
    var candidates = extractJsonCandidates(text);
    for (var i = 0; i < candidates.length; i++) {
      var out = flattenGeminiPayload(candidates[i]);
      if (out.length) return out;
    }
    return [];
  }

  /* ---------- Parser determinista de texto OCR ---------- */
  function normalizeLines(text) {
    return String(text || '')
      .replace(/\r/g, '')
      .split('\n')
      .map(function (l) { return l.replace(/\s+/g, ' ').trim(); })
      .filter(Boolean);
  }

  function guessCategory(line) {
    var s = line.toLowerCase();
    var rules = [
      [['bebida', 'refresco', 'gaseosa', 'jugo', 'limonada', 'café', 'cafe', 'té', 'te', 'agua', 'soda'], 'Bebidas'],
      [['postre', 'torta', 'pastel', 'helado', 'dulce', 'brownie', 'flan', 'reposter'], 'Postres'],
      [['combo', 'promo', 'paquete', 'familiar'], 'Combos'],
      [['entrada', 'aperitivo', 'snack', 'papas', 'salsa'], 'Entradas'],
      [['pizza', 'pizzeta', 'calzone'], 'Pizzas'],
      [['hamburguesa', 'sandwich', 'sándwich', 'hot dog', 'wrap'], 'Rápida'],
      [['pollo', 'carne', 'pescado', 'cerdo', 'plato', 'arroz', 'pasta', 'casado'], 'Platos Fuertes'],
      [['desayuno', 'almorzo', 'merienda'], 'Desayunos'],
      [['sopa', 'ensalada', 'crema'], 'Sopas y Ensaladas'],
      [['medicamento', 'pastilla', 'jarabe', 'vitamina'], 'Farmacia'],
      [['licor', 'cerveza', 'vino', 'ron', 'whisky', 'vodka'], 'Licores']
    ];
    for (var i = 0; i < rules.length; i++) {
      for (var j = 0; j < rules[i][0].length; j++) {
        if (s.indexOf(rules[i][0][j]) !== -1) return rules[i][1];
      }
    }
    return 'General';
  }

  function parsePrice(raw) {
    if (!raw) return '';
    var cleaned = String(raw).replace(/[^\d.,]/g, '');
    if (!cleaned) return '';
    if (cleaned.indexOf(',') !== -1 && cleaned.indexOf('.') !== -1) {
      cleaned = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
        ? cleaned.replace(/\./g, '').replace(',', '.')
        : cleaned.replace(/,/g, '');
    } else if (cleaned.indexOf(',') !== -1) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      var parts = cleaned.split('.');
      if (parts.length > 2) cleaned = parts.join('');
    }
    /* 1.500 / 9.900 en menús latinoamericanos = miles, no decimales */
    if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) cleaned = cleaned.replace(/\./g, '');
    var n = parseFloat(cleaned);
    return isFinite(n) && n > 0 ? String(Math.round(n * 100) / 100) : '';
  }

  function parseMenuText(text) {
    var lines = normalizeLines(text);
    var items = [];
    var currentCategory = 'General';
    lines.forEach(function (line) {
      var hasNumber = /\d/.test(line);
      var header = line.replace(/[:\-–—]+$/, '').trim();

      /* Encabezado de sección: "BEBIDAS", "Bebidas:" o "Postres" sin precio. */
      if (!hasNumber && header.length <= 34 &&
          (/:$/.test(line.trim()) || header === header.toUpperCase() || guessCategory(header) !== 'General')) {
        currentCategory = safeCategory(header, currentCategory);
        return;
      }
      if (!hasNumber) return;

      /* Siempre el último número de la línea: evita meter el precio en el
         nombre cuando hay más de una cifra (ej. "Combo 2 4500"). */
      var matches = line.match(/(?:₡|¢|CRC|US\$|\$|€)?\s*\d[\d.,]*/g);
      if (!matches || !matches.length) return;
      var rawPrice = matches[matches.length - 1].trim();
      var price = parsePrice(rawPrice);
      if (!price) return;
      var priceIndex = line.lastIndexOf(rawPrice);

      var name = line.slice(0, priceIndex)
        .replace(/(₡|¢|CRC|US\$|\$|€)\s*$/i, '').trim()
        .replace(/[.·\-–—:_]+$/g, '').trim();
      if (name.length < 2 || /^[\d\s.,₡$€¢]+$/.test(name)) return;
      var desc = line.slice(priceIndex + rawPrice.length)
        .replace(/^[\s.\-–—:]+/, '').trim();
      if (desc.length < 4) desc = '';

      items.push({
        nombre: name.charAt(0).toUpperCase() + name.slice(1),
        categoria: currentCategory !== 'General' ? currentCategory : guessCategory(name),
        precio: price,
        descripcion: desc,
        etiqueta: ''
      });
    });
    return items;
  }

  /* ---------- Gemini Flash vía proxy seguro ---------- */
  function scanWithGemini(file, onProgress) {
    if (onProgress) onProgress('Preparando imagen…', 12);
    return prepareImage(file).then(function (image) {
      if (onProgress) onProgress('Enviando imagen al analizador…', 45);
      var prompt = 'Analiza esta imagen de un menú impreso, volante, cartelera o pizarra. ' +
        'Extrae ÚNICAMENTE lo que se lee, sin inventar nada. ' +
        'Responde con un JSON válido con esta forma exacta: ' +
        '{"categorias":[{"categoria":"Nombre de la sección","productos":[{"nombre":"Producto","precio":"solo número","descripcion":"detalle opcional"}]}]}. ' +
        'Respeta las secciones impresas: coloca cada producto dentro de la categoría correspondiente. ' +
        'Si no ves una sección clara, usa "General". ' +
        'Incluye TODOS los productos visibles; no resumas, no limites la cantidad y no omitas ninguno. ' +
        'Si no se puede leer nada, devuelve {"categorias":[]}. ' +
        'No agregues texto fuera del JSON.';

      return fetch(AppAIConfig.geminiProxy, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt, mime: image.mime, data: image.data })
      }).then(function (r) {
        if (!r.ok) throw new Error('El analizador respondió ' + r.status + '.');
        return r.json();
      }).then(function (json) {
        return flattenGeminiText(json && json.text);
      });
    });
  }

  /* ---------- OCR local (Tesseract.js) ---------- */
  function scanWithOCR(file, onProgress) {
    if (!global.Tesseract || !global.Tesseract.recognize) {
      return Promise.reject(new Error('OCR no disponible en este navegador. Pega el texto del menú para continuar.'));
    }
    if (onProgress) onProgress('Leyendo el menú con OCR en tu navegador…', 20);
    return global.Tesseract.recognize(file, AppAIConfig.ocrLanguage, {
      logger: function (m) {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress('Reconociendo texto…', 20 + Math.round((m.progress || 0) * 55));
        }
      }
    }).then(function (result) {
      var text = result && result.data && result.data.text ? result.data.text : '';
      return parseMenuText(text);
    });
  }

  /**
   * API principal usada por menu-loader.js
   * @param {File} imageFile
   * @param {Object} options { onProgress: fn(msg, pct), manualText: string }
   * @returns {Promise<Array<{nombre,categoria,precio,descripcion,etiqueta}>>}
   */
  function scanMenuImageWithAI(imageFile, options) {
    options = options || {};
    var onProgress = options.onProgress;
    if (!imageFile) return Promise.resolve([]);
    if (onProgress) onProgress('Preparando imagen…', 8);

    var engines = [];
    if (AppAIConfig.geminiProxy) {
      engines.push(function () { return scanWithGemini(imageFile, onProgress); });
    }
    if (AppAIConfig.useClientOCR && global.Tesseract) {
      engines.push(function () { return scanWithOCR(imageFile, onProgress); });
    }
    if (options.manualText) {
      engines.push(function () { return Promise.resolve(parseMenuText(options.manualText)); });
    }

    function run(index, previous) {
      if (index >= engines.length) return Promise.resolve(previous || []);
      return engines[index]().then(function (items) {
        /* Si Gemini no leyó nada, probamos OCR antes de rendirnos. */
        if (items && items.length) return items;
        return run(index + 1, previous);
      }).catch(function () {
        if (onProgress) onProgress('Usando método de respaldo…', 35);
        return run(index + 1, previous);
      });
    }

    return run(0, []).then(function (items) {
      if (onProgress) onProgress('Procesando tarjetas detectadas…', 88);
      return items.filter(function (it) { return it && it.nombre; });
    });
  }

  global.AppAIConfig = AppAIConfig;
  global.AppAIMenuScanner = {
    scanMenuImageWithAI: scanMenuImageWithAI,
    parseMenuText: parseMenuText,
    parsePrice: parsePrice,
    flattenGeminiText: flattenGeminiText,
    isGeminiReady: function () { return !!AppAIConfig.geminiProxy; }
  };
})(window);
