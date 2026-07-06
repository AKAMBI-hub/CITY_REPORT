/* ════════════════════════════════════════════════
   CityReport PWA — App (js/app.js)
   Orchestrateur : render() + bind() + screens
   ════════════════════════════════════════════════ */

const App = (() => {

  const VERSION = '1.0.0';

  /* ── État local (non persisté, survit aux re-renders) ── */
  const FILTERS = ['all', 'new', 'progress', 'done', 'urgent'];
  const CAT_LABELS = { roads:'Voirie', water:'Eau', waste:'Déchets', light:'Éclairage', flood:'Inondation', health:'Santé', security:'Sécurité', other:'Autre' };
  const CAT_COLORS = { roads:'var(--cat-roads)', water:'var(--cat-water)', waste:'var(--cat-waste)', light:'var(--cat-light)', flood:'var(--cat-flood)', health:'var(--cat-health)', security:'var(--cat-security)', other:'var(--cat-other)' };
  const STATUS_LABELS = { new:'Nouveau', progress:'En cours', done:'Résolu', urgent:'Urgent', rejected:'Rejeté' };
  const STATUS_CLS = { new:'status-new', progress:'status-progress', done:'status-done', urgent:'status-urgent', rejected:'status-rejected' };
  const STATUS_OPTIONS = ['new', 'progress', 'done', 'rejected'];

  /* ════════════════════════════════════════════
     SCREENS
     ════════════════════════════════════════════ */

  function _buildHeatmapData(reports, zoneLabels) {
    const counts = {};
    reports.forEach(r => {
      const loc = (r.location?.label || r.location || '').toLowerCase();
      let found = null;
      for (const [zoneId, labels] of Object.entries(zoneLabels)) {
        if (labels.some(l => loc.includes(l))) { found = zoneId; break; }
      }
      if (found) counts[found] = (counts[found] || 0) + 1;
    });
    return counts;
  }

  const HEAT_ZONE_LABELS = (() => {
    const map = {};
    const zones = [
      { id:'akpakpa',     labels:['akpakpa'] },
      { id:'cadjehoun',   labels:['cadjehoun'] },
      { id:'godomey-s',   labels:['godomey'] },
      { id:'agla',        labels:['agla'] },
      { id:'fidjrosse',   labels:['fidjrossè','fidjrosse'] },
      { id:'vedoko',      labels:['vèdoko','vedoko'] },
      { id:'gbegamey',    labels:['gbégamey','gbegamey'] },
      { id:'jonquet',     labels:['jonquet'] },
      { id:'haie-vive',   labels:['haie vive','haie-vive'] },
      { id:'zongo',       labels:['zongo'] },
      { id:'tankpe',      labels:['tankpè','tankpe'] },
      { id:'calavi-centre', labels:['calavi centre','calavi-centre'] },
      { id:'godomey',     labels:['godomey'] },
      { id:'kpanroun',    labels:['kpanroun'] },
    ];
    zones.forEach(z => { map[z.id] = z.labels; });
    return map;
  })();

  function _getZoneForReport(report) {
    const loc = (report.location?.label || report.location || '').toLowerCase();
    for (const zid of Object.keys(HEAT_ZONE_LABELS)) {
      if (HEAT_ZONE_LABELS[zid].some(kw => loc.includes(kw))) return zid;
    }
    return '';
  }

  function _renderFeedWithAds(S, showAds) {
    const all = [...S.reports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const ads = State.ADS || [];
    if (!all.length) {
      return `
        <div class="suivi-empty" style="padding:var(--space-xl) 0">
          <i class="ti ti-inbox" style="font-size:48px;display:block;margin-bottom:var(--space-md);opacity:.3"></i>
          <p>Aucun signalement pour l'instant</p>
          <p class="muted" style="font-size:13px">Soyez le premier à signaler un problème !</p>
        </div>`;
    }

    let html = '<div class="stagger-list">';
    all.forEach((r, i) => {
      html += UI.reportCard({
        id: r.id, category: r.category, location: r.location?.label || r.location,
        status: r.status, time: r.createdAt ? _timeAgo(new Date(r.createdAt)) : '',
        votes: r.votes || 0, urgent: r.status === 'urgent', description: r.description || '',
      });
      if (showAds && ads.length && (i + 1) % 5 === 0 && i + 1 < all.length) {
        const zone = _getZoneForReport(r);
        const candidates = zone ? ads.filter(a => a.zone === zone) : [];
        const ad = candidates.length ? candidates[i % candidates.length] : ads[i % ads.length];
        html += _renderAdCard(ad);
      }
    });
    html += '</div>';
    html += `<div class="list-end">${all.length} signalement${all.length > 1 ? 's' : ''}</div>`;
    return html;
  }

  function _renderAdCard(ad) {
    return `
      <div class="card ad-card" style="border-left:3px solid ${ad.color};margin-bottom:var(--space-sm)">
        <div class="flex items-center flex-gap-sm" style="margin-bottom:6px">
          <span class="badge badge-sm" style="background:${ad.color}22;color:${ad.color};font-size:10px;letter-spacing:.5px">
            ⚡ Sponsorisé
          </span>
        </div>
        <div class="flex items-center flex-gap-sm">
          <i class="ti ${ad.icon}" style="color:${ad.color};font-size:20px" aria-hidden="true"></i>
          <div style="flex:1">
            <p class="fw-600" style="font-size:14px;color:${ad.color}">${ad.name}</p>
          </div>
          <a href="${ad.url}" class="btn btn-sm" style="background:${ad.color};color:#fff;white-space:nowrap;border-radius:var(--radius);padding:4px 12px;text-decoration:none">
            ${ad.cta} <i class="ti ti-arrow-right" style="font-size:11px"></i>
          </a>
        </div>
      </div>`;
  }

  function screenHome(S) {
    const recent = S.reports.slice(0, 3);
    const hasReal = recent.length > 0;
    const heatmapData = _buildHeatmapData(S.reports, HEAT_ZONE_LABELS);
    const showAds = !S.prefs.dataSaver;
    const feedTab = S.homeTab === 'feed';

    return `
      <div class="screen-full">

        <!-- Toggle carte / feed -->
        <div class="flex items-center flex-gap-sm" style="padding:var(--space-md) var(--space-md) 0">
          <button class="btn btn-sm ${!feedTab ? 'btn-lime' : 'btn-ghost'}" id="btn-home-map">
            <i class="ti ti-map" style="font-size:14px" aria-hidden="true"></i> Carte
          </button>
          <button class="btn btn-sm ${feedTab ? 'btn-lime' : 'btn-ghost'}" id="btn-home-feed">
            <i class="ti ti-news" style="font-size:14px" aria-hidden="true"></i> Fil
          </button>
        </div>

        ${feedTab ? `
          <!-- Vue Fil avec annonces -->
          <div style="padding:var(--space-md);overflow-y:auto;flex:1">
            <div class="flex-between mb-sm reveal">
              <p class="micro">Fil d'actualité</p>
              <button class="btn btn-ghost btn-sm" id="btn-voir-tout-feed">
                Voir tout <i class="ti ti-arrow-right" style="font-size:12px"></i>
              </button>
            </div>
            ${_renderFeedWithAds(S, showAds)}
          </div>
        ` : `
          <!-- Carte SVG Cotonou/Calavi -->
          ${S.heatmapMode
            ? MapView.renderHeatmap(heatmapData)
            : MapView.render({
                onPinClick: (pin) => {
                  State.go({ selectedReport: pin.id });
                  Router.push('rapport', [pin.id]);
                }
              })}

          <!-- Contrôles carte -->
          <div class="flex-between" style="padding:0 var(--space-md) var(--space-xs)">
            <button class="btn btn-sm${S.heatmapMode ? ' btn-lime' : ' btn-ghost'}" id="btn-toggle-heatmap">
              <i class="ti ti-${S.heatmapMode ? 'map' : 'flame'}" style="font-size:14px" aria-hidden="true"></i>
              ${S.heatmapMode ? 'Carte normale' : 'Carte de chaleur'}
            </button>
          </div>

          <!-- Feed signalements récents -->
          <div style="padding:var(--space-md)">
            <div class="flex-between mb-sm reveal">
              <p class="micro">Signalements récents</p>
              <button class="btn btn-ghost btn-sm" id="btn-voir-tout">
                Voir tout <i class="ti ti-arrow-right" style="font-size:12px"></i>
              </button>
            </div>

            ${S.loading ? UI.skeletonList(3) : `
              <div class="stagger-list">
                ${hasReal
                  ? recent.map(r => UI.reportCard({
                      id: r.id, category: r.category, location: r.location?.label || r.location,
                      status: r.status, time: r.createdAt ? _timeAgo(new Date(r.createdAt)) : '',
                      votes: r.votes || 0, urgent: r.status === 'urgent', description: r.description || '',
                    })).join('')
                  : `
                    ${UI.reportCard({ id:1, category:'roads', location:'Agla, Cotonou',      status:'urgent',   time:'1h', votes:18, urgent:true, description:'Fosse immense devant l\'école' })}
                    ${UI.reportCard({ id:2, category:'flood', location:'Vèdoko, Cotonou',    status:'progress', time:'3h', votes:11, description:'Inondation voie principale après pluie' })}
                    ${UI.reportCard({ id:3, category:'light', location:'Fidjrossè, Cotonou', status:'new',      time:'5h', votes:6,  description:'Éclairage éteint sur 300m de rue' })}
                  `
                }
              </div>
              <div class="list-end">${hasReal ? `${S.reports.length} signalement${S.reports.length > 1 ? 's' : ''}` : '3 signalements récents'}</div>
            `}
          </div>
        `}

      </div>
    `;
  }

  function screenSignaler(S) {
    return Report.render(S);
  }

  function screenSuivi(S) {
    const hasPending  = S.pendingReports.length > 0;
    const loading     = S.loading;

    /* Filtres : Tous | En cours | Résolus | Rejetés */
    const TABS = [
      { key: 'all',      label: 'Tous' },
      { key: 'progress', label: 'En cours' },
      { key: 'done',     label: 'Résolus' },
      { key: 'rejected', label: 'Rejetés' },
    ];
    const activeTab = S.suiviTab || 'all';

    /* Fusionner les reports + pending */
    let allReports = [...S.reports];

    /* Trier par date décroissante */
    allReports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    /* Filtrer par onglet */
    const filtered = activeTab === 'all'
      ? allReports
      : allReports.filter(r => r.status === activeTab);

    /* Pagination */
    const PER_PAGE = 10;
    const maxPage = Math.max(0, Math.ceil(filtered.length / PER_PAGE) - 1);
    const page = Math.min(S.suiviPage || 0, maxPage);
    const pageStart = page * PER_PAGE;
    const pageEnd = Math.min(pageStart + PER_PAGE, filtered.length);
    const paged = filtered.slice(pageStart, pageEnd);
    const hasMore = pageEnd < filtered.length;

    return `
      <div class="screen">

        <!-- En-tête -->
        <div class="flex-between mb-sm reveal">
          <p class="display-sm">Mes signalements</p>
          ${hasPending ? `<span class="badge badge-orange">${S.pendingReports.length} en attente</span>` : ''}
        </div>

        <!-- Bannière mode anonyme -->
        ${S.prefs.anonymous && S.user ? `
          <div class="anon-banner mb-sm reveal">
            <i class="ti ti-incognito" aria-hidden="true"></i>
            <span class="micro"><strong>Mode anonyme actif</strong> — Vos signalements n'apparaissent pas ici. Désactivez-le dans vos préférences pour les voir.</span>
          </div>
        ` : ''}

        <!-- Pending (offline) -->
        ${hasPending && !loading ? `
          <div class="mb-md reveal reveal-delay-1">
            <p class="micro mb-sm" style="color:var(--orange)">En attente d'envoi</p>
            ${S.pendingReports.map(r => {
              const html = UI.reportCard({
                id: r.id, category: r.category, location: r.location?.label || r.location,
                status: 'new', time: r.createdAt ? _timeAgo(new Date(r.createdAt)) : '',
                votes: r.votes || 0, urgent: false, description: r.description || '',
              });
              return `
                <div style="position:relative;opacity:.75">
                  ${html.replace(' class="card card-hover report-card"', ' class="card card-hover report-card report-card-pending"')}
                  <button class="btn-pending-delete" data-pending-delete="${r.id}" aria-label="Supprimer">
                    <i class="ti ti-x" aria-hidden="true"></i>
                  </button>
                  <div style="position:absolute;top:var(--space-sm);right:var(--space-sm)">
                    <span class="badge badge-orange"><i class="ti ti-clock" style="font-size:10px"></i> En attente</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          <div class="mb-md reveal reveal-delay-2">
            ${UI.btn({ label:`Envoyer ${S.pendingReports.length} signalement(s)`, icon:'cloud-upload', variant:'primary', full:true, id:'btn-sync-pending' })}
          </div>
          <div class="divider"></div>
        ` : ''}

        <!-- Onglets -->
        <div class="suivi-tabs mb-md reveal" id="suivi-tabs">
          ${TABS.map(t => `
            <button class="suivi-tab${activeTab === t.key ? ' active' : ''}" data-suivi-tab="${t.key}">${t.label}</button>
          `).join('')}
        </div>

        <!-- Liste -->
        ${loading ? UI.skeletonList(4) : filtered.length === 0 ? `
          <div class="suivi-empty reveal">
            <i class="ti ti-inbox" style="font-size:48px;display:block;margin-bottom:var(--space-md);opacity:.3"></i>
            <p>Aucun signalement ${activeTab !== 'all' ? 'dans cette catégorie' : 'pour l\'instant'}</p>
            <p class="muted" style="font-size:13px">Utilisez le bouton <strong>+</strong> pour signaler un problème</p>
          </div>
        ` : `
          <div class="stagger-list" id="suivi-report-list">
            ${paged.map(r => UI.reportCard({
              id: r.id, category: r.category, location: r.location?.label || r.location,
              status: r.status, time: r.createdAt ? _timeAgo(new Date(r.createdAt)) : '',
              votes: r.votes || 0, urgent: r.status === 'urgent', description: r.description || '',
            })).join('')}
          </div>

          <!-- Pagination -->
          ${filtered.length > PER_PAGE ? `
            <div class="admin-pagination reveal">
              <button class="btn btn-sm btn-ghost" id="btn-suivi-prev"${page === 0 ? ' disabled' : ''}>
                <i class="ti ti-chevron-left" aria-hidden="true"></i> Précédent
              </button>
              <span class="micro" style="color:var(--text-muted)">${pageStart + 1}–${pageEnd} sur ${filtered.length}</span>
              <button class="btn btn-sm btn-ghost" id="btn-suivi-next"${!hasMore ? ' disabled' : ''}>
                Suivant <i class="ti ti-chevron-right" aria-hidden="true"></i>
              </button>
            </div>
          ` : ''}

          <div class="list-end">${filtered.length} signalement${filtered.length > 1 ? 's' : ''}</div>
        `}

        <!-- FAB -->
        <button class="fab" id="btn-fab-signaler" aria-label="Nouveau signalement">
          <i class="ti ti-plus" aria-hidden="true"></i>
        </button>

      </div>
    `;
  }

  function screenCommunaute(S) {
    const user = S.user;
    const logged = !!user;
    const quartier = user?.quartier || '';
    const ALL_QUARTIERS = ['Akpakpa','Cadjehoun','Fidjrossè','Vèdoko','Gbégamey','Jonquet','Haie-Vive','Zongo','Agla','Calavi Centre','Godomey','Kpanroun','Tankpè','Akron','Ouando','Sèmè','Dowa','Kpérou','Albarika','Titirou','Baka'];

    /* Filtrer les posts du quartier (ou tous si pas de quartier) */
    const posts = quartier
      ? S.communityPosts
      : S.communityPosts;

    return `
      <div class="screen">

        ${!logged ? `
          <div style="text-align:center;padding:var(--space-xl);color:var(--text-muted)">
            <i class="ti ti-users" style="font-size:48px;display:block;margin-bottom:var(--space-md);opacity:.3"></i>
            <p class="subheading mb-sm">Rejoignez votre quartier</p>
            <p class="muted">Connectez-vous pour voir les discussions de votre zone</p>
            <div class="mt-md" style="display:grid;gap:var(--space-sm);max-width:240px;margin:var(--space-md) auto 0">
              ${UI.btn({ label:'Se connecter', icon:'login', variant:'primary', full:true, id:'btn-communaute-login' })}
              ${UI.btn({ label:'Créer un compte', icon:'user-plus', variant:'lime', full:true, id:'btn-communaute-inscription' })}
            </div>
          </div>
        ` : !quartier ? `
          <div class="reveal">
            <p class="display-sm mb-sm">Votre quartier</p>
            <p class="muted mb-md">Sélectionnez votre quartier pour voir le fil communautaire</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-sm)">
              ${ALL_QUARTIERS.map(q => `
                <button class="btn btn-sm quartier-select-btn" data-quartier="${q}" style="border-color:var(--border);text-align:left;padding:var(--space-sm) var(--space-md);border-radius:var(--radius-sm);background:var(--card);font-family:var(--font-ui);color:var(--text);cursor:pointer">
                  ${q}
                </button>
              `).join('')}
            </div>
          </div>
        ` : `
          <!-- En-tête quartier -->
          <div class="flex-between mb-sm reveal">
            <p class="display-sm">${quartier}</p>
            <div class="flex items-center flex-gap-sm">
              <button class="btn btn-sm btn-ghost" id="btn-classement-link" aria-label="Classement">
                <i class="ti ti-trophy" style="font-size:14px"></i>
              </button>
              <button class="btn btn-sm btn-ghost" id="btn-change-quartier" aria-label="Changer de quartier">
                <i class="ti ti-map-pin" style="font-size:14px"></i> Changer
              </button>
            </div>
          </div>

          <!-- Zone de post -->
          <div class="card mb-md reveal">
            <textarea class="community-textarea" id="community-post-input" placeholder="Quoi de neuf dans le quartier ?" rows="2" maxlength="500" aria-label="Votre message"></textarea>
            <div class="flex-between mt-xs">
              <span class="micro" style="color:var(--text-dim)" id="community-chars">0/500</span>
              <button class="btn btn-sm btn-lime" id="btn-community-post">
                <i class="ti ti-send" aria-hidden="true"></i> Poster
              </button>
            </div>
          </div>

          <!-- Fil -->
          <div class="community-feed" id="community-feed">
            ${posts.length === 0 ? `
              <div style="text-align:center;padding:var(--space-xl);color:var(--text-muted)">
                <i class="ti ti-message-off" style="font-size:36px;display:block;margin-bottom:var(--space-sm);opacity:.3"></i>
                <p class="micro">Aucun message dans le fil pour l'instant</p>
                <p class="micro muted">Soyez le premier à poster !</p>
              </div>
            ` : posts.map(p => `
              <div class="community-post">
                <div class="flex items-start flex-gap-sm">
                  <div class="avatar avatar-sm" style="background:var(--accent);color:var(--bg);flex-shrink:0">${(p.userName || '?')[0].toUpperCase()}</div>
                  <div class="flex-1 min-w-0">
                    <div class="flex-between">
                      <p class="micro" style="font-weight:600">${p.userName || 'Anonyme'}</p>
                      <span class="micro" style="color:var(--text-dim)">${_timeAgo(new Date(p.createdAt))}</span>
                    </div>
                    <p class="body-sm mt-xs">${p.text}</p>
                    <div class="flex items-center flex-gap-sm mt-xs">
                      <button class="community-like-btn${(p.likedBy || []).includes(user?.id) ? ' liked' : ''}" data-post-id="${p.id}" aria-label="${(p.likedBy || []).includes(user?.id) ? 'Ne plus aimer' : 'Aimer ce message'}">
                        <i class="ti ti-thumb-up" style="font-size:14px"></i>
                        <span class="micro">${p.likes || 0}</span>
                      </button>
                      <button class="community-flag-btn" data-post-id="${p.id}" aria-label="Signaler un abus" style="background:none;border:none;color:var(--text-dim);cursor:pointer;padding:4px;font-size:13px">
                        <i class="ti ti-flag" style="font-size:14px"></i>
                      </button>
                      <button data-share-community="${(p.text || '').slice(0, 120)}" aria-label="Partager" style="background:none;border:none;color:var(--text-dim);cursor:pointer;padding:4px;font-size:13px">
                        <i class="ti ti-share" style="font-size:14px"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `}

      </div>
    `;
  }

  function screenClassement(S) {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    /* Extraire les quartiers de adminConfig et aggréger les stats */
    const zones = (S.adminConfig?.zones || []).filter(z => z.active);
    const allQuartiers = [];
    zones.forEach(z => {
      (z.quartiers || []).forEach(q => {
        const reportsQ = S.reports.filter(r => {
          const loc = (r.location?.label || r.location || '').toLowerCase();
          return loc.includes(q.toLowerCase());
        });
        const monthReports = reportsQ.filter(r => {
          const d = new Date(r.createdAt);
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        });
        allQuartiers.push({
          name: q,
          zone: z.label,
          total: monthReports.length,
          resolved: monthReports.filter(r => r.status === 'done').length,
        });
      });
    });

    /* Filtrer ceux avec au moins 1 signalement */
    const active = allQuartiers.filter(q => q.total > 0);

    /* Tri */
    const sort = S.quartierSort || 'resolved';
    const SORT_FNS = {
      resolved:  (a, b) => b.resolved - a.resolved,
      total:     (a, b) => b.total - a.total,
      rate:      (a, b) => (b.resolved / b.total) - (a.resolved / a.total),
    };
    const sorted = active.sort(SORT_FNS[sort] || SORT_FNS.resolved);

    return `
      <div class="screen">

        <div class="flex-between mb-sm reveal">
          <p class="display-sm">Classement quartiers</p>
          <p class="micro muted">${now.toLocaleDateString('fr-FR', { month:'long', year:'numeric' })}</p>
        </div>

        <!-- Sélecteur de tri -->
        <div class="suivi-tabs mb-md reveal" id="quartier-sort-tabs">
          <button class="suivi-tab${sort === 'resolved' ? ' active' : ''}" data-qs="resolved">Résolus</button>
          <button class="suivi-tab${sort === 'total' ? ' active' : ''}" data-qs="total">Total</button>
          <button class="suivi-tab${sort === 'rate' ? ' active' : ''}" data-qs="rate">Taux</button>
        </div>

        ${sorted.length === 0 ? `
          <div style="text-align:center;padding:var(--space-xl);color:var(--text-muted)">
            <i class="ti ti-trophy" style="font-size:48px;display:block;margin-bottom:var(--space-md);opacity:.3"></i>
            <p>Aucune donnée ce mois</p>
            <p class="muted">Les signalements de ce mois apparaîtront ici</p>
          </div>
        ` : `
          <div class="leaderboard">
            ${sorted.map((q, i) => {
              const rate = q.total > 0 ? Math.round((q.resolved / q.total) * 100) : 0;
              const maxResolved = sorted[0]?.resolved || 1;
              const barPct = Math.round((q.resolved / maxResolved) * 100);
              return `
                <div class="leaderboard-row ${i < 3 ? 'leaderboard-top' : ''}">
                  <div class="leaderboard-rank">${i + 1}</div>
                  <div class="flex-1 min-w-0">
                    <div class="flex-between">
                      <p class="body-sm" style="font-weight:600">${q.name}</p>
                      <span class="micro" style="color:var(--text-muted)">${q.zone}</span>
                    </div>
                    <div style="display:flex;gap:var(--space-md);margin-top:2px">
                      <span class="micro" style="color:var(--teal)">${q.resolved} résolus</span>
                      <span class="micro" style="color:var(--text-dim)">${q.total} total</span>
                      <span class="micro" style="color:var(--accent)">${rate}%</span>
                    </div>
                    <div class="leaderboard-bar-bg mt-xs">
                      <div class="leaderboard-bar" style="width:${barPct}%"></div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}

        <div class="divider"></div>
        ${UI.btn({ label:'Retour à Communauté', icon:'arrow-left', variant:'ghost', full:true, id:'btn-classement-back' })}
      </div>
    `;
  }

  /* ════════════════════════════════════════════
     PAIEMENT — FEDAPAY (ÉTAPE 41)
     ════════════════════════════════════════════ */

  function screenPaiement(S) {
    const plans = State.PLANS;
    const currentPlan = S.adminConfig?.plan;
    const success = S.payStatus === 'success';
    const error   = S.payStatus === 'error';
    const curPlanObj = plans.find(p => p.id === currentPlan);

    return `
      <div class="screen">
        <div class="flex-between mb-sm reveal">
          <p class="display-sm">Abonnement</p>
          <span class="badge badge-lime">FedaPay</span>
        </div>

        ${currentPlan ? `
          <div class="card mb-md reveal" style="border-color:var(--teal);background:rgba(0,200,150,.05)">
            <div class="flex items-center flex-gap-sm" style="color:var(--teal)">
              <i class="ti ti-circle-check" style="font-size:20px"></i>
              <span class="subheading">Plan actuel : ${curPlanObj?.label || currentPlan}</span>
            </div>
            <p class="micro mt-xs" style="color:var(--text-muted)">${curPlanObj?.features.join(' · ') || ''}</p>
            <button class="btn btn-sm btn-ghost mt-sm" id="btn-cancel-plan" style="color:var(--red)">
              <i class="ti ti-x" aria-hidden="true"></i> Résilier l'abonnement
            </button>
          </div>
        ` : `
          <div class="card mb-md reveal" style="border-color:var(--orange);background:rgba(255,152,0,.05)">
            <div class="flex items-center flex-gap-sm" style="color:var(--orange)">
              <i class="ti ti-alert-triangle" style="font-size:20px"></i>
              <span class="subheading">Aucun abonnement actif</span>
            </div>
            <p class="micro mt-xs" style="color:var(--text-muted)">Choisissez un plan ci-dessous pour activer votre dashboard mairie.</p>
          </div>
        `}

        ${success ? `
          <div class="card mb-md reveal" style="border-color:var(--teal);background:rgba(0,200,150,.05)">
            <div class="flex items-center flex-gap-sm" style="color:var(--teal)">
              <i class="ti ti-circle-check" style="font-size:24px"></i>
              <span class="subheading">Paiement confirmé</span>
            </div>
            <p class="micro mt-xs">Merci ! Votre abonnement a bien été activé.</p>
          </div>
        ` : error ? `
          <div class="card mb-md reveal" style="border-color:var(--red);background:rgba(255,50,50,.05)">
            <div class="flex items-center flex-gap-sm" style="color:var(--red)">
              <i class="ti ti-alert-circle" style="font-size:24px"></i>
              <span class="subheading">Paiement échoué</span>
            </div>
            <p class="micro mt-xs">La transaction a été annulée ou a échoué. Veuillez réessayer.</p>
          </div>
        ` : ''}

        <!-- Plans -->
        <div style="display:grid;gap:var(--space-md)">
          ${plans.map((plan, i) => {
            const isActive = plan.id === currentPlan;
            return `
              <div class="card-sm reveal reveal-delay-${i + 1}" style="${isActive ? 'border-color:var(--teal)' : ''}">
                <div class="flex-between mb-xs">
                  <p class="subheading">${plan.label}${isActive ? ' <span class="badge badge-teal" style="font-size:10px">Actif</span>' : ''}</p>
                  <p style="font-family:var(--font-display);font-size:20px;color:var(--accent)">
                    ${plan.price > 0 ? plan.price.toLocaleString() + ' <span class="micro" style="color:var(--text-muted)">FCFA/mois</span>' : '<span class="micro" style="color:var(--text-muted)">Sur devis</span>'}
                  </p>
                </div>
                <ul style="list-style:none;padding:0;margin:0 0 var(--space-sm)">
                  ${plan.features.map(f => `
                    <li class="flex items-center flex-gap-xs" style="padding:2px 0">
                      <i class="ti ti-check" style="color:var(--teal);font-size:12px" aria-hidden="true"></i>
                      <span class="micro">${f}</span>
                    </li>
                  `).join('')}
                </ul>
                ${plan.price > 0 ? `
                  <button class="btn btn-sm ${isActive ? 'btn-ghost' : 'btn-primary'} full" id="btn-pay-${plan.id}">
                    ${isActive ? 'Changer de plan' : 'S\'abonner'}
                  </button>
                ` : `
                  <button class="btn btn-sm btn-ghost full" id="btn-pay-${plan.id}">
                    Nous contacter
                  </button>
                `}
              </div>
            `;
          }).join('')}
        </div>

        <!-- Moyens de paiement -->
        <div class="card mt-md reveal">
          <div class="flex items-center flex-gap-sm mb-xs">
            <i class="ti ti-credit-card" style="color:var(--accent);font-size:16px"></i>
            <span class="micro" style="color:var(--text-muted)">Choisissez un moyen de paiement</span>
          </div>
          <div class="flex items-center flex-gap-md mt-sm" style="flex-wrap:wrap">
            <button class="badge badge-lime" id="btn-pay-card" style="cursor:pointer;border:none;padding:4px 10px">Carte bancaire</button>
            <button class="badge badge-lime" id="btn-pay-mtn" style="cursor:pointer;border:none;padding:4px 10px;background:rgba(252,209,22,.15);color:#fcd116">MTN MoMo</button>
            <button class="badge badge-lime" id="btn-pay-moov" style="cursor:pointer;border:none;padding:4px 10px;background:rgba(0,169,79,.15);color:#00a94f">Moov Money</button>
            <span class="badge badge-lime" style="opacity:.5">Orange Money</span>
          </div>
        </div>

        <!-- Modal Mobile Money (MTN / Moov) -->
        ${S.showMomoModal ? `
          <div class="modal-overlay open" style="display:flex;z-index:1001" id="momo-overlay" role="dialog" aria-modal="true" aria-label="Paiement Mobile Money">
            <div class="modal-sheet" style="max-width:340px;margin:auto;padding:var(--space-lg);position:relative;z-index:1002">

              ${(() => {
                const isMoov = S.momoOperator === 'moov';
                const opLabel = isMoov ? 'Moov Money' : 'MTN Mobile Money';
                const opColor = isMoov ? '#00a94f' : '#fcd116';
                const opBg = isMoov ? 'rgba(0,169,79,.15)' : 'rgba(252,209,22,.15)';
                const icon = isMoov ? 'ti ti-brand-foursquare' : 'ti ti-brand-foursquare';
                const placeholder = isMoov ? '99XXXXXXXX' : '97XXXXXXXX';
                const phoneHint = isMoov ? '99, 95, 94, 90, 91' : '96, 97, 98';
                const fees = isMoov ? '1–2% du montant appliqués par Moov' : '1–2% du montant appliqués par MTN';
                return `
                  <div style="text-align:center;margin-bottom:var(--space-md)">
                    <div style="width:48px;height:48px;border-radius:50%;background:${opBg};display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-sm)">
                      <i class="ti ti-device-mobile" style="font-size:24px;color:${opColor}"></i>
                    </div>
                    <p class="subheading">${opLabel}</p>
                  </div>

                  ${S.momoStatus === 'waiting' ? `
                    <label class="micro" for="momo-phone" style="color:var(--text-muted)">Numéro ${isMoov ? 'Moov' : 'MTN'} Bénin</label>
                    <input type="tel" id="momo-phone" class="input" value="${S.momoPhone}" placeholder="${placeholder}" inputmode="numeric" maxlength="10" style="margin-top:var(--space-xs)">
                    <p class="micro mt-xs" style="color:var(--text-muted)">Préfixes : ${phoneHint} suivi de 7 chiffres</p>
                    <p class="micro mt-xs" style="color:var(--orange)"><i class="ti ti-alert-triangle" style="font-size:10px"></i> Frais : ${fees}</p>
                    <p class="micro mt-xs" style="color:var(--text-muted)">Montant : <strong>${S.momoAmount.toLocaleString()} FCFA</strong></p>
                    <p class="micro" style="color:var(--text-muted)">Description : ${S.momoDesc}</p>
                    <div style="display:grid;gap:var(--space-sm);margin-top:var(--space-md)">
                      <button class="btn btn-primary full" id="btn-momo-send">
                        <i class="ti ti-send" aria-hidden="true"></i> Envoyer la demande USSD
                      </button>
                      <button class="btn btn-ghost full" id="btn-momo-close">Annuler</button>
                    </div>
                  ` : ''}

                  ${S.momoStatus === 'sending' ? `
                    <div style="text-align:center;padding:var(--space-md)">
                      <div class="spinner" style="width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite;margin:0 auto var(--space-md)"></div>
                      <p class="subheading">Demande envoyée</p>
                      <p class="micro" style="color:var(--text-muted)">Confirmez le paiement sur votre téléphone ${isMoov ? 'Moov' : 'MTN'}</p>
                      <div class="flex items-center flex-gap-xs" style="justify-content:center;margin-top:var(--space-md)">
                        <i class="ti ti-clock" style="font-size:14px;color:var(--orange)"></i>
                        <span class="micro" style="color:var(--orange)">Expire dans ${S.momoCountdown}s</span>
                      </div>
                      <button class="btn btn-ghost full mt-md" id="btn-momo-cancel">Annuler</button>
                    </div>
                  ` : ''}

                  ${S.momoStatus === 'success' ? `
                    <div style="text-align:center;padding:var(--space-md)">
                      <i class="ti ti-circle-check" style="font-size:40px;color:var(--teal);display:block;margin-bottom:var(--space-sm)"></i>
                      <p class="subheading" style="color:var(--teal)">Paiement confirmé !</p>
                      <p class="micro" style="color:var(--text-muted)">${S.momoAmount.toLocaleString()} FCFA — ${S.momoDesc}</p>
                      <button class="btn btn-primary full mt-md" id="btn-momo-done">Terminé</button>
                    </div>
                  ` : ''}

                  ${S.momoStatus === 'error' ? `
                    <div style="text-align:center;padding:var(--space-md)">
                      <i class="ti ti-alert-circle" style="font-size:40px;color:var(--red);display:block;margin-bottom:var(--space-sm)"></i>
                      <p class="subheading" style="color:var(--red)">Paiement échoué</p>
                      <p class="micro" style="color:var(--text-muted)">Transaction annulée. Veuillez réessayer.</p>
                      <button class="btn btn-primary full mt-md" id="btn-momo-retry">Réessayer</button>
                    </div>
                  ` : ''}
                `;
              })()}

            </div>
          </div>
        ` : ''}

        <!-- Test libre -->
        <details class="mt-md reveal reveal-delay-3" style="cursor:pointer">
          <summary class="micro" style="color:var(--text-muted)">Mode test — paiement libre</summary>
          <div class="card-sm mt-sm">
            <label class="micro" for="pay-amount" style="color:var(--text-muted)">Montant (FCFA)</label>
            <input type="number" id="pay-amount" class="input" value="1000" min="100" step="100">
            <label class="micro mt-sm" for="pay-desc" style="color:var(--text-muted)">Description</label>
            <input type="text" id="pay-desc" class="input" value="Test FedaPay">
            <button class="btn btn-primary full mt-sm" id="btn-pay-custom">
              <i class="ti ti-credit-card" aria-hidden="true"></i> Payer (sandbox)
            </button>
            <p class="micro mt-xs" style="color:var(--orange)">Carte de test : 4242 4242 4242 4242, date future, CVC 123</p>
          </div>
        </details>

        <div class="divider"></div>
        ${UI.btn({ label:'Retour', icon:'arrow-left', variant:'ghost', full:true, id:'btn-pay-back' })}
      </div>
    `;
  }

  /* ── Lancer un paiement FedaPay ── */
  function _launchFedaPay(amount, description) {
    if (typeof FedaPay === 'undefined') {
      State.toast('SDK FedaPay non chargé — utilisation du mode simulation', 'warn', 3000);
      simulerPaiement(amount, description);
      return;
    }
    try {
      FedaPay.init('#btn-pay-trigger', {
        environment: 'sandbox',
        public_key: 'pk_sandbox_xxxxxxxxxxxx',
        transaction: {
          amount: amount,
          description: description,
          currency: { iso: 'XOF' },
        },
        customer: {
          email: 'demo@cityreport.bj',
          name: 'Démo CityReport',
        },
      });
      FedaPay.on('payment:completed', (data) => {
        State.Actions.paySuccess(data);
      });
      FedaPay.on('payment:error', (data) => {
        State.Actions.payError(data?.message || 'Erreur inconnue');
      });
    } catch (e) {
      State.toast('Erreur FedaPay : ' + e.message + ' — bascule simulation', 'warn');
      simulerPaiement(amount, description);
    }
  }

  /* ── Simulation FedaPay (démo locale) ── */
  function simulerPaiement(amount, description) {
    State.toast('Paiement simulé en cours…', 'info', 2000);
    setTimeout(() => {
      State.Actions.paySuccess({ transaction: { id: 'demo_' + Date.now() } });
    }, 2000);
  }

  /* ── Simulation MTN MoMo ── */
  let _momoTimerId = null;
  function _simulerMomo() {
    _momoTimerId = setInterval(() => {
      const S = State.get();
      if (S.momoStatus !== 'sending') { clearInterval(_momoTimerId); _momoTimerId = null; return; }
      State.Actions.momoCountdownTick();
      if (S.momoCountdown <= 0) {
        clearInterval(_momoTimerId); _momoTimerId = null;
        State.Actions.momoError('Délai de confirmation expiré');
      }
    }, 1000);
    /* Simulation : confirmation auto après 3 secondes */
    setTimeout(() => {
      const S2 = State.get();
      if (S2.momoStatus === 'sending') {
        clearInterval(_momoTimerId); _momoTimerId = null;
        State.Actions.momoSuccess({ transaction: { id: 'momo_demo_' + Date.now() } });
      }
    }, 3000);
  }

  /* ════════════════════════════════════════════
     FACTURATION — ÉTAPE 45
     ════════════════════════════════════════════ */

  /* ════════════════════════════════════════════
     SCREEN : ONBOARDING
     ════════════════════════════════════════════ */

  let _onboardSlide = 0;

  function screenOnboarding(S) {
    const slides = [
      { icon:'ti ti-map-pin', title:'Signalez en 30 secondes', desc:'Photographiez un problème dans votre quartier, ajoutez une courte description et envoyez-le à votre mairie. Simple, rapide, efficace.' },
      { icon:'ti ti-building-community', title:'La mairie vous répond', desc:'Votre signalement est traité par les services municipaux. Suivez son avancement en temps réel depuis l\'application.' },
      { icon:'ti ti-users', title:'Votre quartier se mobilise', desc:'Rejoignez la communauté de votre quartier, soutenez les signalements de vos voisins et suivez les améliorations.' },
    ];
    const slide = slides[_onboardSlide];

    return `
      <div class="screen" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:var(--space-xl);min-height:100dvh">
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;max-width:320px">
          <div style="font-size:64px;color:var(--accent);margin-bottom:var(--space-lg)" aria-hidden="true">
            <i class="${slide.icon}"></i>
          </div>
          <p class="display-sm mb-sm">${slide.title}</p>
          <p class="muted">${slide.desc}</p>
        </div>

        <!-- Dots -->
        <div style="display:flex;gap:8px;margin-bottom:var(--space-lg)">
          ${slides.map((_, i) => `
            <div style="width:${i === _onboardSlide ? 24 : 8}px;height:8px;border-radius:4px;background:${i === _onboardSlide ? 'var(--accent)' : 'var(--border)'};transition:all .3s"></div>
          `).join('')}
        </div>

        <!-- Boutons -->
        <div style="width:100%;max-width:320px">
          ${_onboardSlide < slides.length - 1 ? `
            <button class="btn btn-primary full mb-sm" id="btn-onboard-next"><i class="ti ti-arrow-right" aria-hidden="true"></i> Suivant</button>
            <button class="btn btn-ghost full" id="btn-onboard-skip">Passer</button>
          ` : `
            <button class="btn btn-primary full" id="btn-onboard-start"><i class="ti ti-check" aria-hidden="true"></i> Commencer</button>
          `}
        </div>
      </div>
    `;
  }

  /* ════════════════════════════════════════════
     SCREEN : FAQ
     ════════════════════════════════════════════ */

  function screenFAQ(S) {
    const faqs = [
      { q:'Comment signaler un problème ?', a:'Ouvrez l\'app, appuyez sur le bouton <strong>+</strong> en bas, choisissez une catégorie, prenez une photo et décrivez le problème. Votre signalement est envoyé à la mairie en moins de 30 secondes.' },
      { q:'Comment suivre mon signalement ?', a:'Allez dans l\'onglet <strong>Suivi</strong> pour voir tous vos signalements et leur statut (Nouveau, En cours, Résolu, Rejeté).' },
      { q:'La mairie répond-elle vraiment ?', a:'Oui ! Chaque signalement est envoyé aux services municipaux compétents. Vous recevrez des notifications lors des changements de statut.' },
      { q:'Mes données sont-elles protégées ?', a:'CityReport respecte le RGPD. Vous pouvez à tout moment télécharger ou supprimer vos données depuis la section <strong>Mes données</strong> de votre profil.' },
      { q:'Puis-je signaler anonymement ?', a:'Oui, activez le mode anonyme dans les préférences de votre profil ou lors de l\'envoi d\'un signalement.' },
      { q:'Que faire en cas d\'urgence ?', a:'En cas d\'urgence, appelez les numéros d\'urgence (police : 17, pompiers : 18, SAMU : 15). CityReport n\'est pas un service d\'urgence.' },
      { q:'Comment contacter le support ?', a:'Utilisez le bouton WhatsApp ou le formulaire de contact dans l\'onglet <strong>Nous contacter</strong> de votre profil.' },
    ];
    return `
      <div class="screen">
        <div class="mb-md">
          <p class="display-sm mb-sm">Questions fréquentes</p>
          <p class="muted">Trouvez rapidement une réponse à vos questions</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--space-sm)">
          ${faqs.map(f => `
            <details style="background:var(--card);border-radius:var(--radius-sm);overflow:hidden">
              <summary style="cursor:pointer;padding:var(--space-sm) var(--space-md);font-size:14px;font-weight:500;color:var(--text);list-style:none;display:flex;align-items:center;gap:var(--space-sm)">
                <i class="ti ti-chevron-right" style="font-size:14px;color:var(--accent);transition:transform .2s" aria-hidden="true"></i>
                <span>${f.q}</span>
              </summary>
              <div style="padding:0 var(--space-md) var(--space-sm);font-size:13px;color:var(--text-muted);line-height:1.6;border-top:1px solid var(--border);padding-top:var(--space-sm)">
                ${f.a}
              </div>
            </details>
          `).join('')}
        </div>
      </div>
    `;
  }

  /* ════════════════════════════════════════════
     SCREEN : CONTACT
     ════════════════════════════════════════════ */

  function screenContact(S) {
    return `
      <div class="screen">
        <div class="mb-md">
          <p class="display-sm mb-sm">Nous contacter</p>
          <p class="muted">Une question ? Un problème ? Nous sommes là.</p>
        </div>

        <div class="card mb-md">
          <p class="micro mb-sm" style="color:var(--text-muted)">Email</p>
          <p class="body-sm"><i class="ti ti-mail" style="color:var(--accent)" aria-hidden="true"></i> support@cityreport.bj</p>
        </div>

        <div class="card mb-md">
          <p class="micro mb-sm" style="color:var(--text-muted)">WhatsApp</p>
          <button class="btn flex items-center flex-gap-sm" id="btn-contact-wa" style="width:100%;border-color:var(--border);background:#25D366;color:#fff;justify-content:center">
            <i class="ti ti-brand-whatsapp" style="font-size:18px"></i> Écrire sur WhatsApp
          </button>
        </div>

        <div class="card">
          <p class="micro mb-sm" style="color:var(--text-muted)">Formulaire de contact</p>
          <div class="mb-sm">
            <label class="micro" style="display:block;margin-bottom:4px">Votre message</label>
            <textarea class="community-textarea" id="contact-message" placeholder="Décrivez votre demande…" rows="4" aria-label="Votre message"></textarea>
          </div>
          <button class="btn btn-primary full" id="btn-contact-send"><i class="ti ti-send" aria-hidden="true"></i> Envoyer</button>
        </div>

        <p class="micro text-center mt-md" style="color:var(--text-dim)">Horaires : Lun-Ven 8h-18h · Samedi 9h-13h</p>
      </div>
    `;
  }

  /* ════════════════════════════════════════════
     SCREEN : NOT FOUND (404)
     ════════════════════════════════════════════ */

  function screenNotFound(S) {
    return `
      <div class="screen screen-404">
        <svg class="isometric-canvas" viewBox="0 0 180 140" fill="none" aria-hidden="true">
          <rect x="10" y="60" width="50" height="40" rx="4" fill="var(--card-3)" stroke="var(--border)" stroke-width="1.5"/>
          <rect x="14" y="64" width="18" height="12" rx="2" fill="var(--card-2)" stroke="var(--border-light)" stroke-width="1"/>
          <rect x="36" y="64" width="18" height="12" rx="2" fill="var(--card-2)" stroke="var(--border-light)" stroke-width="1"/>
          <rect x="14" y="80" width="18" height="12" rx="2" fill="var(--card-2)" stroke="var(--border-light)" stroke-width="1"/>
          <rect x="36" y="80" width="18" height="12" rx="2" fill="var(--card-2)" stroke="var(--border-light)" stroke-width="1"/>
          <rect x="70" y="50" width="50" height="50" rx="4" fill="var(--card-3)" stroke="var(--border)" stroke-width="1.5"/>
          <circle cx="95" cy="75" r="10" fill="var(--card-2)" stroke="var(--border-light)" stroke-width="1"/>
          <rect x="130" y="30" width="40" height="70" rx="4" fill="var(--card-3)" stroke="var(--border)" stroke-width="1.5"/>
          <rect x="138" y="38" width="24" height="8" rx="2" fill="var(--lime)" opacity=".8"/>
          <rect x="138" y="52" width="24" height="8" rx="2" fill="var(--lime)" opacity=".5"/>
          <rect x="138" y="66" width="24" height="8" rx="2" fill="var(--lime)" opacity=".3"/>
          <line x1="10" y1="110" x2="170" y2="110" stroke="var(--border)" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <h2>404</h2>
        <p>Page introuvable. Le lien que vous avez suivi n'existe pas ou a été déplacé.</p>
        <button class="btn btn-primary" onclick="Router.push('home')" type="button">Retour à l'accueil</button>
      </div>
    `;
  }

  /* ════════════════════════════════════════════
     SCREEN : ERROR RÉSEAU
     ════════════════════════════════════════════ */

  function screenError(S) {
    return `
      <div class="screen screen-404">
        <svg class="isometric-canvas" viewBox="0 0 180 140" fill="none" aria-hidden="true">
          <path d="M30 70 L60 40 L90 70 L120 40" stroke="var(--red)" stroke-width="3" stroke-linecap="round" fill="none"/>
          <path d="M30 85 L60 55 L90 85 L120 55" stroke="var(--red)" stroke-width="3" stroke-linecap="round" fill="none" opacity=".5"/>
          <circle cx="90" cy="105" r="12" fill="var(--red-dim)" stroke="var(--red)" stroke-width="1.5"/>
          <line x1="85" y1="100" x2="95" y2="110" stroke="var(--red)" stroke-width="2" stroke-linecap="round"/>
          <line x1="95" y1="100" x2="85" y2="110" stroke="var(--red)" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <h2 style="color:var(--red)">Pas de connexion</h2>
        <p>Vérifiez votre connexion Internet et réessayez. Les données sont sauvegardées localement.</p>
        <button class="btn btn-primary" id="btn-retry-connect" type="button">Réessayer</button>
        <button class="btn btn-ghost" onclick="Router.push('home')" type="button">Aller à l'accueil</button>
      </div>
    `;
  }

  /* ════════════════════════════════════════════
     SCREEN : AMENDES
     ════════════════════════════════════════════ */

  function screenAmendes(S) {
    const { amendeNumber, amendeAmount, amendeStatus, amendeData, amendeReceipt } = S;

    return `
      <div class="screen">

        <div class="reveal">
          <p class="display-sm mb-sm">Payer une amende</p>
          <p class="muted mb-lg">Réglez vos amendes municipales directement depuis l'application.</p>

          <div class="card mb-md">
            <div class="card-sm mb-md" style="background:rgba(255,193,7,.1);border-left:3px solid var(--orange)">
              <p class="micro" style="color:var(--orange)"><i class="ti ti-info-circle" aria-hidden="true"></i> Le paiement est transmis à la Mairie de Cotonou</p>
            </div>

            <label class="input-label" for="input-amende-number">Numéro de l'avis d'amende</label>
            <div class="input-wrap" style="margin-top:6px">
              <i class="ti ti-file-text input-icon" aria-hidden="true"></i>
              <input class="input" id="input-amende-number" type="text" placeholder="Ex: AM-2024-001" value="${amendeNumber}" ${amendeStatus === 'success' ? 'disabled' : ''}>
            </div>
            <p class="micro mt-xs" style="color:var(--text-dim)">Saisissez le numéro à 12 chiffres figurant sur votre avis</p>
          </div>

          ${amendeData ? `
            <div class="card mb-md reveal">
              <p class="micro mb-sm" style="text-transform:uppercase">Détails de l'amende</p>
              <div class="list-row">
                <div class="list-row-icon" style="background:rgba(200,255,0,.1)">
                  <i class="ti ti-file-description" style="color:var(--lime)" aria-hidden="true"></i>
                </div>
                <div class="list-row-body">
                  <p class="list-row-title">Motif</p>
                  <p class="list-row-sub">${amendeData.reason}</p>
                </div>
              </div>
              <div class="list-row">
                <div class="list-row-icon" style="background:rgba(200,255,0,.1)">
                  <i class="ti ti-calendar" style="color:var(--lime)" aria-hidden="true"></i>
                </div>
                <div class="list-row-body">
                  <p class="list-row-title">Date</p>
                  <p class="list-row-sub">${amendeData.date}</p>
                </div>
              </div>
              <div class="list-row">
                <div class="list-row-icon" style="background:rgba(200,255,0,.1)">
                  <i class="ti ti-map-pin" style="color:var(--lime)" aria-hidden="true"></i>
                </div>
                <div class="list-row-body">
                  <p class="list-row-title">Commune</p>
                  <p class="list-row-sub">${amendeData.commune}</p>
                </div>
              </div>
              <div class="divider"></div>
              <div class="flex-between">
                <p class="fw-600">Montant</p>
                <p class="fw-600" style="color:var(--lime);font-size:18px">${amendeData.amount.toLocaleString()} FCFA</p>
              </div>
            </div>

            ${amendeStatus === 'success' && amendeReceipt ? `
              <div class="card mb-md reveal" style="border:1px solid var(--lime)">
                <div class="flex items-center flex-gap-sm mb-sm">
                  <i class="ti ti-circle-check" style="color:var(--lime);font-size:24px" aria-hidden="true"></i>
                  <p class="fw-600">Paiement réussi</p>
                </div>
                <div id="receipt-content">
                  <div class="divider"></div>
                  <div class="flex-between"><span class="micro">Référence</span><span class="micro fw-600">${amendeReceipt.ref}</span></div>
                  <div class="flex-between mt-xs"><span class="micro">Montant</span><span class="micro fw-600">${amendeReceipt.amount.toLocaleString()} FCFA</span></div>
                  <div class="flex-between mt-xs"><span class="micro">Date</span><span class="micro fw-600">${new Date(amendeReceipt.date).toLocaleDateString('fr-FR')}</span></div>
                  <div class="flex-between mt-xs"><span class="micro">Amende</span><span class="micro fw-600">${amendeReceipt.description}</span></div>
                </div>
                <div class="mt-md flex flex-gap-sm">
                  ${UI.btn({ label:'Télécharger le reçu', icon:'download', variant:'primary', id:'btn-download-receipt', full:true })}
                  ${UI.btn({ label:'Nouveau paiement', icon:'plus', variant:'ghost', id:'btn-new-amende', full:true })}
                </div>
              </div>
            ` : amendeStatus === 'pending' ? `
              <div class="card mb-md text-center reveal">
                <div class="inline-spinner mb-sm"></div>
                <p>Paiement en cours…</p>
              </div>
            ` : `
              ${UI.btn({ label:`Payer ${amendeData.amount.toLocaleString()} FCFA`, icon:'credit-card', variant:'primary', full:true, id:'btn-pay-amende', loading: false })}
            `}
          ` : amendeNumber && !amendeData ? `
            <div class="card mb-md" style="background:rgba(255,59,48,.1);border-left:3px solid var(--red)">
              <p class="micro" style="color:var(--red)">Aucune amende trouvée avec ce numéro. Vérifiez votre avis.</p>
            </div>
          ` : ''}

        </div>
      </div>
    `;
  }

  function screenFacturation(S) {
    const planId = S.adminConfig?.plan;
    const planObj = State.PLANS.find(p => p.id === planId);
    const payments = (S.payments || []).slice().reverse();
    const methodLabels = { mtn_money: 'MTN MoMo', moov_money: 'Moov Money', card: 'Carte bancaire' };

    return `
      <div class="screen">
        <div class="flex-between mb-sm reveal">
          <p class="display-sm">Facturation</p>
          <span class="badge badge-lime">Admin</span>
        </div>

        <!-- Plan actuel -->
        <div class="card mb-md reveal">
          <p class="micro mb-sm" style="color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Abonnement actuel</p>
          ${planObj ? `
            <div class="flex-between">
              <div>
                <p class="subheading">${planObj.label}</p>
                <p class="micro" style="color:var(--text-muted)">${planObj.price.toLocaleString()} ${planObj.currency} · ${planObj.features.join(' · ')}</p>
              </div>
              <span class="badge badge-teal">Actif</span>
            </div>
            <p class="micro mt-sm" style="color:var(--text-muted)"><i class="ti ti-calendar" style="font-size:10px"></i> Prochain renouvellement : ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')}</p>
          ` : `
            <div class="flex items-center flex-gap-sm" style="color:var(--orange)">
              <i class="ti ti-alert-triangle" style="font-size:16px"></i>
              <p class="subheading">Aucun abonnement actif</p>
            </div>
            <p class="micro mt-xs" style="color:var(--text-muted)">Souscrivez à un plan pour accéder aux fonctionnalités mairie.</p>
          `}
        </div>

        <!-- Actions -->
        <div style="display:grid;gap:var(--space-sm)" class="mb-md reveal reveal-delay-1">
          ${UI.btn({ label:'Changer de plan', icon:'credit-card', variant:'secondary', full:true, id:'btn-facture-plans' })}
          ${planId ? UI.btn({ label:'Annuler l\'abonnement', icon:'x', variant:'ghost', full:true, id:'btn-facture-cancel' }) : ''}
        </div>

        <!-- Historique des paiements -->
        <p class="subheading mb-sm reveal reveal-delay-2">Historique des paiements</p>

        ${payments.length === 0 ? `
          <div class="card-sm reveal reveal-delay-2" style="text-align:center;padding:var(--space-lg)">
            <i class="ti ti-receipt" style="font-size:32px;color:var(--text-muted);display:block;margin-bottom:var(--space-sm);opacity:.4"></i>
            <p class="micro" style="color:var(--text-muted)">Aucun paiement enregistré</p>
          </div>
        ` : `
          <div style="display:grid;gap:var(--space-sm)">
            ${payments.slice(0, 20).map((p, i) => `
              <div class="card-sm reveal reveal-delay-${i + 3}" style="display:flex;align-items:center;justify-content:space-between">
                <div class="flex-1 min-w-0">
                  <p class="micro" style="color:var(--text-dim)">${new Date(p.date).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                  <p class="body truncate">${p.description || 'Paiement'}</p>
                  <div class="flex items-center flex-gap-xs mt-xs">
                    <span class="micro" style="color:var(--text-muted)">${methodLabels[p.method] || p.method || '—'}</span>
                    <span class="micro" style="color:var(--text-dim)">·</span>
                    <span class="micro" style="color:${p.status === 'completed' ? 'var(--teal)' : 'var(--orange)'}">${p.status === 'completed' ? 'Payé' : p.status}</span>
                  </div>
                </div>
                <div style="text-align:right">
                  <p style="font-family:var(--font-display);color:var(--accent)">${p.amount?.toLocaleString() || '—'} <span class="micro" style="color:var(--text-muted)">FCFA</span></p>
                  <button class="btn btn-sm btn-ghost mt-xs" data-receipt="${p.id}" style="font-size:10px">
                    <i class="ti ti-file-text" style="font-size:10px"></i> Reçu
                  </button>
                </div>
              </div>
            `).join('')}
            ${payments.length > 20 ? `<p class="micro mt-sm" style="color:var(--text-muted);text-align:center">+ ${payments.length - 20} autres paiements</p>` : ''}
          </div>
        `}

        <div class="divider"></div>
        ${UI.btn({ label:'Retour au dashboard', icon:'arrow-left', variant:'ghost', full:true, id:'btn-facture-back' })}
      </div>
    `;
  }

  function screenElu(S) {
    const total = S.reports.length;
    const done = S.reports.filter(r => r.status === 'done').length;
    const urgent = S.reports.filter(r => r.status === 'urgent').length;

    return `
      <div class="screen">
        <p class="display-sm mb-sm reveal">Dashboard élu</p>
        <p class="muted mb-lg reveal">Vue simplifiée pour les élus municipaux</p>

        <div class="kpi-grid mb-md reveal">
          ${UI.kpiCard({ label:'Signalements', value:total, icon:'clipboard-list', color:'var(--lime)' })}
          ${UI.kpiCard({ label:'Résolus', value:done, icon:'circle-check', color:'var(--teal)' })}
          ${UI.kpiCard({ label:'Urgents', value:urgent, icon:'alert-circle', color:urgent > 5 ? 'var(--red)' : 'var(--blue)' })}
        </div>

        <div class="card mb-md reveal reveal-delay-1">
          <p class="micro mb-sm">Évolution</p>
          <canvas id="chart-line-elu" style="width:100%;height:120px"></canvas>
        </div>

        <div class="card mb-md reveal reveal-delay-2">
          <p class="micro mb-sm">Carte des signalements</p>
          ${MapView.render({ onPinClick: (pin) => {} })}
        </div>

        ${UI.btn({ label:'Dashboard complet', icon:'arrow-right', variant:'primary', full:true, id:'btn-elu-admin' })}
        <div class="divider"></div>
        ${UI.btn({ label:'Retour au profil', icon:'arrow-left', variant:'ghost', full:true, id:'btn-elu-back' })}
      </div>
    `;
  }

  function screenAdmin(S) {
    const plan = S.adminConfig?.plan;
    const planObj = State.PLANS.find(p => p.id === plan);

    /* Blocage si pas d'abonnement */
    if (!plan) {
      return `
        <div class="screen">
          <div class="flex-between mb-sm reveal">
            <p class="display-sm">Dashboard</p>
            <span class="badge badge-lime">Admin</span>
          </div>
          <div class="card reveal" style="text-align:center;padding:var(--space-lg)">
            <i class="ti ti-credit-card-off" style="font-size:40px;color:var(--text-muted);display:block;margin-bottom:var(--space-md)"></i>
            <p class="subheading">Aucun abonnement actif</p>
            <p class="micro mt-xs" style="color:var(--text-muted);max-width:280px;margin:var(--space-sm) auto">
              Souscrivez à un plan pour accéder au dashboard mairie, aux rapports mensuels et aux paramètres.
            </p>
            ${UI.btn({ label:'Voir les plans', icon:'credit-card', variant:'primary', full:true, id:'btn-goto-plans' })}
          </div>
          <div class="divider"></div>
          ${UI.btn({ label:'Retour au profil', icon:'arrow-left', variant:'ghost', full:true, id:'btn-admin-back' })}
        </div>
      `;
    }

    const total     = S.reports.length;
    const newCount  = S.reports.filter(r => r.status === 'new' || r.status === 'urgent').length;
    const progress  = S.reports.filter(r => r.status === 'progress').length;
    const doneCount = S.reports.filter(r => r.status === 'done').length;

    const ALL_CATS = Object.keys(CAT_LABELS);
    const isMobile = window.innerWidth < 600;

    /* Compter par catégorie */
    const catCounts = {};
    S.reports.forEach(r => { catCounts[r.category] = (catCounts[r.category] || 0) + 1; });

    /* ── Filtrage ── */
    const f = S.adminFilters;
    let filtered = S.reports.filter(r => {
      if (f.status && r.status !== f.status) return false;
      if (f.category && r.category !== f.category) return false;
      if (f.search) {
        const q = f.search.toLowerCase();
        const haystack = [r.description, r.location?.label, r.reference].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (f.dateFrom || f.dateTo) {
        const d = new Date(r.createdAt);
        if (f.dateFrom && d < new Date(f.dateFrom)) return false;
        if (f.dateTo) {
          const end = new Date(f.dateTo);
          end.setHours(23,59,59,999);
          if (d > end) return false;
        }
      }
      return true;
    });

    /* ── Tri stable ── */
    const sortCol = S.adminSort.col;
    const sortDir = S.adminSort.dir;
    const SORT_FNS = {
      ref:      (a, b) => (a.reference || '').localeCompare(b.reference || ''),
      category: (a, b) => (CAT_LABELS[a.category] || a.category).localeCompare(CAT_LABELS[b.category] || b.category),
      location: (a, b) => (a.location?.label || '').localeCompare(b.location?.label || ''),
      status:   (a, b) => (STATUS_LABELS[a.status] || '').localeCompare(STATUS_LABELS[b.status] || ''),
      date:     (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    };
    const fn = SORT_FNS[sortCol] || SORT_FNS.date;
    filtered = filtered.map((r, i) => ({ r, i }))
      .sort((a, b) => {
        const cmp = fn(a.r, b.r);
        return cmp !== 0 ? (sortDir === 'asc' ? cmp : -cmp) : a.i - b.i;
      })
      .map(x => x.r);

    /* ── Pagination ── */
    const PER_PAGE = 10;
    const maxPage = Math.max(0, Math.ceil(filtered.length / PER_PAGE) - 1);
    const page = Math.min(S.adminPage, maxPage);
    const pageStart = page * PER_PAGE;
    const pageEnd = Math.min(pageStart + PER_PAGE, filtered.length);
    const paged = filtered.slice(pageStart, pageEnd);

    if (S.adminPage !== page) {
      /* Corrigé silencieusement — le prochain render reflétera la bonne page */
    }

    return `
      <div class="screen">
        <div class="flex-between mb-sm reveal">
          <p class="display-sm">Dashboard</p>
          <div class="flex items-center flex-gap-xs">
            ${planObj ? `<span class="badge badge-teal" style="font-size:9px">${planObj.label}</span>` : ''}
            <span class="badge badge-lime">Admin</span>
          </div>
        </div>

        <!-- KPI 2×2 -->
        <div class="kpi-grid mb-md reveal reveal-delay-1">
          ${UI.kpiCard({ label:'Total', value:total, icon:'clipboard-list', color:'var(--lime)' })}
          ${UI.kpiCard({ label:'Nouveaux', value:newCount, icon:'alert-circle', color:'var(--blue)' })}
          ${UI.kpiCard({ label:'En cours', value:progress, icon:'refresh', color:'var(--orange)' })}
          ${UI.kpiCard({ label:'Résolus', value:doneCount, icon:'circle-check', color:'var(--teal)' })}
        </div>

        <!-- Graphique évolution -->
        ${total > 4 ? `
          <div class="card mb-md reveal reveal-delay-2">
            <p class="micro mb-sm">Évolution des signalements (7 derniers jours)</p>
            <canvas id="chart-line" style="width:100%;height:120px"></canvas>
          </div>
        ` : ''}

        <!-- Bar chart par service municipal -->
        <div class="card mb-md reveal reveal-delay-2">
          <p class="micro mb-sm">Signalements par service</p>
          <canvas id="chart-bar" style="width:100%;height:160px"></canvas>
        </div>

        <!-- Comparatif inter-communes -->
        <div class="card mb-md reveal reveal-delay-2">
          <p class="micro mb-sm">Comparatif inter-communes</p>
          <div style="overflow-x:auto">
            <table class="admin-table intercomm-table">

              <!-- Hotspots zones à risque -->
              ${(() => {
                const zoneCounts = {};
                const now = Date.now();
                const THIRTY_DAYS = 30 * 86400000;
                S.reports.forEach(r => {
                  const loc = (r.location?.label || '').toLowerCase();
                  for (const z of Object.keys(HEAT_ZONE_LABELS)) {
                    if (HEAT_ZONE_LABELS[z].some(kw => loc.includes(kw))) {
                      if (!zoneCounts[z]) zoneCounts[z] = { total: 0, recent: 0, label: z };
                      zoneCounts[z].total++;
                      if (new Date(r.createdAt).getTime() > now - THIRTY_DAYS) zoneCounts[z].recent++;
    }
  }

  function _exportUserData() {
    const S = State.get();
    const data = {
      user:     S.user,
      reports:  S.reports.filter(r => r.userId === S.user?.id),
      prefs:    S.prefs,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cityreport-mes-donnees-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    State.toast('Données exportées ✓', 'ok');
  }

  async function _deleteAccount(otp) {
    if (otp !== '123456') { State.toast('Code incorrect', 'warn'); return; }
    /* Effacer le cache SW */
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    /* Vider localStorage et réinitialiser */
    if ('serviceWorker' in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      } catch (_) {}
    }
    localStorage.removeItem('cr_state');
    State.go({ deleteStep: 0, user: null });
    State.toast('Compte supprimé', 'ok');
  }
                });
                const hotspots = Object.values(zoneCounts).filter(z => {
                  const avg = z.total / 30; /* moy jour */
                  return avg > 0 && z.recent > avg * 2;
                });
                return hotspots.length ? `
                  <div class="mb-sm" style="background:rgba(255,59,48,.08);border-radius:var(--radius-sm);padding:var(--space-sm)">
                    <p class="micro mb-xs" style="color:var(--red);text-transform:uppercase">🔥 Zones à risque</p>
                    ${hotspots.map(h => `
                      <div class="flex items-center flex-gap-sm mb-xs">
                        <span class="badge badge-sm" style="background:var(--red);color:#fff;font-size:9px">${h.recent} récents</span>
                        <span class="micro">${h.label}</span>
                      </div>
                    `).join('')}
                  </div>
                ` : '';
              })()}
              <thead>
                <tr>
                  <th>Commune</th>
                  <th>Total</th>
                  <th>Nouveaux</th>
                  <th>En cours</th>
                  <th>Résolus</th>
                  <th>Taux résol.</th>
                </tr>
              </thead>
              <tbody>
                ${['Cotonou', 'Abomey-Calavi', 'Porto-Novo'].map(commune => {
                  const r = S.reports.filter(r => (r.location?.label || '').toLowerCase().includes(commune.toLowerCase()));
                  const t = r.length, n = r.filter(x => x.status === 'new').length, p = r.filter(x => x.status === 'progress').length, d = r.filter(x => x.status === 'done').length;
                  const taux = t ? Math.round(d / t * 100) : 0;
                  return `<tr><td>${commune}</td><td>${t}</td><td>${n}</td><td>${p}</td><td>${d}</td><td>${taux}%</td></tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Sondages satisfaction -->
        ${S.surveys.length > 0 ? `
          <div class="card mb-md reveal reveal-delay-2">
            <p class="micro mb-sm">Satisfaction citoyens</p>
            ${(() => {
              const avg = S.surveys.reduce((s, sv) => s + sv.rating, 0) / S.surveys.length;
              const stars = Math.round(avg);
              return `
                <div class="flex items-center flex-gap-sm">
                  <span class="display-xs" style="color:var(--accent)">${avg.toFixed(1)}</span>
                  <div style="display:flex;gap:2px">
                    ${[1,2,3,4,5].map(i => `<i class="ti ti-star${i <= stars ? '-filled' : ''}" style="font-size:14px;color:${i <= stars ? 'var(--accent)' : 'var(--border)'}"></i>`).join('')}
                  </div>
                  <span class="micro" style="color:var(--text-muted)">(${S.surveys.length} avis)</span>
                </div>
              `;
            })()}
          </div>
        ` : ''}

        <!-- Catégories les plus signalées -->
        ${total > 0 ? `
          <div class="card mb-md reveal reveal-delay-2">
            <p class="micro mb-sm">Par catégorie</p>
            <div class="flex items-center flex-gap-md">
              <canvas id="chart-donut" style="width:140px;height:140px;flex-shrink:0"></canvas>
              <div style="flex:1">
                ${Object.entries(catCounts).sort((a,b) => b[1] - a[1]).slice(0,5).map(([cat, count]) => `
                  <div class="flex-between" style="padding:3px 0">
                    <div class="flex items-center flex-gap-sm">
                      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${CAT_COLORS[cat] || '#666'}"></span>
                      <span class="micro">${CAT_LABELS[cat] || cat}</span>
                    </div>
                    <span class="micro" style="color:var(--text-muted)">${count}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Filtres -->
        <div class="admin-filters mb-sm reveal reveal-delay-2" id="admin-filters">
          <div class="admin-filters-row">
            <select class="admin-filter-select" data-filter="status" aria-label="Filtrer par statut">
              <option value="">Tous les statuts</option>
              ${Object.entries(STATUS_LABELS).map(([k, v]) =>
                `<option value="${k}"${f.status === k ? ' selected' : ''}>${v}</option>`
              ).join('')}
            </select>
            <select class="admin-filter-select" data-filter="category" aria-label="Filtrer par catégorie">
              <option value="">Toutes catégories</option>
              ${ALL_CATS.map(k =>
                `<option value="${k}"${f.category === k ? ' selected' : ''}>${CAT_LABELS[k]}</option>`
              ).join('')}
            </select>
            <input class="admin-filter-input" type="search" data-filter="search" placeholder="Rechercher…" value="${f.search}" aria-label="Rechercher">
          </div>
          <div class="admin-filters-row">
            <input class="admin-filter-input" type="date" data-filter="dateFrom" value="${f.dateFrom}" aria-label="Date début">
            <input class="admin-filter-input" type="date" data-filter="dateTo" value="${f.dateTo}" aria-label="Date fin">
            <button class="btn btn-sm btn-ghost" id="btn-admin-export-csv" title="Exporter CSV">
              <i class="ti ti-download" aria-hidden="true"></i> CSV
            </button>
            <button class="btn btn-sm btn-ghost" id="btn-admin-export-geojson" title="Exporter GeoJSON">
              <i class="ti ti-map" aria-hidden="true"></i> GeoJSON
            </button>
          </div>
        </div>

        <!-- Compteur résultats -->
        <div class="flex-between mb-sm reveal reveal-delay-2">
          <p class="micro">${filtered.length} signalement${filtered.length > 1 ? 's' : ''}</p>
          ${filtered.length > 0 ? `
            <span class="micro" style="color:var(--text-muted)">${pageStart + 1}–${pageEnd} sur ${filtered.length}</span>
          ` : ''}
        </div>

        <!-- Tableau (desktop) / Cards (mobile) -->
        ${filtered.length === 0 ? `
          <div style="text-align:center;padding:var(--space-xl);color:var(--text-muted)" class="reveal">
            <i class="ti ti-inbox" style="font-size:36px;display:block;margin-bottom:var(--space-sm);opacity:.4"></i>
            <p class="micro">Aucun signalement trouvé</p>
          </div>
        ` : isMobile ? `
          ${paged.map(r => {
            const stLbl = STATUS_LABELS[r.status] || 'Nouveau';
            return `
              <div class="card mb-sm reveal" data-admin-card="${r.id}">
                <div class="flex-between mb-sm">
                  <div class="flex-1 min-w-0">
                    <p class="micro" style="color:var(--text-dim)">${r.reference || '—'}</p>
                    <p class="body truncate">${r.description?.slice(0, 60) || 'Aucune description'}</p>
                    <div class="flex items-center flex-gap-sm mt-xs">
                      <span class="micro" style="color:${CAT_COLORS[r.category] || 'var(--text-dim)'}">${CAT_LABELS[r.category] || r.category}</span>
                      <span class="micro" style="color:var(--text-dim)">·</span>
                      <span class="micro" style="color:var(--text-dim)">${r.location?.label || r.location || ''}</span>
                      ${r.agentId ? `
                        <span class="micro" style="color:var(--text-dim)">·</span>
                        <span class="micro" style="color:var(--text-dim)">${(S.agents || []).find(a => a.id === r.agentId)?.name || ''}</span>
                      ` : ''}
                    </div>
                  </div>
                  <span class="badge ${STATUS_CLS[r.status] || 'status-new'}">${stLbl}</span>
                </div>
                <div class="flex items-center flex-gap-sm" style="border-top:1px solid var(--border);padding-top:var(--space-sm)">
                  <select class="admin-status-select" data-admin-status="${r.id}" aria-label="Changer statut">
                    ${STATUS_OPTIONS.map(opt => `<option value="${opt}"${opt === r.status ? ' selected' : ''}>${STATUS_LABELS[opt] || opt}</option>`).join('')}
                  </select>
                  <button class="btn btn-sm btn-ghost" data-admin-view="${r.id}" aria-label="Voir le détail">
                    <i class="ti ti-eye" style="font-size:14px" aria-hidden="true"></i>
                  </button>
                  <button class="btn btn-sm" style="color:var(--red);border-color:transparent;padding:4px 8px" data-admin-delete="${r.id}" aria-label="Supprimer">
                    <i class="ti ti-trash" style="font-size:14px" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        ` : `
          <div class="table-responsive reveal">
            <table class="admin-table">
              <thead>
                <tr>
                  <th data-sort="ref" class="sortable">Réf${sortIcon('ref')}</th>
                  <th data-sort="category" class="sortable">Catégorie${sortIcon('category')}</th>
                  <th data-sort="location" class="sortable">Localisation${sortIcon('location')}</th>
                  <th data-sort="status" class="sortable">Statut${sortIcon('status')}</th>
                  <th data-sort="date" class="sortable">Date${sortIcon('date')}</th>
                  <th>Agent</th>
                  <th style="text-align:right">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${paged.map(r => {
                  const stLbl = STATUS_LABELS[r.status] || 'Nouveau';
                  return `
                    <tr data-admin-row="${r.id}">
                      <td class="cell-ref">${r.reference || '—'}</td>
                      <td><span class="micro" style="color:${CAT_COLORS[r.category] || 'var(--text-dim)'}">${CAT_LABELS[r.category] || r.category}</span></td>
                      <td class="cell-loc">${r.location?.label || r.location || '—'}</td>
                      <td><span class="badge ${STATUS_CLS[r.status] || 'status-new'}">${stLbl}</span></td>
                      <td class="cell-date">${r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—'}</td>
                      <td class="cell-agent">${r.agentId ? (S.agents || []).find(a => a.id === r.agentId)?.name || '—' : '—'}</td>
                      <td style="text-align:right">
                        <div class="flex items-center" style="justify-content:flex-end;gap:4px">
                          <select class="admin-status-select admin-status-table" data-admin-status="${r.id}" aria-label="Changer statut">
                            ${STATUS_OPTIONS.map(opt => `<option value="${opt}"${opt === r.status ? ' selected' : ''}>${STATUS_LABELS[opt] || opt}</option>`).join('')}
                          </select>
                          <button class="btn btn-sm btn-ghost" data-admin-view="${r.id}" aria-label="Voir le détail">
                            <i class="ti ti-eye" style="font-size:14px" aria-hidden="true"></i>
                          </button>
                          <button class="btn btn-sm" style="color:var(--red);border-color:transparent;padding:4px 8px" data-admin-delete="${r.id}" aria-label="Supprimer">
                            <i class="ti ti-trash" style="font-size:14px" aria-hidden="true"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}

        <!-- Pagination -->
        ${filtered.length > PER_PAGE ? `
          <div class="admin-pagination reveal">
            <button class="btn btn-sm btn-ghost" id="btn-admin-prev"${page === 0 ? ' disabled' : ''}>
              <i class="ti ti-chevron-left" aria-hidden="true"></i> Précédent
            </button>
            <span class="micro" style="color:var(--text-muted)">${pageStart + 1}–${pageEnd} sur ${filtered.length}</span>
            <button class="btn btn-sm btn-ghost" id="btn-admin-next"${pageEnd >= filtered.length ? ' disabled' : ''}>
              Suivant <i class="ti ti-chevron-right" aria-hidden="true"></i>
            </button>
          </div>
        ` : ''}

        <div class="divider"></div>
        <div style="display:grid;gap:var(--space-sm)">
          ${plan === 'starter' ? `
            <div class="card-sm" style="background:rgba(255,152,0,.05);border-color:rgba(255,152,0,.15)">
              <div class="flex items-center flex-gap-sm">
                <i class="ti ti-lock" style="color:var(--orange);font-size:14px"></i>
                <span class="micro" style="color:var(--orange)">Passez au plan Pro pour débloquer les rapports mensuels, paramètres et plus.</span>
              </div>
            </div>
          ` : ''}
          ${UI.btn({ label:'Rapport mensuel', icon:'file-text', variant:'secondary', full:true, id:'btn-admin-report', disabled: plan === 'starter' })}
          ${UI.btn({ label:'Paiement & abonnement', icon:'credit-card', variant:'secondary', full:true, id:'btn-admin-pay' })}
          ${UI.btn({ label:'Facturation', icon:'receipt', variant:'secondary', full:true, id:'btn-admin-facture' })}
          ${UI.btn({ label:'Paramètres', icon:'settings', variant:'secondary', full:true, id:'btn-admin-settings', disabled: plan === 'starter' })}
          ${UI.btn({ label:'Retour au profil', icon:'arrow-left', variant:'ghost', full:true, id:'btn-admin-back' })}
        </div>
      </div>
    `;
  }

  function sortIcon(col) {
    const sortCol = State.get().adminSort.col;
    const sortDir = State.get().adminSort.dir;
    if (col !== sortCol) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  }

  /* ════════════════════════════════════════════
     RAPPORT MENSUEL — ÉTAPE 28
     ════════════════════════════════════════════ */

  function screenRapportMensuel(S) {
    const now = new Date();
    const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();

    /* Filtrer les signalements du mois en cours */
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthReports = S.reports.filter(r => new Date(r.createdAt) >= startOfMonth);
    const total = monthReports.length;
    const newCount = monthReports.filter(r => r.status === 'new' || r.status === 'urgent').length;
    const progressCount = monthReports.filter(r => r.status === 'progress').length;
    const doneCount = monthReports.filter(r => r.status === 'done').length;
    const rejectedCount = monthReports.filter(r => r.status === 'rejected').length;

    /* Top quartiers */
    const quartierCounts = {};
    monthReports.forEach(r => {
      const loc = r.location?.label || r.location || 'Non spécifié';
      quartierCounts[loc] = (quartierCounts[loc] || 0) + 1;
    });
    const topQuartiers = Object.entries(quartierCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

    /* Top catégories */
    const catCounts = {};
    monthReports.forEach(r => { catCounts[r.category] = (catCounts[r.category] || 0) + 1; });
    const topCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    /* Taux de résolution */
    const resolvedRate = total > 0 ? Math.round((doneCount / total) * 100) : 0;

    return `
      <div class="screen rapport-mensuel" id="rapport-mensuel">
        <div class="report-print-only" style="display:none">
          <!-- En-tête imprimable -->
          <div style="text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #000">
            <h1 style="font-size:24px;margin:0;font-family:sans-serif">CityReport — Rapport Mensuel</h1>
            <p style="font-size:14px;color:#555;margin:4px 0 0">${month} ${year} · Mairie de Cotonou & Abomey-Calavi</p>
          </div>
        </div>

        <!-- En-tête écran -->
        <div class="flex-between mb-sm reveal">
          <p class="display-sm">Rapport mensuel</p>
          <span class="badge badge-lime">${month}</span>
        </div>
        <p class="muted mb-md reveal reveal-delay-1">${month} ${year} · Synthèse des signalements</p>

        <!-- Résumé exécutif -->
        <div class="card mb-md reveal reveal-delay-2">
          <p class="micro mb-sm" style="text-transform:uppercase">Résumé exécutif</p>
          <p class="body">Au cours du mois de ${month} ${year}, <strong>${total} signalement${total > 1 ? 's' : ''}</strong> ont été enregistrés. <strong>${doneCount}</strong> ont été résolus (taux de résolution : ${resolvedRate}%). <strong>${progressCount}</strong> sont en cours de traitement et <strong>${newCount}</strong> sont encore en attente.</p>
        </div>

        <!-- KPIs -->
        <div class="kpi-grid mb-md reveal reveal-delay-3">
          <div class="card-sm kpi-card" style="text-align:center;padding:var(--space-md)">
            <p class="display-sm" style="color:var(--lime)">${total}</p>
            <p class="micro" style="color:var(--text-muted)">Signalements</p>
          </div>
          <div class="card-sm kpi-card" style="text-align:center;padding:var(--space-md)">
            <p class="display-sm" style="color:var(--blue)">${newCount}</p>
            <p class="micro" style="color:var(--text-muted)">Nouveaux</p>
          </div>
          <div class="card-sm kpi-card" style="text-align:center;padding:var(--space-md)">
            <p class="display-sm" style="color:var(--orange)">${progressCount}</p>
            <p class="micro" style="color:var(--text-muted)">En cours</p>
          </div>
          <div class="card-sm kpi-card" style="text-align:center;padding:var(--space-md)">
            <p class="display-sm" style="color:var(--teal)">${doneCount}</p>
            <p class="micro" style="color:var(--text-muted)">Résolus</p>
          </div>
        </div>

        <!-- Top 10 quartiers -->
        <div class="card mb-md reveal reveal-delay-4">
          <p class="micro mb-sm" style="text-transform:uppercase">Top 10 quartiers les plus actifs</p>
          ${topQuartiers.length === 0 ? '<p class="micro muted">Aucune donnée ce mois</p>' : `
            <table class="print-table" style="width:100%;font-size:13px;border-collapse:collapse">
              <thead><tr><th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--border);color:var(--text-muted);font-size:11px">Quartier</th><th style="text-align:right;padding:4px 8px;border-bottom:1px solid var(--border);color:var(--text-muted);font-size:11px">Signalements</th></tr></thead>
              <tbody>
                ${topQuartiers.map(([q, c]) => `
                  <tr><td style="padding:4px 8px;border-bottom:1px solid var(--border)">${q}</td><td style="text-align:right;padding:4px 8px;border-bottom:1px solid var(--border)">${c}</td></tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>

        <!-- Top 5 catégories -->
        <div class="card mb-md reveal reveal-delay-5">
          <p class="micro mb-sm" style="text-transform:uppercase">Top 5 catégories</p>
          ${topCats.length === 0 ? '<p class="micro muted">Aucune donnée ce mois</p>' : `
            <div style="display:flex;flex-direction:column;gap:var(--space-xs)">
              ${topCats.map(([cat, count]) => {
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return `
                  <div class="flex-between">
                    <span class="micro">${CAT_LABELS[cat] || cat}</span>
                    <div class="flex items-center flex-gap-sm" style="flex:1;margin:0 var(--space-sm)">
                      <div style="flex:1;height:6px;background:var(--card-2);border-radius:3px;overflow:hidden">
                        <div style="width:${pct}%;height:100%;background:${CAT_COLORS[cat] || 'var(--lime)'};border-radius:3px"></div>
                      </div>
                    </div>
                    <span class="micro" style="color:var(--text-muted);min-width:50px;text-align:right">${count} (${pct}%)</span>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Boutons actions -->
        <div class="reveal" style="display:grid;gap:var(--space-sm)">
          <button class="btn btn-lime" id="btn-print-report">
            <i class="ti ti-printer" aria-hidden="true"></i> Imprimer le rapport
          </button>
          ${UI.btn({ label:'Retour au dashboard', icon:'arrow-left', variant:'ghost', full:true, id:'btn-report-back' })}
        </div>

        <div class="divider"></div>
        <p class="micro text-center" style="color:var(--text-dim)">CityReport · Rapport généré le ${now.toLocaleDateString('fr-FR')}</p>
      </div>
    `;
  }

  function screenAdminSettings(S) {
    const config = S.adminConfig;
    const activeTab = S.adminSettingsTab || 'categories';
    const cats = config.categories || [];
    const zones = config.zones || [];
    const categoryInUse = (id) => S.reports.some(r => r.category === id);

    return `
      <div class="screen">
        <div class="flex-between mb-sm reveal">
          <p class="display-sm">Paramètres</p>
          <span class="badge badge-lime">Admin</span>
        </div>

        <!-- Onglets -->
        <div class="settings-tabs mb-md" role="tablist">
          <button class="settings-tab${activeTab === 'categories' ? ' active' : ''}" data-stab="categories" role="tab">Catégories</button>
          <button class="settings-tab${activeTab === 'zones' ? ' active' : ''}" data-stab="zones" role="tab">Zones</button>
        </div>

        ${activeTab === 'categories' ? `
          <!-- ═══ Catégories ═══ -->
          <div class="flex mb-sm">
            <input class="admin-filter-input flex-1" id="input-new-cat-label" placeholder="Nouvelle catégorie…" aria-label="Nom de la catégorie">
            <input type="color" id="input-new-cat-color" value="#e74c3c" style="width:36px;height:36px;border:none;padding:2px;background:none;cursor:pointer" aria-label="Couleur de la catégorie">
            <button class="btn btn-sm btn-lime" id="btn-add-category">Ajouter</button>
          </div>
          <div class="settings-list">
            ${cats.map(c => `
              <div class="settings-item">
                <div class="flex items-center flex-gap-sm flex-1 min-w-0">
                  <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c.color};flex-shrink:0"></span>
                  <span class="body">${c.label}</span>
                  <span class="micro" style="color:var(--text-dim)">(${c.id})</span>
                </div>
                <div class="flex items-center flex-gap-sm">
                  <button class="btn btn-sm btn-ghost settings-edit-btn" data-cat-id="${c.id}" data-cat-label="${c.label}" data-cat-color="${c.color}" aria-label="Modifier ${c.label}">
                    <i class="ti ti-pencil" style="font-size:14px"></i>
                  </button>
                  ${categoryInUse(c.id) ? `
                    <span class="micro" style="color:var(--orange)" title="Des signalements utilisent cette catégorie">
                      <i class="ti ti-alert-triangle" style="font-size:14px"></i>
                    </span>
                  ` : `
                    <button class="btn btn-sm btn-ghost settings-del-btn" data-cat-id="${c.id}" style="color:var(--red)" aria-label="Supprimer ${c.label}">
                      <i class="ti ti-trash" style="font-size:14px"></i>
                    </button>
                  `}
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <!-- ═══ Zones ═══ -->
          <div class="settings-list">
            ${zones.map(z => `
              <div class="settings-item">
                <div class="flex items-center flex-gap-sm flex-1 min-w-0">
                  <span class="body">${z.label}</span>
                  <span class="micro" style="color:var(--text-dim)">${z.quartiers.length} quartiers</span>
                </div>
                <label class="toggle-label">
                  <input type="checkbox" class="toggle-input zone-toggle" data-zone-id="${z.id}"${z.active ? ' checked' : ''}>
                  <span class="toggle-track"></span>
                </label>
              </div>
              <div class="quartier-list" style="padding-left:var(--space-lg);margin-bottom:var(--space-sm)">
                ${z.quartiers.map(q => `
                  <label class="quartier-item">
                    <input type="checkbox" class="quartier-toggle" data-zone-id="${z.id}" data-quartier="${q}"${z.active ? ' checked' : ''}${!z.active ? ' disabled' : ''}>
                    <span class="micro">${q}</span>
                  </label>
                `).join('')}
              </div>
            `).join('')}
          </div>
        `}

        <div class="divider"></div>
        ${UI.btn({ label:'Retour au dashboard', icon:'arrow-left', variant:'ghost', full:true, id:'btn-settings-back' })}

        <!-- Modale confirmation suppression catégorie -->
        ${S.modalOpen && S.modalPayload?.type === 'confirmDeleteCat' ? `
          <div class="modal-overlay open" id="modal-overlay-delete-cat" style="display:flex" role="dialog" aria-modal="true" aria-label="Confirmer la suppression">
            <div class="modal-sheet" style="max-width:360px;margin:auto;padding:var(--space-lg);position:relative;z-index:1001">
              <div style="text-align:center;margin-bottom:var(--space-md)">
                <i class="ti ti-alert-triangle" style="font-size:36px;color:var(--red);margin-bottom:var(--space-sm);display:block"></i>
                <p class="subheading">Supprimer cette catégorie ?</p>
                <p class="micro muted">Cette action est irréversible.</p>
              </div>
              <div class="flex items-center flex-gap-sm">
                <button class="btn btn-sm flex-1" id="btn-cancel-delete-cat" style="border-color:var(--border)">Annuler</button>
                <button class="btn btn-sm btn-lime flex-1" id="btn-confirm-delete-cat" data-cat-id="${S.modalPayload.catId}">Supprimer</button>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function screenAgent(S) {
    const total = S.reports.length;

    /* Grouper : urgents + nouveaux en premier */
    const sorted = [...S.reports].sort((a, b) => {
      const order = { urgent:0, new:1, progress:2, done:3, rejected:4 };
      return (order[a.status] ?? 1) - (order[b.status] ?? 1);
    });

    return `
      <div class="screen">
        <div class="flex-between mb-sm reveal">
          <p class="display-sm">Espace agent</p>
          <span class="badge badge-lime">Agent</span>
        </div>
        <p class="muted mb-md reveal reveal-delay-1">${total} signalement${total > 1 ? 's' : ''} sur le terrain</p>

        ${total === 0 ? `
          <div style="text-align:center;padding:var(--space-xl);color:var(--text-muted)">
            <i class="ti ti-inbox" style="font-size:36px;display:block;margin-bottom:var(--space-sm);opacity:.4"></i>
            <p class="micro">Aucun signalement à traiter</p>
          </div>
        ` : `
          ${sorted.map(r => {
            const stCls = STATUS_CLS[r.status] || 'status-new';
            const stLbl = STATUS_LABELS[r.status] || 'Nouveau';
            const nextStatus = r.status === 'new' ? 'progress' : r.status === 'progress' ? 'done' : null;
            const nextLabel = r.status === 'new' ? 'Prendre en charge' : r.status === 'progress' ? 'Marquer résolu' : null;
            return `
              <div class="card mb-sm reveal">
                <div class="flex-between mb-sm">
                  <div>
                    <p class="body">${r.description?.slice(0, 60) || 'Aucune description'}</p>
                    <div class="flex items-center flex-gap-sm mt-xs">
                      <span class="micro" style="color:var(--text-dim)">${CAT_LABELS[r.category] || r.category}</span>
                      <span class="micro" style="color:var(--text-dim)">·</span>
                      <span class="micro" style="color:var(--text-dim)">${r.location?.label || r.location || ''}</span>
                    </div>
                  </div>
                  <span class="badge ${stCls}">${stLbl}</span>
                </div>
                <div class="flex items-center flex-gap-sm">
                  <button class="btn btn-sm btn-ghost" data-agent-view="${r.id}">Détail</button>
                  ${nextStatus ? `<button class="btn btn-sm ${r.status === 'new' ? 'btn-primary' : 'btn-secondary'}" data-agent-status="${r.id}" data-next-status="${nextStatus}">${nextLabel}</button>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        `}

        <div class="divider"></div>
        <div style="display:grid;gap:var(--space-sm)">
          ${UI.btn({ label:'Mon profil agent', icon:'user', variant:'primary', full:true, id:'btn-agent-profil' })}
          ${UI.btn({ label:'Retour au profil', icon:'arrow-left', variant:'ghost', full:true, id:'btn-agent-back' })}
        </div>
      </div>
    `;
  }

  function screenAgentProfil(S) {
    const agentEntry = S.agents?.find(a => a.id === S.user?.id) || null;
    const name = agentEntry?.name || S.user?.name || 'Agent';
    const zone = agentEntry?.zone || '—';
    const assignedToAgent = S.reports.filter(r => r.agentId === S.user?.id);
    const active = assignedToAgent.filter(r => r.status !== 'done' && r.status !== 'rejected');
    const resolved = assignedToAgent.filter(r => r.status === 'done');
    const totalAssigned = assignedToAgent.length;
    const resolvedCount = resolved.length;
    const rate = totalAssigned > 0 ? Math.round((resolvedCount / totalAssigned) * 100) : 0;

    /* Délai moyen de résolution */
    let avgTime = 'N/A';
    if (resolved.length > 0) {
      const times = resolved.map(r => {
        const created = new Date(r.createdAt).getTime();
        const historyEntry = (r.statusHistory || []).find(h => h.status === 'done');
        const resolvedDate = historyEntry ? new Date(historyEntry.date).getTime() : Date.now();
        return resolvedDate - created;
      });
      const avgMs = times.reduce((s, t) => s + t, 0) / times.length;
      const hours = Math.floor(avgMs / 3600000);
      avgTime = hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}j ${hours % 24}h`;
    }

    return `
      <div class="screen">
        <!-- Hero -->
        <div class="flex items-center flex-gap-md mb-md reveal">
          <div class="avatar avatar-xl" style="font-size:24px">${name[0].toUpperCase()}</div>
          <div class="flex-1 min-w-0">
            <p class="subheading">${name}</p>
            <p class="muted micro">${zone}</p>
          </div>
          <span class="badge badge-lime">Agent</span>
        </div>

        <!-- Stats -->
        <div class="agent-stats-grid mb-md reveal reveal-delay-1">
          <div class="card-sm agent-stat">
            <p class="agent-stat-value">${totalAssigned}</p>
            <p class="micro" style="color:var(--text-muted)">Assignés</p>
          </div>
          <div class="card-sm agent-stat">
            <p class="agent-stat-value" style="color:var(--teal)">${resolvedCount}</p>
            <p class="micro" style="color:var(--text-muted)">Résolus</p>
          </div>
          <div class="card-sm agent-stat">
            <p class="agent-stat-value" style="color:var(--lime)">${rate}%</p>
            <p class="micro" style="color:var(--text-muted)">Taux</p>
          </div>
          <div class="card-sm agent-stat">
            <p class="agent-stat-value" style="color:var(--blue)">${avgTime}</p>
            <p class="micro" style="color:var(--text-muted)">Délai moy.</p>
          </div>
        </div>

        <!-- Signalements actifs -->
        <p class="micro mb-sm reveal reveal-delay-2" style="text-transform:uppercase;color:var(--text-muted)">
          ${active.length} signalement${active.length > 1 ? 's' : ''} actif${active.length > 1 ? 's' : ''}
        </p>
        ${active.length === 0 ? `
          <div class="card-sm" style="text-align:center;padding:var(--space-xl);color:var(--text-muted)" class="reveal reveal-delay-2">
            <i class="ti ti-circle-check" style="font-size:32px;display:block;margin-bottom:var(--space-sm);opacity:.4"></i>
            <p class="micro">Aucun signalement actif — bonne travail !</p>
          </div>
        ` : `
          ${active.map(r => `
            <div class="card card-sm mb-sm reveal" data-agent-view="${r.id}" style="cursor:pointer">
              <div class="flex-between">
                <div class="flex-1 min-w-0">
                  <p class="body truncate">${r.description?.slice(0, 60) || 'Aucune description'}</p>
                  <div class="flex items-center flex-gap-sm mt-xs">
                    <span class="micro" style="color:${CAT_COLORS[r.category] || 'var(--text-dim)'}">${CAT_LABELS[r.category] || r.category}</span>
                    <span class="micro" style="color:var(--text-dim)">·</span>
                    <span class="micro" style="color:var(--text-dim)">${r.location?.label || r.location || ''}</span>
                  </div>
                </div>
                <span class="badge ${STATUS_CLS[r.status] || 'status-new'}">${STATUS_LABELS[r.status] || r.status}</span>
              </div>
            </div>
          `).join('')}
        `}

        <div class="divider"></div>
        <div style="display:grid;gap:var(--space-sm)">
          ${UI.btn({ label:'Retour à l\'espace agent', icon:'arrow-left', variant:'ghost', full:true, id:'btn-agent-profil-back' })}
        </div>
      </div>
    `;
  }

  function screenProfil(S) {
    const user    = S.user;
    const logged  = !!user;
    const isAdmin = logged && user.role === 'admin';
    const isAgent = logged && (user.role === 'agent' || user.role === 'admin');

    /* Stats citoyen */
    const myReports  = logged ? S.reports.filter(r => r.userId === user.id) : [];
    const sentCount  = myReports.length;
    const doneCount  = myReports.filter(r => r.status === 'done').length;
    const voteCount  = myReports.reduce((sum, r) => sum + (r.votes || 0), 0);
    const points     = user?.points || 0;
    const badges     = user?.badges || [];

    return `
      <div class="screen">

        <!-- Hero card -->
        <div class="card flex items-center flex-gap-md mb-md reveal">
          <div class="avatar avatar-lg" style="background:var(--accent);color:var(--bg)">${logged ? user.name[0].toUpperCase() : '?'}</div>
          <div class="flex-1 min-w-0">
            <p class="subheading">${logged ? user.name : 'Citoyen anonyme'}</p>
            <p class="micro" style="color:var(--text-muted)">${logged ? (user.phone ? `+229 ${user.phone}` : 'Connecté') : 'Créez un compte pour suivre vos signalements'}</p>
          </div>
          ${logged ? `
            <div style="text-align:right">
              <span class="badge badge-lime">${user.role === 'admin' ? 'Mairie' : user.role === 'agent' ? 'Agent' : 'Citoyen'}</span>
              <p class="micro mt-xs" style="color:var(--lime);font-weight:700">${points} pts</p>
            </div>
          ` : ''}
        </div>

        <!-- Stats grid -->
        ${logged ? `
          <div class="kpi-grid mb-md reveal reveal-delay-1">
            <div class="card" style="text-align:center;padding:var(--space-md)">
              <p class="display-xs" style="color:var(--accent)">${sentCount}</p>
              <p class="micro muted">Signalements</p>
            </div>
            <div class="card" style="text-align:center;padding:var(--space-md)">
              <p class="display-xs" style="color:var(--teal)">${doneCount}</p>
              <p class="micro muted">Résolus</p>
            </div>
            <div class="card" style="text-align:center;padding:var(--space-md)">
              <p class="display-xs" style="color:var(--orange)">${voteCount}</p>
              <p class="micro muted">Votes</p>
            </div>
            <div class="card" style="text-align:center;padding:var(--space-md)">
              <p class="display-xs" style="color:var(--lime)">${points}</p>
              <p class="micro muted">Points</p>
            </div>
          </div>
        ` : ''}

        <!-- Badges -->
        ${logged ? `
          <div class="mb-md reveal reveal-delay-2">
            <p class="micro mb-sm" style="text-transform:uppercase;letter-spacing:0.05em">Badges (${badges.length})</p>
            ${badges.length === 0 ? `
              <div class="card" style="text-align:center;padding:var(--space-lg)">
                <i class="ti ti-award" style="font-size:32px;display:block;margin-bottom:var(--space-sm);opacity:.3"></i>
                <p class="micro muted">Aucun badge débloqué pour le moment</p>
                <p class="micro" style="color:var(--text-dim);margin-top:var(--space-xs)">Signalez des problèmes pour gagner des badges</p>
              </div>
            ` : `
              <div class="badge-grid">
                ${badges.map(b => `
                  <div class="card badge-card" style="text-align:center;padding:var(--space-md)">
                    <span style="font-size:28px;display:block">${b.icon || '🏅'}</span>
                    <p class="micro mt-xs" style="font-weight:600">${b.label}</p>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        ` : ''}

        <!-- Actions -->
        <div style="display:grid;gap:var(--space-sm)" class="reveal reveal-delay-3">
          ${UI.btn({ label:'Payer une amende', icon:'receipt-tax', variant:'ghost', full:true, id:'btn-amendes' })}
        ${logged ? `
          ${UI.btn({ label:'Dashboard mairie', icon:'building-community', variant:'primary', full:true, id:'btn-admin-dash' })}
          ${UI.btn({ label:'Espace agent',     icon:'truck',              variant:'secondary', full:true, id:'btn-agent-dash' })}
        ` : `
          ${UI.btn({ label: 'Créer un compte', icon: 'user-plus', variant: 'lime', full: true, id: 'btn-inscription' })}
          ${UI.btn({ label: 'Demo : citoyen',     icon: 'user',      variant: 'primary',   full: true, id: 'btn-login' })}
          ${UI.btn({ label: 'Demo : agent terrain', icon: 'truck',   variant: 'secondary', full: true, id: 'btn-login-agent' })}
          ${UI.btn({ label: 'Demo : mode mairie', icon: 'building-community', variant: 'secondary', full: true, id: 'btn-login-admin' })}
          ${UI.btn({ label: 'Continuer anonymement', icon: 'ghost',  variant: 'ghost',     full: true, id: 'btn-anon' })}
        `}
        </div>

        <!-- Historique des transactions -->
        ${(S.receipts || []).length ? `
          <div class="divider"></div>
          <div class="reveal reveal-delay-2">
            <p class="micro mb-sm" style="text-transform:uppercase;letter-spacing:0.05em">Historique des transactions</p>
            <div style="display:grid;gap:var(--space-sm)">
              ${S.receipts.slice(0, 10).map(r => UI.receiptCard(r)).join('')}
              ${S.receipts.length > 10 ? `<p class="micro mt-sm" style="color:var(--text-muted);text-align:center">+ ${S.receipts.length - 10} autres transactions</p>` : ''}
            </div>
          </div>
        ` : ''}

        <div class="divider"></div>

        <!-- Préférences -->
        <p class="micro mb-sm" style="text-transform:uppercase;letter-spacing:0.05em">Préférences</p>
        ${S.pushSubscription ? `
          <div class="flex items-center flex-gap-sm mb-sm">
            <i class="ti ti-bell-ringing" style="color:var(--teal);font-size:16px"></i>
            <span class="micro" style="color:var(--teal);flex:1">Notifications push activées</span>
            <button class="btn btn-sm btn-ghost" id="btn-disable-push" style="color:var(--red)">
              <i class="ti ti-bell-off" style="font-size:14px"></i> Désactiver
            </button>
          </div>
        ` : `
          <button class="btn btn-sm flex items-center flex-gap-sm mb-sm" id="btn-enable-push" style="width:100%;border-color:var(--border);background:var(--card);padding:var(--space-sm) var(--space-md);border-radius:var(--radius-sm);font-family:var(--font-ui);color:var(--text);cursor:pointer">
            <i class="ti ti-bell-plus" style="color:var(--accent);font-size:16px"></i>
            <span class="flex-1 text-left micro">Activer les notifications push</span>
            <i class="ti ti-chevron-right" style="color:var(--text-dim);font-size:14px"></i>
          </button>
        `}
        <div class="divider-sm"></div>

        <!-- Paramètres notifications -->
        <div class="mb-sm">
          <p class="micro mb-xs" style="color:var(--text-dim);text-transform:uppercase">Notifications</p>
          ${Notification.permission === 'granted' ? `
            ${UI.toggle({ id:'pref-push_report_update',  label:'Mises à jour de mes signalements', sub:'Statut, assignation, résolution', checked: S.prefs.push_report_update !== false })}
            <div class="divider-sm"></div>
            ${UI.toggle({ id:'pref-push_community',      label:'Activité dans mon quartier',       sub:'Nouveaux signalements à proximité', checked: S.prefs.push_community !== false })}
            <div class="divider-sm"></div>
            ${UI.toggle({ id:'pref-push_weekly',         label:'Résumé hebdomadaire',              sub:'Les 5 signalements les plus votés', checked: S.prefs.push_weekly !== false })}
            <div class="divider-sm"></div>
            ${UI.toggle({ id:'pref-email_digest',        label:'Email quotidien',                  sub:'Résumé des signalements du jour', checked: S.prefs.email_digest !== false })}
          ` : `
            <p class="micro" style="color:var(--orange)"><i class="ti ti-alert-triangle" aria-hidden="true"></i> Autorisez les notifications push d'abord dans les préférences ci-dessus</p>
          `}
        </div>
        <div class="divider-sm"></div>
        <div class="flex items-center flex-gap-sm mb-sm">
          <i class="ti ti-language" style="color:var(--text-muted);font-size:16px"></i>
          <span class="flex-1 micro">Langue / Language</span>
          <select id="sel-lang" aria-label="Langue" style="background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:var(--radius-sm);padding:4px 8px;font-size:13px;font-family:var(--font-ui)">
            <option value="fr" ${S.prefs.lang === 'fr' ? 'selected' : ''}>Français</option>
            <option value="en" ${S.prefs.lang === 'en' ? 'selected' : ''}>English</option>
            <option value="fon" ${S.prefs.lang === 'fon' ? 'selected' : ''}>Fon</option>
          </select>
        </div>
        <div class="divider-sm"></div>
        ${UI.toggle({ id:'pref-theme', label:'Mode clair', sub:'Passer en thème clair', checked: S.prefs.theme === 'light' })}
        <div class="divider-sm"></div>
        ${UI.toggle({ id:'pref-datasaver',  label:'Mode données économisées',       sub:'Désactive animations & photos auto (2G/3G)', checked: S.prefs.dataSaver })}
        <div class="divider-sm"></div>
        ${UI.toggle({ id:'pref-anon',       label:'Signalement anonyme par défaut', sub:'Non associé à votre compte',               checked: S.prefs.anonymous })}

        <div class="divider"></div>

        <!-- Section RGPD / Mes données -->
        ${logged ? `
          <p class="micro mb-sm" style="color:var(--text-muted);margin-top:var(--space-md)">Mes données</p>
          <p class="micro mb-sm" style="color:var(--text-dim)">Téléphone, signalements, préférences, badges</p>
          <div class="flex flex-gap-sm mb-md">
            <button class="btn btn-sm btn-ghost flex-1" id="btn-export-data"><i class="ti ti-download" aria-hidden="true"></i> Télécharger</button>
            <button class="btn btn-sm flex-1" id="btn-delete-account" style="color:var(--red);border-color:transparent"><i class="ti ti-trash" aria-hidden="true"></i> Supprimer</button>
          </div>
          <div class="divider"></div>
        ` : ''}

        <!-- Liens légaux -->
        <p class="micro mb-sm" style="text-transform:uppercase;letter-spacing:0.05em">Informations légales</p>
        <div class="settings-list mb-md">
          <button class="settings-item legal-link" id="btn-legal-cgu" style="cursor:pointer;width:100%;background:none;border:none;padding:var(--space-sm) 0;text-align:left;font-family:var(--font-ui);color:var(--text);display:flex;align-items:center;gap:var(--space-sm)">
            <i class="ti ti-file-text" style="color:var(--text-muted);font-size:16px"></i>
            <span class="flex-1">Conditions générales d'utilisation</span>
            <i class="ti ti-chevron-right" style="color:var(--text-dim);font-size:14px"></i>
          </button>
          <button class="settings-item legal-link" id="btn-legal-privacy" style="cursor:pointer;width:100%;background:none;border:none;padding:var(--space-sm) 0;text-align:left;font-family:var(--font-ui);color:var(--text);display:flex;align-items:center;gap:var(--space-sm)">
            <i class="ti ti-shield-lock" style="color:var(--text-muted);font-size:16px"></i>
            <span class="flex-1">Politique de confidentialité</span>
            <i class="ti ti-chevron-right" style="color:var(--text-dim);font-size:14px"></i>
          </button>
          <button class="settings-item" id="btn-legal-contact" style="cursor:pointer;width:100%;background:none;border:none;padding:var(--space-sm) 0;text-align:left;font-family:var(--font-ui);color:var(--text);display:flex;align-items:center;gap:var(--space-sm)">
            <i class="ti ti-mail" style="color:var(--text-muted);font-size:16px"></i>
            <span class="flex-1">Nous contacter</span>
            <i class="ti ti-chevron-right" style="color:var(--text-dim);font-size:14px"></i>
          </button>
          <button class="settings-item" id="btn-faq" style="cursor:pointer;width:100%;background:none;border:none;padding:var(--space-sm) 0;text-align:left;font-family:var(--font-ui);color:var(--text);display:flex;align-items:center;gap:var(--space-sm)">
            <i class="ti ti-question-mark" style="color:var(--text-muted);font-size:16px"></i>
            <span class="flex-1">Questions fréquentes</span>
            <i class="ti ti-chevron-right" style="color:var(--text-dim);font-size:14px"></i>
          </button>
          <button class="settings-item legal-link" id="btn-legal-about" style="cursor:pointer;width:100%;background:none;border:none;padding:var(--space-sm) 0;text-align:left;font-family:var(--font-ui);color:var(--text);display:flex;align-items:center;gap:var(--space-sm)">
            <i class="ti ti-info-circle" style="color:var(--text-muted);font-size:16px"></i>
            <span class="flex-1">À propos de CityReport</span>
            <i class="ti ti-chevron-right" style="color:var(--text-dim);font-size:14px"></i>
          </button>
        </div>

        <!-- Déconnexion -->
        ${logged ? `
          <div class="divider"></div>
          ${UI.btn({ label: 'Se déconnecter', icon: 'logout', variant: 'danger', full: true, id: 'btn-logout' })}
        ` : ''}

        <p class="micro text-center mt-md" style="color:var(--text-dim);padding-bottom:var(--space-lg)">CityReport v${VERSION}</p>

      </div>
    `;
  }

  function screenInscription(S) {
    const step = S.signupStep || 1;
    const phone = S.signupPhone || '';
    const operator = S.signupOperator || 'mtn';
    const timer = S.signupTimer || 0;

    return `
      <div class="screen">

        <div style="text-align:center;padding:var(--space-xl) 0 var(--space-lg)">
          <div style="width:64px;height:64px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-md)">
            <i class="ti ti-phone" style="font-size:28px;color:var(--bg)" aria-hidden="true"></i>
          </div>
          <p class="subheading">${step === 1 ? 'Créer un compte' : 'Vérification'}</p>
          <p class="muted">${step === 1 ? 'Entrez votre numéro béninois' : 'Saisissez le code reçu par SMS'}</p>
        </div>

        ${step === 1 ? `
          <!-- Étape 1 : Numéro de téléphone -->
          <div class="card mb-md">
            <label class="micro mb-xs" style="display:block">Numéro de téléphone</label>
            <div class="flex items-center flex-gap-sm">
              <span class="body" style="color:var(--text-muted)">+229</span>
              <input type="tel" class="input" id="input-phone" value="${phone}" placeholder="97 12 34 56" maxlength="8" autocomplete="tel-national" inputmode="numeric" style="flex:1;text-align:center;font-size:20px;letter-spacing:0.15em;font-family:var(--font-mono)">
            </div>
          </div>

          <div class="card mb-md">
            <label class="micro mb-xs" style="display:block">Opérateur</label>
            <div class="flex items-center flex-gap-sm">
              <button class="btn btn-sm flex-1 operator-btn${operator === 'mtn' ? ' operator-active' : ''}" data-op="mtn" style="${operator === 'mtn' ? 'border-color:var(--lime);background:rgba(200,255,0,.08)' : ''}">
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ffc107;margin-right:4px"></span> MTN
              </button>
              <button class="btn btn-sm flex-1 operator-btn${operator === 'moov' ? ' operator-active' : ''}" data-op="moov" style="${operator === 'moov' ? 'border-color:var(--lime);background:rgba(200,255,0,.08)' : ''}">
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#2196f3;margin-right:4px"></span> Moov
              </button>
            </div>
          </div>

          <div style="display:grid;gap:var(--space-sm)">
            <button class="btn btn-lime" id="btn-request-otp">
              <i class="ti ti-send" aria-hidden="true"></i> Envoyer le code
            </button>
            <button class="btn btn-ghost" id="btn-inscription-back">Retour</button>
          </div>
        ` : `
          <!-- Étape 2 : OTP -->
          <div class="card mb-md">
            <p class="micro mb-sm text-center" style="color:var(--text-muted)">Code envoyé au <strong>+229 ${phone}</strong></p>
            <div class="otp-inputs">
              ${[0,1,2,3,4,5].map(i => `
                <input type="tel" maxlength="1" class="otp-input" data-idx="${i}" id="otp-${i}" autocomplete="one-time-code" inputmode="numeric"${i === 0 ? ' autofocus' : ''} aria-label="Code OTP chiffre ${i+1}">
              `).join('')}
            </div>
            <p class="micro text-center mt-sm" style="color:var(--text-dim)">Code de démo : <strong>123456</strong></p>
          </div>

          <div style="display:grid;gap:var(--space-sm)">
            <button class="btn btn-lime" id="btn-verify-otp">
              <i class="ti ti-check" aria-hidden="true"></i> Vérifier le code
            </button>
            <button class="btn btn-ghost" id="btn-resend-otp"${timer > 0 ? ' disabled' : ''}>
              ${timer > 0 ? `Renvoyer dans ${timer}s` : 'Renvoyer le code'}
            </button>
            <button class="btn btn-ghost" id="btn-otp-back">Modifier le numéro</button>
          </div>
          <p class="micro text-center mt-sm" style="color:var(--text-dim)">Un SMS a été envoyé au ${operator === 'mtn' ? 'MTN' : 'Moov'} ${phone}</p>
        `}

      </div>
    `;
  }

  function screenRapport(S) {
    const id    = S.routeParams?.[0];
    const report = _resolveReport(S, id);
    if (!report) {
      return `
        <div class="screen">
          ${UI.empty({ icon:'mood-empty', title:'Signalement introuvable', sub:'Ce signalement n\'existe pas ou a été supprimé.', action:{ label:'Retour', icon:'arrow-left', variant:'ghost', id:'btn-back-empty' } })}
        </div>
      `;
    }

    const CAT_CFG = {
      roads:{ label:'Voirie', icon:'road', cls:'cat-roads' }, water:{ label:'Eau', icon:'droplet', cls:'cat-water' },
      waste:{ label:'Déchets', icon:'trash', cls:'cat-waste' }, light:{ label:'Éclairage', icon:'bulb', cls:'cat-light' },
      flood:{ label:'Inondation', icon:'ripple', cls:'cat-flood' }, health:{ label:'Santé', icon:'heart-rate-monitor', cls:'cat-health' },
      security:{ label:'Sécurité', icon:'shield', cls:'cat-security' }, other:{ label:'Autre', icon:'dots', cls:'cat-other' },
    };
    const cat = CAT_CFG[report.category] || CAT_CFG.other;

    const STATUS_CFG = {
      new:{ label:'Nouveau', cls:'status-new' }, progress:{ label:'En cours', cls:'status-progress' },
      done:{ label:'Résolu', cls:'status-done' }, rejected:{ label:'Rejeté', cls:'status-rejected' },
      urgent:{ label:'Urgent', cls:'status-urgent' },
    };
    const st = STATUS_CFG[report.status] || STATUS_CFG.new;

    const photo   = report.photo || null;
    const timeAgo = report.createdAt ? _timeAgo(new Date(report.createdAt)) : report.time || '';
    const ref     = report.ref || `#${report.id}`;
    const locLabel = report.location?.label || report.location || 'Non précisée';

    return `
      <div class="screen" style="padding:0">

        <!-- Hero image / gradient -->
        <div class="detail-hero">
          ${photo
            ? `<img src="${photo}" alt="Photo" class="detail-hero-img">`
            : `<div class="detail-hero-icon"><i class="ti ti-${cat.icon}" aria-hidden="true"></i></div>`
          }
          <div class="detail-hero-overlay"></div>
          <span class="badge ${st.cls}" style="position:absolute;top:var(--space-md);right:var(--space-md);z-index:2">${st.label}</span>
        </div>

        <!-- Contenu -->
        <div class="detail-content">

          <!-- Catégorie + référence -->
          <div class="flex-between mb-sm">
            <div class="flex items-center flex-gap-sm">
              <div class="cat-item ${cat.cls}" style="padding:5px;border-radius:6px;width:30px;height:30px;min-width:30px">
                <div class="cat-icon" style="width:20px;height:20px;font-size:13px;border-radius:4px">
                  <i class="ti ti-${cat.icon}" aria-hidden="true"></i>
                </div>
              </div>
              <span class="micro text-lime">${cat.label}</span>
              ${report.subtype ? `<span class="micro" style="color:var(--text-dim)">· ${report.subtype}</span>` : ''}
            </div>
            <span class="micro" style="color:var(--text-dim)">${ref}</span>
          </div>

          <!-- Description -->
          <p class="subheading mb-md reveal">${report.description || 'Aucune description fournie'}</p>

          <!-- Localisation -->
          <div class="card-sm flex items-center flex-gap-sm mb-md reveal reveal-delay-1">
            <i class="ti ti-map-pin" style="color:var(--lime);font-size:16px;flex-shrink:0" aria-hidden="true"></i>
            <span class="muted" style="flex:1">${locLabel}</span>
            ${report.location?.detail ? `<span class="micro" style="color:var(--text-dim)">· ${report.location.detail}</span>` : ''}
          </div>

          <!-- Chronologie statut -->
          <div class="card mb-md reveal reveal-delay-2">
            <p class="micro mb-md" style="text-transform:uppercase">Suivi du signalement</p>
            ${_renderTimeline(report.status, report.statusHistory || [])}
          </div>

          <!-- Stats -->
          <div class="detail-stats reveal reveal-delay-3">
            <div class="detail-stat">
              <p class="detail-stat-value">${report.votes || 0}</p>
              <p class="micro">Soutiens</p>
            </div>
            <div class="detail-stat">
              <p class="detail-stat-value" style="color:var(--text-muted)">${timeAgo}</p>
              <p class="micro">Signalé</p>
            </div>
          </div>

          <!-- Agent assigné -->
          ${S.user?.role === 'admin' || S.user?.role === 'agent' ? `
            <div class="card-sm mb-md reveal reveal-delay-4 flex-between">
              <div>
                <p class="micro" style="text-transform:uppercase;color:var(--text-muted)">Agent assigné</p>
                <p class="body">${report.agentId ? (S.agents || []).find(a => a.id === report.agentId)?.name || '—' : 'Non assigné'}</p>
                ${report.agentId ? `<p class="micro" style="color:var(--text-dim)">${(S.agents || []).find(a => a.id === report.agentId)?.zone || ''}</p>` : ''}
              </div>
              <button class="btn btn-sm btn-ghost" id="btn-assign-agent" data-assign-id="${id}">
                <i class="ti ti-user-plus" style="font-size:14px" aria-hidden="true"></i>
                ${report.agentId ? 'Réassigner' : 'Assigner'}
              </button>
            </div>
          ` : ''}

          <!-- Actions admin (uniquement si connecté en admin/agent et statut non final) -->
          ${(S.user?.role === 'admin' || S.user?.role === 'agent') && report.status !== 'done' && report.status !== 'rejected' ? `
            <div class="card mb-md reveal reveal-delay-4">
              <p class="micro mb-sm" style="text-transform:uppercase">Actions</p>
              <div style="display:grid;gap:var(--space-sm)">
                ${report.status === 'new' || report.status === 'urgent' ? `
                  <button class="btn btn-sm btn-lime" data-action-status="${id}" data-action-next="progress">
                    <i class="ti ti-refresh" aria-hidden="true"></i> Prendre en charge
                  </button>
                  <button class="btn btn-sm" style="background:var(--red-dim);color:var(--red);border:1px solid var(--red-border)" data-action-status="${id}" data-action-next="rejected">
                    <i class="ti ti-x" aria-hidden="true"></i> Rejeter
                  </button>
                ` : report.status === 'progress' ? `
                  <button class="btn btn-sm btn-lime" data-action-status="${id}" data-action-next="done">
                    <i class="ti ti-circle-check" aria-hidden="true"></i> Marquer résolu
                  </button>
                ` : ''}
              </div>
            </div>
          ` : ''}

          <!-- Dons citoyens -->
          <div class="card mb-md reveal reveal-delay-4" style="border-color:rgba(200,255,0,.15)">
            <div class="flex items-center flex-gap-sm mb-sm">
              <i class="ti ti-heart-handshake" style="color:var(--accent);font-size:16px"></i>
              <p class="micro" style="text-transform:uppercase;color:var(--text-muted)">Soutenir ce signalement</p>
            </div>

            <!-- Barre de progression -->
            ${(() => {
              const goal = report.donationGoal || 50000;
              const collected = report.donationsCollected || 0;
              const pct = Math.min(100, Math.round((collected / goal) * 100));
              return `
                <div class="flex-between mb-xs">
                  <span class="micro" style="color:var(--text-muted)">${collected.toLocaleString()} FCFA collectés</span>
                  <span class="micro" style="color:var(--text-muted)">Objectif : ${goal.toLocaleString()} FCFA</span>
                </div>
                <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden">
                  <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--accent),var(--lime));border-radius:3px;transition:width .6s var(--ease-out)"></div>
                </div>
                <p class="micro mt-xs" style="color:var(--text-dim)">${pct}% · ${collected >= goal ? 'Objectif atteint ! 🎉' : 'Contribuez à la résolution de ce problème'}</p>
              `;
            })()}

            <!-- Liste donateurs -->
            ${(() => {
              const reportDonors = (S.donations || []).filter(d => d.reportId == report.id).slice(-5);
              if (!reportDonors.length) return '';
              return `
                <div class="mt-sm" style="border-top:1px solid var(--border);padding-top:var(--space-sm)">
                  ${reportDonors.slice().reverse().map(d => `
                    <div class="flex items-center flex-gap-sm" style="padding:2px 0">
                      <span style="width:22px;height:22px;border-radius:50%;background:var(--card-2);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:600;color:var(--accent);flex-shrink:0">${d.donor}</span>
                      <span class="micro" style="color:var(--text-dim)"><strong>${d.donorFull.split(' ')[0]} ${d.donorFull.includes(' ') ? d.donorFull.split(' ').slice(1).map(w => w[0] + '.').join(' ') : ''}</strong> a donné ${d.amount.toLocaleString()} FCFA</span>
                    </div>
                  `).join('')}
                </div>
              `;
            })()}

            <button class="btn btn-sm btn-primary full mt-sm" id="btn-donate-${report.id}">
              <i class="ti ti-heart-plus" aria-hidden="true"></i> Faire un don
            </button>
            <p class="micro mt-xs" style="color:var(--text-dim);font-size:9px">100% des dons sont reversés à la mairie pour la résolution de ce signalement</p>
          </div>

          <!-- Actions citoyennes -->
          <div class="detail-actions reveal reveal-delay-4">
            ${UI.btn({ label:'Soutenir', icon:'arrow-up', variant:'primary', full:true, id:'btn-vote-up' })}
            ${UI.btn({ label:'Partager', icon:'share', variant:'ghost', full:true, id:'btn-share' })}
          </div>

          <div class="divider"></div>
          <p class="micro text-center" style="color:var(--text-dim)">CityReport · Signalement citoyen</p>

        </div>
      </div>

      <!-- Modale don citoyen -->
      ${S.showDonateModal && S.donateReportId == report.id ? `
        <div class="modal-overlay open" style="display:flex;z-index:1001" id="donate-overlay" role="dialog" aria-modal="true" aria-label="Faire un don">
          <div class="modal-sheet" style="max-width:340px;margin:auto;padding:var(--space-lg);position:relative;z-index:1002">
            <div style="text-align:center;margin-bottom:var(--space-md)">
              <i class="ti ti-heart-handshake" style="font-size:32px;color:var(--accent);display:block;margin-bottom:var(--space-sm)"></i>
              <p class="subheading">Soutenir ce signalement</p>
              <p class="micro" style="color:var(--text-muted)">${report.description?.slice(0, 60) || 'Signalement'}…</p>
            </div>

            <p class="micro mb-sm" style="color:var(--text-muted)">Montant du don</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-xs);margin-bottom:var(--space-sm)">
              ${[500, 1000, 2000, 5000].map(amt => `
                <button class="btn btn-sm ${S.donateAmount === amt ? 'btn-primary' : 'btn-ghost'}" data-donate-amount="${amt}" style="font-family:var(--font-display);font-size:16px;padding:8px;text-align:center">${amt.toLocaleString()}</button>
              `).join('')}
            </div>
            <div class="flex items-center flex-gap-xs mb-md">
              <span class="micro" style="color:var(--text-muted)">Autre :</span>
              <input type="number" id="donate-custom" class="input" value="${S.donateAmount && ![500,1000,2000,5000].includes(S.donateAmount) ? S.donateAmount : ''}" placeholder="Montant FCFA" min="100" step="100" style="flex:1" aria-label="Montant personnalisé">
            </div>

            <p class="micro mb-xs" style="color:var(--text-muted)">Moyen de paiement</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-xs);margin-bottom:var(--space-md)">
              <button class="btn btn-sm btn-ghost" id="btn-donate-card"><i class="ti ti-credit-card"></i> Carte</button>
              <button class="btn btn-sm btn-ghost" id="btn-donate-momo"><i class="ti ti-device-mobile"></i> Mobile Money</button>
            </div>

            <p class="micro mb-md" style="color:var(--orange);text-align:center">100% reversé à la mairie · Frais 1-2%</p>

            <div style="display:grid;gap:var(--space-sm)">
              <button class="btn btn-primary full" id="btn-donate-confirm" ${S.donateAmount < 100 ? 'disabled' : ''}>
                <i class="ti ti-heart-plus" aria-hidden="true"></i> Donner ${(S.donateAmount || 0).toLocaleString()} FCFA
              </button>
              <button class="btn btn-ghost full" id="btn-donate-close">Annuler</button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Modale changement de statut -->
      ${S.modalOpen && S.modalPayload?.type === 'statusChange' ? `
        <div class="modal-overlay open" id="modal-overlay">
          <div class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div class="modal-handle"></div>
            <p class="subheading mb-sm" id="modal-title">Justifier le changement</p>
            <p class="micro muted mb-md">Vous passez ce signalement à « ${STATUS_LABELS[S.modalPayload.newStatus] || S.modalPayload.newStatus} »</p>
            <textarea class="modal-textarea" id="modal-note" placeholder="Note obligatoire — expliquez la raison du changement…" rows="3" aria-label="Note obligatoire"></textarea>
            <div class="flex" style="gap:var(--space-sm);margin-top:var(--space-md)">
              <button class="btn btn-sm btn-ghost flex-1" id="btn-modal-cancel">Annuler</button>
              <button class="btn btn-sm btn-lime flex-1" id="btn-modal-confirm">Confirmer</button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Modale assignation agent -->
      ${S.modalOpen && S.modalPayload?.type === 'assignAgent' ? `
        ${(() => {
          const rep = _resolveReport(S, S.modalPayload.reportId);
          const commune = rep?.location?.commune || '';
          const available = S.agents.filter(a => !commune || a.zone.toLowerCase() === commune.toLowerCase());
          return `
            <div class="modal-overlay open" id="modal-overlay-assign">
              <div class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="assign-title">
                <div class="modal-handle"></div>
                <p class="subheading mb-sm" id="assign-title">Assigner un agent</p>
                <p class="micro muted mb-md">${available.length} agent${available.length > 1 ? 's' : ''} disponible${available.length > 1 ? 's' : ''}</p>
                <div style="display:flex;flex-direction:column;gap:var(--space-xs)">
                  ${available.map(a => `
                    <button class="card-sm flex-between assign-agent-btn" data-assign-agent="${a.id}" style="cursor:pointer;width:100%;text-align:left;border:none;background:var(--card-2)" data-report-id="${S.modalPayload.reportId}">
                      <div>
                        <p class="body">${a.name}</p>
                        <p class="micro" style="color:var(--text-dim)">${a.zone} · ${a.assigned.length} en cours</p>
                      </div>
                      <span class="badge ${a.assigned.length > 5 ? 'badge-orange' : 'badge-lime'}">${a.assigned.length}</span>
                    </button>
                  `).join('')}
                  ${!available.length ? `<p class="micro muted text-center" style="padding:var(--space-md)">Aucun agent disponible pour cette commune</p>` : ''}
                </div>
                <div style="margin-top:var(--space-md)">
                  <button class="btn btn-sm btn-ghost full" id="btn-assign-cancel">Annuler</button>
                </div>
              </div>
            </div>
          `;
        })()}
      ` : ''}

        </div>
      </div>
    `;
  }


  /* ── Helpers rapport détail ── */

  function _resolveReport(S, id) {
    if (!id) return null;
    /* 1. Chercher dans les signalements soumis */
    const found = S.reports.find(r => String(r.id) === String(id));
    if (found) return found;
    /* 2. Chercher dans les signalements en attente (pending) */
    const pending = S.pendingReports.find(r => String(r.id) === String(id));
    if (pending) return pending;
    /* 3. Chercher dans les pins démo de la carte */
    const pin = MapView.DEMO_PINS.find(p => String(p.id) === String(id));
    if (pin) {
      const CAT_CFG = { roads:{ label:'Voirie' }, water:{ label:'Eau' }, waste:{ label:'Déchets' }, light:{ label:'Éclairage' }, flood:{ label:'Inondation' }, health:{ label:'Santé' }, security:{ label:'Sécurité' }, other:{ label:'Autre' } };
      return {
        id: pin.id, category: pin.cat, status: pin.status,
        location: { label: `${pin.loc}, ${pin.cat === 'roads' ? 'Cotonou' : 'Abomey-Calavi'}` },
        description: pin.label, votes: 0, createdAt: new Date().toISOString(),
        ref: `DEMO-${pin.id}`, photo: null,
      };
    }
    return null;
  }

  function _timeAgo(date) {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)}j`;
    return date.toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
  }

  function _renderTimeline(status, history = []) {
    const steps = [
      { key:'new', label:'Nouveau' },
      { key:'progress', label:'En cours' },
      { key:'done', label:'Résolu' },
    ];
    let activeIdx = steps.findIndex(s => s.key === status);
    if (activeIdx < 0) activeIdx = (status === 'urgent' || status === 'rejected') ? 2 : 0;

    const timelineHtml = steps.map((s, i) => {
      const done = i <= activeIdx;
      const isActive = steps[activeIdx]?.key === s.key;
      const isLast = i === steps.length - 1;
      const historyEntry = history.find(h => h.status === s.key);
      return `
        <div class="tl-item${done ? ' tl-done' : ''}${isActive ? ' tl-active' : ''}">
          <div class="tl-track">
            <div class="tl-dot">${done ? '<i class="ti ti-check" aria-hidden="true"></i>' : ''}</div>
            ${isLast ? '' : '<div class="tl-line"></div>'}
          </div>
          <div class="tl-body">
            <p class="tl-title">${s.label}</p>
            ${historyEntry ? `
              <p class="tl-sub micro" style="color:var(--text-dim)">${historyEntry.note ? `«${historyEntry.note}»` : ''}</p>
              <p class="tl-sub micro" style="color:var(--text-muted)">${historyEntry.date ? _timeAgo(new Date(historyEntry.date)) : ''}</p>
            ` : ''}
            ${isActive && !historyEntry && (status === 'urgent' || status === 'rejected') ? `<p class="tl-sub" style="color:var(--red)">${status === 'urgent' ? 'Priorité urgente' : 'Signalement rejeté'}</p>` : ''}
          </div>
        </div>`;
    }).join('');

    /* Historique détaillé */
    const detailHistory = history.filter(h => h.note).map(h => `
      <div class="tl-history-item">
        <span class="badge ${STATUS_CLS[h.status] || 'status-new'} micro">${STATUS_LABELS[h.status] || h.status}</span>
        <span class="micro" style="color:var(--text-dim)">${h.note}</span>
        <span class="micro" style="color:var(--text-muted)">${h.date ? _timeAgo(new Date(h.date)) : ''}</span>
      </div>
    `).join('');

    return `
      <div class="timeline">${timelineHtml}</div>
      ${detailHistory ? `<div class="tl-history mt-sm">${detailHistory}</div>` : ''}
    `;
  }


  /* ── Simulation d'alertes admin ── */
  let _alertTimerId = null;

  function _manageAlertSimulation(currentScreen) {
    if (currentScreen === 'admin' && !_alertTimerId) {
      _alertTimerId = setInterval(() => {
        const S = State.get();
        if (S.screen !== 'admin') return;
        const reports = S.reports || [];
        const lastReport = reports[reports.length - 1];
        if (lastReport && lastReport.status === 'new') {
          const catLabel = CAT_LABELS[lastReport.category] || lastReport.category;
          State.Actions.addAlert({
            text: `Nouveau signalement urgent : ${catLabel} à ${lastReport.location?.label || lastReport.location || 'inconnu'}`,
            reportId: lastReport.id,
          });
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = 800;
            const gain = ctx.createGain();
            gain.gain.value = 0.1;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
          } catch (_) { /* web audio non disponible */ }
        }
      }, 30000);
    }
    if (currentScreen !== 'admin' && _alertTimerId) {
      clearInterval(_alertTimerId);
      _alertTimerId = null;
    }
  }

  /* ── Timer OTP ── */
  let _otpTimerId = null;

  function _startOtpTimer() {
    if (_otpTimerId) clearInterval(_otpTimerId);
    _otpTimerId = setInterval(() => {
      const S = State.get();
      if (S.screen !== 'inscription' || S.signupStep !== 2) {
        clearInterval(_otpTimerId);
        _otpTimerId = null;
        return;
      }
      if (S.signupTimer <= 1) {
        clearInterval(_otpTimerId);
        _otpTimerId = null;
        State.go({ signupTimer: 0 });
      } else {
        State.Actions.decrementTimer();
      }
    }, 1000);
  }

  /* ── Panneau de notifications ── */
  function _renderAlertPanel(S) {
    const alerts = S.adminAlerts || [];
    const unread = alerts.filter(a => !a.read);

    return `
      <div class="alert-panel-overlay${S.showAlertPanel ? ' open' : ''}" id="alert-panel-overlay">
        <div class="alert-panel${S.showAlertPanel ? ' open' : ''}" role="dialog" aria-modal="true" aria-label="Notifications">
          <div class="alert-panel-header">
            <p class="subheading">Notifications</p>
            <button class="btn btn-sm btn-ghost" id="btn-close-alert-panel" aria-label="Fermer">
              <i class="ti ti-x" aria-hidden="true"></i>
            </button>
          </div>

          <div class="alert-panel-body">
            ${unread.length > 0 ? `
              <button class="btn btn-sm btn-ghost" id="btn-mark-alerts-read" style="margin-bottom:var(--space-sm);width:100%">
                <i class="ti ti-check-double" aria-hidden="true"></i> Marquer tout comme lu
              </button>
            ` : ''}

            ${alerts.length === 0 ? `
              <div style="text-align:center;padding:var(--space-xl);color:var(--text-muted)">
                <i class="ti ti-bell-off" style="font-size:36px;display:block;margin-bottom:var(--space-sm);opacity:.4"></i>
                <p class="micro">Aucune notification</p>
              </div>
            ` : `
              ${alerts.map(a => `
                <div class="alert-item${a.read ? '' : ' alert-unread'}">
                  <div class="alert-item-dot${a.read ? '' : ' alert-dot-unread'}"></div>
                  <div class="flex-1 min-w-0">
                    <p class="body-sm">${a.text || 'Notification'}</p>
                    <p class="micro" style="color:var(--text-muted)">${a.date ? _timeAgo(new Date(a.date)) : ''}</p>
                  </div>
                </div>
              `).join('')}
            `}
          </div>
        </div>
      </div>
    `;
  }

  /* ── Modale célébration badge ── */
  function _renderBadgeModal(S) {
    const badge = S.showBadgeModal;
    if (!badge) return '';
    return `
      <div class="modal-overlay open badge-celebration-overlay" id="badge-celebration-overlay" style="display:flex;z-index:1001" role="dialog" aria-modal="true" aria-label="Nouveau badge">
        <div class="modal-sheet badge-celebration" style="max-width:320px;margin:auto;padding:var(--space-xl);position:relative;z-index:1002;text-align:center">
          <div style="font-size:56px;margin-bottom:var(--space-md);animation:badge-pop .4s var(--ease-out)">${badge.icon || '🏆'}</div>
          <p class="subheading mb-xs">Nouveau badge !</p>
          <p class="display-xs" style="color:var(--accent);margin-bottom:var(--space-sm)">${badge.label}</p>
          <p class="micro muted mb-md">${badge.description || 'Continuez à signaler pour débloquer plus de badges'}</p>
          <button class="btn btn-lime" id="btn-close-badge-modal" style="width:100%">
            <i class="ti ti-check" aria-hidden="true"></i> Super !
          </button>
        </div>
      </div>
    `;
  }

  /* ── Modale sondage satisfaction ── */
  function _renderSurveyModal(S) {
    if (!S.showSurveyModal) return '';
    const reportId = S.surveyReportId;
    const report = reportId ? S.reports.find(r => r.id === reportId) : null;
    return `
      <div class="modal-overlay open" id="survey-overlay" style="display:flex;z-index:1001" role="dialog" aria-modal="true" aria-label="Sondage satisfaction">
        <div class="modal-sheet" style="max-width:360px;margin:auto;padding:var(--space-xl);position:relative;z-index:1002">
          <div style="text-align:center;margin-bottom:var(--space-md)">
            <i class="ti ti-star" style="font-size:36px;color:var(--accent);display:block;margin-bottom:var(--space-sm)"></i>
            <p class="subheading">Satisfait du traitement ?</p>
            <p class="muted">${report ? `Signalement : ${report.reference || report.id}` : ''}</p>
          </div>
          <div class="star-rating mb-md" id="star-rating">
            ${[1,2,3,4,5].map(i => `
              <button class="star-btn" data-rating="${i}" aria-label="${i} étoile${i > 1 ? 's' : ''}">
                <i class="ti ti-star" style="font-size:28px"></i>
              </button>
            `).join('')}
          </div>
          <textarea class="community-textarea mb-md" id="survey-comment" placeholder="Un commentaire ? (optionnel)" rows="2" maxlength="300" aria-label="Commentaire du sondage"></textarea>
          <div style="display:grid;gap:var(--space-sm)">
            <button class="btn btn-lime" id="btn-submit-survey" disabled>
              <i class="ti ti-check" aria-hidden="true"></i> Envoyer
            </button>
            <button class="btn btn-ghost" id="btn-skip-survey">
              <i class="ti ti-x" aria-hidden="true"></i> Passer
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /* ── Panneau partager (fallback) ── */
  function _renderSharePanel(S) {
    if (!S.showSharePanel) return '';
    return `
      <div class="modal-overlay open" id="share-panel-overlay" style="display:flex;z-index:1001" role="dialog" aria-modal="true" aria-label="Partager">
        <div class="modal-sheet" style="max-width:320px;margin:auto;padding:var(--space-lg);position:relative;z-index:1002">
          <div style="text-align:center;margin-bottom:var(--space-md)">
            <i class="ti ti-share" style="font-size:32px;color:var(--accent);display:block;margin-bottom:var(--space-sm)"></i>
            <p class="subheading">Partager</p>
          </div>
          <div style="display:grid;gap:var(--space-sm)">
            <button class="btn flex items-center flex-gap-sm" id="btn-share-wa" style="border-color:var(--border);background:#25D366;color:#fff;justify-content:center">
              <i class="ti ti-brand-whatsapp" style="font-size:18px"></i> WhatsApp
            </button>
            <button class="btn flex items-center flex-gap-sm" id="btn-share-copy" style="border-color:var(--border);background:var(--surface);color:var(--text);justify-content:center">
              <i class="ti ti-copy" style="font-size:18px"></i> Copier le lien
            </button>
            <button class="btn btn-ghost" id="btn-share-close">
              <i class="ti ti-x" aria-hidden="true"></i> Annuler
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /* ── Modale suppression de compte ── */
  function _renderDeleteModal(S) {
    const step = S.deleteStep || 0;
    if (!step) return '';
    return `
      <div class="modal-overlay open" style="display:flex;z-index:1001;background:rgba(0,0,0,.7)" role="dialog" aria-modal="true" aria-label="Supprimer mon compte">
        <div class="modal-sheet" style="max-width:340px;margin:auto;padding:var(--space-lg);position:relative;z-index:1002;text-align:center">
          ${step === 1 ? `
            <i class="ti ti-alert-triangle" style="font-size:36px;color:var(--red);display:block;margin-bottom:var(--space-sm)"></i>
            <p class="subheading mb-sm">Supprimer mon compte</p>
            <p class="micro mb-md" style="color:var(--text-muted)">
              Cette action est irréversible. Toutes vos données personnelles, signalements et préférences seront définitivement effacés.
            </p>
            <div class="flex flex-gap-sm">
              <button class="btn btn-ghost flex-1" id="btn-delete-cancel">Annuler</button>
              <button class="btn flex-1" id="btn-delete-confirm" style="background:var(--red);color:#fff">Supprimer</button>
            </div>
          ` : step === 2 ? `
            <i class="ti ti-shield-lock" style="font-size:36px;color:var(--accent);display:block;margin-bottom:var(--space-sm)"></i>
            <p class="subheading mb-sm">Confirmation OTP</p>
            <p class="micro mb-md" style="color:var(--text-muted)">
              Un code de confirmation a été envoyé à votre téléphone (démonstration : <strong>123456</strong>)
            </p>
            <div class="otp-inputs" style="justify-content:center;margin-bottom:var(--space-md)">
              ${[0,1,2,3,4,5].map(i => `
                <input type="tel" maxlength="1" class="otp-input delete-otp-input" data-idx="${i}" id="delete-otp-${i}" inputmode="numeric" aria-label="Code suppression chiffre ${i+1}">
              `).join('')}
            </div>
            <div class="flex flex-gap-sm">
              <button class="btn btn-ghost flex-1" id="btn-delete-otp-cancel">Annuler</button>
              <button class="btn flex-1" id="btn-delete-otp-confirm" style="background:var(--red);color:#fff">Confirmer</button>
            </div>
            <p class="micro mt-xs" style="color:var(--orange)"><i class="ti ti-alert-triangle" style="font-size:10px"></i> Cette action est irréversible</p>
          ` : ''}
        </div>
      </div>
    `;
  }

  /* ── Modale signaler un abus ── */
  function _renderFlagModal(S) {
    if (!S.modalOpen || S.modalPayload?.type !== 'flagPost') return '';
    const reasons = ['Spam', 'Contenu haineux', 'Information fausse', 'Autre'];
    return `
      <div class="modal-overlay open" style="display:flex;z-index:1001" role="dialog" aria-modal="true" aria-label="Signaler un abus">
        <div class="modal-sheet" style="max-width:300px;margin:auto;padding:var(--space-lg);position:relative;z-index:1002">
          <p class="subheading mb-sm">Signaler ce message</p>
          <p class="micro muted mb-md">Pourquoi signalez-vous ce message ?</p>
          ${reasons.map(r => `
            <button class="flag-reason-btn" data-flag-reason="${r}" style="display:block;width:100%;background:var(--card-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:var(--space-sm) var(--space-md);margin-bottom:var(--space-xs);text-align:left;cursor:pointer;font-family:var(--font-ui);color:var(--text);font-size:14px">
              <i class="ti ti-flag" style="color:var(--red);font-size:14px;margin-right:8px" aria-hidden="true"></i>
              ${r}
            </button>
          `).join('')}
          <button class="btn btn-ghost full mt-sm" id="btn-flag-cancel">Annuler</button>
        </div>
      </div>
    `;
  }

  /* ════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════ */

  function render() {
    const S    = State.get();
    const root = document.getElementById('root');
    if (!root) return;

    /* Restaurer le focus avant de détruire le DOM (modale fermée) */
    FocusTrap.release();

    /* Appliquer le thème */
    _applyTheme();

    const prevScreen = S.prevScreen;

    /* Gérer la simulation d'alertes (admin uniquement) */
    _manageAlertSimulation(S.screen);

    /* Nettoyer le timer OTP si on quitte l'écran d'inscription */
    if (prevScreen === 'inscription' && prevScreen !== S.screen && _otpTimerId) {
      clearInterval(_otpTimerId);
      _otpTimerId = null;
    }

    /* Choisir le screen */
    const screenFn = {
      home:       screenHome,
      onboarding: screenOnboarding,
      signaler:   screenSignaler,
      suivi:      screenSuivi,
      communaute: screenCommunaute,
      profil:     screenProfil,
      rapport:    screenRapport,
      admin:      screenAdmin,
      agent:      screenAgent,
      'agent-profil': screenAgentProfil,
      'rapport-mensuel': screenRapportMensuel,
      'admin-settings':  screenAdminSettings,
      'inscription':     screenInscription,
      'classement':      screenClassement,
      'paiement':        screenPaiement,
      'amendes':         screenAmendes,
      'elu':             screenElu,
      'facturation':     screenFacturation,
      'faq':             screenFAQ,
      'contact':         screenContact,
      'notfound':        screenNotFound,
      'error':           screenError,
    };
    const screenHTML = (screenFn[S.screen] || screenNotFound)(S);

  const ADMIN_SCREENS = ['admin', 'agent', 'agent-profil', 'rapport-mensuel', 'admin-settings', 'elu'];

    root.innerHTML = `
      <a href="#main" class="skip-link">${t('skip_link')}</a>
      ${S.screen === 'onboarding' ? '' : Nav.renderTopBar(S)}
      <main id="main" role="main" class="${ADMIN_SCREENS.includes(S.screen) ? 'admin-main' : ''}">${screenHTML}</main>
      ${(S.screen === 'onboarding' || ADMIN_SCREENS.includes(S.screen)) ? '' : Nav.renderBottomNav(S)}
      <div id="toasts" role="alert" aria-live="polite" aria-atomic="true"></div>
      ${_renderAlertPanel(S)}
      ${_renderBadgeModal(S)}
      ${_renderSurveyModal(S)}
      ${_renderSharePanel(S)}
      ${_renderDeleteModal(S)}
      ${_renderFlagModal(S)}
    `;

    /* Transition d'entrée entre onglets */
    if (prevScreen && prevScreen !== S.screen) {
      Nav.animateTransition(prevScreen, S.screen);
    }

    bind();

    /* Focus trap : piéger le focus dans la modale ouverte */
    _trapModalFocus(S);

    /* Mettre à jour les badges (pending counts, etc.) */
    _updateBadges();

    /* Positionner l'indicateur après render */
    requestAnimationFrame(() => Nav.animateIndicator(S.screen));
  }


  /* ════════════════════════════════════════════
     BIND
     ════════════════════════════════════════════ */

  function bind() {

    /* Navigation centralisée dans Nav */
    Nav.bind(route => {
      if (route === '__back__') Router.back();
      else Router.push(route);
    });

    /* Flux signalement */
    if (State.get().screen === 'signaler') {
      Report.bind();
    }

    /* ── Onboarding ── */
    if (State.get().screen === 'onboarding') {
      document.getElementById('btn-onboard-next')?.addEventListener('click', () => {
        _onboardSlide++;
        State.go({}); /* go({}) déclenche render() sans changer l'état */
      });
      document.getElementById('btn-onboard-skip')?.addEventListener('click', () => {
        localStorage.setItem('cr_onboarded', 'true');
        Router.replace('home');
      });
      document.getElementById('btn-onboard-start')?.addEventListener('click', () => {
        localStorage.setItem('cr_onboarded', 'true');
        Router.replace('home');
      });
    }

    /* Cards signalement cliquables → détail */
    UI.bindReportCards();

    /* Carte SVG */
    MapView.bind();

    /* Panneau alertes */
    document.getElementById('btn-close-alert-panel')?.addEventListener('click', () => {
      State.Actions.toggleAlertPanel();
    });
    document.getElementById('alert-panel-overlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) State.Actions.toggleAlertPanel();
    });
    document.getElementById('btn-mark-alerts-read')?.addEventListener('click', () => {
      State.Actions.markAllAlertsRead();
    });

    /* Toggle heatmap */
    document.getElementById('btn-toggle-heatmap')?.addEventListener('click', () => {
      State.go({ heatmapMode: !State.get().heatmapMode });
    });

    /* Toggle home tab (map/feed) */
    document.getElementById('btn-home-map')?.addEventListener('click', () => {
      State.go({ homeTab: 'map' });
    });
    document.getElementById('btn-home-feed')?.addEventListener('click', () => {
      State.go({ homeTab: 'feed' });
    });

    /* Voir tout → onglet suivi */
    document.getElementById('btn-voir-tout')?.addEventListener('click', () => {
      Router.push('suivi');
    });
    document.getElementById('btn-voir-tout-feed')?.addEventListener('click', () => {
      Router.push('suivi');
    });

    /* Bandeau offline */
    UI.bindOfflineBanner();

    /* ── Profil : auth demo ── */
    document.getElementById('btn-login')?.addEventListener('click', () => {
      /* Simulation login — sera remplacé par OTP à la partie #31 */
      State.Actions.login(
        { id: 1, name: 'Koffi Mensah', phone: '97 12 34 56', role: 'citizen', points: 120, badges: [] },
        'fake-jwt-token'
      );
    });
    document.getElementById('btn-login-admin')?.addEventListener('click', () => {
      State.Actions.login(
        { id: 99, name: 'Mairie Cotonou', phone: '97 00 00 01', role: 'admin', points: 0, badges: [] },
        'fake-admin-token'
      );
      State.toast('Mode administration activé', 'ok');
    });
    document.getElementById('btn-logout')?.addEventListener('click', () => {
      State.Actions.logout();
    });
    document.getElementById('btn-anon')?.addEventListener('click', () => {
      State.Actions.loginAnonymous();
      State.toast('Mode anonyme activé', 'info');
    });

    /* ── Liens légaux ── */
    document.querySelectorAll('.legal-link').forEach(el => {
      el.addEventListener('click', () => {
        State.toast('Documentation disponible dans une prochaine version', 'info');
      });
    });

    /* ── FAQ ── */
    document.getElementById('btn-faq')?.addEventListener('click', () => {
      Router.push('faq');
    });

    /* ── Contact ── */
    document.getElementById('btn-legal-contact')?.addEventListener('click', () => {
      Router.push('contact');
    });
    document.getElementById('btn-contact-wa')?.addEventListener('click', () => {
      window.open('https://wa.me/22997000000?text=Bonjour%20CityReport%20%F0%9F%91%8B', '_blank');
    });
    document.getElementById('btn-contact-send')?.addEventListener('click', () => {
      State.toast('Message envoyé ✓ Nous vous répondrons sous 24h', 'ok');
    });

    /* ── Export données ── */
    document.getElementById('btn-export-data')?.addEventListener('click', _exportUserData);

    /* ── Suppression compte ── */
    document.getElementById('btn-delete-account')?.addEventListener('click', () => {
      State.go({ deleteStep: 1 });
    });
    document.getElementById('btn-delete-cancel')?.addEventListener('click', () => {
      State.go({ deleteStep: 0 });
    });
    document.getElementById('btn-delete-confirm')?.addEventListener('click', () => {
      State.go({ deleteStep: 2 });
    });
    document.getElementById('btn-delete-otp-cancel')?.addEventListener('click', () => {
      State.go({ deleteStep: 0 });
    });
    document.getElementById('btn-delete-otp-confirm')?.addEventListener('click', () => {
      const otp = [0,1,2,3,4,5].map(i => document.getElementById(`delete-otp-${i}`)?.value || '').join('');
      _deleteAccount(otp);
    });
    /* OTP auto-advance */
    document.querySelectorAll('.delete-otp-input').forEach(inp => {
      inp.addEventListener('input', () => {
        const next = inp.nextElementSibling;
        if (next && inp.value.length === 1) next.focus();
      });
      inp.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !inp.value) {
          const prev = inp.previousElementSibling;
          if (prev) { prev.focus(); prev.value = ''; }
        }
      });
    });
    document.getElementById('delete-otp-0')?.focus();

    /* ── Badge célébration ── */
    document.getElementById('btn-close-badge-modal')?.addEventListener('click', () => {
      State.Actions.closeBadgeModal();
    });
    document.getElementById('badge-celebration-overlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) State.Actions.closeBadgeModal();
    });

    /* ── Sondage satisfaction ── */
    let _selectedRating = 0;
    document.querySelectorAll('.star-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _selectedRating = Number(btn.dataset.rating);
        document.querySelectorAll('.star-btn').forEach((b, i) => {
          b.innerHTML = i < _selectedRating
            ? '<i class="ti ti-star-filled" style="font-size:28px;color:var(--accent)"></i>'
            : '<i class="ti ti-star" style="font-size:28px"></i>';
        });
        document.getElementById('btn-submit-survey').disabled = false;
      });
    });
    document.getElementById('btn-submit-survey')?.addEventListener('click', () => {
      if (_selectedRating < 1) return;
      const comment = document.getElementById('survey-comment')?.value || '';
      State.Actions.submitSurvey(_selectedRating, comment);
      _selectedRating = 0;
    });
    document.getElementById('btn-skip-survey')?.addEventListener('click', () => {
      State.Actions.skipSurvey();
      _selectedRating = 0;
    });
    document.getElementById('survey-overlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) State.Actions.skipSurvey();
    });

    /* ── Notifications push ── */
    document.getElementById('btn-enable-push')?.addEventListener('click', () => {
      State.Actions.enablePushNotifications();
    });
    document.getElementById('btn-disable-push')?.addEventListener('click', () => {
      State.Actions.disablePushNotifications();
    });

    /* ── Communauté ── */
    document.querySelectorAll('.quartier-select-btn').forEach(el => {
      el.addEventListener('click', () => State.Actions.setUserQuartier(el.dataset.quartier));
    });
    document.getElementById('btn-change-quartier')?.addEventListener('click', () => {
      State.Actions.setUserQuartier('');
    });
    document.getElementById('btn-community-post')?.addEventListener('click', () => {
      const input = document.getElementById('community-post-input');
      const text = input?.value.trim();
      if (!text) { State.toast('Écrivez un message', 'err'); return; }
      State.Actions.addCommunityPost(text);
      if (input) input.value = '';
    });
    document.getElementById('community-post-input')?.addEventListener('input', e => {
      const len = e.target.value.length;
      const counter = document.getElementById('community-chars');
      if (counter) counter.textContent = `${len}/500`;
    });
    document.querySelectorAll('.community-like-btn').forEach(el => {
      el.addEventListener('click', () => State.Actions.likeCommunityPost(Number(el.dataset.postId)));
    });
    document.querySelectorAll('.community-flag-btn').forEach(el => {
      el.addEventListener('click', () => {
        State.go({ modalOpen: true, modalPayload: { type: 'flagPost', postId: Number(el.dataset.postId) } });
      });
    });
    document.querySelectorAll('.flag-reason-btn').forEach(el => {
      el.addEventListener('click', () => {
        const postId = S.modalPayload?.postId;
        if (postId) State.Actions.flagCommunityPost(postId, el.dataset.flagReason);
        State.go({ modalOpen: false, modalPayload: null });
      });
    });
    document.getElementById('btn-flag-cancel')?.addEventListener('click', () => {
      State.go({ modalOpen: false, modalPayload: null });
    });
    document.getElementById('btn-communaute-login')?.addEventListener('click', () => Router.push('profil'));
    document.getElementById('btn-communaute-inscription')?.addEventListener('click', () => Router.push('inscription'));
    document.getElementById('btn-classement-link')?.addEventListener('click', () => Router.push('classement'));
    document.getElementById('btn-classement-back')?.addEventListener('click', () => Router.back());
    document.querySelectorAll('[data-qs]').forEach(el => {
      el.addEventListener('click', () => State.Actions.setQuartierSort(el.dataset.qs));
    });

    /* ── Paiement FedaPay ── */
    ['starter','pro','enterprise'].forEach(id => {
      document.getElementById(`btn-pay-${id}`)?.addEventListener('click', () => {
        if (id === 'enterprise') { State.toast('Contactez-nous à mairie@cityreport.bj', 'info'); return; }
        const plan = State.PLANS.find(p => p.id === id);
        if (!plan) return;
        State.Actions.initPay(plan.price, `Abonnement ${plan.label} CityReport`, id);
        _launchFedaPay(plan.price, `Abonnement ${plan.label} CityReport`);
      });
    });
    document.getElementById('btn-pay-custom')?.addEventListener('click', () => {
      const amount = parseInt(document.getElementById('pay-amount')?.value) || 1000;
      const desc = document.getElementById('pay-desc')?.value || 'Test FedaPay';
      State.Actions.initPay(amount, desc);
      _launchFedaPay(amount, desc);
    });
    document.getElementById('btn-cancel-plan')?.addEventListener('click', () => {
      State.Actions.setPlan(null);
    });
    document.getElementById('btn-pay-back')?.addEventListener('click', () => Router.back());
    document.getElementById('btn-pay-card')?.addEventListener('click', () => {
      _launchFedaPay(1000, 'Paiement par carte');
    });
    /* ── Mobile Money (MTN / Moov) ── */
    document.getElementById('btn-pay-mtn')?.addEventListener('click', () => {
      const S = State.get();
      const plan = State.get().payPlan;
      const amount = plan ? (State.PLANS.find(p => p.id === plan)?.price || 25000) : 25000;
      const desc = plan ? `Abonnement ${State.PLANS.find(p => p.id === plan)?.label}` : 'Abonnement CityReport';
      State.Actions.openMomoModal(amount, desc, 'mtn');
    });
    document.getElementById('btn-pay-moov')?.addEventListener('click', () => {
      const S = State.get();
      const plan = State.get().payPlan;
      const amount = plan ? (State.PLANS.find(p => p.id === plan)?.price || 25000) : 25000;
      const desc = plan ? `Abonnement ${State.PLANS.find(p => p.id === plan)?.label}` : 'Abonnement CityReport';
      State.Actions.openMomoModal(amount, desc, 'moov');
    });
    document.getElementById('btn-momo-send')?.addEventListener('click', () => {
      const S = State.get();
      const phone = document.getElementById('momo-phone')?.value.trim() || '';
      const isMoov = S.momoOperator === 'moov';
      const mtnRegex = /^(97|98|96)\d{7}$/;
      const moovRegex = /^(99|95|94|90|91)\d{7}$/;
      const valid = isMoov ? moovRegex.test(phone) : mtnRegex.test(phone);
      if (!valid) {
        State.toast(`Numéro ${isMoov ? 'Moov' : 'MTN'} Bénin invalide`, 'err');
        return;
      }
      State.Actions.setMomoPhone(phone);
      State.go({ momoStatus: 'sending', momoCountdown: 120 });
      _simulerMomo();
    });
    document.getElementById('btn-momo-close')?.addEventListener('click', () => State.Actions.closeMomoModal());
    document.getElementById('momo-overlay')?.addEventListener('click', e => {
      if (e.target.id === 'momo-overlay') State.Actions.closeMomoModal();
    });
    document.getElementById('btn-momo-cancel')?.addEventListener('click', () => State.Actions.closeMomoModal());
    document.getElementById('btn-momo-done')?.addEventListener('click', () => State.Actions.closeMomoModal());
    document.getElementById('btn-momo-retry')?.addEventListener('click', () => {
      State.Actions.openMomoModal(State.get().momoAmount, State.get().momoDesc);
    });
    /* Input phone auto-format */
    document.getElementById('momo-phone')?.addEventListener('input', e => {
      const v = e.target.value.replace(/\D/g, '').slice(0, 10);
      e.target.value = v;
      State.Actions.setMomoPhone(v);
    });

    document.getElementById('btn-anon')?.addEventListener('click', () => {
      State.Actions.loginAnonymous();
      State.toast('Mode anonyme activé', 'info');
    });
    document.getElementById('btn-admin-dash')?.addEventListener('click', () => {
      Router.push('admin');
    });

    /* ── Amendes ── */
    document.getElementById('btn-amendes')?.addEventListener('click', () => {
      Router.push('amendes');
    });

    /* Input amende number */
    document.getElementById('input-amende-number')?.addEventListener('blur', e => {
      State.Actions.setAmendeNumber(e.target.value.trim());
    });

    /* Payer amende */
    document.getElementById('btn-pay-amende')?.addEventListener('click', async () => {
      await State.Actions.payAmende();
    });

    /* Télécharger reçu */
    document.getElementById('btn-download-receipt')?.addEventListener('click', () => {
      downloadReceiptPDF();
    });

    /* Nouveau paiement */
    document.getElementById('btn-new-amende')?.addEventListener('click', () => {
      State.Actions.resetAmende();
    });

    /* ── Préférences toggles ── */
    document.getElementById('pref-notifs')?.addEventListener('change', e => {
      State.Actions.setPref('notifications', e.target.checked);
    });
    document.getElementById('pref-datasaver')?.addEventListener('change', e => {
      State.Actions.setPref('dataSaver', e.target.checked);
      _applyTheme();
    });
    document.getElementById('pref-anon')?.addEventListener('change', e => {
      State.Actions.setPref('anonymous', e.target.checked);
    });

    /* Langue */
    document.getElementById('sel-lang')?.addEventListener('change', e => {
      State.Actions.setPref('lang', e.target.value);
    });

    /* Thème */
    document.getElementById('pref-theme')?.addEventListener('change', e => {
      State.Actions.setPref('theme', e.target.checked ? 'light' : 'dark');
      _applyTheme();
    });

    /* ── Suivi tabs ── */
    document.querySelectorAll('.suivi-tab').forEach(el => {
      el.addEventListener('click', () => State.Actions.setSuiviTab(el.dataset.suiviTab));
    });

    /* ── Suivi pagination ── */
    document.getElementById('btn-suivi-prev')?.addEventListener('click', () => {
      State.go({ suiviPage: Math.max(0, (State.get().suiviPage || 0) - 1) });
    });
    document.getElementById('btn-suivi-next')?.addEventListener('click', () => {
      State.go({ suiviPage: (State.get().suiviPage || 0) + 1 });
    });

    /* ── FAB ── */
    document.getElementById('btn-fab-signaler')?.addEventListener('click', () => {
      Router.push('signaler');
    });

    /* ── Sync pending ── */
    document.getElementById('btn-sync-pending')?.addEventListener('click', async () => {
      const el = document.getElementById('btn-sync-pending');
      if (el) el.disabled = true;
      await State.Actions.syncPendingReports();
      _updateBadges();
    });

    /* ── Supprimer un signalement en attente ── */
    document.querySelectorAll('[data-pending-delete]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.pendingDelete;
        State.Actions.deletePendingReport(id);
        _updateBadges();
      });
    });

    /* ── Détail signalement ── */
    if (State.get().screen === 'rapport') {
      const id = State.get().routeParams?.[0];

      /* Boutons admin/agent — changement de statut */
      document.querySelectorAll('[data-action-status]').forEach(btn => {
        btn.addEventListener('click', () => {
          State.Actions.requestStatusChange(btn.dataset.actionStatus, btn.dataset.actionNext);
        });
      });

      /* Modale — confirmer */
      document.getElementById('btn-modal-confirm')?.addEventListener('click', () => {
        const note = document.getElementById('modal-note')?.value || '';
        State.Actions.confirmStatusChange(note);
      });

      /* Modale — annuler */
      document.getElementById('btn-modal-cancel')?.addEventListener('click', () => {
        State.Actions.cancelStatusChange();
      });

      /* Assignation agent */
      document.getElementById('btn-assign-agent')?.addEventListener('click', () => {
        const reportId = document.getElementById('btn-assign-agent')?.dataset.assignId;
        if (reportId) State.Actions.requestAssignModal(reportId);
      });

      document.querySelectorAll('.assign-agent-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const agentId = Number(btn.dataset.assignAgent);
          const reportId = btn.dataset.reportId;
          if (reportId) State.Actions.assignReport(reportId, agentId);
        });
      });

      document.getElementById('btn-assign-cancel')?.addEventListener('click', () => {
        State.go({ modalOpen: false, modalPayload: null });
      });

      document.getElementById('modal-overlay-assign')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) State.go({ modalOpen: false, modalPayload: null });
      });

      /* Modale — clic sur l'overlay ferme */
      document.getElementById('modal-overlay')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) State.Actions.cancelStatusChange();
      });

      /* Modale — confirmation suppression catégorie */
      document.getElementById('btn-confirm-delete-cat')?.addEventListener('click', () => {
        const catId = document.getElementById('btn-confirm-delete-cat')?.dataset.catId;
        if (catId) {
          State.Actions.deleteCategory(catId);
          State.go({ modalOpen: false, modalPayload: null });
        }
      });
      document.getElementById('btn-cancel-delete-cat')?.addEventListener('click', () => {
        State.go({ modalOpen: false, modalPayload: null });
      });

      document.getElementById('btn-vote-up')?.addEventListener('click', () => {
        const S = State.get();
        if (S.prefs.anonymous) { State.toast('Mode anonyme : les votes sont désactivés', 'warn'); return; }
        if (id) { State.Actions.voteReport(id, 'up'); State.toast('Soutien ajouté !', 'ok'); }
      });
      document.getElementById('btn-share')?.addEventListener('click', () => {
        const report = _resolveReport(State.get(), id);
        if (!report) return;
        _shareReport(report);
      });
      /* Partager depuis une carte signalement dans le feed */
      document.querySelectorAll('[data-share-report]').forEach(el => {
        el.addEventListener('click', () => {
          const report = _resolveReport(State.get(), el.dataset.shareReport);
          if (report) _shareReport(report);
        });
      });
      /* Partager un post communautaire */
      document.querySelectorAll('[data-share-community]').forEach(el => {
        el.addEventListener('click', () => {
          const text = el.dataset.shareCommunity || 'Message sur CityReport';
          const url = `https://cityreport.bj/`;
          if (navigator.share) {
            navigator.share({ title: 'CityReport', text, url }).catch(() => {});
          } else {
            State.go({ showSharePanel: true, shareData: { text, url } });
          }
        });
      });

      /* ── Don citoyen ── */
      document.getElementById(`btn-donate-${id}`)?.addEventListener('click', () => {
        State.Actions.openDonateModal(id);
      });
      document.querySelectorAll('[data-donate-amount]').forEach(el => {
        el.addEventListener('click', () => {
          const amt = parseInt(el.dataset.donateAmount);
          State.Actions.setDonateAmount(amt);
          document.getElementById('donate-custom').value = '';
        });
      });
      document.getElementById('donate-custom')?.addEventListener('input', e => {
        const v = parseInt(e.target.value) || 0;
        State.Actions.setDonateAmount(v);
      });
      document.getElementById('btn-donate-card')?.addEventListener('click', () => {
        const amt = State.get().donateAmount;
        if (amt < 100) { State.toast('Montant minimum : 100 FCFA', 'warn'); return; }
        State.Actions.submitDonation(amt, 'card');
      });
      document.getElementById('btn-donate-momo')?.addEventListener('click', () => {
        const amt = State.get().donateAmount;
        if (amt < 100) { State.toast('Montant minimum : 100 FCFA', 'warn'); return; }
        const id = State.get().donateReportId;
        State.Actions.submitDonation(amt, 'mtn_money');
      });
      document.getElementById('btn-donate-confirm')?.addEventListener('click', () => {
        const amt = State.get().donateAmount;
        const el = document.getElementById('btn-donate-card');
        if (el) el.click();
      });
      document.getElementById('btn-donate-close')?.addEventListener('click', () => State.Actions.closeDonateModal());
      document.getElementById('donate-overlay')?.addEventListener('click', e => {
        if (e.target.id === 'donate-overlay') State.Actions.closeDonateModal();
      });
      document.getElementById('btn-share-wa')?.addEventListener('click', () => {
        const data = State.get().shareData;
        if (!data) return;
        const waUrl = `https://wa.me/?text=${encodeURIComponent(data.text)}`;
        window.open(waUrl, '_blank');
        State.go({ showSharePanel: false, shareData: null });
      });
      document.getElementById('btn-share-copy')?.addEventListener('click', () => {
        const data = State.get().shareData;
        if (!data) return;
        navigator.clipboard?.writeText(data.text).then(() => {
          State.toast('Lien copié !', 'ok');
          State.go({ showSharePanel: false, shareData: null });
        });
      });
      document.getElementById('btn-share-close')?.addEventListener('click', () => {
        State.go({ showSharePanel: false, shareData: null });
      });
      document.getElementById('share-panel-overlay')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) State.go({ showSharePanel: false, shareData: null });
      });
      document.getElementById('btn-back-empty')?.addEventListener('click', () => Router.back());
    }

    /* ── Agent login + navigation ── */
    document.getElementById('btn-login-agent')?.addEventListener('click', () => {
      State.Actions.login(
        { id: 50, name: 'Agent Koffi', phone: '97 12 34 56', role: 'agent', points: 0, badges: [] },
        'fake-agent-token'
      );
      State.toast('Mode agent terrain activé', 'ok');
    });
    document.getElementById('btn-agent-dash')?.addEventListener('click', () => {
      Router.push('agent');
    });

    /* ── Inscription OTP ── */
    document.getElementById('btn-inscription')?.addEventListener('click', () => {
      State.Actions.resetSignup();
      Router.push('inscription');
    });

    document.getElementById('btn-inscription-back')?.addEventListener('click', () => {
      Router.back();
    });

    document.querySelectorAll('.operator-btn').forEach(el => {
      el.addEventListener('click', () => {
        State.Actions.setSignupOperator(el.dataset.op);
      });
    });

    document.getElementById('btn-request-otp')?.addEventListener('click', () => {
      const input = document.getElementById('input-phone');
      const phone = input?.value.trim();
      if (!phone || !/^(97|98|99|96|95|94|93|90|91|01|02|03|04|05|06|07|08|09)\d{6}$/.test(phone)) {
        State.toast('Numéro béninois invalide (ex: 97123456)', 'err');
        return;
      }
      State.Actions.setSignupPhone(phone);
      State.Actions.goToOtpStep();
    });

    document.getElementById('btn-verify-otp')?.addEventListener('click', () => {
      let code = '';
      for (let i = 0; i < 6; i++) {
        const inp = document.getElementById(`otp-${i}`);
        if (inp) code += inp.value;
      }
      if (code.length !== 6) {
        State.toast('Veuillez saisir les 6 chiffres du code', 'err');
        return;
      }
      if (code !== '123456') {
        State.toast('Code invalide', 'err');
        return;
      }
      const S = State.get();
      State.Actions.login(
        { id: Date.now(), name: 'Nouveau citoyen', phone: S.signupPhone, role: 'citizen', points: 0, badges: [] },
        'fake-jwt-token'
      );
      State.Actions.resetSignup();
      State.toast('Bienvenue sur CityReport !', 'ok');
      Router.push('home');
    });

    document.getElementById('btn-otp-back')?.addEventListener('click', () => {
      State.Actions.goToPhoneStep();
    });

    document.getElementById('btn-resend-otp')?.addEventListener('click', () => {
      State.Actions.goToOtpStep();
    });

    /* ═══ OTP inputs auto-focus ═══ */
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach((input, i) => {
      input.addEventListener('input', () => {
        if (input.value && i < 5) otpInputs[i + 1].focus();
      });
      input.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !input.value && i > 0) otpInputs[i - 1].focus();
      });
    });

    /* ═══ Timer OTP ═══ */
    if (State.get().screen === 'inscription' && State.get().signupStep === 2) {
      _startOtpTimer();
    }

    /* ── Admin dashboard ── */
    document.getElementById('btn-admin-back')?.addEventListener('click', () => Router.push('profil'));
    document.getElementById('btn-goto-plans')?.addEventListener('click', () => Router.push('paiement'));
    document.getElementById('btn-admin-report')?.addEventListener('click', () => Router.push('rapport-mensuel'));
    document.getElementById('btn-admin-pay')?.addEventListener('click', () => Router.push('paiement'));
    document.getElementById('btn-admin-facture')?.addEventListener('click', () => Router.push('facturation'));
    document.getElementById('btn-admin-settings')?.addEventListener('click', () => Router.push('admin-settings'));

    /* ── Facturation ── */
    document.getElementById('btn-facture-back')?.addEventListener('click', () => Router.push('admin'));

    /* ── Dashboard élu ── */
    document.getElementById('btn-elu-admin')?.addEventListener('click', () => Router.push('admin'));
    document.getElementById('btn-elu-back')?.addEventListener('click', () => Router.push('profil'));

    /* Chart et carte pour élu */
    requestAnimationFrame(() => {
      if (State.get().screen === 'elu') {
        const S = State.get();
        const labels = [];
        const data = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          labels.push(d.toLocaleDateString('fr-FR', { weekday: 'short' }));
          const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          const dayEnd = new Date(dayStart.getTime() + 86400000);
          data.push(S.reports.filter(r => { const c = new Date(r.createdAt); return c >= dayStart && c < dayEnd; }).length);
        }
        Charts.lineChart({ canvasId: 'chart-line-elu', data, labels, color: getComputedStyle(document.documentElement).getPropertyValue('--lime').trim() || '#C8FF00' });
        MapView.bind();
      }
    });
    document.getElementById('btn-facture-plans')?.addEventListener('click', () => Router.push('paiement'));
    document.getElementById('btn-facture-cancel')?.addEventListener('click', () => {
      State.Actions.setPlan(null);
      State.toast('Abonnement résilié', 'info');
    });
    document.querySelectorAll('[data-receipt]').forEach(el => {
      el.addEventListener('click', () => {
        State.toast('Reçu — disponible dans votre interface de paiement', 'info');
      });
    });

    /* ── Admin settings ── */
    document.getElementById('btn-settings-back')?.addEventListener('click', () => Router.push('admin'));

    document.querySelectorAll('.settings-tab').forEach(el => {
      el.addEventListener('click', () => {
        State.Actions.setAdminSettingsTab(el.dataset.stab);
      });
    });

    document.getElementById('btn-add-category')?.addEventListener('click', () => {
      const input = document.getElementById('input-new-cat-label');
      const colorInput = document.getElementById('input-new-cat-color');
      const label = input?.value.trim();
      if (!label) { State.toast('Veuillez entrer un nom de catégorie', 'err'); return; }
      const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (!id) { State.toast('Nom invalide', 'err'); return; }
      const S = State.get();
      if ((S.adminConfig.categories || []).some(c => c.id === id)) {
        State.toast('Cette catégorie existe déjà', 'err'); return;
      }
      State.Actions.addCategory({ id, label, color: colorInput?.value || '#95a5a6', icon: 'ti-tag' });
      input.value = '';
      State.toast(`Catégorie « ${label} » ajoutée`, 'ok');
    });

    document.querySelectorAll('.settings-edit-btn').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.catId;
        const currentLabel = el.dataset.catLabel;
        const currentColor = el.dataset.catColor;
        const newLabel = prompt('Nouveau nom :', currentLabel);
        if (!newLabel || newLabel.trim() === currentLabel) return;
        State.Actions.updateCategory(id, { label: newLabel.trim() });
        State.toast('Catégorie modifiée', 'ok');
      });
    });

    document.querySelectorAll('.settings-del-btn').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.catId;
        State.go({ modalOpen: true, modalPayload: { type: 'confirmDeleteCat', catId: id } });
      });
    });

    document.querySelectorAll('.zone-toggle').forEach(el => {
      el.addEventListener('change', () => {
        State.Actions.toggleZone(el.dataset.zoneId);
      });
    });

    document.querySelectorAll('.quartier-toggle').forEach(el => {
      el.addEventListener('change', () => {
        State.Actions.toggleQuartier(el.dataset.zoneId, el.dataset.quartier);
      });
    });

    if (State.get().screen === 'admin') {
      /* Filtres : changement → maj S + reset page */
      document.querySelectorAll('[data-filter]').forEach(el => {
        el.addEventListener('change', e => {
          State.go({
            adminFilters: { ...State.get().adminFilters, [el.dataset.filter]: el.value },
            adminPage: 0,
          });
        });
        if (el.type === 'search') {
          el.addEventListener('input', () => {
            State.go({
              adminFilters: { ...State.get().adminFilters, search: el.value },
              adminPage: 0,
            });
          });
        }
      });

      /* Tri sur en-têtes de colonne */
      document.querySelectorAll('[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
          const col = th.dataset.sort;
          const cur = State.get().adminSort;
          State.go({
            adminSort: { col, dir: col === cur.col && cur.dir === 'asc' ? 'desc' : 'asc' },
            adminPage: 0,
          });
        });
      });

      /* Pagination */
      document.getElementById('btn-admin-prev')?.addEventListener('click', () => {
        State.go({ adminPage: Math.max(0, State.get().adminPage - 1) });
      });
      document.getElementById('btn-admin-next')?.addEventListener('click', () => {
        State.go({ adminPage: State.get().adminPage + 1 });
      });

      /* Export CSV */
      document.getElementById('btn-admin-export-csv')?.addEventListener('click', () => {
        const S = State.get();
        const f = S.adminFilters;
        let filtered = S.reports.filter(r => {
          if (f.status && r.status !== f.status) return false;
          if (f.category && r.category !== f.category) return false;
          if (f.search) {
            const q = f.search.toLowerCase();
            const haystack = [r.description, r.location?.label, r.reference].filter(Boolean).join(' ').toLowerCase();
            if (!haystack.includes(q)) return false;
          }
          return true;
        });
        exportCSV(filtered, CAT_LABELS);
      });

      /* Export GeoJSON */
      document.getElementById('btn-admin-export-geojson')?.addEventListener('click', () => {
        const S = State.get();
        const features = S.reports.filter(r => r.coords?.lat && r.coords?.lng).map(r => ({
          type: 'Feature',
          properties: { id: r.id, ref: r.ref, category: r.category, status: r.status, description: r.description?.slice(0,100), date: r.createdAt },
          geometry: { type: 'Point', coordinates: [r.coords.lng, r.coords.lat] },
        }));
        const geojson = { type: 'FeatureCollection', features };
        const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'cityreport-export.geojson'; a.click();
        URL.revokeObjectURL(url);
      });

      /* Line chart dans le dashboard admin */
      requestAnimationFrame(() => {
        const S = State.get();
        if (S.screen === 'admin' && S.reports.length > 4) {
          const labels = [];
          const data = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            labels.push(d.toLocaleDateString('fr-FR', { weekday: 'short' }));
            const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const dayEnd = new Date(dayStart.getTime() + 86400000);
            data.push(S.reports.filter(r => {
              const c = new Date(r.createdAt);
              return c >= dayStart && c < dayEnd;
            }).length);
          }
          Charts.lineChart({ canvasId: 'chart-line', data, labels, color: getComputedStyle(document.documentElement).getPropertyValue('--lime').trim() || '#C8FF00' });
          Charts.observeResize('chart-line', () => {
            Charts.lineChart({ canvasId: 'chart-line', data, labels, color: getComputedStyle(document.documentElement).getPropertyValue('--lime').trim() || '#C8FF00' });
          });
        }
        /* Bar chart par service */
        if (S.screen === 'admin') {
          const catOrder = ['roads', 'water', 'waste', 'light', 'flood', 'health', 'security', 'other'];
          const catCounts = {};
          S.reports.forEach(r => { catCounts[r.category] = (catCounts[r.category] || 0) + 1; });
          const groups = catOrder
            .filter(c => catCounts[c])
            .map(c => ({ label: (CAT_LABELS[c] || c).slice(0, 6), values: [catCounts[c]] }));
          if (groups.length) {
            Charts.barChart({ canvasId: 'chart-bar', groups });
            Charts.observeResize('chart-bar', () => {
              const S2 = State.get();
              const cc2 = {};
              S2.reports.forEach(r => { cc2[r.category] = (cc2[r.category] || 0) + 1; });
              Charts.barChart({ canvasId: 'chart-bar', groups: catOrder.filter(c => cc2[c]).map(c => ({ label: (CAT_LABELS[c] || c).slice(0, 6), values: [cc2[c]] })) });
            });
          }
        }
        /* Donut chart par catégorie */
        if (S.screen === 'admin' && S.reports.length > 0) {
          requestAnimationFrame(() => {
            const catCounts = {};
            State.get().reports.forEach(r => { catCounts[r.category] = (catCounts[r.category] || 0) + 1; });
            const donutData = Object.entries(catCounts)
              .filter(([cat]) => CAT_COLORS[cat])
              .map(([cat, count]) => ({ label: CAT_LABELS[cat] || cat, value: count, color: CAT_COLORS[cat] }));
            if (donutData.length) {
              Charts.donutChart({ canvasId: 'chart-donut', data: donutData, animated: true });
            }
          });
        }
      });

      /* Changement de statut via select */
      document.querySelectorAll('[data-admin-status]').forEach(sel => {
        sel.addEventListener('change', () => {
          State.Actions.updateReportStatus(sel.dataset.adminStatus, sel.value);
        });
      });

      /* Voir le détail */
      document.querySelectorAll('[data-admin-view]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          State.go({ selectedReport: btn.dataset.adminView });
          Router.push('rapport', [btn.dataset.adminView]);
        });
      });

      /* Supprimer */
      document.querySelectorAll('[data-admin-delete]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          State.Actions.deleteReport(btn.dataset.adminDelete);
        });
      });
    }

    /* ── Rapport mensuel ── */
    document.getElementById('btn-print-report')?.addEventListener('click', () => window.print());
    document.getElementById('btn-report-back')?.addEventListener('click', () => Router.push('admin'));

    /* ── Agent screen ── */
    document.getElementById('btn-agent-back')?.addEventListener('click', () => Router.push('profil'));
    document.getElementById('btn-agent-profil')?.addEventListener('click', () => Router.push('agent-profil'));
    document.getElementById('btn-agent-profil-back')?.addEventListener('click', () => Router.push('agent'));

    if (State.get().screen === 'agent' || State.get().screen === 'agent-profil') {
      /* Voir le détail d'un signalement */
      document.querySelectorAll('[data-agent-view]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.agentView;
          State.go({ selectedReport: id });
          Router.push('rapport', [id]);
        });
      });

      /* Changer le statut d'un signalement */
      document.querySelectorAll('[data-agent-status]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.agentStatus;
          const next = btn.dataset.nextStatus;
          State.Actions.updateReportStatus(id, next);
        });
      });
    }

    /* Révélations au scroll — délégué à Reveal */
    Reveal.bind();

    /* Ripple global sur tous les .btn */
    document.querySelectorAll('.btn.ripple').forEach(el => {
      if (el.dataset.rippleBound) return;
      el.dataset.rippleBound = '1';
      el.addEventListener('click', function(e) {
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const wave = document.createElement('span');
        wave.className = 'ripple-wave';
        wave.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px`;
        this.appendChild(wave);
        wave.addEventListener('animationend', () => wave.remove(), { once: true });
      });
    });

    /* Badge bounce pour les badges de notif */
    document.querySelectorAll('.bn-badge, .tb-badge').forEach(el => {
      el.classList.remove('bounce');
      requestAnimationFrame(() => el.classList.add('bounce'));
    });

    /* Réessayer connexion (écran error) */
    document.getElementById('btn-retry-connect')?.addEventListener('click', () => {
      window.location.reload();
    });
  }


  /* ════════════════════════════════════════════
     INIT
     ════════════════════════════════════════════ */

  function init() {
    /* 0. Appliquer le thème */
    _applyTheme();

    /* 1. Charger l'état persisté (localStorage) */
    State.init();

    /* 1a. Onboarding : rediriger si c'est le premier lancement */
    if (!localStorage.getItem('cr_onboarded') && !window.location.hash.includes('onboarding')) {
      window.location.hash = '#/onboarding';
    }

    /* 2. Router lit l'URL, met à jour State, appelle App.render() */
    Router.init();

    /* 3. Service Worker */
    _initSW();

    /* 4. Global keydown : ESC pour fermer les modales */
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const S = State.get();
      if (S.showSharePanel)      State.go({ showSharePanel: false, shareData: null });
      else if (S.showSurveyModal) State.Actions.skipSurvey();
      else if (S.showBadgeModal)  State.Actions.closeBadgeModal();
      else if (S.showAlertPanel)  State.Actions.toggleAlertPanel();
      else if (S.showDonateModal) State.Actions.closeDonateModal();
      else if (S.showMomoModal)   State.Actions.closeMomoModal();
      else if (S.modalOpen)       State.go({ modalOpen: false, modalPayload: null });
    });

    /* 4b. Data saver : détecter les changements de connexion */
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', () => {
        if (navigator.connection.saveData) {
          State.Actions.setPref('dataSaver', true);
          _applyTheme();
        }
      });
    }

    /* 4c. Install prompt PWA : écouter beforeinstallprompt */
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredPrompt = e;
      /* Afficher la bannière après 30s ou 2 reports */
      if (State.get().reports.length >= 2 || localStorage.getItem('cr_install_dismissed') !== 'true') {
        _showInstallBanner(() => {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then(choice => {
            if (choice.outcome === 'accepted') {
              localStorage.setItem('cr_install_dismissed', 'true');
              _removeInstallBanner();
            }
            deferredPrompt = null;
          });
        });
      }
    });
    window.addEventListener('appinstalled', () => {
      localStorage.setItem('cr_install_dismissed', 'true');
      _removeInstallBanner();
    });

    /* Widget embarquable : si param ?widget dans l'URL */
    if (window.location.search.includes('widget')) {
      _renderWidget();
      return;
    }

    /* Réseau — auto-sync au retour en ligne */
    window.addEventListener('online', async () => {
      State.go({ isOnline: true });
      const synced = await State.Actions.syncPendingReports();
      _updateBadges();
      State.toast(synced > 0 ? `${synced} signalement(s) synchronisé(s) ✓` : 'Connexion rétablie', synced > 0 ? 'ok' : 'info');
    });
    window.addEventListener('offline', () => {
      State.go({ isOnline: false });
      State.toast('Hors ligne — mode limité', 'warn');
    });

    /* Badge signalements en attente au démarrage */
    _updateBadges();
  }

  function _updateBadges() {
    const S = State.get();
    const pending   = S.pendingReports.length;
    Nav.setBadge('suivi', pending > 0 ? pending : 0);
  }

  function _applyTheme() {
    const S = State.get();
    const theme = S.prefs?.theme || 'dark';
    document.documentElement.classList.toggle('theme-light', theme === 'light');

    /* Mode données économisées : désactiver les polices Google */
    const dataSaver = S.prefs?.dataSaver || navigator.connection?.saveData || false;
    document.documentElement.classList.toggle('data-saver', dataSaver);
  }

  function _trapModalFocus(S) {
    const ids = ['alert-panel-overlay', 'badge-celebration-overlay', 'survey-overlay',
                 'share-panel-overlay', 'donate-overlay', 'momo-overlay',
                 'modal-overlay-delete-cat', 'modal-overlay', 'modal-overlay-assign'];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && el.style.display !== 'none' && el.classList.contains('open')) {
        FocusTrap.activate(el);
        return;
      }
    }
  }

  /* Partager un signalement via Web Share API ou fallback */
  function _shareReport(report) {
    const cat = CAT_LABELS[report.category] || report.category;
    const loc = report.location?.label || report.location || 'inconnu';
    const desc = report.description ? report.description.slice(0, 80) : 'Signalement';
    const url = `https://cityreport.bj/#/rapport/${report.id}`;
    const text = `🚨 Signalement ${cat} à ${loc} — ${desc}… Voir sur CityReport : ${url}`;
    if (navigator.share) {
      navigator.share({ title: 'CityReport', text, url }).catch(() => {});
    } else {
      State.go({ showSharePanel: true, shareData: { text, url } });
    }
  }

  /* Bannière d'installation PWA */
  function _showInstallBanner(onInstall) {
    if (document.getElementById('install-banner') || localStorage.getItem('cr_install_dismissed') === 'true') return;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const banner = document.createElement('div');
    banner.id = 'install-banner';
    banner.className = isIOS ? 'ios-install' : '';
    banner.innerHTML = `
      <div class="install-icon">CR</div>
      <div class="install-text">
        <strong>Installer CityReport</strong>
        ${isIOS
          ? '<span class="ios-steps">Partager → Sur l\'écran d\'accueil</span>'
          : 'Ajoutez l\'application à votre écran d\'accueil'}
      </div>
      ${isIOS
        ? '<button class="install-close" id="btn-install-dismiss" aria-label="Fermer">&times;</button>'
        : '<button class="btn btn-primary btn-sm" id="btn-install-confirm" type="button">Installer</button>'}
    `;
    document.body.appendChild(banner);
    document.getElementById('btn-install-confirm')?.addEventListener('click', onInstall, { once: true });
    document.getElementById('btn-install-dismiss')?.addEventListener('click', () => {
      localStorage.setItem('cr_install_dismissed', 'true');
      _removeInstallBanner();
    });
    setTimeout(() => { if (document.getElementById('install-banner')) _removeInstallBanner(); }, 10000);
  }

  function _removeInstallBanner() {
    const b = document.getElementById('install-banner');
    if (b) b.remove();
  }

  function _renderWidget() {
    const params = new URLSearchParams(window.location.search);
    const commune = params.get('commune') || 'cotonou';
    const theme = params.get('theme') === 'light' ? 'light' : 'dark';
    const S = State.get();
    const reports = commune ? S.reports.filter(r => (r.location?.label || '').toLowerCase().includes(commune.toLowerCase())) : S.reports;
    const total = reports.length;
    const done = reports.filter(r => r.status === 'done').length;
    const recent = reports.slice(0, 5);
    const bg = theme === 'light' ? '#F5F5F7' : '#070910';
    const fg = theme === 'light' ? '#1C1C1E' : '#FFF';
    const muted = theme === 'light' ? '#6C6C70' : 'rgba(255,255,255,.5)';

    document.getElementById('root').innerHTML = `
      <div style="background:${bg};color:${fg};font-family:DM Sans,sans-serif;padding:16px;border-radius:12px;max-width:400px">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px">
          <span style="font-weight:700;font-size:16px">📊 CityReport — ${commune}</span>
          <span style="color:${muted};font-size:13px">${total} signalements</span>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:12px">
          <div style="flex:1;background:rgba(200,255,0,.1);border-radius:8px;padding:8px;text-align:center">
            <span style="font-size:20px;font-weight:700;color:#C8FF00">${total}</span>
            <span style="display:block;color:${muted};font-size:11px">Total</span>
          </div>
          <div style="flex:1;background:rgba(0,200,150,.1);border-radius:8px;padding:8px;text-align:center">
            <span style="font-size:20px;font-weight:700;color:#00C896">${done}</span>
            <span style="display:block;color:${muted};font-size:11px">Résolus</span>
          </div>
          <div style="flex:1;background:rgba(255,193,7,.1);border-radius:8px;padding:8px;text-align:center">
            <span style="font-size:20px;font-weight:700;color:#FFC107">${Math.round(done/(total||1)*100)}%</span>
            <span style="display:block;color:${muted};font-size:11px">Taux</span>
          </div>
        </div>
        ${recent.length ? recent.map(r => `
          <div style="padding:8px 0;border-bottom:1px solid ${theme === 'light' ? '#E5E5EA' : 'rgba(255,255,255,.06)'}">
            <span style="font-size:13px">${r.description?.slice(0, 50) || 'Signalement'}</span>
            <span style="display:block;color:${muted};font-size:11px;margin-top:2px">${r.location?.label || ''}</span>
          </div>
        `).join('') : '<p style="color:'+muted+';font-size:13px">Aucun signalement</p>'}
        <div style="text-align:center;margin-top:12px">
          <span style="color:${muted};font-size:10px">cityreport.bj · Données en temps réel</span>
        </div>
      </div>
    `;
  }

  function _initSW() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('[CityReport] SW enregistré :', reg.scope);

      /* Détecter une mise à jour disponible */
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            /* Nouvelle version disponible → bannière de mise à jour */
            _showUpdateBanner(newSW);
          }
        });
      });

    }).catch(e => console.warn('[CityReport] SW échec :', e));

    /* Messages SW → app */
    navigator.serviceWorker.addEventListener('message', event => {
      const { type } = event.data || {};

      if (type === 'SYNC_COMPLETE') {
        const { sent } = event.data;
        State.toast(`${sent} signalement(s) synchronisé(s) ✓`, 'ok');
        State.go({}); /* déclenche render() proprement via le flux normal */
      }

      if (type === 'NAVIGATE') {
        Router.push(event.data.url.replace('/#/', '').replace('/', ''));
      }
    });
  }

  /* Bannière "Mise à jour disponible" */
  function _showUpdateBanner(newSW) {
    const existing = document.getElementById('update-banner');
    if (existing) return;

    const banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.innerHTML = `
      <span>Nouvelle version disponible</span>
      <button id="btn-update-reload">Mettre à jour</button>
    `;
    document.body.appendChild(banner);

    document.getElementById('btn-update-reload').addEventListener('click', () => {
      newSW.postMessage({ type: 'SKIP_WAITING' });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      }, { once: true });
    });
  }

  /* ── Export CSV ── */
  function exportCSV(reports, labels) {
    const headers = ['Ref', 'Catégorie', 'Localisation', 'Statut', 'Date'];
    const rows = reports.map(r => [
      r.reference || '',
      labels[r.category] || r.category || '',
      r.location?.label || r.location || '',
      STATUS_LABELS[r.status] || r.status || '',
      r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR') : '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signalements-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadReceiptPDF() {
    const content = document.getElementById('receipt-content');
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Reçu CityReport</title>
      <style>body{font-family:sans-serif;padding:32px;background:#fff;color:#000} @media print{button{display:none}} .flex-between{display:flex;justify-content:space-between;padding:6px 0} .micro{font-size:13px} .fw-600{font-weight:600} .divider{border-top:1px solid #ddd;margin:12px 0}</style>
      </head><body>
      <h2 style="margin-bottom:24px">Reçu de paiement</h2>
      ${content.innerHTML}
      <br>
      <button onclick="window.print()" style="padding:10px 24px;background:#C8FF00;color:#000;border:none;border-radius:6px;cursor:pointer;font-weight:600">Imprimer / Télécharger PDF</button>
      </body></html>
    `);
    win.document.close();
    win.focus();
  }

  return { init, render, bind };
})();

window.App = App;

document.addEventListener('DOMContentLoaded', () => App.init());
