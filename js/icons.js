/* ============================================================
   icons.js — Librería de iconos y logotipos SVG minimalistas
   Trazo limpio 1.75px, geometría moderna y simétrica. SIN EMOJIS.
   Uso: AppIcons.svg('whatsapp', {size:20})
        AppIcons.category('restaurantes', '#FF5500', {size:56})
   ============================================================ */
(function (global) {
  'use strict';

  var PATHS = {
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.2 4.2"/>',
    location: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.6"/>',
    pin: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><path d="M12 8v.01"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 19a6 6 0 0 1 12 0"/><path d="M16 6.3a3 3 0 0 1 0 5.4M17 14.5a5.6 5.6 0 0 1 4 4.5"/>',
    heart: '<path d="M20.6 8.4c0 4.4-8.6 9.7-8.6 9.7S3.4 12.8 3.4 8.4a4.6 4.6 0 0 1 8.6-2.2 4.6 4.6 0 0 1 8.6 2.2Z"/>',
    whatsapp: '<path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.4-4.3A8.5 8.5 0 1 1 20.5 11.7Z"/><path d="M9 9.4c0 3.1 2.5 5.6 5.6 5.6l1-1.7-2-1-1 .9a6 6 0 0 1-2-2l.9-1-1-2-1.5.2Z"/>',
    phone: '<path d="M6.3 3.5h3l1.5 4-2 1.4a12 12 0 0 0 5.3 5.3l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.3 5.7a2 2 0 0 1 2-2.2Z"/>',
    maps: '<path d="m3 6 6-2.5L15 6l6-2.5v14L15 20l-6-2.5L3 20V6Z"/><path d="M9 3.5v14M15 6v14"/>',
    waze: '<path d="M12 3c4.4 0 8 3.6 8 8s-8 10-8 10S4 15.4 4 11s3.6-8 8-8Z"/><path d="M8.5 13.5c1-2.5 2-3.5 3.5-3.5s2.5 1 3.5 3.5"/><path d="M10 9.5h.01M14 9.5h.01"/>',
    instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.6"/><path d="M17 7h.01"/>',
    facebook: '<path d="M14 8h3V4.5h-3a4 4 0 0 0-4 4V11H7v3.5h3V21h3.5v-6.5H17l.5-3.5h-4V8.8c0-.5.4-.8 1-.8Z"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    chevronRight: '<path d="m9 6 6 6-6 6"/>',
    chevronLeft: '<path d="m15 6-6 6 6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    edit: '<path d="M4 20h4l10-10-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5"/>',
    upload: '<path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    camera: '<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.4"/>',
    sparkles: '<path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15ZM5 14l.6 1.6L7 16l-1.4.4L5 18l-.6-1.6L3 16l1.4-.4L5 14Z"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    checkCircle: '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.2 2.4 2.4 4.7-5"/>',
    alert: '<path d="M12 4 2.8 20h18.4L12 4Z"/><path d="M12 10v4.5M12 17.5h.01"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
    tag: '<path d="M3.5 11.5V4a.5.5 0 0 1 .5-.5h7.5L20.5 12.5 12 21l-8.5-8.5Z"/><path d="M7.5 7.5h.01"/>',
    percent: '<path d="M6 18 18 6"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>',
    flame: '<path d="M12 21c4 0 6.5-2.7 6.5-6.2 0-4.3-4.2-5.8-3.2-11.8-3.2 1.3-5.2 4-5.2 6.7 0 1.3.5 2.1.5 2.1S8.6 10 8 8c-1.5 1.8-2.5 4-2.5 6.8C5.5 18.3 8 21 12 21Z"/>',
    gift: '<rect x="3.5" y="9" width="17" height="11" rx="2"/><path d="M3.5 13h17M12 9v11M12 9S9.5 4 7 5.2 8.5 9 12 9ZM12 9s2.5-5 5-3.8S15.5 9 12 9Z"/>',
    compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15 9-2 4-4 2 2-4 4-2Z"/>',
    shield: '<path d="M12 3 5 6v5.5c0 4.3 3 7.4 7 9.5 4-2.1 7-5.2 7-9.5V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
    key: '<circle cx="8" cy="16" r="4"/><path d="m11 13 8-8M17 7l2 2M15 9l2 2"/>',
    store: '<path d="M4 10v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9M3 4h18l1 5a3 3 0 0 1-5.5 1.7A3 3 0 0 1 12 10a3 3 0 0 1-4.5.7A3 3 0 0 1 2 9l1-5Z"/><path d="M9 20v-6h6v6"/>',
    logout: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M15 8l4 4-4 4M19 12H9"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    external: '<path d="M13 4h7v7M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    share: '<circle cx="6" cy="12" r="2.5"/><circle cx="17" cy="6" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="m8.2 10.8 6.6-3.6M8.2 13.2l6.6 3.6"/>',
    arrowLeft: '<path d="M19 12H5m0 0 6-6m-6 6 6 6"/>',
    arrowRight: '<path d="M5 12h14m0 0-6-6m6 6-6 6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m4.5 17 5-5 3.5 3.5 2.5-2.5 4 4"/>',
    file: '<path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h4M8 13h8M8 17h6"/>',
    download: '<path d="M12 4v12m0 0 4.5-4.5M12 16l-4.5-4.5"/><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"/>',
    bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6ZM10 19a2 2 0 0 0 4 0"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21H9.9v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.1 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 13.9H3v-3.8h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.1 7 7 4.1l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V3h4.1v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.9 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v3.8h-.1a1.7 1.7 0 0 0-1.7 1.2Z"/>',
    eye: '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.8"/>',
    refresh: '<path d="M20 7v5h-5"/><path d="M19 12a7 7 0 1 0-2 5"/>',
    scan: '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M4 12h16"/>',
    bolt: '<path d="M13.5 2.5 5 13h6l-.5 8.5L19 11h-6l.5-8.5Z"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.4 3.5 5.3 3.5 8.5S14.3 18.1 12 20.5C9.7 18.1 8.5 15.2 8.5 12S9.7 5.9 12 3.5Z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    menuBook: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22V5.5ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5a2.5 2.5 0 0 1 2.5 2.5V5.5Z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    box: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
    percentBadge: '<circle cx="12" cy="12" r="8.5"/><path d="m9 15 6-6M9.5 9.5h.01M14.5 14.5h.01"/>',
    crown: '<path d="M3 7.5 7 11l5-6 5 6 4-3.5-1.5 11h-15L3 7.5Z"/><path d="M6 20h12"/>',
    truck: '<path d="M3 6h11v10H3V6ZM14 9h4l3 3v4h-7V9Z"/><circle cx="7" cy="18" r="2"/><circle cx="17.5" cy="18" r="2"/>',
    chat: '<path d="M20.5 11.5a8 8 0 0 1-11.7 7.1L3.5 20.5l1.9-5.1A8 8 0 1 1 20.5 11.5Z"/><path d="M8.5 11.5h7M8.5 14.5h4"/>',

    /* ---- Iconos de rubro (geometría custom) ---- */
    cat_restaurantes: '<path d="M7 3v8a2.5 2.5 0 0 0 5 0V3M9.5 3v18M17 3c-1.5 2-2 4.5-2 7.5h4c0-3-.5-5.5-2-7.5ZM17 10.5V21"/>',
    cat_sodas: '<path d="M7 4h10l-1.2 4.2A4 4 0 0 1 12 11a4 4 0 0 1-3.8-2.8L7 4ZM12 11v9M8.5 20h7"/>',
    cat_rapida: '<path d="M4 12.5c0-3.6 3.6-6.5 8-6.5s8 2.9 8 6.5H4ZM5.5 15.5h13M7 18.5h10"/>',
    cat_pizzerias: '<path d="M12 3 21 19H3L12 3Z"/><circle cx="12" cy="13.5" r="1.3"/><circle cx="9" cy="16.5" r="1"/><circle cx="15" cy="16.5" r="1"/>',
    cat_cafeterias: '<path d="M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V8ZM17 9h1.5a2.5 2.5 0 0 1 0 5H17M4 21h14"/>',
    cat_reposteria: '<path d="M4 14a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v1H4v-1ZM6 15v5h12v-5M12 10V6M12 6c-2 0-3-1-3-2.5C11 3.5 12 4.5 12 6ZM12 6c2 0 3-1 3-2.5C13 3.5 12 4.5 12 6Z"/>',
    cat_supermercados: '<path d="M4 9h16l-1 11H5L4 9ZM8 9V6a4 4 0 0 1 8 0v3M9 13v3M15 13v3"/>',
    cat_saludable: '<path d="M12 21c0-7 3-12 9-14 0 7-3 12-9 14ZM12 21C12 14 9 9 3 7c0 7 3 12 9 14ZM12 21v-6"/>',
    cat_farmacia: '<path d="M9 3h6a2 2 0 0 1 2 2v1H7V5a2 2 0 0 1 2-2ZM7 6h10l1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L7 6ZM12 10v7M8.5 13.5h7"/>',
    cat_conveniencia: '<path d="M5 8h14v12H5V8ZM4 8l1-4h14l1 4M9 12h6M9 16h4"/>',
    cat_licores: '<path d="M9 3h6v4l2 4v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-8l2-4V3ZM7 12h10M12 6v.01"/>',
    cat_mas: '<circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>'
  };

  var FILLED = { heartFilled: PATHS.heart, starFilled: PATHS.star };

  function svg(name, opts) {
    opts = opts || {};
    var body = PATHS[name] || FILLED[name] || PATHS.info;
    var size = opts.size || 22;
    var fill = opts.fill !== undefined ? opts.fill : (FILLED[name] ? 'currentColor' : 'none');
    var stroke = FILLED[name] ? 'none' : (opts.stroke || 'currentColor');
    var width = opts.width || size;
    var height = opts.height || size;
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height +
      '" viewBox="0 0 24 24" fill="' + fill + '" stroke="' + stroke +
      '" stroke-width="' + (opts.strokeWidth || 1.8) + '" stroke-linecap="round" stroke-linejoin="round"' +
      (opts.className ? ' class="' + opts.className + '"' : '') +
      (opts.style ? ' style="' + opts.style + '"' : '') + ' aria-hidden="true">' + body + '</svg>';
  }

  /** Squircle de categoría con tinte vívido */
  function category(key, color, opts) {
    opts = opts || {};
    var size = opts.size || 58;
    var iconName = 'cat_' + key;
    if (!PATHS[iconName]) iconName = 'cat_mas';
    var innerSize = Math.round(size * .52);
    return '<span class="cat-squircle" style="--sq:' + (color || 'var(--brand-blue)') +
      ';width:' + size + 'px;height:' + size + 'px;border-radius:' + Math.round(size * .38) + 'px">' +
      svg(iconName, { size: innerSize, strokeWidth: 1.75 }) + '</span>';
  }

  /** Ilustraciones SVG para estados vacíos (sin datos inventados) */
  function emptyArt(kind) {
    var arts = {
      business: '<svg viewBox="0 0 132 112" width="100%" height="100%" fill="none"><circle cx="66" cy="56" r="44" fill="rgba(0,102,255,.08)"/><rect x="30" y="42" width="72" height="52" rx="10" fill="var(--surface)" stroke="var(--border-strong)" stroke-width="2"/><path d="M26 42 36 24h60l10 18" stroke="var(--brand-orange)" stroke-width="2.5" stroke-linecap="round"/><path d="M50 94V66h32v28" stroke="var(--border-strong)" stroke-width="2"/><rect x="44" y="50" width="10" height="10" rx="3" fill="rgba(255,107,0,.3)"/><rect x="78" y="50" width="10" height="10" rx="3" fill="rgba(255,107,0,.3)"/><circle cx="100" cy="26" r="8" fill="var(--brand-coral)" opacity=".85"/><path d="m100 22 1.2 2.6 2.8.4-2 2 .5 2.8-2.5-1.4-2.5 1.4.5-2.8-2-2 2.8-.4L100 22Z" fill="#fff"/></svg>',
      search: '<svg viewBox="0 0 132 112" width="100%" height="100%" fill="none"><circle cx="66" cy="56" r="44" fill="rgba(124,58,237,.08)"/><circle cx="58" cy="51" r="22" stroke="var(--brand-blue)" stroke-width="3"/><path d="m74 67 15 15" stroke="var(--brand-blue)" stroke-width="4" stroke-linecap="round"/><path d="M49 51h18M58 42v18" stroke="var(--brand-magenta)" stroke-width="2" stroke-linecap="round" opacity=".5"/></svg>',
      heart: '<svg viewBox="0 0 132 112" width="100%" height="100%" fill="none"><circle cx="66" cy="56" r="44" fill="rgba(255,42,133,.08)"/><path d="M84 38c0 13-18 25-18 25S48 51 48 38a9 9 0 0 1 18-4 9 9 0 0 1 18 4Z" stroke="var(--brand-magenta)" stroke-width="3" stroke-linejoin="round"/><circle cx="103" cy="33" r="3" fill="var(--brand-coral)"/><circle cx="30" cy="70" r="2.5" fill="var(--brand-orange)"/></svg>',
      promo: '<svg viewBox="0 0 132 112" width="100%" height="100%" fill="none"><circle cx="66" cy="56" r="44" fill="rgba(0,102,255,.08)"/><path d="M28 40h76v18a6 6 0 0 0 0 12v18H28V70a6 6 0 0 0 0-12V40Z" stroke="var(--brand-blue)" stroke-width="2.5" stroke-linejoin="round"/><circle cx="66" cy="56" r="7" stroke="var(--brand-magenta)" stroke-width="2.5"/><path d="M40 50v12M92 50v12" stroke="var(--border-strong)" stroke-width="2" stroke-linecap="round"/></svg>',
      upload: '<svg viewBox="0 0 132 112" width="100%" height="100%" fill="none"><circle cx="66" cy="56" r="44" fill="rgba(0,200,83,.08)"/><rect x="42" y="30" width="48" height="58" rx="8" stroke="var(--brand-blue)" stroke-width="2.5"/><path d="M66 72V44m0 0-9 9m9-9 9 9" stroke="var(--cat-supermercados)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M50 82h32" stroke="var(--border-strong)" stroke-width="2" stroke-linecap="round"/></svg>',
      lock: '<svg viewBox="0 0 132 112" width="100%" height="100%" fill="none"><circle cx="66" cy="56" r="44" fill="rgba(124,58,237,.09)"/><rect x="45" y="52" width="42" height="34" rx="8" stroke="var(--cat-licores)" stroke-width="2.5"/><path d="M55 52V43a11 11 0 0 1 22 0v9" stroke="var(--cat-licores)" stroke-width="2.5"/><circle cx="66" cy="66" r="4" fill="var(--brand-magenta)"/></svg>',
      star: '<svg viewBox="0 0 132 112" width="100%" height="100%" fill="none"><circle cx="66" cy="56" r="44" fill="rgba(255,184,0,.1)"/><path d="m66 28 9 19 21 3-15 15 4 21-19-10-19 10 4-21-15-15 21-3 9-19Z" stroke="var(--cat-rapida)" stroke-width="2.5" stroke-linejoin="round"/></svg>',
      chart: '<svg viewBox="0 0 132 112" width="100%" height="100%" fill="none"><circle cx="66" cy="56" r="44" fill="rgba(0,102,255,.08)"/><path d="M38 82V54M56 82V38M74 82V62M92 82V46" stroke="var(--brand-blue)" stroke-width="5" stroke-linecap="round"/><path d="M32 82h68" stroke="var(--border-strong)" stroke-width="2"/></svg>'
    };
    return arts[kind] || arts.business;
  }

  global.AppIcons = { svg: svg, category: category, emptyArt: emptyArt, paths: PATHS };
})(window);
