/* ============================================================
   storage-service.js — Imágenes en Appwrite Storage

   Envía el data URL comprimido al proxy /api/appwrite-upload y
   guarda solo la URL pública corta en Firestore. Si el proxy no
   está disponible, devuelve el data URL original para no romper
   el flujo (modo respaldo).
   ============================================================ */
(function (global) {
  'use strict';

  var CFG = global.AppwriteConfig;
  var warned = false;

  function isDataUrl(value) {
    return /^data:image\//i.test(String(value || ''));
  }
  function isRemote(value) {
    return /^https?:\/\//i.test(String(value || ''));
  }

  async function upload(dataUrl, opts) {
    var value = String(dataUrl || '');
    /* Ya es una URL de Appwrite (o externa): nada que subir. */
    if (!isDataUrl(value)) return value;
    if (!CFG || !CFG.isConfigured()) return value;

    try {
      var response = await fetch('/api/appwrite-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: value,
          folder: (opts && opts.folder) || 'general'
        })
      });

      if (!response.ok) {
        var failure = await response.json().catch(function () { return {}; });
        throw new Error(failure.error || ('HTTP ' + response.status));
      }

      var out = await response.json();
      if (!out.url) throw new Error('Appwrite no devolvió una URL');
      return out.url;
    } catch (err) {
      if (!warned) {
        warned = true;
        /* eslint-disable no-console */
        console.warn('[Storage] No se pudo subir a Appwrite; se usa el respaldo local:', (err && err.message) || err);
      }
      return value;
    }
  }

  /* Sube varias imágenes con 3 peticiones en paralelo como máximo. */
  async function uploadMany(list, opts) {
    if (!Array.isArray(list)) return list;
    var output = new Array(list.length);
    var next = 0;

    async function worker() {
      while (next < list.length) {
        var index = next++;
        output[index] = await upload(list[index], opts);
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    return output;
  }

  global.StorageService = {
    upload: upload,
    uploadMany: uploadMany,
    isDataUrl: isDataUrl,
    isRemote: isRemote
  };
})(window);
