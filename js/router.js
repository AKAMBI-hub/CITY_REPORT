/* ════════════════════════════════════════════════
   CityReport PWA — Router SPA v2 (js/router.js)

   Fonctionnalités :
   - Hash routing : #/home, #/rapport/42, etc.
   - Historique interne (pile de navigation)
   - Bouton back navigateur (popstate)
   - Deep links au premier chargement
   - Scroll restoration par screen
   - Guards (ex: routes admin protégées)
   - Transitions directionnelles
   ════════════════════════════════════════════════ */

const Router = (() => {

  /* ── Table de routes ─────────────────────────
     slug (hash)  → { screen, title, guard? }
  ────────────────────────────────────────────── */
  const ROUTES = {
    '':           { screen: 'home',       title: 'CityReport' },
    'home':       { screen: 'home',       title: 'CityReport' },
    'onboarding': { screen: 'onboarding', title: 'Bienvenue' },
    'signaler':   { screen: 'signaler',   title: 'Nouveau signalement' },
    'suivi':      { screen: 'suivi',      title: 'Mes signalements' },
    'communaute': { screen: 'communaute', title: 'Communauté' },
    'profil':     { screen: 'profil',     title: 'Mon profil' },
    'rapport':    { screen: 'rapport',    title: 'Signalement' },
    /* Routes protégées — seront activées aux parties #21-22 */
    'admin':      { screen: 'admin',      title: 'Dashboard mairie', guard: 'admin' },
    'agent':      { screen: 'agent',        title: 'Espace agent',     guard: 'agent' },
    'agent-profil':   { screen: 'agent-profil',   title: 'Mon profil agent',     guard: 'agent' },
    'rapport-mensuel': { screen: 'rapport-mensuel', title: 'Rapport mensuel',      guard: 'admin' },
    'admin-settings':  { screen: 'admin-settings',  title: 'Paramètres',           guard: 'admin' },
    'inscription':     { screen: 'inscription',     title: 'Inscription' },
    'paiement':     { screen: 'paiement',     title: 'Paiement' },
    'facturation':  { screen: 'facturation',  title: 'Facturation', guard: 'admin' },
    'annonces':     { screen: 'annonces',     title: 'Annonces' },
    'classement':      { screen: 'classement',      title: 'Classement quartiers' },
    'amendes':         { screen: 'amendes',         title: 'Paiement d\'amende' },
    'elu':             { screen: 'elu',             title: 'Dashboard élu', guard: 'admin' },
    'faq':             { screen: 'faq',             title: 'Questions fréquentes' },
    'contact':         { screen: 'contact',         title: 'Nous contacter' },
    'error':           { screen: 'error',           title: 'Erreur réseau' },
  };

  /* ── Fallback : toutes les routes non reconnues → 404 ── */
  let _stack = [];         /* [{screen, params, scrollY}] */
  let _ignoreNext = false; /* évite de traiter un popstate qu'on a déclenché nous-mêmes */

  /* ── Positions de scroll mémorisées ── */
  const _scrollPos = {};

  /* ── Sauvegarder la position de scroll de l'écran courant ── */
  function _saveScroll() {
    const main = document.getElementById('main');
    if (!main) return;
    const cur = State.get().screen;
    _scrollPos[cur] = main.scrollTop;
  }

  /* ── Restaurer la position de scroll ── */
  function _restoreScroll(screen) {
    const main = document.getElementById('main');
    if (!main) return;
    /* Micro-délai pour laisser le DOM se mettre à jour */
    requestAnimationFrame(() => {
      main.scrollTop = _scrollPos[screen] || 0;
    });
  }

  /* ── Parser le hash courant ── */
  function _parse(hash = window.location.hash) {
    const raw    = hash.replace(/^#\/?/, '');
    const parts  = raw.split('/').filter(Boolean);
    const slug   = parts[0] || '';
    const params = parts.slice(1);
    const route  = ROUTES[slug];
    if (!route) {
      /* Route inconnue → 404 */
      return { slug, screen: 'notfound', params: [slug], title: 'Page introuvable', guard: null };
    }
    return { slug, screen: route.screen, params, title: route.title, guard: route.guard };
  }

  /* ── Vérifier un guard ── */
  function _checkGuard(guard) {
    if (!guard) return true;
    const S = State.get();
    if (guard === 'admin' && S.user?.role !== 'admin') return false;
    if (guard === 'agent' && !['admin','agent'].includes(S.user?.role)) return false;
    return true;
  }

  /* ── Appliquer une route parsée ── */
  function _apply(parsed, direction = 'push') {
    /* Guard : rediriger si non autorisé */
    if (!_checkGuard(parsed.guard)) {
      State.toast('Accès réservé — connectez-vous', 'err');
      replace('profil');
      return;
    }

    /* Mémoriser le scroll de l'écran qu'on quitte */
    _saveScroll();

    /* Mettre à jour le state SANS déclencher render (navigate est silencieux) */
    const prev = State.get().screen;
    State.navigate(parsed.screen, parsed.params);

    /* Mettre à jour le titre de la page */
    document.title = parsed.title ? `${parsed.title} — CityReport` : 'CityReport';

    /* Un seul render, propre */
    App.render();

    /* Restaurer le scroll de la destination */
    _restoreScroll(parsed.screen);
  }

  /* ════════════════════════════════════════════
     API PUBLIQUE
     ════════════════════════════════════════════ */

  /*
   * push(path, params)
   * Naviguer vers une route — ajoute à l'historique navigateur
   * ex: Router.push('rapport', ['42'])
   */
  function push(path, params = []) {
    const hash = params.length
      ? `#/${path}/${params.join('/')}`
      : `#/${path}`;

    /* Empêche de re-traiter dans hashchange */
    _ignoreNext = true;
    window.location.hash = hash;

    /* Ajouter à la pile interne */
    const parsed = _parse(hash);
    _stack.push(parsed);

    _apply(parsed, 'push');
  }

  /*
   * replace(path, params)
   * Remplacer l'URL sans ajouter à l'historique
   */
  function replace(path, params = []) {
    const hash = params.length
      ? `#/${path}/${params.join('/')}`
      : `#/${path}`;

    _ignoreNext = true;
    window.history.replaceState(null, '', hash);

    const parsed = _parse(hash);
    /* Remplacer le dernier item de la pile */
    if (_stack.length) _stack[_stack.length - 1] = parsed;
    else _stack.push(parsed);

    _apply(parsed, 'replace');
  }

  /*
   * back()
   * Remonter dans la pile interne
   * Si la pile est vide → home
   */
  function back() {
    if (_stack.length > 1) {
      _stack.pop();                          /* retirer l'entrée courante */
      const prev = _stack[_stack.length - 1];

      _ignoreNext = true;
      window.history.back();                 /* synchroniser le navigateur */

      _apply(prev, 'back');
    } else {
      push('home');
    }
  }

  /*
   * canGoBack()
   * Vrai si on peut remonter dans l'historique interne
   */
  function canGoBack() {
    return _stack.length > 1;
  }

  /*
   * current()
   * Retourner la route courante parsée
   */
  function current() {
    return _stack.length ? _stack[_stack.length - 1] : _parse();
  }

  /*
   * init()
   * À appeler une seule fois au démarrage
   */
  function init() {

    /* ── Deep link : lire l'URL au chargement ── */
    const initial = _parse();
    _stack = [initial];
    _apply(initial, 'replace');

    /* ── hashchange : bouton précédent/suivant navigateur ── */
    window.addEventListener('hashchange', () => {
      if (_ignoreNext) {
        _ignoreNext = false;
        return;
      }
      /* L'utilisateur a utilisé le bouton back/forward du navigateur */
      const parsed = _parse();

      /* Déterminer la direction */
      const curIdx  = _stack.findIndex(e => e.screen === State.get().screen);
      const prevIdx = _stack.findIndex(e => e.screen === parsed.screen);
      const dir     = prevIdx < curIdx ? 'back' : 'push';

      /* Synchroniser la pile */
      if (dir === 'back') {
        _stack = _stack.slice(0, _stack.findIndex(e => e.screen === parsed.screen) + 1);
      } else {
        _stack.push(parsed);
      }

      _apply(parsed, dir);
    });

    /* ── Intercepter les liens <a href="#/..."> ── */
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#/"]');
      if (!a) return;
      e.preventDefault();
      const slug = a.getAttribute('href').replace('#/', '');
      push(slug);
    });
  }

  /* ── Helpers utilitaires ── */

  /* Construire un href pour un lien de navigation */
  function href(path, params = []) {
    return params.length ? `#/${path}/${params.join('/')}` : `#/${path}`;
  }

  /* Vrai si le screen donné est l'actif */
  function isActive(screen) {
    return State.get().screen === screen;
  }

  return {
    init,
    push,
    replace,
    back,
    canGoBack,
    current,
    href,
    isActive,
    /* Exposer pour debug */
    _getStack: () => [..._stack],
  };

})();

window.Router = Router;
