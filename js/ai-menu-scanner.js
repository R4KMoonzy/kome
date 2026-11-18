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

  function stripFences(text) {
    return String(text || '').replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
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
      /* Encabezado de sección: "BEBIDAS" o "Bebidas:" sin precio */
      if (!/\d/.test(line) && line.length < 34 && /:$/.test(line.trim())) {
        currentCategory = guessCategory(line) !== 'General' ? guessCategory(line) : line.replace(/:$/, '').trim();
        return;
      }
      if (!/\d/.test(line)) return;

      var priceMatch = line.match(/(?:₡|¢|CRC|US\$|\$|€)?\s*(\d[\d.,]*)(?!.*\d)/);
      if (!priceMatch) {
        priceMatch = line.match(/(₡|¢|\$)\s*(\d[\d.,]*)/);
        if (priceMatch) priceMatch[1] = priceMatch[2];
      }
      if (!priceMatch) return;
      var price = parsePrice(priceMatch[1]);
      if (!price) return;

      var name = line.slice(0, priceMatch.index)
        .replace(/(₡|¢|US\$|\$|€)\s*$/i, '').trim()
        .replace(/[.·\-–—:_]+$/g, '').trim();
      if (name.length < 2) return;
      var desc = line.slice((priceMatch.index || 0) + priceMatch[0].length)
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
    return fileToBase64(file).then(function (base64) {
      if (onProgress) onProgress('Enviando imagen al analizador…', 45);
      var mime = file.type || 'image/jpeg';
      var prompt = 'Analiza esta imagen de un menú impreso, volante o pizarra. ' +
        'Extrae ÚNICAMENTE los productos/platillos que se lean. Responde con un JSON array ' +
        'de objetos con las claves exactas: nombre, categoria, precio (solo número), descripcion. ' +
        'No inventes productos. Si no se puede leer nada devuelve [].';

      return fetch(AppAIConfig.geminiProxy, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt, mime: mime, data: base64 })
      }).then(function (r) {
        if (!r.ok) throw new Error('El analizador respondió ' + r.status + '.');
        return r.json();
      }).then(function (json) {
        var text = json && json.text;
        var parsed;
        try { parsed = JSON.parse(stripFences(text)); } catch (e) { parsed = []; }
        if (!Array.isArray(parsed)) parsed = [];
        return parsed.map(function (it) {
          return {
            nombre: String(it.nombre || it.name || '').trim(),
            categoria: String(it.categoria || it.category || 'General').trim() || 'General',
            precio: parsePrice(it.precio || it.price || ''),
            descripcion: String(it.descripcion || it.description || '').trim(),
            etiqueta: ''
          };
        }).filter(function (it) { return it.nombre; });
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

    function run(index) {
      if (index >= engines.length) {
        return Promise.reject(new Error('Sin analizador disponible. Pega el texto del menú para continuar.'));
      }
      return engines[index]().catch(function () {
        if (onProgress) onProgress('Usando método de respaldo…', 35);
        return run(index + 1);
      });
    }

    return run(0).then(function (items) {
      if (onProgress) onProgress('Procesando tarjetas detectadas…', 88);
      return items.filter(function (it) { return it && it.nombre; });
    });
  }

  global.AppAIConfig = AppAIConfig;
  global.AppAIMenuScanner = {
    scanMenuImageWithAI: scanMenuImageWithAI,
    parseMenuText: parseMenuText,
    parsePrice: parsePrice,
    isGeminiReady: function () { return !!AppAIConfig.geminiProxy; }
  };
})(window);
