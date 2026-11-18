/* ============================================================
   firestore-service.js — Backend real de Firestore

   Comparte la app de firebase-config.js con AuthService y expone
   operaciones simples para data-service.js. Si Firestore no está
   disponible, las operaciones devuelven valores seguros y el
   servicio de datos usa localStorage como respaldo.
   ============================================================ */
(function (global) {
  'use strict';

  var FC = global.FirebaseConfig;
  var SDK_VERSION = '10.12.2';
  var APP_SDK = 'https://www.gstatic.com/firebasejs/' + SDK_VERSION + '/firebase-app.js';
  var FIRESTORE_SDK = 'https://www.gstatic.com/firebasejs/' + SDK_VERSION + '/firebase-firestore.js';

  var ctx = null;
  var pending = null;
  var lastError = null;

  function firebaseOptions() {
    return {
      apiKey: FC.apiKey,
      authDomain: FC.authDomain,
      projectId: FC.projectId,
      storageBucket: FC.storageBucket,
      messagingSenderId: FC.messagingSenderId,
      appId: FC.appId,
      measurementId: FC.measurementId
    };
  }

  /* Firestore rechaza valores undefined: los quitamos de forma recursiva. */
  function clean(value) {
    if (value === null || value === undefined) return null;
    if (Array.isArray(value)) {
      return value.map(clean).filter(function (v) { return v !== null; });
    }
    if (typeof value === 'object') {
      var out = {};
      Object.keys(value).forEach(function (k) {
        if (value[k] !== undefined) out[k] = clean(value[k]);
      });
      return out;
    }
    return value;
  }

  async function init() {
    if (ctx) return ctx;
    if (pending) return pending;
    if (!FC || !FC.isConfigured()) return null;

    pending = (async function () {
      var appMod = await import(APP_SDK);
      var fsMod = await import(FIRESTORE_SDK);
      var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(firebaseOptions());
      ctx = { m: fsMod, db: fsMod.getFirestore(app) };
      return ctx;
    })().catch(function (err) {
      lastError = err;
      pending = null;
      /* eslint-disable no-console */
      console.error('[Firestore] No se pudo inicializar:', err);
      return null;
    });

    return pending;
  }

  async function ref(collectionName, id) {
    var c = await init();
    if (!c) return null;
    return { c: c, r: c.m.doc(c.db, collectionName, id) };
  }

  async function get(collectionName, id) {
    var target = await ref(collectionName, id);
    if (!target) return null;
    var snap = await target.c.m.getDoc(target.r);
    if (!snap.exists()) return null;
    return Object.assign({ id: snap.id }, snap.data());
  }

  async function all(collectionName) {
    var c = await init();
    if (!c) return [];
    var snap = await c.m.getDocs(c.m.collection(c.db, collectionName));
    return snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
  }

  async function set(collectionName, id, data) {
    var target = await ref(collectionName, id);
    if (!target) return null;
    var payload = clean(data || {});
    await target.c.m.setDoc(target.r, payload);
    return Object.assign({ id: id }, payload);
  }

  async function update(collectionName, id, patch) {
    var target = await ref(collectionName, id);
    if (!target) return null;
    await target.c.m.updateDoc(target.r, clean(patch || {}));
    return get(collectionName, id);
  }

  async function remove(collectionName, id) {
    var target = await ref(collectionName, id);
    if (!target) return false;
    await target.c.m.deleteDoc(target.r);
    return true;
  }

  async function arrayAdd(collectionName, id, field, value) {
    var target = await ref(collectionName, id);
    if (!target) return false;
    await target.c.m.updateDoc(target.r, cleanField(field, target.c.m.fieldValue.arrayUnion(value)));
    return true;
  }

  async function arrayRemove(collectionName, id, field, value) {
    var target = await ref(collectionName, id);
    if (!target) return false;
    await target.c.m.updateDoc(target.r, cleanField(field, target.c.m.fieldValue.arrayRemove(value)));
    return true;
  }

  function cleanField(field, value) {
    var out = {};
    out[field] = value;
    return out;
  }

  async function roleOf(uid) {
    if (!uid) return 'usuario';
    var user = await get('users', uid);
    return (user && user.role) || 'usuario';
  }

  async function ensureUser(session) {
    if (!session || !session.uid) return 'usuario';
    var existing = await get('users', session.uid);
    if (!existing) {
      await set('users', session.uid, {
        name: session.name || 'Usuario',
        email: session.email || '',
        photoURL: session.photoURL || '',
        role: 'usuario',
        favorites: [],
        createdAt: new Date().toISOString()
      });
    }
    return roleOf(session.uid);
  }

  global.FirestoreService = {
    init: init,
    ready: function () { return !!ctx; },
    error: function () { return lastError; },
    get: get,
    all: all,
    set: set,
    update: update,
    remove: remove,
    arrayAdd: arrayAdd,
    arrayRemove: arrayRemove,
    roleOf: roleOf,
    ensureUser: ensureUser,
    clean: clean
  };
})(window);
