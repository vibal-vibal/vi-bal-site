(function () {
  const root = document.documentElement;
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('lang');
  let stored = null;
  try { stored = window.localStorage.getItem('vibal-language'); } catch (_) {}
  const initial = requested === 'ru' || requested === 'en' ? requested : (stored === 'ru' ? 'ru' : 'en');

  function setLanguage(lang, updateUrl) {
    const chosen = lang === 'ru' ? 'ru' : 'en';
    root.dataset.currentLang = chosen;
    root.lang = chosen;
    try { window.localStorage.setItem('vibal-language', chosen); } catch (_) {}

    document.querySelectorAll('[data-lang-button]').forEach((button) => {
      const active = button.dataset.langButton === chosen;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    const title = document.body.dataset.titleEn && document.body.dataset.titleRu
      ? (chosen === 'ru' ? document.body.dataset.titleRu : document.body.dataset.titleEn)
      : 'VI-BAL';
    document.title = title;

    document.querySelectorAll('[data-route]').forEach((link) => {
      const fileHref = link.dataset.fileHref;
      const webHref = link.dataset.webHref;
      const base = window.location.protocol === 'file:' ? fileHref : webHref;
      if (!base) return;
      link.href = base + '?lang=' + chosen;
    });

    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', chosen);
      try { window.history.replaceState({}, '', url); } catch (_) {}
    }
  }

  document.querySelectorAll('[data-lang-button]').forEach((button) => {
    button.addEventListener('click', () => setLanguage(button.dataset.langButton, true));
  });

  setLanguage(initial, false);

  function buildAmbientLogos() {
    const logoReference = document.querySelector('.hero-logo, .brand-home img');
    if (!logoReference) return;

    const layer = document.createElement('div');
    layer.className = 'ambient-logos';
    layer.setAttribute('aria-hidden', 'true');
    document.body.prepend(layer);

    const source = logoReference.currentSrc || logoReference.src;
    const longPageSpeed = 1.28;
    const shortPageSpeed = 1.0;
    let sprites = [];
    let viewportWidth = 0;
    let viewportHeight = 0;
    let overscan = 0;
    let lastScrollY = window.scrollY || 0;
    let lastTouchY = null;
    let resizeTimer = null;

    function pageMetrics() {
      const doc = document.documentElement;
      const body = document.body;
      const documentHeight = Math.max(
        doc.scrollHeight, doc.offsetHeight, doc.clientHeight,
        body ? body.scrollHeight : 0,
        body ? body.offsetHeight : 0
      );
      const maxScroll = Math.max(0, documentHeight - window.innerHeight);
      return { maxScroll, scrollable: maxScroll > 2 };
    }

    function randomizeSprite(sprite, y) {
      const baseSize = Math.max(10.8, Math.min(14.4, viewportWidth / 100));
      const size = baseSize * (0.82 + Math.random() * 0.38);
      sprite.y = y;
      sprite.x = Math.random() * viewportWidth;
      sprite.el.style.width = size.toFixed(2) + 'px';
      sprite.el.style.height = size.toFixed(2) + 'px';
      sprite.el.style.opacity = (0.105 + Math.random() * 0.075).toFixed(3);
      sprite.el.style.transform = `translate3d(${sprite.x.toFixed(2)}px, ${sprite.y.toFixed(2)}px, 0)`;
    }

    function rebuildSprites() {
      viewportWidth = Math.max(window.innerWidth || 0, 320);
      viewportHeight = Math.max(window.innerHeight || 0, 480);
      overscan = Math.max(90, viewportHeight * 0.18);
      const baseSize = Math.max(10.8, Math.min(14.4, viewportWidth / 100));
      const targetCoverage = 0.026;
      const count = Math.max(18, Math.min(220, Math.round((viewportWidth * viewportHeight * targetCoverage) / (baseSize * baseSize))));

      layer.replaceChildren();
      sprites = [];
      for (let i = 0; i < count; i += 1) {
        const icon = document.createElement('img');
        icon.className = 'ambient-logo';
        icon.src = source;
        icon.alt = '';
        icon.draggable = false;
        layer.appendChild(icon);
        const sprite = { el: icon, x: 0, y: 0 };
        randomizeSprite(sprite, -overscan + Math.random() * (viewportHeight + overscan * 2));
        sprites.push(sprite);
      }
    }

    function recycleSprite(sprite, direction) {
      if (direction < 0) {
        randomizeSprite(sprite, viewportHeight + overscan * (0.35 + Math.random() * 0.65));
      } else {
        randomizeSprite(sprite, -overscan * (0.35 + Math.random() * 0.65));
      }
    }

    function moveBackground(screenDelta) {
      if (!Number.isFinite(screenDelta) || Math.abs(screenDelta) < 0.01) return;
      // Keep very large OS-generated wheel deltas stable while preserving direction.
      const delta = Math.max(-viewportHeight * 1.5, Math.min(viewportHeight * 1.5, screenDelta));
      const topLimit = -overscan;
      const bottomLimit = viewportHeight + overscan;

      sprites.forEach((sprite) => {
        sprite.y += delta;
        if (sprite.y < topLimit) {
          recycleSprite(sprite, -1);
        } else if (sprite.y > bottomLimit) {
          recycleSprite(sprite, 1);
        } else {
          sprite.el.style.transform = `translate3d(${sprite.x.toFixed(2)}px, ${sprite.y.toFixed(2)}px, 0)`;
        }
      });
    }

    function canPageScrollInDirection(deltaY) {
      const { maxScroll, scrollable } = pageMetrics();
      if (!scrollable || deltaY === 0) return false;
      const y = window.scrollY || 0;
      return deltaY > 0 ? y < maxScroll - 1 : y > 1;
    }

    rebuildSprites();

    window.addEventListener('scroll', () => {
      const current = window.scrollY || 0;
      const delta = current - lastScrollY;
      if (delta !== 0) moveBackground(-delta * longPageSpeed);
      lastScrollY = current;
    }, { passive: true });

    window.addEventListener('wheel', (event) => {
      if (event.deltaY === 0) return;
      const { scrollable } = pageMetrics();
      if (!canPageScrollInDirection(event.deltaY)) {
        // Short pages and the top/bottom edge of long pages: content stays put,
        // while the decorative field can keep scrolling without a limit.
        event.preventDefault();
        moveBackground(-event.deltaY * (scrollable ? longPageSpeed : shortPageSpeed));
      }
    }, { passive: false });

    window.addEventListener('touchstart', (event) => {
      if (event.touches.length === 1) lastTouchY = event.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchmove', (event) => {
      if (event.touches.length !== 1 || lastTouchY === null) return;
      const currentY = event.touches[0].clientY;
      const intendedScroll = lastTouchY - currentY;
      const { scrollable } = pageMetrics();
      if (!canPageScrollInDirection(intendedScroll)) {
        event.preventDefault();
        moveBackground((currentY - lastTouchY) * (scrollable ? longPageSpeed : shortPageSpeed));
      }
      lastTouchY = currentY;
    }, { passive: false });

    window.addEventListener('touchend', () => { lastTouchY = null; }, { passive: true });
    window.addEventListener('touchcancel', () => { lastTouchY = null; }, { passive: true });

    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        lastScrollY = window.scrollY || 0;
        rebuildSprites();
      }, 120);
    }, { passive: true });
  }

  buildAmbientLogos();
})();
