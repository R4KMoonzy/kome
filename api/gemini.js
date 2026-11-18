/* api/gemini.js — Proxy seguro de Gemini para Vercel.
   La API KEY se lee de process.env.GEMINI_API_KEY y nunca llega al navegador. */

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en Vercel' });
  }

  try {
    var body = req.body || {};
    var prompt = String(body.prompt || '').trim();
    if (!prompt) {
      return res.status(400).json({ error: 'Falta el prompt' });
    }

    var parts = [{ text: prompt }];
    if (body.data) {
      parts.push({
        inline_data: {
          mime_type: String(body.mime || 'image/jpeg'),
          data: String(body.data)
        }
      });
    }

    var model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
      model + ':generateContent?key=' + encodeURIComponent(process.env.GEMINI_API_KEY);
    var requestBody = { contents: [{ parts: parts }] };

    /* Un menú extenso puede tener cientos de productos: pedimos salida
       JSON amplia. Si el modelo no acepta el valor, reintentamos sin él. */
    function generationConfig(withLimit) {
      return withLimit
        ? { responseMimeType: 'application/json', maxOutputTokens: 16384 }
        : { responseMimeType: 'application/json' };
    }

    async function call(withLimit) {
      var controller = new AbortController();
      /* Menús grandes tardan más: 25s antes de dar por fallado. */
      var timeout = setTimeout(function () { controller.abort(); }, 25000);
      try {
        requestBody.generationConfig = generationConfig(withLimit);
        return await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify(requestBody)
        });
      } finally {
        clearTimeout(timeout);
      }
    }

    var response = await call(true);
    if (response.status === 400) {
      response = await call(false);
    }

    var json = await response.json();
    if (!response.ok) {
      /* Si el proveedor limitó la salida, devolvemos 422 para que el
         cliente active su respaldo en vez de mostrar un JSON cortado. */
      var candidateError = (json.candidates || [])[0] || {};
      if (candidateError.finishReason === 'MAX_TOKENS') {
        return res.status(422).json({ error: 'El menú es demasiado extenso para una sola lectura' });
      }
      return res.status(response.status).json(json);
    }

    var candidate = (json.candidates || [])[0] || {};
    var partsOut = ((candidate.content || {}).parts || []);
    var text = partsOut.map(function (p) { return p.text || ''; }).join('');
    var finishReason = candidate.finishReason || '';

    if (finishReason === 'MAX_TOKENS') {
      return res.status(422).json({ error: 'El menú es demasiado extenso para una sola lectura' });
    }

    return res.status(200).json({ text: text, finishReason: finishReason });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      return res.status(504).json({ error: 'Gemini tardó demasiado en responder' });
    }
    return res.status(500).json({ error: String((err && err.message) || err) });
  }
};
