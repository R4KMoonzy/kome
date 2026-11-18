/* page-nosotros.js — Página institucional editable desde administración */
(function () {
  'use strict';

  var D = window.DataService, I = window.AppIcons, UI = window.UI;
  var esc = D.escapeHtml;

  function paragraphs(value) {
    return String(value || '').split('\n').map(function (line) {
      return line.trim() ? '<p>' + esc(line) + '</p>' : '';
    }).join('');
  }
  function block(icon, title, value) {
    if (!value || !String(value).trim()) return '';
    return '<article class="card how-step stagger-item">' +
      '<div class="how-step__num">' + I.svg(icon, { size: 22 }) + '</div>' +
      '<h3>' + esc(title) + '</h3>' +
      '<div class="prose">' + paragraphs(value) + '</div></article>';
  }
  function section(title, body) {
    if (!body) return '';
    return '<div class="section" style="padding-block:20px"><div class="section__head">' +
      '<div><h2 class="section__title" style="font-size:1.4rem">' + esc(title) + '</h2></div></div>' + body + '</div>';
  }

  UI.ready.then(async function () {
    var root = document.getElementById('nosotros-root');
    if (!root) return;
    var cfg = await D.getConfig();
    var values = (cfg.aboutValues || []).filter(function (v) { return v.titulo || v.texto; });
    var team = (cfg.aboutTeam || []).filter(function (t) { return t.nombre || t.rol || t.bio; });
    var hasContent = !!(cfg.aboutIntro || cfg.aboutHistory || cfg.aboutMission ||
      cfg.aboutVision || values.length || team.length);

    if (!hasContent) {
      root.innerHTML = '<div class="info-hero"><span class="hero__eyebrow">' + I.svg('users', { size: 14 }) +
        ' Nuestra historia</span><h1>' + esc(cfg.aboutTitle || 'Quiénes somos') + '</h1>' +
        '<p>Conoce el equipo y los motivos detrás de esta plataforma.</p></div>' +
        UI.empty({
          art: 'business',
          title: 'Esta sección aún está por escribirse',
          text: 'Cuando el administrador publique la historia, la misión y el equipo, podrás verlos aquí.',
          action: { href: 'contacto.html', label: 'Contactar al equipo', icon: 'mail' }
        });
      return;
    }

    var hero = '<div class="info-hero"><span class="hero__eyebrow">' + I.svg('users', { size: 14 }) +
      ' Nuestra historia</span><h1>' + esc(cfg.aboutTitle || 'Quiénes somos') + '</h1>' +
      (cfg.aboutIntro ? '<p>' + esc(cfg.aboutIntro) + '</p>' : '') +
      '<div class="info-hero__actions"><a class="btn btn--primary" href="explorar.html">' +
        I.svg('search', { size: 16 }) + 'Explorar el directorio</a>' +
        '<a class="btn btn--ghost" href="contacto.html">' + I.svg('mail', { size: 16 }) + 'Escríbenos</a></div></div>';

    var history = section('Nuestra historia',
      cfg.aboutHistory ? '<div class="card" style="padding:22px"><div class="prose">' + paragraphs(cfg.aboutHistory) + '</div></div>' : '');

    var purpose = section('Lo que nos mueve',
      (cfg.aboutMission || cfg.aboutVision)
        ? '<div class="how-grid stagger">' + block('heart', 'Misión', cfg.aboutMission) +
          block('sparkles', 'Visión', cfg.aboutVision) + '</div>' : '');

    var valueCards = '';
    if (values.length) {
      valueCards = '<div class="how-grid stagger">' + values.map(function (v, i) {
        return '<article class="card how-step stagger-item"><div class="how-step__num">' +
          I.svg(['shield', 'heart', 'globe', 'sparkles', 'users'][i % 5], { size: 22 }) + '</div>' +
          '<h3>' + esc(v.titulo || 'Valor ' + (i + 1)) + '</h3>' +
          '<div class="prose">' + paragraphs(v.texto) + '</div></article>';
      }).join('') + '</div>';
    }
    var valuesSection = section('Nuestros valores', valueCards);

    var teamCards = '';
    if (team.length) {
      teamCards = '<div class="team-grid stagger">' + team.map(function (t) {
        return '<article class="card team-card stagger-item">' +
          '<div class="team-card__avatar">' + esc((t.nombre || '?').trim().charAt(0).toUpperCase()) + '</div>' +
          '<div><h3>' + esc(t.nombre || 'Integrante') + '</h3>' +
          '<span class="tiny muted">' + esc(t.rol || '') + '</span>' +
          (t.bio ? '<div class="prose" style="margin-top:8px">' + paragraphs(t.bio) + '</div>' : '') + '</div></article>';
      }).join('') + '</div>';
    }
    var teamSection = section('El equipo', teamCards);

    root.innerHTML = hero + history + purpose + valuesSection + teamSection +
      '<div class="coverage-note" style="margin-top:22px">' + I.svg('mail', { size: 16 }) +
        '<span>¿Tienes una idea o comentario? <a href="contacto.html">Escríbele al equipo</a>.</span></div>';
  });
})();
