/* ============================================================
   firebase-config.js — Firebase (Auth + Firestore)

   Proyecto: kome-vulkano
   La apiKey web es pública por diseño; la seguridad se controla
   con reglas de Firestore y dominios autorizados en Authentication.
   ============================================================ */
(function (global) {
  'use strict';

  var FirebaseConfig = {
    enabled: true,

    /* --- Firebase Web API --- */
    apiKey: 'AIzaSyB0KGFz7STT4-90HBz0EJCEPyX_ocaiCq0',
    authDomain: 'kome-vulkano.firebaseapp.com',
    projectId: 'kome-vulkano',
    storageBucket: 'kome-vulkano.firebasestorage.app',
    messagingSenderId: '611850225456',
    appId: '1:611850225456:web:41a254ad4dcd0ea730eaf5',
    measurementId: 'G-1BDJ1LYSCT',

    /* --- Preferencias de Authentication --- */
    auth: {
      persistence: 'local',          // 'local' | 'session' | 'none'
      resetPasswordUrl: '',          // opcional: URL propia para restablecer contraseña
      loginUrl: 'login.html',
      registerUrl: 'registro.html'
    },

    /* Colecciones previstas (sin datos de ejemplo) */
    collections: {
      businesses: 'businesses',
      requests: 'business_requests',
      promotions: 'promotions',
      reviews: 'reviews',
      users: 'users',
      config: 'app_config'
    },

    isConfigured: function () {
      return !!(this.enabled && this.apiKey && this.authDomain && this.projectId && this.appId);
    }
  };

  global.FirebaseConfig = FirebaseConfig;
  /* eslint-disable no-console */
  if (FirebaseConfig.isConfigured()) console.info('[Firebase] Configuración detectada.');
})(window);
