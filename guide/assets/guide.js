/* VI-BAL local guide m005. Classic script: no fetch, modules, server or external libraries. */
(function () {
  'use strict';
  var config = window.VIBAL_GUIDE || {languages: ['ru', 'en'], defaultLanguage: 'ru'};
  var root = document.documentElement;
  var language = root.getAttribute('data-language') || config.defaultLanguage;
  var theme = root.getAttribute('data-theme') || 'dark';
  var themeButton = document.getElementById('theme-toggle');
  var sidebar = document.getElementById('contents');
  var menu = document.getElementById('menu-toggle');
  var pageTitles = {};
  config.languages.forEach(function (lang) {
    pageTitles[lang] = document.body.getAttribute('data-title-' + lang);
  });

  function readStored(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function store(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
  function isLocalLink(href) { return href && href.charAt(0) !== '#' && !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href); }
  function withPreferences(href, lang, includeTheme) {
    var hashIndex = href.indexOf('#');
    var hash = hashIndex === -1 ? '' : href.slice(hashIndex);
    var clean = hashIndex === -1 ? href : href.slice(0, hashIndex);
    var queryIndex = clean.indexOf('?');
    var path = queryIndex === -1 ? clean : clean.slice(0, queryIndex);
    var params = new URLSearchParams(queryIndex === -1 ? '' : clean.slice(queryIndex + 1));
    params.set('lang', lang);
    if (includeTheme) params.set('theme', theme);
    return path + '?' + params.toString() + hash;
  }
  function rewriteLinks() {
    document.querySelectorAll('a[href]').forEach(function (a) {
      var base = a.getAttribute('data-base-href');
      if (!base) { base = a.getAttribute('href'); a.setAttribute('data-base-href', base); }
      if (isLocalLink(base) || a.hasAttribute('data-website')) a.setAttribute('href', withPreferences(base, language, isLocalLink(base)));
    });
  }
  function sectionAtReadingPosition() {
    var current = null;
    var topLine = window.innerWidth <= 800 ? 155 : 140;
    document.querySelectorAll('.guide-section').forEach(function (section) {
      if (section.getBoundingClientRect().top <= topLine) current = section;
    });
    return current;
  }
  function setLanguage(lang, updateAddress) {
    if (config.languages.indexOf(lang) === -1) return;
    var section = updateAddress ? sectionAtReadingPosition() : null;
    var sectionOffset = section ? section.getBoundingClientRect().top : null;
    language = lang;
    root.setAttribute('data-language', lang); root.setAttribute('lang', lang);
    document.querySelectorAll('[data-lang]').forEach(function (element) {
      element.hidden = element.getAttribute('data-lang') !== lang;
    });
    document.querySelectorAll('[data-language-button]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-language-button') === lang));
    });
    document.querySelectorAll('[data-label-' + lang + ']').forEach(function (element) {
      element.setAttribute('aria-label', element.getAttribute('data-label-' + lang));
    });
    document.title = pageTitles[lang] || 'VI-BAL';
    updateThemeButton();
    rewriteLinks();
    if (updateAddress) {
      store('vibal-guide-language', lang);
      var updated = new URL(window.location.href);
      updated.searchParams.set('lang', lang);
      updated.searchParams.set('theme', theme);
      // Use the semantic section being read, not an obsolete hash from a previous jump.
      if (section) updated.hash = section.id;
      try { window.history.replaceState(null, '', updated.href); }
      catch (_) {
        // Some browsers restrict History on file URLs. Reload the same local page only.
        if (window.location.protocol === 'file:') { window.location.replace(updated.href); return; }
      }
      if (section) window.scrollBy(0, section.getBoundingClientRect().top - sectionOffset);
      updateActiveSection();
    }
  }
  function updateThemeButton() {
    if (!themeButton) return;
    var labels = language === 'ru' ? ['Включить светлую тему', 'Включить тёмную тему'] : ['Switch to light theme', 'Switch to dark theme'];
    var label = labels[theme === 'dark' ? 0 : 1];
    themeButton.setAttribute('aria-label', label);
    themeButton.setAttribute('title', label);
  }
  function setTheme(nextTheme, updateAddress) {
    if (nextTheme !== 'light' && nextTheme !== 'dark') return;
    theme = nextTheme;
    root.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#000000' : '#f5f3ee');
    updateThemeButton();
    rewriteLinks();
    if (updateAddress) {
      store('vibal-guide-theme', theme);
      var updated = new URL(window.location.href);
      updated.searchParams.set('theme', theme);
      updated.searchParams.set('lang', language);
      var current = sectionAtReadingPosition();
      if (current) updated.hash = current.id;
      try { window.history.replaceState(null, '', updated.href); }
      catch (_) {
        // File URL restrictions vary. Keep the preference in the URL as well as storage.
        if (window.location.protocol === 'file:') window.location.replace(updated.href);
      }
    }
  }
  function closeMenu() {
    if (sidebar) sidebar.classList.remove('open');
    if (menu) menu.setAttribute('aria-expanded', 'false');
  }
  function updateActiveSection() {
    var section = sectionAtReadingPosition();
    document.querySelectorAll('.section-links a').forEach(function (a) {
      var active = !!section && a.getAttribute('href') === '#' + section.id;
      a.classList.toggle('active', active);
      if (active) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
  }
  document.querySelectorAll('[data-language-button]').forEach(function (button) {
    button.addEventListener('click', function () { setLanguage(button.getAttribute('data-language-button'), true); });
  });
  if (themeButton) themeButton.addEventListener('click', function () { setTheme(theme === 'dark' ? 'light' : 'dark', true); });
  if (menu && sidebar) {
    menu.addEventListener('click', function () {
      var opened = sidebar.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(opened));
    });
    sidebar.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMenu); });
  }
  // Explicit same-page navigation keeps anchor position predictable under the sticky header.
  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var anchor = event.target.closest ? event.target.closest('a[href^="#"]') : null;
    if (!anchor) return;
    var hash = anchor.getAttribute('href');
    var target;
    try { target = document.getElementById(decodeURIComponent(hash.slice(1))); } catch (_) { return; }
    if (!target) return;
    event.preventDefault();
    closeMenu();
    var destination = new URL(window.location.href);
    destination.hash = hash.slice(1);
    try { window.history.pushState(null, '', destination.href); }
    catch (_) { if (window.location.protocol === 'file:') window.location.hash = hash; }
    target.scrollIntoView({block: 'start', behavior: 'auto'});
    updateActiveSection();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && sidebar && sidebar.classList.contains('open')) { closeMenu(); menu.focus(); }
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 800) closeMenu(); });
  var scrollQueued = false;
  window.addEventListener('scroll', function () {
    if (!scrollQueued) {
      scrollQueued = true;
      window.requestAnimationFrame(function () { scrollQueued = false; updateActiveSection(); });
    }
  }, {passive:true});
  window.addEventListener('hashchange', updateActiveSection);
  window.addEventListener('popstate', function () {
    var params = new URLSearchParams(window.location.search);
    var fromAddress = params.get('lang');
    var fromTheme = params.get('theme') || readStored('vibal-guide-theme') || 'dark';
    setTheme(fromTheme, false);
    if (config.languages.indexOf(fromAddress) !== -1) setLanguage(fromAddress, false);
    updateActiveSection();
  });
  setTheme(theme, false);
  setLanguage(language, false);
  updateActiveSection();
}());
