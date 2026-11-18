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

    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 8000);

    var response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: parts }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });
    } catch (err) {
      if (err && err.name === 'AbortError') {
        return res.status(504).json({ error: 'Gemini tardó demasiado en responder' });
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    var json = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(json);
    }

    var candidate = (json.candidates || [])[0] || {};
    var partsOut = ((candidate.content || {}).parts || []);
    var text = partsOut.map(function (p) { return p.text || ''; }).join('');

    return res.status(200).json({ text: text });
  } catch (err) {
    return res.status(500).json({ error: String((err && err.message) || err) });
  }
};
