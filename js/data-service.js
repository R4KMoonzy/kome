/* ============================================================
   data-service.js — Capa centralizada de datos (async/await)
   Backend principal: Firestore. localStorage se usa solo como
   respaldo si Firestore no está disponible. Sin datos de ejemplo.
   ============================================================ */
(function (global) {
  'use strict';

  var PREFIX = 'mgl:';
  var KEYS = {
    config: PREFIX + 'config',
    businesses: PREFIX + 'businesses',
    requests: PREFIX + 'requests',
    promotions: PREFIX + 'promotions',
    favorites: PREFIX + 'favorites',
    session: PREFIX + 'session',
    reviews: PREFIX + 'reviews',
    theme: PREFIX + 'theme',
    cookies: PREFIX + 'cookies',
    admin: PREFIX + 'admin',
    messages: PREFIX + 'messages'
  };

  var DEFAULT_CONFIG = {
    appName: 'MiGuía Local',
    slogan: 'Descubre lo mejor de tu zona y contacta directo con el vendedor',
    logoUrl: '',
    topNotice: '',
    noticeEnabled: false,
    primaryColor: '#FF2E00',
    supportWhatsapp: '',
    contactEmail: '',
    instagram: '',
    facebook: '',
    /* Menú de navegación editable desde administración */
    nav: {
      inicio: { label: 'Inicio', visible: true },
      explorar: { label: 'Explorar', visible: true },
      promociones: { label: 'Promociones', visible: true },
      nosotros: { label: 'Quiénes somos', visible: true },
      faq: { label: 'Preguntas frecuentes', visible: true },
      contacto: { label: 'Contacto', visible: true }
    },
    /* Páginas informativas (todo vacío hasta que admin lo edite) */
    aboutTitle: 'Quiénes somos',
    aboutIntro: '',
    aboutHistory: '',
    aboutMission: '',
    aboutVision: '',
    aboutValues: [],
    aboutTeam: [],
    contactIntro: '',
    contactDeveloperName: '',
    contactDeveloperRole: '',
    contactPhone: '',
    contactAddress: '',
    contactHours: '',
    contactResponseTime: '',
    contactWeb: '',
    faqs: [],
    currency: '₡',
    currencyCode: 'CRC',
    /* Cobertura piloto: se amplía desde admin.html */
    coverageEnabled: true,
    coverageZones: ['Cañas, Guanacaste', 'Cañas'],
    coverageMessage: 'Por ahora solo estamos en Cañas, Guanacaste. Estamos probando el directorio en la zona local y pronto llegaremos a más lugares.',
    coverageCenter: { lat: 10.4286, lng: -85.1007 },
    coverageRadiusKm: 30,
    updatedAt: null
  };

  var CATEGORIES = [
    { id: 'restaurantes', label: 'Restaurantes', color: '#FF5500', icon: 'restaurantes' },
    { id: 'sodas', label: 'Sodas Típicas', color: '#FF7A00', icon: 'sodas' },
    { id: 'rapida', label: 'Comida Rápida', color: '#FFB800', icon: 'rapida' },
    { id: 'pizzerias', label: 'Pizzerías', color: '#FF3D00', icon: 'pizzerias' },
    { id: 'cafeterias', label: 'Cafeterías', color: '#FF2A85', icon: 'cafeterias' },
    { id: 'reposteria', label: 'Repostería', color: '#E91E8C', icon: 'reposteria' },
    { id: 'supermercados', label: 'Supermercados', color: '#00C853', icon: 'supermercados' },
    { id: 'saludable', label: 'Saludable', color: '#2ECC71', icon: 'saludable' },
    { id: 'farmacia', label: 'Farmacia', color: '#0091FF', icon: 'farmacia' },
    { id: 'conveniencia', label: 'Conveniencia', color: '#00B8D4', icon: 'conveniencia' },
    { id: 'licores', label: 'Licores', color: '#7C3AED', icon: 'licores' }
  ];

  var ZONES = [
    'Cañas, Guanacaste',
    'San José', 'Alajuela', 'Cartago', 'Heredia',
    'Guanacaste', 'Puntarenas', 'Limón'
  ];

  var DAYS = [
    { key: 'lunes', label: 'Lunes' }, { key: 'martes', label: 'Martes' },
    { key: 'miercoles', label: 'Miércoles' }, { key: 'jueves', label: 'Jueves' },
    { key: 'viernes', label: 'Viernes' }, { key: 'sabado', label: 'Sábado' },
    { key: 'domingo', label: 'Domingo' }
  ];

  function uid() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function read(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      var parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (e) { return fallback; }
  }

  function write(key, value) {
    try { global.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* quota */ }
    emit();
    return value;
  }

  /* Caché silenciosa: no dispara mgl:data-changed (evita lecturas extra al arrancar). */
  function writeCache(key, value) {
    try { global.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* quota */ }
    return value;
  }

  function emit() {
    var ev;
    try { ev = new Event('mgl:data-changed'); } catch (e) { ev = document.createEvent('Event'); ev.initEvent('mgl:data-changed', true, true); }
    global.dispatchEvent(ev);
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms || 40); }); }

  function fs() {
    var S = global.FirestoreService;
    if (!S) return Promise.resolve(false);
    if (S.ready()) return Promise.resolve(true);
    return S.init().then(function () { return S.ready(); });
  }

  function sortByCreated(list) {
    return list.slice().sort(function (a, b) {
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
  }

  /* ---------------- Config white-label ---------------- */
  async function getConfig() {
    if (await fs()) {
      var doc = await global.FirestoreService.get('app_config', 'public');
      var merged = Object.assign({}, DEFAULT_CONFIG, doc || {});
      /* Se guarda para que el próximo arranque pinte la marca correcta al instante. */
      writeCache(KEYS.config, merged);
      return merged;
    }
    var saved = read(KEYS.config, {});
    return Object.assign({}, DEFAULT_CONFIG, saved || {});
  }
  async function saveConfig(patch) {
    var next = Object.assign(await getConfig(), patch || {}, { updatedAt: new Date().toISOString() });
    if (await fs()) {
      await global.FirestoreService.set('app_config', 'public', next);
      writeCache(KEYS.config, next);
    } else {
      write(KEYS.config, next);
    }
    return next;
  }

  /* ---------------- Mensajes de soporte ---------------- */
  async function getMessages() {
    if (await fs()) return sortByCreated(await global.FirestoreService.all('messages'));
    var list = read(KEYS.messages, []);
    return Array.isArray(list) ? list : [];
  }
  async function addMessage(msg) {
    var item = Object.assign({
      id: uid(), nombre: '', email: '', asunto: '', mensaje: '',
      estado: 'pendiente', createdAt: new Date().toISOString(), updatedAt: null
    }, msg || {});
    if (await fs()) {
      await global.FirestoreService.set('messages', item.id, item);
    } else {
      var list = await getMessages();
      list.unshift(item);
      write(KEYS.messages, list);
    }
    return item;
  }
  async function updateMessage(id, patch) {
    if (await fs()) {
      return global.FirestoreService.update('messages', id,
        Object.assign({}, patch || {}, { updatedAt: new Date().toISOString() }));
    }
    var list = await getMessages();
    var idx = -1;
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { idx = i; break; } }
    if (idx === -1) return null;
    list[idx] = Object.assign({}, list[idx], patch || {}, { updatedAt: new Date().toISOString() });
    write(KEYS.messages, list);
    return list[idx];
  }
  async function deleteMessage(id) {
    if (await fs()) {
      return global.FirestoreService.remove('messages', id);
    }
    var list = (await getMessages()).filter(function (m) { return m.id !== id; });
    write(KEYS.messages, list);
    return true;
  }

  /* ---------------- Negocios ---------------- */
  async function getBusinesses() {
    if (await fs()) return global.FirestoreService.all('businesses');
    var list = read(KEYS.businesses, []);
    return Array.isArray(list) ? list : [];
  }
  async function getBusiness(id) {
    if (!id) return null;
    var list = await getBusinesses();
    return list.find(function (b) { return b.id === id || b.slug === id; }) || null;
  }
  async function saveBusiness(business) {
    var copy = Object.assign({}, business);
    if (!copy.id) copy.id = uid();
    copy.updatedAt = new Date().toISOString();
    if (!copy.createdAt) copy.createdAt = copy.updatedAt;
    if (await fs()) {
      return global.FirestoreService.set('businesses', copy.id, copy);
    }
    var list = await getBusinesses();
    var idx = list.findIndex(function (b) { return b.id === copy.id; });
    if (idx === -1) list.push(copy); else list[idx] = copy;
    write(KEYS.businesses, list);
    return copy;
  }
  async function deleteBusiness(id) {
    if (await fs()) return global.FirestoreService.remove('businesses', id);
    var list = (await getBusinesses()).filter(function (b) { return b.id !== id; });
    write(KEYS.businesses, list);
    return true;
  }
  async function updateBusiness(id, patch) {
    var b = await getBusiness(id);
    if (!b) return null;
    return saveBusiness(Object.assign({}, b, patch));
  }

  function isOpenNow(business, date) {
    if (!business) return false;
    if (business.openToday === false) return false;
    var d = date || new Date();
    var key = DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1].key;
    var h = business.hours && business.hours[key];
    if (!h || h.closed) return false;
    if (!h.open || !h.close) return false;
    var mins = d.getHours() * 60 + d.getMinutes();
    function toMin(s) { var p = String(s).split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
    return mins >= toMin(h.open) && mins <= toMin(h.close);
  }

  function matchesQuery(business, q) {
    if (!q) return true;
    var needle = String(q).toLowerCase().trim();
    if (!needle) return true;
    var hay = [business.name, business.description, business.category, business.zone, business.address]
      .concat((business.menu || []).map(function (m) { return m.nombre + ' ' + m.descripcion + ' ' + m.categoria; }))
      .join(' ').toLowerCase();
    return needle.split(/\s+/).every(function (word) { return hay.indexOf(word) !== -1; });
  }

  async function queryBusinesses(filters) {
    filters = filters || {};
    var list = await getBusinesses();
    list = list.filter(function (b) {
      if (b.estado && b.estado !== 'aprobado') return false;
      if (filters.category && b.category !== filters.category) return false;
      if (filters.zone && b.zone !== filters.zone) return false;
      if (filters.openNow && !isOpenNow(b)) return false;
      if (filters.express && !b.express) return false;
      if (filters.favoriteOnly && (filters.favoriteIds || []).indexOf(b.id) === -1) return false;
      if (!matchesQuery(b, filters.q)) return false;
      return true;
    });
    var sort = filters.sort || 'relevancia';
    if (sort === 'nombre') list.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    if (sort === 'recientes') list.sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
    if (sort === 'rating') list.sort(function (a, b) { return ratingOf(b) - ratingOf(a); });
    return list;
  }

  function ratingOf(b) {
    var c = b.ratingCount || 0;
    return c ? (b.ratingSum || 0) / c : 0;
  }

  async function getFeatured(limit) {
    var list = await queryBusinesses({ sort: 'rating' });
    return list.filter(function (b) { return ratingOf(b) > 0 || b.destacado; }).slice(0, limit || 10);
  }

  /* ---------------- Solicitudes (anti-trolls) ---------------- */
  async function getRequests() {
    if (await fs()) return sortByCreated(await global.FirestoreService.all('business_requests'));
    var list = read(KEYS.requests, []);
    return Array.isArray(list) ? list : [];
  }
  async function saveRequest(request) {
    var copy = Object.assign({}, request);
    if (!copy.id) copy.id = uid();
    copy.estado = copy.estado || 'pendiente';
    copy.createdAt = copy.createdAt || new Date().toISOString();
    if (await fs()) {
      return global.FirestoreService.set('business_requests', copy.id, copy);
    }
    var list = await getRequests();
    var idx = list.findIndex(function (r) { return r.id === copy.id; });
    if (idx === -1) list.push(copy); else list[idx] = copy;
    write(KEYS.requests, list);
    return copy;
  }
  async function deleteRequest(id) {
    if (await fs()) return global.FirestoreService.remove('business_requests', id);
    write(KEYS.requests, (await getRequests()).filter(function (r) { return r.id !== id; }));
    return true;
  }
  async function approveRequest(id) {
    var requests = await getRequests();
    var req = requests.find(function (r) { return r.id === id; });
    if (!req) return null;
    var business = await saveBusiness({
      name: req.name, category: req.category, zone: req.zone, address: req.address,
      phone: req.phone, whatsapp: req.whatsapp, instagram: req.instagram,
      facebook: req.facebook, mapsUrl: req.mapsUrl, wazeUrl: req.wazeUrl,
      logo: req.logo, cover: req.cover, description: req.description,
      hours: req.hours || {}, openToday: true, express: !!req.express,
      ownerEmail: req.email, ownerId: req.ownerId || null,
      estado: 'aprobado', menu: req.menu || [], destacado: false,
      ratingCount: 0, ratingSum: 0
    });
    req.estado = 'aprobado';
    req.businessId = business.id;
    await saveRequest(req);
    return business;
  }

  /* ---------------- Promociones ---------------- */
  async function getPromotions() {
    if (await fs()) return sortByCreated(await global.FirestoreService.all('promotions'));
    var list = read(KEYS.promotions, []);
    return Array.isArray(list) ? list : [];
  }
  async function getPromotion(id) {
    return (await getPromotions()).find(function (p) { return p.id === id; }) || null;
  }
  async function savePromotion(promo) {
    var copy = Object.assign({}, promo);
    if (!copy.id) copy.id = uid();
    copy.createdAt = copy.createdAt || new Date().toISOString();
    copy.activa = copy.activa !== false;
    if (await fs()) {
      return global.FirestoreService.set('promotions', copy.id, copy);
    }
    var list = await getPromotions();
    var idx = list.findIndex(function (p) { return p.id === copy.id; });
    if (idx === -1) list.push(copy); else list[idx] = copy;
    write(KEYS.promotions, list);
    return copy;
  }
  async function deletePromotion(id) {
    if (await fs()) return global.FirestoreService.remove('promotions', id);
    write(KEYS.promotions, (await getPromotions()).filter(function (p) { return p.id !== id; }));
    return true;
  }
  async function getActivePromotions(businessId) {
    var list = await getPromotions();
    var now = Date.now();
    return list.filter(function (p) {
      if (p.activa === false) return false;
      if (businessId && p.businessId !== businessId) return false;
      if (p.vence && new Date(p.vence).getTime() < now) return false;
      return true;
    });
  }

  /* ---------------- Favoritos (por usuario autenticado) ---------------- */
  function favoritesKey() {
    var s = read(KEYS.session, null);
    return s && s.uid ? KEYS.favorites + ':' + s.uid : null;
  }
  async function getFavorites() {
    var session = await getSession();
    if (!session || !session.uid) return [];
    if (await fs()) {
      var user = await global.FirestoreService.get('users', session.uid);
      return (user && Array.isArray(user.favorites)) ? user.favorites : [];
    }
    var key = favoritesKey();
    if (!key) return [];
    var list = read(key, null);
    if (!Array.isArray(list)) {
      /* Migración única desde el antiguo listado global */
      var legacy = read(KEYS.favorites, []);
      list = Array.isArray(legacy) ? legacy.slice() : [];
      write(key, list);
    }
    return list;
  }
  async function isFavorite(id) { return (await getFavorites()).indexOf(id) !== -1; }
  async function toggleFavorite(id) {
    var session = await getSession();
    if (!session || !session.uid) return false;
    if (await fs()) {
      var list = await getFavorites();
      var add = list.indexOf(id) === -1;
      var S = global.FirestoreService;
      if (add) await S.arrayAdd('users', session.uid, 'favorites', id);
      else await S.arrayRemove('users', session.uid, 'favorites', id);
      emit();
      return add;
    }
    var key = favoritesKey();
    if (!key) return false;
    var local = await getFavorites();
    var idx = local.indexOf(id);
    if (idx === -1) local.push(id); else local.splice(idx, 1);
    write(key, local);
    return idx === -1;
  }

  /* ---------------- Sesión / cuenta ---------------- */
  async function getSession() { return read(KEYS.session, null); }
  async function login(profile) {
    var session = Object.assign({
      uid: uid(), name: 'Invitado', email: '', zone: '', photo: '',
      photoURL: '', emailVerified: false, provider: 'local', role: 'usuario'
    }, profile || {});
    write(KEYS.session, session);
    return session;
  }
  async function updateProfile(patch) {
    var s = await getSession();
    if (!s) return null;
    return login(Object.assign({}, s, patch));
  }
  async function logout() {
    try { global.localStorage.removeItem(KEYS.session); } catch (e) {}
    try { global.localStorage.removeItem(KEYS.admin); } catch (e) {}
    emit();
    return true;
  }

  /* ---------------- Reseñas ---------------- */
  async function getReviews(businessId) {
    var list;
    if (await fs()) list = await global.FirestoreService.all('reviews');
    else {
      var stored = read(KEYS.reviews, []);
      list = Array.isArray(stored) ? stored : [];
    }
    return list.filter(function (r) { return !businessId || r.businessId === businessId; });
  }
  async function addReview(review) {
    var session = (global.AuthService && global.AuthService.current()) || await getSession();
    var copy = Object.assign({}, review, {
      id: uid(),
      userId: (session && session.uid) || null,
      createdAt: new Date().toISOString()
    });
    if (await fs()) {
      await global.FirestoreService.set('reviews', copy.id, copy);
    } else {
      var list = read(KEYS.reviews, []);
      if (!Array.isArray(list)) list = [];
      list.push(copy);
      write(KEYS.reviews, list);
    }
    var b = await getBusiness(review.businessId);
    if (b) {
      await saveBusiness(Object.assign({}, b, {
        ratingSum: (b.ratingSum || 0) + Number(review.rating || 0),
        ratingCount: (b.ratingCount || 0) + 1
      }));
    }
    return copy;
  }

  /* ---------------- Admin / stats ---------------- */
  async function getStats() {
    return {
      businesses: (await getBusinesses()).length,
      requests: (await getRequests()).filter(function (r) { return r.estado === 'pendiente'; }).length,
      promotions: (await getPromotions()).length,
      reviews: (await getReviews()).length,
      favorites: (await getFavorites()).length
    };
  }
  async function isAdminUnlocked() {
    if (await fs()) {
      var session = await getSession();
      if (!session || !session.uid) return false;
      return (await global.FirestoreService.roleOf(session.uid)) === 'admin';
    }
    /* Sin Firestore no hay acceso administrativo: el rol vive en Firestore. */
    return false;
  }
  async function setAdminUnlocked(value) {
    /* El rol se administra en Firestore (users/{uid}.role), no en el navegador. */
    return isAdminUnlocked();
  }

  /* ---------------- Utilidades públicas ---------------- */
  function formatMoney(value, config) {
    var n = Number(value || 0);
    var symbol = (config && config.currency) || '₡';
    return symbol + n.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  function categoryById(id) {
    return CATEGORIES.find(function (c) { return c.id === id; }) || CATEGORIES[0];
  }
  function greeting(date) {
    var h = (date || new Date()).getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }
  function escapeHtml(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------------- Cobertura piloto ---------------- */
  function normalizeText(s) {
    return String(s === null || s === undefined ? '' : s)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function coverageLabels(cfg) {
    cfg = cfg || DEFAULT_CONFIG;
    var zones = cfg.coverageZones;
    if (!Array.isArray(zones) || !zones.length) zones = DEFAULT_CONFIG.coverageZones;
    return zones;
  }
  function isCoveredZone(zone, cfg) {
    cfg = cfg || DEFAULT_CONFIG;
    if (!cfg.coverageEnabled) return true;
    var n = normalizeText(zone);
    if (!n) return true;
    var nTokens = n.split(' ');
    return coverageLabels(cfg).some(function (label) {
      var tokens = normalizeText(label).split(' ').filter(Boolean);
      return tokens.length > 0 && tokens.every(function (t) { return nTokens.indexOf(t) !== -1; });
    });
  }
  function isCoveredCoordinates(lat, lng, cfg) {
    cfg = cfg || DEFAULT_CONFIG;
    if (!cfg.coverageEnabled) return true;
    var c = cfg.coverageCenter || DEFAULT_CONFIG.coverageCenter;
    if (!c || !isFinite(c.lat) || !isFinite(c.lng)) return true;
    var toRad = Math.PI / 180;
    var dLat = (lat - c.lat) * toRad;
    var dLng = (lng - c.lng) * toRad;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(c.lat * toRad) * Math.cos(lat * toRad) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return km <= (Number(cfg.coverageRadiusKm) || DEFAULT_CONFIG.coverageRadiusKm);
  }
  function compressImage(file, maxSize, quality) {
    maxSize = maxSize || 1200;
    quality = quality || .78;
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('Archivo no es imagen'));
      var mime = (file.type === 'image/png' || file.type === 'image/webp') ? file.type : 'image/jpeg';
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          var canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          /* PNG/WebP conservan el canal alfa; JPEG no. */
          resolve(canvas.toDataURL(mime, quality));
        };
        img.onerror = function () { reject(new Error('No se pudo procesar la imagen')); };
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  global.DataService = {
    KEYS: KEYS, DEFAULT_CONFIG: DEFAULT_CONFIG, CATEGORIES: CATEGORIES, ZONES: ZONES, DAYS: DAYS,
    uid: uid, wait: wait, emit: emit,
    getConfig: getConfig, saveConfig: saveConfig,
    getBusinesses: getBusinesses, getBusiness: getBusiness, saveBusiness: saveBusiness,
    updateBusiness: updateBusiness, deleteBusiness: deleteBusiness, queryBusinesses: queryBusinesses,
    getFeatured: getFeatured, isOpenNow: isOpenNow, ratingOf: ratingOf,
    getRequests: getRequests, saveRequest: saveRequest, deleteRequest: deleteRequest, approveRequest: approveRequest,
    getPromotions: getPromotions, getPromotion: getPromotion, savePromotion: savePromotion,
    deletePromotion: deletePromotion, getActivePromotions: getActivePromotions,
    getFavorites: getFavorites, isFavorite: isFavorite, toggleFavorite: toggleFavorite,
    getSession: getSession, login: login, updateProfile: updateProfile, logout: logout,
    getReviews: getReviews, addReview: addReview,
    getMessages: getMessages, addMessage: addMessage, updateMessage: updateMessage, deleteMessage: deleteMessage,
    getStats: getStats, isAdminUnlocked: isAdminUnlocked, setAdminUnlocked: setAdminUnlocked,
    formatMoney: formatMoney, categoryById: categoryById, greeting: greeting,
    escapeHtml: escapeHtml, compressImage: compressImage,
    isCoveredZone: isCoveredZone, isCoveredCoordinates: isCoveredCoordinates,
    coverageLabels: coverageLabels, coverageMessage: function (cfg) {
      return (cfg && cfg.coverageMessage) || DEFAULT_CONFIG.coverageMessage;
    }
  };
})(window);
