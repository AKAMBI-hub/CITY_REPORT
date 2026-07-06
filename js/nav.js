/* ════════════════════════════════════════════════
   CityReport PWA — Navigation (js/nav.js)
   Bottom tabs + Top bar + transitions + swipe
   ════════════════════════════════════════════════ */

const Nav = (() => {

  /* Ordre des onglets (pour le swipe gauche/droite) */
  const TAB_ORDER = ['home', 'suivi', 'signaler', 'communaute', 'profil'];

  /* Config des onglets */
  const TABS = [
    { id: 'home',       icon: 'map-pin',    label: 'Carte',    badge: null },
    { id: 'suivi',      icon: 'list-check', label: 'Suivi',    badge: null },
    { id: 'signaler',   icon: 'plus',       label: 'Signaler', badge: null, cta: true },
    { id: 'communaute', icon: 'users',      label: 'Quartier', badge: null },
    { id: 'profil',     icon: 'user',       label: 'Profil',   badge: null },
  ];

  /* Badges dynamiques (mis à jour depuis l'app) */
  const badges = { suivi: 0, communaute: 0, profil: 0 };

  function setBadge(tab, count) {
    badges[tab] = count;
  }

  /* ── Rendu Top Bar ── */
  function renderTopBar(S) {
    const TITLES = {
      home:       'CityReport',
      signaler:   'Nouveau signalement',
      suivi:      'Mes signalements',
      communaute: 'Communauté',
      profil:     'Mon profil',
      rapport:    'Signalement',
      admin:      'Dashboard mairie',
      agent:      'Espace agent',
      'admin-settings': 'Paramètres',
      inscription:      'Inscription',
      classement:       'Classement quartiers',
      paiement:         'Paiement',
      facturation:      'Facturation',
      amendes:          'Paiement d\'amende',
      elu:              'Dashboard élu',
      faq:              'Questions fréquentes',
      contact:          'Nous contacter',
    };

    const showBack  = ['rapport','admin','agent','admin-settings','inscription','classement','paiement','facturation','amendes','elu','faq','contact'].includes(S.screen) || (Router.canGoBack && Router.canGoBack() && !['home','suivi','signaler','communaute','profil'].includes(S.screen));
    const showLogo  = S.screen === 'home';
    const title     = TITLES[S.screen] || 'CityReport';
    const unreadCount = (S.adminAlerts || []).filter(a => !a.read).length;
    const hasNotif    = unreadCount > 0;

    return `
      <header id="top-bar" role="banner">

        <!-- Gauche : logo ou bouton retour -->
        ${showBack ? `
          <button class="tb-icon" id="btn-back" aria-label="Retour">
            <i class="ti ti-arrow-left" aria-hidden="true"></i>
          </button>
        ` : showLogo ? `
          <span class="tb-logo" aria-label="CityReport">CR</span>
        ` : `
          <div style="width:36px"></div>
        `}

        <!-- Titre centré -->
        <h1 class="tb-title" id="top-bar-title">${title}</h1>

        <!-- Droite : cloche notifs -->
        <button class="tb-icon" id="btn-notifs" aria-label="Notifications${hasNotif ? ` (${unreadCount} non lues)` : ''}">
          <i class="ti ti-bell" aria-hidden="true"></i>
          ${hasNotif ? `<span class="tb-badge" id="notif-badge">${unreadCount}</span>` : ''}
        </button>

      </header>
    `;
  }

  /* ── Rendu Bottom Nav ── */
  function renderBottomNav(S) {
    return `
      <nav id="bottom-nav" role="navigation" aria-label="Navigation principale">

        <!-- Indicateur glissant de l'onglet actif -->
        <div class="bn-indicator" id="bn-indicator" aria-hidden="true"></div>

        ${TABS.map((tab, idx) => {
          const active  = S.screen === tab.id;
          const bdgCount = badges[tab.id] || 0;

          if (tab.cta) {
            return `
              <button
                class="bn-tab bn-cta${active ? ' active' : ''}"
                data-route="${tab.id}"
                data-tab-idx="${idx}"
                aria-label="${tab.label}"
                aria-current="${active ? 'page' : 'false'}"
                type="button"
              >
                <div class="bn-cta-wrap" id="bn-cta-wrap">
                  <i class="ti ti-${tab.icon}" aria-hidden="true"></i>
                </div>
                <span class="bn-label">${tab.label}</span>
              </button>
            `;
          }

          return `
            <button
              class="bn-tab${active ? ' active' : ''}"
              data-route="${tab.id}"
              data-tab-idx="${idx}"
              aria-label="${tab.label}${bdgCount ? ` (${bdgCount})` : ''}"
              aria-current="${active ? 'page' : 'false'}"
              type="button"
            >
              <div class="bn-icon-container">
                <i class="ti ti-${tab.icon} bn-icon" aria-hidden="true"></i>
                ${bdgCount ? `
                  <span class="bn-badge" aria-hidden="true">
                    ${bdgCount > 9 ? '9+' : bdgCount}
                  </span>
                ` : ''}
              </div>
              <span class="bn-label">${tab.label}</span>
            </button>
          `;
        }).join('')}

      </nav>
    `;
  }

  /* ── Animer l'indicateur vers l'onglet actif ── */
  function animateIndicator(screen) {
    const idx     = TAB_ORDER.indexOf(screen);
    const nav     = document.getElementById('bottom-nav');
    const indicator = document.getElementById('bn-indicator');
    if (!nav || !indicator || idx < 0) return;

    const tabs    = nav.querySelectorAll('.bn-tab');
    const target  = tabs[idx];
    if (!target) return;

    const navRect = nav.getBoundingClientRect();
    const tabRect = target.getBoundingClientRect();

    indicator.style.transform = `translateX(${tabRect.left - navRect.left + tabRect.width / 2 - 16}px)`;
  }

  /* ── Bind : onglets + swipe + retour ── */
  function bind(onNavigate) {

    /* Clic sur onglet */
    document.querySelectorAll('.bn-tab[data-route]').forEach(btn => {
      btn.addEventListener('click', e => {
        const route = btn.dataset.route;
        _addRipple(e, btn);
        onNavigate(route);
      });
    });

    /* Bouton retour */
    document.getElementById('btn-back')?.addEventListener('click', () => {
      Router.back();
    });

    /* Notifications */
    document.getElementById('btn-notifs')?.addEventListener('click', () => {
      State.Actions.toggleAlertPanel();
    });

    /* Swipe horizontal entre onglets */
    _bindSwipe(onNavigate);

    /* Positionner l'indicateur */
    const screen = State.get().screen;
    requestAnimationFrame(() => animateIndicator(screen));
  }

  /* ── Swipe tactile gauche/droite ── */
  function _bindSwipe(onNavigate) {
    const main = document.getElementById('main');
    if (!main) return;

    let startX = 0, startY = 0, dragging = false;
    const THRESHOLD = 60;   /* px minimum pour déclencher */
    const MAX_VERT  = 40;   /* max vertical pour ignorer les scrolls */

    main.addEventListener('touchstart', e => {
      startX   = e.touches[0].clientX;
      startY   = e.touches[0].clientY;
      dragging = true;
    }, { passive: true });

    main.addEventListener('touchend', e => {
      if (!dragging) return;
      dragging = false;

      const dx = e.changedTouches[0].clientX - startX;
      const dy = Math.abs(e.changedTouches[0].clientY - startY);

      /* Ignorer si c'est surtout vertical (scroll) */
      if (dy > MAX_VERT) return;

      if (Math.abs(dx) < THRESHOLD) return;

      const cur = State.get().screen;
      /* Exclure signaler du swipe — flux multi-étapes */
      const swipeable = TAB_ORDER.filter(t => t !== 'signaler');
      const idx = swipeable.indexOf(cur);
      if (idx < 0) return;

      if (dx < 0 && idx < swipeable.length - 1) {
        /* Swipe gauche → onglet suivant */
        onNavigate(swipeable[idx + 1]);
      } else if (dx > 0 && idx > 0) {
        /* Swipe droit → onglet précédent */
        onNavigate(swipeable[idx - 1]);
      }
    }, { passive: true });
  }

  /* ── Transition slide entre screens ── */
  let _prevScreen = null;

  function animateTransition(fromScreen, toScreen) {
    const main = document.getElementById('main');
    if (!main || !fromScreen || fromScreen === toScreen) return;

    /* Respecter les préférences de mouvement */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const fromIdx = TAB_ORDER.indexOf(fromScreen);
    const toIdx   = TAB_ORDER.indexOf(toScreen);

    /* Pas de transition pour les écrans hors onglets (rapport, etc.) */
    if (fromIdx < 0 || toIdx < 0) {
      /* Zoom-fade pour les écrans modaux comme signaler */
      if (toScreen === 'signaler' || toScreen === 'rapport') {
        main.classList.add('screen-zoom-in');
        requestAnimationFrame(() => requestAnimationFrame(() => main.classList.remove('screen-zoom-in')));
      }
      return;
    }

    const dir = toIdx > fromIdx ? 1 : -1; /* 1 = vers la droite, -1 = vers la gauche */

    main.classList.add(dir > 0 ? 'slide-from-right' : 'slide-from-left');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        main.classList.remove('slide-from-right', 'slide-from-left');
      });
    });
  }

  /* ── Ripple interne ── */
  function _addRipple(e, el) {
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const wave = document.createElement('span');
    wave.className = 'ripple-wave';
    wave.style.cssText = [
      `width:${size}px`,
      `height:${size}px`,
      `left:${e.clientX - rect.left - size / 2}px`,
      `top:${e.clientY - rect.top - size / 2}px`,
    ].join(';');
    el.classList.add('ripple');
    el.appendChild(wave);
    wave.addEventListener('animationend', () => wave.remove(), { once: true });
  }

  /* API publique */
  return {
    TABS,
    TAB_ORDER,
    setBadge,
    renderTopBar,
    renderBottomNav,
    animateIndicator,
    animateTransition,
    bind,
  };

})();

window.Nav = Nav;
