/* api/appwrite-upload.js — Proxy seguro de Appwrite Storage para Vercel.
   La API KEY se lee de process.env.APPWRITE_API_KEY y nunca llega al navegador.
   El navegador envía un data URL ya comprimido; el servidor lo sube al bucket
   y devuelve una URL pública corta para guardar en Firestore. */

var DEFAULT_ENDPOINT = 'https://nyc.cloud.appwrite.io/v1';
var DEFAULT_PROJECT = '6afcc63100087dc9aa21';
var DEFAULT_BUCKET = '6afcc6410028c15b47fa';
var MAX_BYTES = 4 * 1024 * 1024;

function json(res, status, payload) {
  res.status(status).json(payload);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Método no permitido' });
  }

  var apiKey = process.env.APPWRITE_API_KEY;
  if (!apiKey) {
    return json(res, 500, { error: 'APPWRITE_API_KEY no configurada en Vercel' });
  }

  var endpoint = String(process.env.APPWRITE_ENDPOINT || DEFAULT_ENDPOINT).replace(/\/+$/, '');
  var project = process.env.APPWRITE_PROJECT_ID || DEFAULT_PROJECT;
  var bucket = process.env.APPWRITE_BUCKET_ID || DEFAULT_BUCKET;

  try {
    var body = req.body || {};
    var data = String(body.data || '');
    var match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(data);
    if (!match) {
      return json(res, 400, { error: 'La imagen debe ser un data URL base64' });
    }

    var mime = match[1];
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(mime)) {
      return json(res, 400, { error: 'Formato de imagen no permitido' });
    }

    var buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
    if (!buffer.length) return json(res, 400, { error: 'La imagen está vacía' });
    if (buffer.length > MAX_BYTES) {
      return json(res, 413, { error: 'La imagen supera el límite de 4 MB' });
    }

    var folder = String(body.folder || 'general').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 18) || 'general';
    var unique = require('crypto').randomUUID().replace(/-/g, '');
    var fileId = (folder + '_' + unique).slice(0, 36);
    var ext = mime === 'image/jpeg' ? 'jpg' : mime.replace('image/', '');
    var filename = fileId + '.' + ext;

    var form = new FormData();
    form.append('fileId', fileId);
    form.append('file', new Blob([buffer], { type: mime }), filename);
    form.append('permissions[]', JSON.stringify(['read("any")']));

    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 15000);

    var response;
    try {
      response = await fetch(endpoint + '/storage/buckets/' + encodeURIComponent(bucket) + '/files', {
        method: 'POST',
        headers: {
          'X-Appwrite-Project': project,
          'X-Appwrite-Key': apiKey
        },
        body: form,
        signal: controller.signal
      });
    } catch (err) {
      if (err && err.name === 'AbortError') {
        return json(res, 504, { error: 'Appwrite tardó demasiado en responder' });
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    var text = await response.text();
    var result = {};
    try { result = text ? JSON.parse(text) : {}; } catch (e) { /* respuesta no JSON */ }

    if (!response.ok) {
      var detail = result && result.message ? String(result.message) : ('HTTP ' + response.status);
      return json(res, response.status >= 400 && response.status < 600 ? response.status : 502,
        { error: 'Appwrite: ' + detail });
    }

    var savedId = result.$id || fileId;
    var viewUrl = endpoint + '/storage/buckets/' + encodeURIComponent(bucket) +
      '/files/' + encodeURIComponent(savedId) + '/view?project=' + encodeURIComponent(project);

    return json(res, 201, {
      fileId: savedId,
      url: viewUrl,
      mime: mime,
      size: buffer.length
    });
  } catch (err) {
    return json(res, 500, { error: String((err && err.message) || err) });
  }
};
