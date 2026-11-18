/* ============================================================
   appwrite-config.js — Appwrite (Storage de imágenes/documentos)

   Proyecto: kome-vulkano-media
   Endpoint: https://nyc.cloud.appwrite.io/v1
   Project ID: 6afcc63100087dc9aa21
   Bucket ID: 6afcc6410028c15b47fa

   Database ID: 6afcca070002c5a2e79e
   La apiKey se deja vacía: en producción debe vivir en un proxy/Function.
   ============================================================ */
(function (global) {
  'use strict';

  var AppwriteConfig = {
    enabled: true,
    endpoint: 'https://nyc.cloud.appwrite.io/v1',
    projectId: '6afcc63100087dc9aa21',
    apiKey: '',
    databaseId: '6afcca070002c5a2e79e',
    storageBucketId: '6afcc6410028c15b47fa',
    collections: {
      businesses: 'businesses',
      requests: 'business_requests',
      promotions: 'promotions',
      reviews: 'reviews',
      users: 'users',
      config: 'app_config',
      documents: '6afccb1a00249eccf649'
    },

    isConfigured: function () {
      return !!(this.enabled && this.projectId && this.databaseId);
    }
  };

  global.AppwriteConfig = AppwriteConfig;
})(window);
