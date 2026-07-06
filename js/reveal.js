/* ════════════════════════════════════════════════
   CityReport PWA — Reveal & Observers (js/reveal.js)

   Module centralisé pour :
   - Reveals au scroll (IntersectionObserver)
   - Stagger lists
   - Lazy loading images
   - Infinite scroll (stub pour partie #19)
   ════════════════════════════════════════════════ */

const Reveal = (() => {

  /* ── Observer principal pour .reveal, .reveal-left, .reveal-scale ── */
  let _revealObserver = null;

  function _initRevealObserver() {
    if (_revealObserver) _revealObserver.disconnect();

    _revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        _revealObserver.unobserve(entry.target); /* one-shot */
      });
    }, {
      root:       null,
      rootMargin: '0px 0px -40px 0px', /* déclenche un peu avant le bas de l'écran */
      threshold:  0.08,
    });
  }

  /* ── Observer pour les stagger lists ── */
  let _staggerObserver = null;

  function _initStaggerObserver() {
    if (_staggerObserver) _staggerObserver.disconnect();

    _staggerObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        _staggerObserver.unobserve(entry.target);
      });
    }, {
      threshold: 0.05,
    });
  }

  /* ── Observer pour les images lazy ── */
  let _imgObserver = null;

  function _initImgObserver() {
    if (!('IntersectionObserver' in window)) return;
    if (_imgObserver) _imgObserver.disconnect();

    _imgObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        const src = img.dataset.src;
        if (!src) return;
        img.src = src;
        img.removeAttribute('data-src');
        img.classList.add('loaded');
        _imgObserver.unobserve(img);
      });
    }, {
      rootMargin: '200px 0px', /* précharger 200px avant que l'image soit visible */
    });
  }


  /* ════════════════════════════════════════════
     API PUBLIQUE
     ════════════════════════════════════════════ */

  /*
   * bind()
   * À appeler après chaque App.render() depuis App.bind()
   * Observe tous les éléments révélables du DOM courant
   */
  function bind() {
    /* Reveals simples */
    if (!_revealObserver) _initRevealObserver();
    document.querySelectorAll('.reveal, .reveal-left, .reveal-scale').forEach(el => {
      /* Ne pas re-observer les éléments déjà visibles */
      if (!el.classList.contains('visible')) {
        _revealObserver.observe(el);
      }
    });

    /* Stagger lists */
    if (!_staggerObserver) _initStaggerObserver();
    document.querySelectorAll('.stagger-list').forEach(el => {
      if (!el.classList.contains('visible')) {
        _staggerObserver.observe(el);
      }
    });

    /* Images lazy (data-src) */
    if (!_imgObserver) _initImgObserver();
    if (_imgObserver) {
      document.querySelectorAll('img[data-src]').forEach(img => {
        _imgObserver.observe(img);
      });
    }
  }

  /*
   * revealNow(el)
   * Forcer la révélation immédiate d'un élément (ex: après une action)
   */
  function revealNow(el) {
    if (!el) return;
    el.classList.add('visible');
  }

  /*
   * revealAll(container)
   * Révéler tous les éléments d'un container immédiatement
   */
  function revealAll(container = document) {
    container.querySelectorAll('.reveal, .reveal-left, .reveal-scale, .stagger-list').forEach(el => {
      el.classList.add('visible');
    });
  }

  /*
   * skeletonToContent(skeletonEl, contentHTML, delay)
   * Remplacer un skeleton par du vrai contenu avec transition
   */
  function skeletonToContent(skeletonEl, contentHTML, delay = 0) {
    if (!skeletonEl) return;
    setTimeout(() => {
      skeletonEl.style.transition = `opacity ${getComputedStyle(document.documentElement).getPropertyValue('--dur-base')} ease`;
      skeletonEl.style.opacity = '0';
      setTimeout(() => {
        skeletonEl.outerHTML = contentHTML;
        bind(); /* re-observer les nouveaux éléments */
      }, 220);
    }, delay);
  }

  /*
   * simulateLoad(container, skeletonFn, contentFn, duration)
   * Utilitaire de démo : affiche un skeleton pendant `duration`ms
   * puis le remplace par le vrai contenu
   */
  function simulateLoad(containerId, skeletonHTML, contentFn, duration = 1200) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = skeletonHTML;

    setTimeout(() => {
      container.style.transition = `opacity 200ms ease`;
      container.style.opacity = '0';
      setTimeout(() => {
        container.innerHTML = contentFn();
        container.style.opacity = '1';
        bind();
      }, 200);
    }, duration);
  }

  /*
   * Infinite scroll observer (stub — sera branché à la partie #19)
   * Déclenche un callback quand l'utilisateur approche du bas de la liste
   */
  function onReachBottom(callback, threshold = 200) {
    const main = document.getElementById('main');
    if (!main) return () => {};

    function check() {
      const { scrollTop, scrollHeight, clientHeight } = main;
      if (scrollHeight - scrollTop - clientHeight < threshold) {
        callback();
      }
    }

    main.addEventListener('scroll', check, { passive: true });
    return () => main.removeEventListener('scroll', check);
  }

  return { bind, revealNow, revealAll, skeletonToContent, simulateLoad, onReachBottom };

})();

window.Reveal = Reveal;
