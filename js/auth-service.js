/* ============================================================
   auth-service.js — Capa de autenticación

   • Con FirebaseConfig.isConfigured() === true usa Firebase Auth real
     (correo/contraseña, recuperación, persistencia y sesión).
   • Sin credenciales usa un modo DEMO local SOLO para revisar los flujos.
     Nunca guardes contraseñas reales en el modo demo.
   ============================================================ */
(function (global) {
  'use strict';

  var FC = global.FirebaseConfig;
  var D = global.DataService;
  var SDK_VERSION = '10.12.2';
  var APP_SDK = 'https://www.gstatic.com/firebasejs/' + SDK_VERSION + '/firebase-app.js';
  var AUTH_SDK = 'https://www.gstatic.com/firebasejs/' + SDK_VERSION + '/firebase-auth.js';
  var DEMO_USERS_KEY = 'mgl:auth_demo_users';

  var fb = null;
  var mode = 'demo';           // 'firebase' | 'demo' | 'error'
  var current = null;
  var lastError = null;

  /* ---------------- Helpers ---------------- */
  function readDemoUsers() {
    try {
      var raw = global.localStorage.getItem(DEMO_USERS_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }
  function writeDemoUsers(list) { global.localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(list)); }

  async function hashDemo(password, salt) {
    var seed = salt + '::' + password;
    if (!global.crypto || !global.crypto.subtle || !global.TextEncoder) return seed;
    try {
      var buf = await global.crypto.subtle.digest('SHA-256', new global.TextEncoder().encode(seed));
      var bytes = new Uint8Array(buf);
      return Array.prototype.map.call(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    } catch (e) { return seed; }
  }
  function randomId(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }
  function cleanEmail(value) { return String(value || '').trim().toLowerCase(); }

  function mapUser(user) {
    if (!user) return null;
    var email = user.email || '';
    return {
      uid: user.uid,
      name: user.displayName || email.split('@')[0] || 'Usuario',
      email: email,
      photo: user.photoURL || '',
      photoURL: user.photoURL || '',
      emailVerified: !!user.emailVerified,
      provider: 'firebase',
      role: 'usuario'
    };
  }

  function friendlyError(err) {
    var code = (err && (err.code || err.message)) || '';
    if (code.indexOf('invalid-email') !== -1) return 'El correo electrónico no es válido.';
    if (code.indexOf('user-disabled') !== -1) return 'Esta cuenta está desactivada. Contacta al administrador.';
    if (code.indexOf('email-already-in-use') !== -1) return 'Ya existe una cuenta con este correo. Inicia sesión.';
    if (code.indexOf('weak-password') !== -1) return 'La contraseña debe tener al menos 6 caracteres.';
    if (code.indexOf('too-many-requests') !== -1) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
    if (code.indexOf('network-request-failed') !== -1) return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
    if (code.indexOf('wrong-password') !== -1 || code.indexOf('user-not-found') !== -1 ||
        code.indexOf('invalid-credential') !== -1 || code.indexOf('incorrectos') !== -1) {
      return 'Correo o contraseña incorrectos.';
    }
    return (err && err.message) || 'No pudimos completar la acción. Inténtalo de nuevo.';
  }

  function clearSession() {
    try { global.localStorage.removeItem(D.KEYS.session); } catch (e) {}
    current = null;
  }

  function emit(session) {
    current = session || null;
    try {
      global.dispatchEvent(new CustomEvent('mgl:auth-changed', { detail: { session: current, mode: mode } }));
    } catch (e) {}
    if (global.UI && global.UI.setSession) global.UI.setSession(current);
  }

  async function applyUser(user) {
    var session = mapUser(user);
    if (session) {
      D.login(session);
      if (global.FirestoreService) {
        try {
          var role = await global.FirestoreService.ensureUser(session);
          session.role = role || 'usuario';
          D.login(session);
        } catch (e) { /* el perfil se creará al siguiente acceso */ }
      }
    } else clearSession();
    emit(session);
    return session;
  }

  /* ---------------- Firebase real ---------------- */
  async function ensureFirebase() {
    if (!FC || !FC.isConfigured()) return null;
    if (fb) return fb;
    var appMod = await import(APP_SDK);
    var authMod = await import(AUTH_SDK);
    var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp({
      apiKey: FC.apiKey, authDomain: FC.authDomain, projectId: FC.projectId,
      storageBucket: FC.storageBucket, messagingSenderId: FC.messagingSenderId,
      appId: FC.appId, measurementId: FC.measurementId
    });
    var auth = authMod.getAuth(app);
    var pref = (FC.auth && FC.auth.persistence) || 'local';
    try {
      if (pref === 'session') await authMod.setPersistence(auth, authMod.browserSessionPersistence);
      else if (pref === 'none') await authMod.setPersistence(auth, authMod.inMemoryPersistence);
      else await authMod.setPersistence(auth, authMod.browserLocalPersistence);
    } catch (e) { /* persistencia no disponible: Firebase usa la default */ }
    fb = { app: app, auth: auth, m: authMod };
    return fb;
  }

  /* ---------------- Modo demo (credenciales vacías) ---------------- */
  async function demoSignUp(name, email, password) {
    var users = readDemoUsers();
    if (users.some(function (u) { return u.email === email; })) {
      throw new Error('Ya existe una cuenta demo con este correo. Inicia sesión.');
    }
    var salt = Math.random().toString(36).slice(2);
    var user = {
      uid: randomId('demo'), name: name, email: email,
      salt: salt, hash: await hashDemo(password, salt), createdAt: new Date().toISOString()
    };
    users.push(user); writeDemoUsers(users);
    var session = {
      uid: user.uid, name: user.name, email: user.email, photo: '',
      provider: 'demo', role: 'usuario'
    };
    D.login(session); emit(session);
    return session;
  }

  async function demoSignIn(email, password) {
    var user = readDemoUsers().find(function (u) { return u.email === email; });
    if (!user || (await hashDemo(password, user.salt)) !== user.hash) {
      throw new Error('Correo o contraseña incorrectos.');
    }
    var session = {
      uid: user.uid, name: user.name, email: user.email, photo: '',
      provider: 'demo', role: 'usuario'
    };
    D.login(session); emit(session);
    return session;
  }

  /* ---------------- API pública ---------------- */
  async function init() {
    lastError = null;
    if (!FC || !FC.isConfigured()) {
      mode = 'demo';
      current = await D.getSession();
      if (global.UI && global.UI.setSession) global.UI.setSession(current);
      return { mode: mode, session: current };
    }
    try {
      var ctx = await ensureFirebase();
      mode = 'firebase';
      /* Esperamos al primer callback para no juzgar el gating con una sesión
         local obsoleta mientras Firebase lee su persistencia. */
      var resolveFirst;
      var first = new Promise(function (resolve) { resolveFirst = resolve; });
      var gotFirst = false;
      ctx.m.onAuthStateChanged(ctx.auth, async function (user) {
        var s = await applyUser(user);
        if (!gotFirst) { gotFirst = true; resolveFirst(s); }
      });
      var session = await first;
      return { mode: mode, session: session };
    } catch (e) {
      mode = 'error'; lastError = e;
      /* eslint-disable no-console */
      console.error('[Auth] No se pudo inicializar Firebase:', e);
      return { mode: mode, error: friendlyError(e) };
    }
  }

  async function signIn(email, password) {
    email = cleanEmail(email);
    if (!email || !password) throw new Error('Ingresa tu correo y contraseña.');
    if (mode === 'demo') return demoSignIn(email, password);
    if (mode !== 'firebase') throw new Error(lastError ? friendlyError(lastError) : 'Firebase no está disponible.');
    try {
      var ctx = await ensureFirebase();
      var cred = await ctx.m.signInWithEmailAndPassword(ctx.auth, email, password);
      return await applyUser(cred.user);
    } catch (e) { throw new Error(friendlyError(e)); }
  }

  async function signUp(name, email, password) {
    name = String(name || '').trim();
    email = cleanEmail(email);
    if (name.length < 2) throw new Error('Escribe tu nombre (mínimo 2 caracteres).');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Ingresa un correo electrónico válido.');
    if (String(password || '').length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
    if (mode === 'demo') return demoSignUp(name, email, password);
    if (mode !== 'firebase') throw new Error(lastError ? friendlyError(lastError) : 'Firebase no está disponible.');
    try {
      var ctx = await ensureFirebase();
      var cred = await ctx.m.createUserWithEmailAndPassword(ctx.auth, email, password);
      await ctx.m.updateProfile(cred.user, { displayName: name });
      return await applyUser(ctx.auth.currentUser || cred.user);
    } catch (e) { throw new Error(friendlyError(e)); }
  }

  async function sendReset(email) {
    email = cleanEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Ingresa un correo electrónico válido.');
    if (mode === 'demo') {
      return { sent: true, demo: true };
    }
    if (mode !== 'firebase') throw new Error(lastError ? friendlyError(lastError) : 'Firebase no está disponible.');
    try {
      var ctx = await ensureFirebase();
      var settings = (FC.auth && FC.auth.resetPasswordUrl)
        ? { url: FC.auth.resetPasswordUrl, handleCodeInApp: false }
        : undefined;
      await ctx.m.sendPasswordResetEmail(ctx.auth, email, settings);
      return { sent: true };
    } catch (e) { throw new Error(friendlyError(e)); }
  }

  async function updateProfile(patch) {
    patch = patch || {};
    if (mode === 'firebase') {
      var ctx = await ensureFirebase();
      var user = ctx.auth.currentUser;
      if (!user) return null;
      var data = {};
      if (patch.name !== undefined) data.displayName = patch.name;
      if (patch.photo !== undefined || patch.photoURL !== undefined) data.photoURL = patch.photo !== undefined ? patch.photo : patch.photoURL;
      if (Object.keys(data).length) await ctx.m.updateProfile(user, data);
      return applyUser(ctx.auth.currentUser);
    }
    return D.updateProfile(patch);
  }

  async function signOut() {
    if (mode === 'firebase') {
      var ctx = await ensureFirebase();
      await ctx.m.signOut(ctx.auth);
    } else {
      clearSession(); emit(null);
    }
    return true;
  }

  function loginUrl(next) {
    var base = (FC && FC.auth && FC.auth.loginUrl) || 'login.html';
    var target = next || (global.location.pathname.split('/').pop() + global.location.search);
    return base + '?next=' + encodeURIComponent(target);
  }
  function registerUrl(next) {
    var base = (FC && FC.auth && FC.auth.registerUrl) || 'registro.html';
    return next ? base + '?next=' + encodeURIComponent(next) : base;
  }
  function requireAuth(next) {
    if (current) return true;
    global.location.replace(loginUrl(next));
    return false;
  }

  global.AuthService = {
    init: init, signIn: signIn, signUp: signUp, sendReset: sendReset,
    signOut: signOut, updateProfile: updateProfile, friendlyError: friendlyError,
    current: function () { return current; },
    mode: function () { return mode; },
    isDemo: function () { return mode === 'demo'; },
    loginUrl: loginUrl, registerUrl: registerUrl, requireAuth: requireAuth
  };
})(window);
