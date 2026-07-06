/* ════════════════════════════════════════════════
   CityReport PWA — State Manager v2 (js/state.js)

   Fonctionnalités :
   - État central S avec go() / goNested()
   - Persistance localStorage (clés sélectives)
   - Middlewares (logger, persistor)
   - Actions métier (Auth, Reports, UI)
   - Subscribe / unsubscribe
   - Reset partiel ou total
   ════════════════════════════════════════════════ */

const State = (() => {

  /* ════════════════════════════════════════════
     ÉTAT INITIAL
     ════════════════════════════════════════════ */

  const INITIAL = {
    /* Navigation */
    screen:      'home',
    prevScreen:  null,
    routeParams: [],

    /* Onglet home */
    homeTab: 'map',   /* map | feed */
    heatmapMode: false,
    heatmapData: null,

    /* Signalement en cours (flux 5 étapes : 1-4 formulaire, 5 succès) */
    report: {
      step:        1,
      category:    null,
      subtype:     null,   /* sous-type optionnel */
      location:    null,   /* { label, arrondissement, commune } */
      coords:      null,   /* { lat, lng } */
      photo:       null,   /* data URL ou File */
      description: '',
      priority:    'normal',
      reference:   null,   /* CR-YYYYMMDD-XXXXXX après soumission */
    },

    /* Données chargées */
    reports:        [],
    selectedReport: null,

    /* Agents de terrain */
    agents: [
      { id: 1, name: 'Koffi A.', zone: 'Cotonou', assigned: [] },
      { id: 2, name: 'Mariam B.', zone: 'Cotonou', assigned: [] },
      { id: 3, name: 'Jean C.', zone: 'Abomey-Calavi', assigned: [] },
      { id: 4, name: 'Sarah D.', zone: 'Cotonou', assigned: [] },
    ],

    /* Utilisateur */
    user:        null,   /* { id, name, phone, role, badges, points } */
    isAnonymous: false,
    authToken:   null,

    /* UI */
    loading:      false,
    modalOpen:    false,
    modalPayload: null,
    deleteStep:   0,          /* 0=fermé, 1=confirmation, 2=OTP */

    /* Offline */
    isOnline:       navigator.onLine,
    pendingReports: [],   /* signalements à envoyer quand réseau revient */

    /* Admin */
    adminFilters: { status: '', category: '', search: '', dateFrom: '', dateTo: '' },
    adminSort:    { col: 'date', dir: 'desc' },
    adminPage:    0,
    adminAlerts:  [],
    showAlertPanel: false,
    adminSettingsTab: 'categories',
    adminConfig: {
      categories: [
        { id: 'roads',    label: 'Voirie',       color: '#e74c3c', icon: 'ti-road',       active: true },
        { id: 'water',    label: 'Eau',          color: '#3498db', icon: 'ti-droplet',    active: true },
        { id: 'waste',    label: 'Déchets',      color: '#e67e22', icon: 'ti-trash',      active: true },
        { id: 'light',    label: 'Éclairage',    color: '#f1c40f', icon: 'ti-lamp',       active: true },
        { id: 'flood',    label: 'Inondation',   color: '#2980b9', icon: 'ti-flood',      active: true },
        { id: 'health',   label: 'Santé',        color: '#2ecc71', icon: 'ti-heartbeat',  active: true },
        { id: 'security', label: 'Sécurité',     color: '#9b59b6', icon: 'ti-shield',     active: true },
        { id: 'other',    label: 'Autre',        color: '#95a5a6', icon: 'ti-dots',      active: true },
      ],
      zones: [
        { id: 'cotonou',        label: 'Cotonou',      active: true, quartiers: ['Akpakpa','Cadjehoun','Fidjrossè','Vèdoko','Gbégamey','Jonquet','Haie-Vive','Zongo','Agla'] },
        { id: 'calavi',         label: 'Abomey-Calavi', active: true, quartiers: ['Calavi Centre','Godomey','Kpanroun','Tankpè'] },
        { id: 'porto-novo',     label: 'Porto-Novo',   active: true, quartiers: ['Akron','Ouando','Sèmè','Dowa'] },
        { id: 'parakou',        label: 'Parakou',      active: true, quartiers: ['Kpérou','Albarika','Titirou','Baka'] },
      ],
      plan: null,   /* null | 'starter' | 'pro' | 'enterprise' */
    },

    /* Préférences (persistées) */
    prefs: {
      theme:         'dark',    /* dark | light */
      lang:          'fr',      /* fr | en | fon */
      notifications: true,
      dataSaver:     false,
      anonymous:     false,
    },

    /* Inscription OTP */
    signupStep:     1,
    signupPhone:    '',
    signupOperator: 'mtn',
    signupTimer:    0,
    showBadgeModal: null,
    suiviTab: 'all',
    suiviPage: 0,
    quartierSort: 'resolved',
    showSharePanel: false,
    shareData: null,
    pushSubscription: null,
    communityPosts: [],
    surveys: [],
    showSurveyModal: false,
    surveyReportId: null,
    payments: [],
    payAmount: 0,
    payDescription: '',
    payPlan: null,  /* null | plan id */
    payStatus: null,  /* null | 'pending' | 'success' | 'error' */
    showMomoModal: false,
    momoOperator: 'mtn',  /* 'mtn' | 'moov' */
    momoPhone: '',
    momoAmount: 0,
    momoDesc: '',
    momoCountdown: 0,
    momoStatus: null,  /* null | 'waiting' | 'sending' | 'success' | 'error' */
    showDonateModal: false,
    donateReportId: null,
    donateAmount: 0,
    donations: [],
    votedReports: {},     /* { [reportId]: 'up' | 'down' } — persisté */

    /* Amendes */
    amendeNumber: '',
    amendeAmount: 0,
    amendeStatus: null,  /* null | 'pending' | 'success' | 'error' */
    amendeReceipt: null,  /* { ref, amount, date, method, description } */
    amendeData: null,     /* données de l'amende après recherche */
    receipts: [],         /* historique des reçus */
  };

  /* ════════════════════════════════════════════
     RÉPUTATION & BADGES
     ════════════════════════════════════════════ */

  const POINTS = {
    report_sent:      5,
    report_confirmed: 15,
    report_resolved:  25,
    vote_given:       1,
    comment_posted:   2,
    first_report:     50,
  };

  const BADGES = [
    { id:'first',     label:'Premier pas',     icon:'👣', condition: s => s.reportsCount >= 1 },
    { id:'active5',   label:'Citoyen actif',   icon:'⭐', condition: s => s.reportsCount >= 5 },
    { id:'resolved3', label:'Efficace',        icon:'✅', condition: s => s.resolvedCount >= 3 },
    { id:'voter',     label:'Engagé',          icon:'👍', condition: s => s.votesCount >= 10 },
    { id:'veteran',   label:'Vétéran',         icon:'🏆', condition: s => s.reportsCount >= 20 },
  ];

  const PLANS = [
    { id:'starter',    label:'Starter',    price:25000,  currency:'FCFA/mois', features:['1 commune', '100 signalements/mois', 'Dashboard basique'] },
    { id:'pro',        label:'Pro',        price:75000,  currency:'FCFA/mois', features:['3 communes', 'Signalements illimités', 'Rapport mensuel', 'API accès'] },
    { id:'enterprise', label:'Mairie+',    price:0,      currency:'Sur devis', features:['Toutes communes', 'Support dédié', 'Intégration système mairie', 'Formation équipe'] },
  ];

  const ADS = [
    { id:1, name:'Pharmacie Sainte-Rita', zone:'cadjehoun', cta:'Voir le site', url:'#', color:'#0A84FF', icon:'ti-medical-cross' },
    { id:2, name:'Boulangerie Moderne',   zone:'agla',      cta:'Commander',    url:'#', color:'#FF9500', icon:'ti-cookie' },
    { id:3, name:'Quincaillerie Générale', zone:'vedoko',   cta:'Voir',          url:'#', color:'#34C759', icon:'ti-tool' },
    { id:4, name:'Restaurant Chez Awa',   zone:'fidjrosse', cta:'Réserver',     url:'#', color:'#FF3B30', icon:'ti-fork-knife' },
    { id:5, name:'Librairie Moderne',     zone:'akpakpa',   cta:'Découvrir',    url:'#', color:'#5856D6', icon:'ti-books' },
  ];

  const SUBTYPES = {
    roads:    ['Nid-de-poule', 'Route non-bitumée', 'Absence de trottoir', 'Chaussée déformée'],
    flood:    ['Canal bouché', 'Inondation domicile', 'Eau stagnante', 'ruissellement'],
    light:    ['Lampe cassée', 'Câble apparent', 'Panne générale', 'Éclairage insuffisant'],
    waste:    ['Dépôt sauvage', 'Absence de collecte', 'Décharge illégale', 'Bac plein'],
    water:    ['Fuite', 'Coupure', 'Eau impropre', 'Pression faible'],
    security: ['Éclairage public', 'Insécurité nocturne', 'Marché illégal', 'Occupation voie'],
    health:   ['Nuisibles', 'Odeurs', 'Déchets médicaux', 'Eau stagnante'],
    other:    [],
  };

  /* ── Computed streak from state ── */
  function _computeStreak(S) {
    const myReports = S.user ? S.reports.filter(r => r.userId === S.user.id) : [];
    return {
      reportsCount:  myReports.length,
      resolvedCount: myReports.filter(r => r.status === 'done').length,
      votesCount:    myReports.reduce((sum, r) => sum + (r.votes || 0), 0),
    };
  }

  /* ── Vérifier et débloquer les badges ── */
  function _checkBadges(S, skipToast) {
    if (!S.user) return;
    const streak = _computeStreak(S);
    const userBadges = S.user.badges || [];
    const earnedIds = userBadges.map(b => b.id);
    let newBadge = null;

    for (const badge of BADGES) {
      if (earnedIds.includes(badge.id)) continue;
      if (badge.condition(streak)) {
        newBadge = badge;
        break;
      }
    }

    if (newBadge) {
      const updatedBadges = [...userBadges, newBadge];
      const totalPoints = S.user.points || 0;
      go({
        user: { ...S.user, badges: updatedBadges, points: totalPoints },
        showBadgeModal: newBadge,
      });
      if (!skipToast) toast(`🏆 Badge débloqué : ${newBadge.label} !`, 'ok', 4000);
    }
  }

  function _awardPoints(amount) {
    if (!S.user) return;
    go({ user: { ...S.user, points: (S.user.points || 0) + amount } });
  }

  /* ── État courant (copie mutable) ── */
  let S = _deepClone(INITIAL);

  /* ── Clés à persister dans localStorage ── */
  const PERSIST_KEYS = ['user', 'authToken', 'prefs', 'pendingReports', 'reports', 'adminAlerts', 'adminConfig', 'votedReports', 'payments', 'donations', 'receipts'];

  /* ── Listeners ── */
  const _listeners = new Set();

  /* ── Middlewares ── */
  const _middlewares = [];


  /* ════════════════════════════════════════════
     HELPERS INTERNES
     ════════════════════════════════════════════ */

  function _deepClone(obj) {
    /* JSON clone — suffisant pour notre state (pas de Date, Map, etc.) */
    return JSON.parse(JSON.stringify(obj));
  }

  /* Logger middleware (dev seulement) */
  function _logger(prev, next, patch) {
    if (typeof console !== 'undefined' && location.hostname === 'localhost') {
      console.groupCollapsed(`[State] %c${Object.keys(patch).join(', ')}`, 'color:#C8FF00');
      console.log('patch :', patch);
      console.log('next  :', next);
      console.groupEnd();
    }
  }

  /* Persistor middleware */
  function _persistor(prev, next) {
    try {
      const toSave = {};
      PERSIST_KEYS.forEach(k => {
        if (next[k] === undefined) return;
        /* Exclure les photos data-URL des signalements pour économiser le quota localStorage */
        if (k === 'reports' || k === 'pendingReports') {
          toSave[k] = next[k].map(r => ({ ...r, photo: null }));
        } else {
          toSave[k] = next[k];
        }
      });
      localStorage.setItem('cr_state', JSON.stringify(toSave));
    } catch (e) {
      /* localStorage plein ou bloqué — silencieux */
    }
  }

  /* Charger depuis localStorage au démarrage */
  function _loadPersisted() {
    try {
      const raw = localStorage.getItem('cr_state');
      if (!raw) return;
      const saved = JSON.parse(raw);
      PERSIST_KEYS.forEach(k => {
        if (saved[k] !== undefined) {
          /* Merge profond pour les objets (ex: prefs) */
          if (typeof saved[k] === 'object' && saved[k] !== null && !Array.isArray(saved[k])) {
            S[k] = Object.assign({}, S[k], saved[k]);
          } else {
            S[k] = saved[k];
          }
        }
      });
    } catch (e) {
      /* Donnée corrompue — on repart de zéro */
      localStorage.removeItem('cr_state');
    }
  }

  /* Notifier les listeners */
  function _notify(patch) {
    _listeners.forEach(fn => { try { fn(S, patch); } catch (e) { console.error('[State] listener error', e); } });
  }

  /* Appliquer les middlewares */
  function _runMiddlewares(prev, next, patch) {
    _logger(prev, next, patch);
    _persistor(prev, next, patch);
    _middlewares.forEach(fn => { try { fn(prev, next, patch); } catch (e) {} });
    _checkAlertThresholds(prev, next);
  }

  /* Seuils d'alertes automatiques */
  const ALERT_THRESHOLD = 5; /* si >5 urgents → alerte */
  function _checkAlertThresholds(prev, next) {
    if (!next.adminAlerts) return;
    const urgent = next.reports.filter(r => r.status === 'urgent').length;
    if (urgent > ALERT_THRESHOLD) {
      const alreadyAlerted = next.adminAlerts.some(a => a.type === 'threshold' && a.count === urgent);
      if (!alreadyAlerted) {
        const alert = {
          id: Date.now(),
          type: 'threshold',
          message: `⚠️ Seuil critique : ${urgent} signalements urgents (seuil: ${ALERT_THRESHOLD})`,
          count: urgent,
          read: false,
          createdAt: new Date().toISOString(),
        };
        next.adminAlerts.push(alert);
        _persist();
      }
    }
  }


  /* ════════════════════════════════════════════
     API CORE
     ════════════════════════════════════════════ */

  /* go(patch) — mise à jour à plat */
  function go(patch) {
    const prev = _deepClone(S);
    Object.assign(S, patch);
    _runMiddlewares(prev, S, patch);
    _notify(patch);
    App.render();
  }

  /* goNested(key, patch) — mise à jour d'un sous-objet */
  function goNested(key, patch) {
    const prev = _deepClone(S);
    S[key] = Object.assign({}, S[key], patch);
    const p = { [key]: S[key] };
    _runMiddlewares(prev, S, p);
    _notify(p);
    App.render();
  }

  /* setSilent(patch) — met à jour S sans render, sans notify, sans middlewares */
  function setSilent(patch) {
    Object.assign(S, patch);
  }

  /* setSilentNested(key, patch) — met à jour S[key] sans render */
  function setSilentNested(key, patch) {
    S[key] = Object.assign({}, S[key], patch);
  }

  /* get() — lecture */
  function get() { return S; }

  /* subscribe(fn) — écouter les changements, retourne unsubscribe */
  function subscribe(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  }

  /* use(middleware) — ajouter un middleware (fn(prev, next, patch)) */
  function use(fn) { _middlewares.push(fn); }

  /* reset(keys?) — réinitialiser tout ou des clés spécifiques */
  function reset(keys = null) {
    if (keys) {
      const patch = {};
      keys.forEach(k => { patch[k] = _deepClone(INITIAL[k]); });
      go(patch);
    } else {
      S = _deepClone(INITIAL);
      _notify({});
      App.render();
    }
  }


  /* ════════════════════════════════════════════
     NAVIGATION (appelée par Router)
     ════════════════════════════════════════════ */

  function navigate(screen, params = []) {
    Object.assign(S, { prevScreen: S.screen, screen, routeParams: params });
    /* Pas de render ici — Router s'en charge */
  }

  function back() {
    Router.back();
  }


  /* ════════════════════════════════════════════
     TOASTS
     ════════════════════════════════════════════ */

  const TOAST_ICONS = {
    ok:   'circle-check',
    err:  'circle-x',
    info: 'info-circle',
    warn: 'alert-triangle',
  };

  function toast(message, type = 'ok', duration = 3000) {
    const container = document.getElementById('toasts');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.setAttribute('role', 'alert');
    el.innerHTML = `
      <i class="ti ti-${TOAST_ICONS[type] || TOAST_ICONS.ok} toast-icon" aria-hidden="true"></i>
      <span>${message}</span>
    `;

    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));

    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 400);
    }, duration);
  }


  /* ════════════════════════════════════════════
     ACTIONS MÉTIER
     Encapsulent la logique applicative —
     les screens n'appellent jamais go() directement
     pour les actions complexes
     ════════════════════════════════════════════ */

  const Actions = {

    /* ── Auth ── */

    login(user, token) {
      go({ user, authToken: token, isAnonymous: false });
      toast(`Bienvenue, ${user.name} !`, 'ok');
    },

    logout() {
      go({ user: null, authToken: null, isAnonymous: false });
      /* Nettoyer le localStorage */
      try { localStorage.removeItem('cr_state'); } catch (e) {}
      Router.replace('home');
      toast('Déconnexion réussie', 'info');
    },

    loginAnonymous() {
      go({ isAnonymous: true, user: null });
    },

    /* ── Signalement en cours ── */

    setReportStep(step) {
      goNested('report', { step });
    },

    setReportCategory(category) {
      const st = SUBTYPES[category] || [];
      const currentSub = S.report.subtype;
      const subtype = st.length && st.includes(currentSub) ? currentSub : null;
      goNested('report', { category, subtype });
    },

    setReportLocation(location, coords = null) {
      goNested('report', { location, coords, step: 3 });
    },

    setReportPhoto(photo) {
      goNested('report', { photo, step: 4 });
    },

    setReportDescription(description) {
      goNested('report', { description });
    },

    resetReport() {
      goNested('report', _deepClone(INITIAL.report));
    },

    /* ── Soumettre un signalement ── */

    async submitReport() {
      const { report, user, isAnonymous, pendingReports } = S;

      /* Validation minimale */
      if (!report.category) { toast('Choisissez une catégorie', 'err'); return false; }
      if (!report.location)  { toast('Indiquez la localisation', 'err'); return false; }

      go({ loading: true });

      /* Générer une référence unique : CR-AAAAMMJJ-XXXXXX */
      const ref = `CR-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Date.now()).slice(-6)}`;

      const payload = {
        id:          Date.now(),
        ref,
        category:    report.category,
        subtype:     report.subtype,
        location:    report.location,
        coords:      report.coords,
        description: report.description,
        photo:       report.photo,   /* data URL compressée — disponible en session */
        status:      'new',
        votes:       0,
        createdAt:   new Date().toISOString(),
        userId:      (isAnonymous || S.prefs.anonymous) ? null : (user?.id || null),
        anonymous:   isAnonymous || S.prefs.anonymous,
        donationGoal: 50000,
        donationsCollected: 0,
      };

      /* Si hors ligne → file d'attente */
      if (!S.isOnline) {
        go({
          loading: false,
          pendingReports: [...pendingReports, payload],
        });
        toast('Signalement sauvegardé — envoi dès reconnexion', 'warn', 4000);
        goNested('report', { step: 5, reference: ref });
        return true;
      }

      /* En ligne → simuler un appel API (sera remplacé par vrai fetch en partie #20) */
      await new Promise(r => setTimeout(r, 800));

      /* Capturer la longueur AVANT go() pour détecter le 1er signalement */
      const isFirstReport = S.reports.length === 0;

      go({
        loading:  false,
        reports:  [payload, ...S.reports],
      });

      /* Points & badges */
      let earnedPoints = POINTS.report_sent;
      if (isFirstReport) earnedPoints += POINTS.first_report; /* premier signalement */
      _awardPoints(earnedPoints);
      _checkBadges({ ...S, reports: [payload, ...S.reports] });

      toast('Signalement envoyé ! Merci 🙌', 'ok', 4000);
      goNested('report', { step: 5, reference: ref });
      return true;
    },

    /* ── Vote ── */

    voteReport(reportId, direction = 'up') {
      const voted = S.votedReports || {};
      const already = voted[String(reportId)];

      let delta = 0;
      const newVoted = { ...voted };

      if (already === direction) {
        /* Re-cliquer sur le même bouton → annuler le vote */
        delta = direction === 'up' ? -1 : 1;
        delete newVoted[String(reportId)];
      } else if (already) {
        /* Changer de direction (up → down ou down → up) */
        delta = direction === 'up' ? 2 : -2;
        newVoted[String(reportId)] = direction;
      } else {
        /* Nouveau vote */
        delta = direction === 'up' ? 1 : -1;
        newVoted[String(reportId)] = direction;
      }

      const reports = S.reports.map(r => {
        if (String(r.id) !== String(reportId)) return r;
        return { ...r, votes: Math.max(0, (r.votes || 0) + delta), userVote: newVoted[String(reportId)] || null };
      });

      go({ reports, votedReports: newVoted });
      if (direction === 'up' && !already) {
        _awardPoints(POINTS.vote_given);
        _checkBadges({ ...S, reports });
      }
    },

    /* ── Synchronisation offline → online ── */

    async syncPendingReports() {
      const { pendingReports } = S;
      if (!pendingReports.length) return 0;

      go({ loading: true });

      /* Simuler l'envoi (remplacé par API réelle en partie #20) */
      await new Promise(r => setTimeout(r, 600));

      const synced = pendingReports.map(p => ({ ...p, status: 'new' }));

      go({
        loading: false,
        reports: [...synced, ...S.reports],
        pendingReports: [],
      });

      toast(`${synced.length} signalement(s) synchronisé(s) ✓`, 'ok', 4000);
      return synced.length;
    },

    /* ── Mettre à jour le statut d'un signalement (agent/admin) ── */

    updateReportStatus(reportId, newStatus, note) {
      const now = new Date().toISOString();
      const reports = S.reports.map(r => {
        if (String(r.id) !== String(reportId)) return r;
        const history = r.statusHistory || [];
        return {
          ...r,
          status: newStatus,
          statusHistory: [...history, { status: newStatus, note: note || '', date: now, agentId: S.user?.id || null }],
        };
      });
      go({ reports });
      const labels = { new:'Nouveau', progress:'En cours', done:'Résolu', urgent:'Urgent', rejected:'Rejeté' };
      toast(`Statut mis à jour : ${labels[newStatus] || newStatus}`, 'ok');
      /* Si résolu, proposer un sondage */
      if (newStatus === 'done') {
        const already = S.surveys.some(s => s.reportId === reportId);
        if (!already) {
          setTimeout(() => go({ showSurveyModal: true, surveyReportId: reportId }), 500);
        }
      }
    },

    /* ── Demander un changement de statut (ouvre la modale) ── */

    requestStatusChange(reportId, newStatus) {
      go({ modalOpen: true, modalPayload: { type: 'statusChange', reportId, newStatus } });
    },

    /* ── Confirmer le changement avec note ── */

    confirmStatusChange(note) {
      if (!S.modalPayload || S.modalPayload.type !== 'statusChange') return;
      const { reportId, newStatus } = S.modalPayload;
      if (!note || !note.trim()) { toast('La note est obligatoire', 'err'); return; }
      this.updateReportStatus(reportId, newStatus, note.trim());
      go({ modalOpen: false, modalPayload: null });
    },

    /* ── Annuler le changement ── */

    cancelStatusChange() {
      go({ modalOpen: false, modalPayload: null });
    },

    /* ── Assigner un agent ── */

    assignReport(reportId, agentId) {
      const reports = S.reports.map(r => {
        if (String(r.id) !== String(reportId)) return r;
        return { ...r, agentId: agentId || null };
      });
      const agents = S.agents.map(a => {
        if (a.id === agentId) return { ...a, assigned: [...a.assigned.filter(id => id !== reportId), reportId] };
        if (agentId && S.reports.find(r => String(r.id) === String(reportId) && r.agentId === a.id)) {
          return { ...a, assigned: a.assigned.filter(id => id !== reportId) };
        }
        return a;
      });
      go({ reports, agents });
      if (agentId) {
        const agentName = S.agents.find(a => a.id === agentId)?.name || '';
        toast(`Assigné à ${agentName}`, 'ok');
      } else {
        toast('Agent retiré', 'info');
      }
    },

    /* ── Demander assignation (ouvre modale) ── */

    requestAssignModal(reportId) {
      go({ modalOpen: true, modalPayload: { type: 'assignAgent', reportId } });
    },

    /* ── Alertes admin ── */

    addAlert(alert) {
      const newAlert = { id: Date.now(), date: new Date().toISOString(), read: false, ...alert };
      go({ adminAlerts: [newAlert, ...S.adminAlerts] });
    },

    markAllAlertsRead() {
      const updated = S.adminAlerts.map(a => ({ ...a, read: true }));
      go({ adminAlerts: updated });
    },

    toggleAlertPanel() {
      go({ showAlertPanel: !S.showAlertPanel });
    },

    /* ── Supprimer un signalement (admin) ── */

    deleteReport(reportId) {
      const filtered = S.reports.filter(r => String(r.id) !== String(reportId));
      if (filtered.length === S.reports.length) return;
      go({ reports: filtered });
      toast('Signalement supprimé', 'info');
    },

    /* ── Supprimer un signalement en attente ── */

    deletePendingReport(id) {
      const filtered = S.pendingReports.filter(r => String(r.id) !== String(id));
      if (filtered.length === S.pendingReports.length) return;
      go({ pendingReports: filtered });
      toast('Signalement supprimé', 'info');
    },

    /* ── Admin Config (catégories & zones) ── */

    addCategory(cat) {
      const config = { ...S.adminConfig };
      config.categories = [...config.categories, { ...cat, active: true }];
      go({ adminConfig: config });
    },

    updateCategory(id, updates) {
      const config = { ...S.adminConfig };
      config.categories = config.categories.map(c => c.id === id ? { ...c, ...updates } : c);
      go({ adminConfig: config });
    },

    deleteCategory(id) {
      const used = S.reports.some(r => r.category === id);
      if (used) {
        toast('Impossible de supprimer cette catégorie : des signalements y sont rattachés', 'error');
        return;
      }
      const config = { ...S.adminConfig };
      config.categories = config.categories.filter(c => c.id !== id);
      go({ adminConfig: config });
      toast('Catégorie supprimée', 'info');
    },

    toggleZone(id) {
      const config = { ...S.adminConfig };
      config.zones = config.zones.map(z => z.id === id ? { ...z, active: !z.active } : z);
      go({ adminConfig: config });
    },

    toggleQuartier(zoneId, quartierName) {
      const config = { ...S.adminConfig };
      config.zones = config.zones.map(z => {
        if (z.id !== zoneId) return z;
        const qs = z.quartiers.includes(quartierName)
          ? z.quartiers.filter(q => q !== quartierName)
          : [...z.quartiers, quartierName];
        return { ...z, quartiers: qs };
      });
      go({ adminConfig: config });
    },

    setAdminSettingsTab(tab) {
      go({ adminSettingsTab: tab });
    },

    setSuiviTab(tab) {
      go({ suiviTab: tab, suiviPage: 0 });
    },

    setQuartierSort(sort) {
      go({ quartierSort: sort });
    },

    /* ── Notifications push ── */

    async enablePushNotifications() {
      if (S.prefs.anonymous) { toast('Mode anonyme : les notifications sont désactivées', 'warn'); return; }
      if (!('Notification' in window)) {
        toast('Les notifications ne sont pas supportées sur ce navigateur', 'err');
        return;
      }
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS && !('serviceWorker' in navigator && 'pushManager' in navigator && 'Notification' in window)) {
        toast('Les notifications push requièrent iOS 16.4+', 'warn', 5000);
        return;
      }
      try {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          toast('Permission refusée — activez-la dans les réglages', 'err');
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const vapidKey = 'BKJiMPSy-NX3qGkM8GqZmJk0TpAlXGf0XKoWzYcO-T_1KJHnYfG0qUo0qUo0qUo0qUo0qUo0qUo0qUo0qUo-abc';
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        });
        go({ pushSubscription: sub, prefs: { ...S.prefs, notifications: true } });
        toast('Notifications activées !', 'ok');
        new Notification('CityReport', {
          body: 'Vos signalements seront suivis en temps réel',
          icon: '/icons/icon-192.png',
        });
      } catch (e) {
        toast('Erreur d\'activation : ' + e.message, 'err');
      }
    },

    disablePushNotifications() {
      go({ pushSubscription: null });
      toast('Notifications désactivées', 'info');
    },

    /* ── Communauté ── */

    addCommunityPost(text) {
      if (!S.user) { toast('Connectez-vous pour poster', 'err'); return; }
      const post = {
        id: Date.now(),
        userId: S.user.id,
        userName: S.user.name,
        text: text.trim(),
        likes: 0,
        likedBy: [],
        createdAt: new Date().toISOString(),
      };
      go({ communityPosts: [post, ...S.communityPosts] });
      toast('Message posté !', 'ok');
    },

    likeCommunityPost(postId) {
      if (!S.user) { toast('Connectez-vous pour voter', 'err'); return; }
      const posts = S.communityPosts.map(p => {
        if (p.id !== postId) return p;
        const already = (p.likedBy || []).includes(S.user.id);
        return {
          ...p,
          likes: already ? (p.likes || 1) - 1 : (p.likes || 0) + 1,
          likedBy: already ? (p.likedBy || []).filter(id => id !== S.user.id) : [...(p.likedBy || []), S.user.id],
        };
      });
      go({ communityPosts: posts });
    },

    flagCommunityPost(postId, reason) {
      const posts = S.communityPosts.map(p => {
        if (p.id !== postId) return p;
        const flags = p.flags || [];
        if (flags.some(f => f.userId === S.user?.id)) return p;
        return { ...p, flags: [...flags, { userId: S.user?.id, reason, date: new Date().toISOString() }] };
      });
      go({ communityPosts: posts });
      toast('Signalement envoyé ✓', 'ok');
    },

    setUserQuartier(quartier) {
      if (!S.user) return;
      go({ user: { ...S.user, quartier } });
    },

    /* ── Sondages satisfaction ── */

    submitSurvey(rating, comment) {
      const reportId = S.surveyReportId;
      if (!reportId) return;
      const survey = { reportId, rating, comment: comment || '', date: new Date().toISOString() };
      go({ surveys: [...S.surveys, survey], showSurveyModal: false, surveyReportId: null });
      toast('Merci pour votre retour !', 'ok');
    },

    skipSurvey() {
      go({ showSurveyModal: false, surveyReportId: null });
    },

    requestSurvey(reportId) {
      const already = S.surveys.some(s => s.reportId === reportId);
      if (!already) go({ showSurveyModal: true, surveyReportId: reportId });
    },

    /* ── Inscription OTP ── */

    setSignupPhone(phone) {
      go({ signupPhone: phone });
    },

    setSignupOperator(op) {
      go({ signupOperator: op });
    },

    goToOtpStep() {
      go({ signupStep: 2, signupTimer: 60 });
    },

    goToPhoneStep() {
      go({ signupStep: 1, signupTimer: 0 });
    },

    decrementTimer() {
      const t = S.signupTimer - 1;
      go({ signupTimer: Math.max(0, t) });
    },

    resetSignup() {
      go({ signupStep: 1, signupPhone: '', signupOperator: 'mtn', signupTimer: 0 });
    },

    /* ── Paiement FedaPay ── */

    initPay(amount, description, planId) {
      go({ payAmount: amount, payDescription: description, payPlan: planId || null, payStatus: null });
    },

    paySuccess(data) {
      const payment = {
        id: Date.now(),
        amount: S.payAmount,
        description: S.payDescription,
        transactionId: data?.transaction?.id || 'demo_' + Date.now(),
        date: new Date().toISOString(),
        status: 'completed',
      };
      const patch = {
        payments: [...S.payments, payment],
        payStatus: 'success',
        payAmount: 0,
        payDescription: '',
      };
      /* Si l'achat est un plan d'abonnement, mettre à jour le plan */
      if (S.payPlan && PLANS.some(p => p.id === S.payPlan)) {
        patch.adminConfig = { ...S.adminConfig, plan: S.payPlan };
        patch.payPlan = null;
        toast(`Abonnement ${PLANS.find(p => p.id === S.payPlan).label} activé !`, 'ok', 4000);
      } else {
        toast(`Paiement de ${payment.amount} FCFA confirmé !`, 'ok');
      }
      go(patch);
    },

    payError(msg) {
      go({ payStatus: 'error' });
      toast('Erreur de paiement : ' + (msg || 'transaction annulée'), 'err');
    },

    setPlan(planId) {
      if (!planId) {
        go({ adminConfig: { ...S.adminConfig, plan: null }, payPlan: null });
        toast('Abonnement résilié', 'info');
      } else if (PLANS.some(p => p.id === planId)) {
        go({ adminConfig: { ...S.adminConfig, plan: planId } });
        toast(`Plan ${PLANS.find(p => p.id === planId).label} activé`, 'ok');
      }
    },

    /* ── MTN Mobile Money ── */

    openMomoModal(amount, desc, operator) {
      go({ showMomoModal: true, momoOperator: operator || 'mtn', momoPhone: '', momoAmount: amount, momoDesc: desc, momoCountdown: 120, momoStatus: 'waiting' });
    },

    setMomoPhone(phone) {
      go({ momoPhone: phone });
    },

    momoCountdownTick() {
      if (S.momoCountdown > 0) go({ momoCountdown: S.momoCountdown - 1 });
    },

    momoSuccess(data) {
      const op = S.momoOperator === 'moov' ? 'moov' : 'mtn';
      const opLabel = op === 'moov' ? 'Moov' : 'MTN';
      const payment = {
        id: Date.now(),
        amount: S.momoAmount,
        description: S.momoDesc,
        transactionId: data?.transaction?.id || op + '_' + Date.now(),
        method: op + '_money',
        date: new Date().toISOString(),
        status: 'completed',
      };
      const patch = {
        payments: [...S.payments, payment],
        momoStatus: 'success',
        showMomoModal: false,
        momoCountdown: 0,
      };
      /* Si c'est un abonnement, activer le plan */
      if (S.payPlan && PLANS.some(p => p.id === S.payPlan)) {
        patch.adminConfig = { ...S.adminConfig, plan: S.payPlan };
        patch.payPlan = null;
      }
      go(patch);
      toast(`Paiement ${opLabel} de ${payment.amount} FCFA confirmé !`, 'ok');
    },

    momoError(msg) {
      const opLabel = S.momoOperator === 'moov' ? 'Moov' : 'MTN';
      go({ momoStatus: 'error', showMomoModal: false, momoCountdown: 0 });
      toast(`Erreur ${opLabel} Money : ` + (msg || 'transaction annulée'), 'err');
    },

    closeMomoModal() {
      go({ showMomoModal: false, momoCountdown: 0, momoStatus: null });
    },

    /* ── Dons citoyens ── */

    openDonateModal(reportId) {
      go({ showDonateModal: true, donateReportId: reportId, donateAmount: 0 });
    },

    setDonateAmount(amount) {
      go({ donateAmount: amount });
    },

    submitDonation(amount, method) {
      const reportId = S.donateReportId;
      if (!reportId || !amount || amount < 100) { toast('Montant minimum : 100 FCFA', 'warn'); return; }
      const donorName = S.user?.name || 'Anonyme';
      const donorInitials = donorName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      const donation = {
        id: Date.now(),
        reportId,
        amount,
        method: method || 'card',
        donor: donorInitials,
        donorFull: donorName,
        date: new Date().toISOString(),
      };
      const updatedReports = S.reports.map(r => {
        if (r.id != reportId) return r;
        const collected = (r.donationsCollected || 0) + amount;
        return { ...r, donationsCollected: collected };
      });
      go({
        donations: [...S.donations, donation],
        reports: updatedReports,
        showDonateModal: false,
        donateReportId: null,
        donateAmount: 0,
        payStatus: 'success',
      });
      toast(`Don de ${amount} FCFA enregistré ! Merci ${donorName.split(' ')[0]} 🙏`, 'ok', 4000);
    },

    closeDonateModal() {
      go({ showDonateModal: false, donateReportId: null, donateAmount: 0 });
    },

    /* ── Préférences ── */

    openModal(payload) {
      go({ modalOpen: true, modalPayload: payload });
    },

    closeBadgeModal() {
      go({ showBadgeModal: null });
    },

    closeModal() {
      go({ modalOpen: false, modalPayload: null });
    },

    /* ── Amendes ── */

    setAmendeNumber(number) {
      const DEMO_AMENDES = {
        'AM-2024-001': { number: 'AM-2024-001', amount: 15000, reason: 'Stationnement interdit', date: '2024-03-15', commune: 'Cotonou' },
        'AM-2024-002': { number: 'AM-2024-002', amount: 25000, reason: 'Excès de vitesse', date: '2024-04-02', commune: 'Abomey-Calavi' },
        'AM-2024-003': { number: 'AM-2024-003', amount: 10000, reason: 'Défaut de permis', date: '2024-05-10', commune: 'Porto-Novo' },
      };
      const data = DEMO_AMENDES[number] || null;
      go({
        amendeNumber: number,
        amendeAmount: data ? data.amount : 0,
        amendeData: data,
      });
    },

    async payAmende() {
      const { amendeData } = S;
      if (!amendeData) { toast('Aucune amende trouvée', 'err'); return; }
      go({ amendeStatus: 'pending' });

      /* Simulation FedaPay */
      await new Promise(r => setTimeout(r, 1500));

      const receipt = {
        ref: `REC-AM-${Date.now().toString(36).toUpperCase()}`,
        amount: amendeData.amount,
        method: 'Carte bancaire',
        date: new Date().toISOString(),
        description: `Amende ${amendeData.number} — ${amendeData.reason}`,
      };

      go({
        amendeStatus: 'success',
        amendeReceipt: receipt,
        receipts: [receipt, ...(S.receipts || [])],
      });

      toast(`Amende ${amendeData.number} payée !`, 'ok', 4000);
    },

    resetAmende() {
      go({ amendeNumber: '', amendeAmount: 0, amendeStatus: null, amendeReceipt: null, amendeData: null });
    },
  };


  /* ════════════════════════════════════════════
     INIT
     ════════════════════════════════════════════ */

  function init() {
    _loadPersisted();
  }


  /* ════════════════════════════════════════════
     API PUBLIQUE
     ════════════════════════════════════════════ */

  return {
    /* Core */
    get, go, goNested, setSilent, setSilentNested, subscribe, use, reset, init,
    /* Navigation */
    navigate, back,
    /* UI */
    toast,
    /* Actions */
    Actions,
    /* Constants */
    PLANS,
    ADS,
    SUBTYPES,
    /* Debug */
    _dump: () => _deepClone(S),
  };

})();

window.State = State;
