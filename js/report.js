/* ════════════════════════════════════════════════
   CityReport PWA — Flux Signalement (js/report.js)
   4 étapes : Catégorie → Localisation → Photo → Confirmation
   ════════════════════════════════════════════════ */

const Report = (() => {

  /* ── Config des 8 catégories ── */
  const CATEGORIES = [
    { id:'roads',    label:'Routes & voirie',      icon:'road',               desc:'Nids de poule, routes dégradées, trottoirs cassés' },
    { id:'water',    label:'Eau & assainissement', icon:'droplet',            desc:'Fuites d\'eau, caniveaux bouchés, manque d\'eau' },
    { id:'waste',    label:'Déchets',              icon:'trash',              desc:'Dépôts sauvages, bacs pleins, encombrants' },
    { id:'light',    label:'Éclairage public',     icon:'bulb',               desc:'Lampadaires éteints, câbles dangereux' },
    { id:'flood',    label:'Inondation',           icon:'ripple',             desc:'Zones inondées, ruissellements, eaux stagnantes' },
    { id:'health',   label:'Santé publique',       icon:'heart-rate-monitor', desc:'Nuisibles, odeurs, risques sanitaires' },
    { id:'security', label:'Sécurité',             icon:'shield',            desc:'Zones dangereuses, infrastructures instables' },
    { id:'other',    label:'Autre',                icon:'dots',               desc:'Tout problème ne rentrant pas dans les catégories' },
  ];

  /* ── Labels des étapes ── */
  const STEPS = [
    { n:1, label:'Catégorie' },
    { n:2, label:'Localisation' },
    { n:3, label:'Photo' },
    { n:4, label:'Confirmation' },
    { n:5, label:'Succès' },
  ];


  /* ════════════════════════════════════════════
     RENDER PRINCIPAL
     ════════════════════════════════════════════ */

  function render(S) {
    const { step } = S.report;

    return `
      <div class="screen" id="report-screen">

        <!-- Bannière mode anonyme -->
        ${S.prefs.anonymous ? `
          <div class="anon-banner mb-sm reveal">
            <i class="ti ti-incognito" aria-hidden="true"></i>
            <span class="micro"><strong>Mode anonyme actif</strong> — Votre identité ne sera pas associée à ce signalement</span>
          </div>
        ` : ''}

        <!-- Stepper (caché pour l'écran de succès) -->
        ${step <= 4 ? _renderStepper(step) : ''}

        <!-- Contenu de l'étape courante -->
        <div id="report-step-content" class="report-step-content">
          ${step === 1 ? _renderStep1(S) : ''}
          ${step === 2 ? _renderStep2(S) : ''}
          ${step === 3 ? _renderStep3(S) : ''}
          ${step === 4 ? _renderStep4(S) : ''}
          ${step === 5 ? _renderStep5(S) : ''}
        </div>

      </div>
    `;
  }


  /* ── Stepper ── */
  function _renderStepper(currentStep) {
    return `
      <div class="stepper reveal" role="list" aria-label="Étapes du signalement">
        ${STEPS.map((s, idx) => {
          const done   = s.n < currentStep;
          const active = s.n === currentStep;
          return `
            <div class="step-item${done ? ' done' : active ? ' active' : ''}" role="listitem">
              <div class="step-dot" aria-label="Étape ${s.n} : ${s.label}${done ? ' (terminée)' : active ? ' (en cours)' : ''}">
                ${done
                  ? `<i class="ti ti-check" style="font-size:13px" aria-hidden="true"></i>`
                  : s.n
                }
              </div>
              ${idx < STEPS.length - 1 ? `<div class="step-line"></div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
      <p class="micro mb-md" style="text-align:center;color:var(--text-dim)">
        Étape ${currentStep} sur ${STEPS.length} — ${STEPS[currentStep-1].label}
      </p>
    `;
  }


  /* ════════════════════════════════════════════
     ÉTAPE 1 — Catégorie
     ════════════════════════════════════════════ */

  function _renderStep1(S) {
    const selected = S.report.category;
    const st = State.SUBTYPES || {};
    const subtypes = selected ? (st[selected] || []) : [];
    const activeSub = S.report.subtype;

    return `
      <div class="step-block" id="step-1">
        <p class="display-sm mb-sm">Quel problème ?</p>
        <p class="muted mb-lg">Choisissez la catégorie qui correspond le mieux à votre signalement.</p>

        <div class="cat-grid-report stagger-list" role="radiogroup" aria-label="Catégorie du problème">
          ${CATEGORIES.map(cat => `
            <button
              class="cat-card${selected === cat.id ? ' selected' : ''}"
              data-cat="${cat.id}"
              role="radio"
              aria-checked="${selected === cat.id}"
              aria-label="${cat.label}"
              type="button"
            >
              <div class="cat-card-icon cat-${cat.id}">
                <i class="ti ti-${cat.icon}" aria-hidden="true"></i>
              </div>
              <span class="cat-card-label">${cat.label}</span>
              ${selected === cat.id ? `
                <div class="cat-card-check">
                  <i class="ti ti-check" aria-hidden="true"></i>
                </div>
              ` : ''}
            </button>
          `).join('')}
        </div>

        ${selected ? `
          <div class="cat-selected-info reveal" id="cat-info">
            <i class="ti ti-info-circle" aria-hidden="true"></i>
            <span>${CATEGORIES.find(c => c.id === selected)?.desc || ''}</span>
          </div>
        ` : ''}

        ${subtypes.length ? `
          <div class="reveal mt-md">
            <p class="micro mb-xs" style="color:var(--text-dim)">Sous-type (optionnel)</p>
            <div class="subtype-scroll" id="subtype-scroll">
              ${subtypes.map(s => `
                <button class="subtype-chip${activeSub === s ? ' active' : ''}" data-subtype="${s}" type="button">${s}</button>
              `).join('')}
              ${activeSub ? `<button class="subtype-chip subtype-clear" id="btn-subtype-clear" type="button">✕ Effacer</button>` : ''}
            </div>
          </div>
        ` : ''}

        <div class="step-actions">
          ${UI.btn({
            label:   'Continuer',
            icon:    'arrow-right',
            variant: selected ? 'primary' : 'secondary',
            full:    true,
            id:      'btn-step1-next',
            disabled: !selected,
          })}
        </div>

      </div>
    `;
  }


  /* ════════════════════════════════════════════
     ÉTAPE 2 — Localisation (partie #13)
     ════════════════════════════════════════════ */

  function _renderStep2(S) {
    const loc = S.report.location;

    return `
      <div class="step-block" id="step-2">
        <p class="display-sm mb-sm">Où est le problème ?</p>
        <p class="muted mb-lg">Indiquez le quartier ou l'adresse la plus précise possible.</p>

        <div style="display:grid;gap:var(--space-md)">

          <!-- Géolocalisation GPS -->
          <button class="location-btn" id="btn-gps" type="button">
            <div class="location-btn-icon">
              <i class="ti ti-current-location" aria-hidden="true"></i>
            </div>
            <div class="location-btn-body">
              <p class="location-btn-title">Ma position GPS</p>
              <p class="location-btn-sub" id="gps-status">
                ${loc?.method === 'gps'
                  ? `✓ ${loc.label}`
                  : 'Utiliser ma position actuelle'
                }
              </p>
            </div>
            <i class="ti ti-chevron-right" style="color:var(--text-dim)" aria-hidden="true"></i>
          </button>

          <div class="flex-center" style="gap:12px;color:var(--text-dim);font-size:12px">
            <div style="flex:1;height:1px;background:var(--border)"></div>
            ou
            <div style="flex:1;height:1px;background:var(--border)"></div>
          </div>

          <!-- Sélection manuelle commune + quartier -->
          ${UI.select({
            id: 'sel-commune',
            label: 'Commune',
            options: [
              { value: '',              label: '— Choisir une commune —', selected: !loc?.commune },
              { value: 'cotonou',       label: 'Cotonou',         selected: loc?.commune === 'cotonou' },
              { value: 'abomey-calavi', label: 'Abomey-Calavi',   selected: loc?.commune === 'abomey-calavi' },
              { value: 'seme-podji',    label: 'Sèmè-Podji',      selected: loc?.commune === 'seme-podji' },
              { value: 'ouidah',        label: 'Ouidah',          selected: loc?.commune === 'ouidah' },
              { value: 'porto-novo',    label: 'Porto-Novo',      selected: loc?.commune === 'porto-novo' },
            ],
          })}

          <div id="quartier-wrap" style="${loc?.commune ? '' : 'display:none'}">
            ${UI.select({
              id: 'sel-quartier',
              label: 'Quartier / Arrondissement',
              options: _getQuartiers(loc?.commune || 'cotonou'),
            })}
          </div>

          ${UI.input({
            id:          'input-adresse',
            label:       'Précision (optionnel)',
            placeholder: 'Ex: Carrefour Total, près de l\'école…',
            icon:        'map-pin',
            value:       loc?.detail || '',
          })}

        </div>

        <div class="step-actions">
          <div style="display:grid;grid-template-columns:1fr 2fr;gap:var(--space-sm)">
            ${UI.btn({ label:'Retour', variant:'ghost', id:'btn-step2-back' })}
            ${UI.btn({ label:'Continuer', icon:'arrow-right', variant:'primary', id:'btn-step2-next', disabled: !loc })}
          </div>
        </div>

      </div>
    `;
  }

  function _getQuartiers(commune) {
    const map = {
      'cotonou': [
        { value:'', label:'— Choisir un quartier —' },
        { value:'1er',         label:'1er Arrondissement' },
        { value:'2eme',        label:'2e Arrondissement' },
        { value:'3eme',        label:'3e Arrondissement' },
        { value:'4eme',        label:'4e Arrondissement' },
        { value:'5eme',        label:'5e Arrondissement' },
        { value:'6eme',        label:'6e Arrondissement' },
        { value:'7eme',        label:'7e Arrondissement' },
        { value:'8eme',        label:'8e Arrondissement' },
        { value:'9eme',        label:'9e Arrondissement' },
        { value:'10eme',       label:'10e Arrondissement' },
        { value:'11eme',       label:'11e Arrondissement' },
        { value:'12eme',       label:'12e Arrondissement' },
        { value:'13eme',       label:'13e Arrondissement' },
        { value:'akpakpa',     label:'Akpakpa' },
        { value:'agla',        label:'Agla' },
        { value:'cadjehoun',   label:'Cadjehoun' },
        { value:'fidjrosse',   label:'Fidjrossè' },
        { value:'gbegamey',    label:'Gbégamey' },
        { value:'haie-vive',   label:'Haie Vive' },
        { value:'jonquet',     label:'Jonquet' },
        { value:'vedoko',      label:'Vèdoko' },
        { value:'zongo',       label:'Zongo' },
      ],
      'abomey-calavi': [
        { value:'', label:'— Choisir un quartier —' },
        { value:'calavi-centre', label:'Calavi Centre' },
        { value:'agori',         label:'Agori' },
        { value:'akassato',      label:'Akassato' },
        { value:'godomey',       label:'Godomey' },
        { value:'houedjedo',     label:'Houèdjèdo' },
        { value:'kpanroun',      label:'Kpanroun' },
        { value:'ouedo',         label:'Ouèdo' },
        { value:'tankpe',        label:'Tankpè' },
        { value:'togba',         label:'Togba' },
        { value:'zinvie',        label:'Zinvié' },
      ],
      'porto-novo': [
        { value:'', label:'— Choisir un quartier —' },
        { value:'akpakpa-sud',  label:'Akpakpa Sud' },
        { value:'djeregbe',     label:'Djèrègbe' },
        { value:'houeme',       label:'Houèmè' },
        { value:'ouando',       label:'Ouando' },
        { value:'tokpleta',     label:'Tokpléta' },
      ],
      'ouidah': [
        { value:'', label:'— Choisir un quartier —' },
        { value:'avlekete',   label:'Avlékété' },
        { value:'djegbadji',  label:'Djégbadji' },
        { value:'houakpe',    label:'Houakpè' },
        { value:'pahou',      label:'Pahou' },
        { value:'save',       label:'Savè' },
      ],
      'seme-podji': [
        { value:'', label:'— Choisir un quartier —' },
        { value:'agblangandan', label:'Agblangandan' },
        { value:'ekpe',         label:'Ekpè' },
        { value:'seme',         label:'Sèmè' },
      ],
    };
    return map[commune] || [{ value:'', label:'— Sélectionner la commune d\'abord —' }];
  }

  /* Reverse geocoding simplifié par bounding boxes */
  function _reverseGeocode(lat, lng) {
    if (lat >= 6.33 && lat <= 6.40 && lng >= 2.38 && lng <= 2.44) {
      return { commune: 'cotonou', label: 'Cotonou' };
    }
    if (lat >= 6.39 && lat <= 6.47 && lng >= 2.28 && lng <= 2.40) {
      return { commune: 'abomey-calavi', label: 'Abomey-Calavi' };
    }
    return null;
  }


  /* ════════════════════════════════════════════
     ÉTAPE 3 — Photo & description (partie #14)
     ════════════════════════════════════════════ */

  function _renderStep3(S) {
    const photo = S.report.photo;
    const desc  = S.report.description;

    return `
      <div class="step-block" id="step-3">
        <p class="display-sm mb-sm">Montrez le problème</p>
        <p class="muted mb-lg">Une photo aide la mairie à comprendre et prioriser votre signalement.</p>

        <!-- Zone photo -->
        <div class="photo-zone" id="photo-zone" role="button" tabindex="0" aria-label="Prendre ou choisir une photo">
          ${photo ? `
            <img src="${photo}" alt="Photo du signalement" class="photo-preview" id="photo-preview">
            <button class="photo-remove" id="btn-remove-photo" aria-label="Supprimer la photo" type="button">
              <i class="ti ti-x" aria-hidden="true"></i>
            </button>
          ` : `
            <div class="photo-placeholder">
              <i class="ti ti-camera" aria-hidden="true"></i>
              <p>Prendre une photo</p>
              <span>ou appuyez pour choisir depuis la galerie</span>
            </div>
          `}
          <input type="file" id="input-photo" accept="image/*" capture="environment"
            style="position:absolute;inset:0;opacity:0;cursor:pointer" aria-hidden="true">
        </div>

        <!-- Description -->
        <div class="mt-md">
          ${UI.textarea({
            id:          'input-desc',
            label:       'Description',
            placeholder: 'Décrivez le problème : depuis combien de temps ? Quel est l\'impact ?',
            value:       desc,
            maxlength:   500,
            required:    true,
          })}
        </div>

        <div class="step-actions">
          <div style="display:grid;grid-template-columns:1fr 2fr;gap:var(--space-sm)">
            ${UI.btn({ label:'Retour', variant:'ghost', id:'btn-step3-back' })}
            ${UI.btn({ label:'Continuer', icon:'arrow-right', variant:'primary', id:'btn-step3-next' })}
          </div>
        </div>

      </div>
    `;
  }


  /* ════════════════════════════════════════════
     ÉTAPE 4 — Confirmation (partie #15)
     ════════════════════════════════════════════ */

  function _renderStep4(S) {
    const { category, subtype, location, photo, description } = S.report;
    const cat = CATEGORIES.find(c => c.id === category);

    return `
      <div class="step-block" id="step-4">
        <p class="display-sm mb-sm">Confirmer</p>
        <p class="muted mb-lg">Vérifiez les informations avant d'envoyer votre signalement.</p>

        <!-- Récapitulatif -->
        <div class="recap-card reveal">

          ${photo ? `<img src="${photo}" alt="Photo" class="recap-photo">` : ''}

          <div class="list-row">
            <div class="list-row-icon" style="background:rgba(200,255,0,.1)">
              <i class="ti ti-tag" style="color:var(--lime)" aria-hidden="true"></i>
            </div>
            <div class="list-row-body">
              <p class="list-row-title">Catégorie</p>
              <p class="list-row-sub">${cat?.label || category}${subtype ? ` · ${subtype}` : ''}</p>
            </div>
          </div>

          <div class="list-row">
            <div class="list-row-icon" style="background:rgba(200,255,0,.1)">
              <i class="ti ti-map-pin" style="color:var(--lime)" aria-hidden="true"></i>
            </div>
            <div class="list-row-body">
              <p class="list-row-title">Localisation</p>
              <p class="list-row-sub">${location?.label || 'Non renseignée'}</p>
            </div>
          </div>

          ${description ? `
            <div class="list-row">
              <div class="list-row-icon" style="background:rgba(200,255,0,.1)">
                <i class="ti ti-file-text" style="color:var(--lime)" aria-hidden="true"></i>
              </div>
              <div class="list-row-body">
                <p class="list-row-title">Description</p>
                <p class="list-row-sub">${description.slice(0, 80)}${description.length > 80 ? '…' : ''}</p>
              </div>
            </div>
          ` : ''}

        </div>

        <!-- Anonymat -->
        <div class="mt-md">
          ${S.prefs.anonymous ? `
            <div class="flex items-center flex-gap-sm mb-xs" style="color:var(--orange)">
              <i class="ti ti-incognito" style="font-size:14px"></i>
              <span class="micro">Mode anonyme activé dans les préférences</span>
            </div>
          ` : ''}
          ${UI.toggle({
            id:      'toggle-anon',
            label:   'Signaler anonymement',
            sub:     'Votre nom ne sera pas affiché publiquement',
            checked: S.prefs.anonymous,
          })}
        </div>

        <div class="step-actions">
          <div style="display:grid;gap:var(--space-sm)">
            ${UI.btn({
              label:   S.loading ? 'Envoi en cours…' : 'Envoyer le signalement',
              icon:    S.loading ? null : 'send',
              variant: 'primary',
              full:    true,
              id:      'btn-submit',
              loading: S.loading,
            })}
            ${UI.btn({ label:'Retour', variant:'ghost', full:true, id:'btn-step4-back' })}
          </div>
        </div>

        ${!S.isOnline ? `
          <div class="mt-md">
            ${UI.alert({ type:'warning', message:'Vous êtes hors ligne. Le signalement sera envoyé automatiquement dès que la connexion sera rétablie.' })}
          </div>
        ` : ''}

      </div>
    `;
  }


  /* ════════════════════════════════════════════
     ÉTAPE 5 — Succès / Confirmation (partie #15)
     Confettis CSS, numéro de référence, actions
     ════════════════════════════════════════════ */

  function _renderStep5(S) {
    const { reference, category, location: loc } = S.report;
    const cat = CATEGORIES.find(c => c.id === category);

    /* Confettis positionnés aléatoirement (générés côté serveur HTML) */
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const confettiPieces = prefersReduced ? '' : Array.from({ length: 24 }, (_, i) => {
      const x   = 5 + Math.random() * 90;
      const d   = (Math.random() * 0.6).toFixed(2);
      const col = i % 5;
      return `<div class="confetti-piece confetti-${col}" style="left:${x}%;--delay:${d}s"></div>`;
    }).join('');

    return `
      <div class="step-block" id="step-5" style="text-align:center">

        <!-- Confettis -->
        <div class="confetti-container" aria-hidden="true">${confettiPieces}</div>

        <!-- Checkmark animé -->
        <div class="success-checkmark reveal">
          <i class="ti ti-check" aria-hidden="true"></i>
        </div>

        <p class="display-sm mt-lg mb-sm reveal">Signalement envoyé !</p>
        <p class="muted reveal reveal-delay-1" style="max-width:280px;margin:0 auto">
          Merci pour votre contribution. Votre signalement a été transmis à la mairie.
        </p>

        <!-- Numéro de référence -->
        <div class="ref-card reveal reveal-delay-2">
          <p class="micro mb-xs">Numéro de référence</p>
          <p class="ref-number">${reference || 'CR-XXXXXX'}</p>
          <p class="micro mt-sm">Conservez ce numéro pour suivre votre signalement</p>
        </div>

        <!-- Résumé rapide -->
        <div class="mt-md reveal reveal-delay-3">
          <span class="badge badge-muted">
            <i class="ti ti-${cat?.icon || 'tag'}" style="font-size:12px" aria-hidden="true"></i>
            ${cat?.label || category}
          </span>
          ${loc ? `
            <span class="badge badge-muted" style="margin-left:6px">
              <i class="ti ti-map-pin" style="font-size:12px" aria-hidden="true"></i>
              ${loc.label}
            </span>
          ` : ''}
        </div>

        <!-- Actions -->
        <div class="step-actions reveal reveal-delay-4">
          <div style="display:grid;gap:var(--space-sm)">
            ${UI.btn({ label:'Voir mes signalements', icon:'list-check', variant:'primary', full:true, id:'btn-go-suivi' })}
            ${UI.btn({ label:'Nouveau signalement',   icon:'plus',       variant:'ghost',   full:true, id:'btn-new-report' })}
            ${UI.btn({ label:'Retour à l\'accueil',   icon:'home',       variant:'ghost',   full:true, id:'btn-go-home' })}
          </div>
        </div>

      </div>
    `;
  }


  /* ════════════════════════════════════════════
     BIND — tous les events du flux
     ════════════════════════════════════════════ */

  function bind() {
    const S = State.get();

    /* ── Étape 1 : sélection catégorie ── */
    document.querySelectorAll('.cat-card[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        State.Actions.setReportCategory(btn.dataset.cat);
        /* setReportCategory appelle go() → render() → bind() automatiquement */
      });
    });

    /* Navigation clavier : flèches gauche/droite dans la grille catégories */
    const catGrid = document.querySelector('.cat-grid-report');
    if (catGrid) {
      catGrid.addEventListener('keydown', e => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const btns = [...catGrid.querySelectorAll('.cat-card[data-cat]')];
        const idx = btns.indexOf(document.activeElement);
        if (idx < 0) return;
        const next = e.key === 'ArrowRight'
          ? (idx + 1) % btns.length
          : (idx - 1 + btns.length) % btns.length;
        btns[next].focus();
        btns[next].click();
      });
    }

    /* Sous-type chips */
    document.querySelectorAll('.subtype-chip[data-subtype]').forEach(btn => {
      btn.addEventListener('click', () => {
        State.setSilentNested('report', { subtype: btn.dataset.subtype });
        document.querySelectorAll('.subtype-chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    document.getElementById('btn-subtype-clear')?.addEventListener('click', () => {
      State.setSilentNested('report', { subtype: null });
    });

    document.getElementById('btn-step1-next')?.addEventListener('click', () => {
      if (!State.get().report.category) return;
      State.Actions.setReportStep(2);
    });

    /* ── Étape 2 : localisation ── */
    document.getElementById('btn-step2-back')?.addEventListener('click', () => {
      State.Actions.setReportStep(1);
    });

    const selCommune = document.getElementById('sel-commune');
    selCommune?.addEventListener('change', () => {
      const commune = selCommune.value;
      const quartierWrap = document.getElementById('quartier-wrap');
      if (quartierWrap) {
        quartierWrap.style.display = commune ? '' : 'none';
        const sel = document.getElementById('sel-quartier');
        if (sel) {
          sel.innerHTML = _getQuartiers(commune)
            .map(o => `<option value="${o.value}">${o.label}</option>`)
            .join('');
        }
      }
      State.setSilentNested('report', { location: commune ? { commune, label: commune, method: 'manual' } : null });
      _updateStep2NextBtn();
    });

    document.getElementById('sel-quartier')?.addEventListener('change', e => {
      const commune  = document.getElementById('sel-commune')?.value || '';
      const quartier = e.target.value;
      if (quartier) {
        const existing = State.get().report.location || {};
        State.setSilentNested('report', {
          location: { ...existing, commune, quartier, label: `${quartier}, ${commune}`, method: 'manual' },
        });
      }
      _updateStep2NextBtn();
    });

    document.getElementById('input-adresse')?.addEventListener('blur', e => {
      const loc = State.get().report.location;
      if (loc) {
        loc.detail = e.target.value;
        State.setSilentNested('report', { location: loc });
      }
    });

    document.getElementById('btn-gps')?.addEventListener('click', async () => {
      const btn    = document.getElementById('btn-gps');
      const status = document.getElementById('gps-status');
      if (!btn || !status) return;
      status.textContent = 'Localisation en cours…';
      btn.classList.add('loading');

      try {
        const pos = await _getGPS();
        const { latitude, longitude } = pos.coords;
        const geo = _reverseGeocode(latitude, longitude);

        const location = {
          method:  'gps',
          coords:  { lat: latitude, lng: longitude },
        };

        if (geo) {
          location.commune = geo.commune;
          location.label   = `${geo.label} (GPS)`;

          const selCommuneEl = document.getElementById('sel-commune');
          if (selCommuneEl) selCommuneEl.value = geo.commune;

          const quartierWrap = document.getElementById('quartier-wrap');
          if (quartierWrap) quartierWrap.style.display = '';

          const selQuartier = document.getElementById('sel-quartier');
          if (selQuartier) {
            selQuartier.innerHTML = _getQuartiers(geo.commune)
              .map(o => `<option value="${o.value}">${o.label}</option>`)
              .join('');
          }
        } else {
          location.label = `GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
        }

        State.setSilentNested('report', { location });
        status.textContent = `✓ ${location.label}`;
        _updateStep2NextBtn();
      } catch (e) {
        status.textContent = 'GPS indisponible — saisissez manuellement';
        State.toast('GPS non disponible', 'err');
      }
      btn.classList.remove('loading');
    });

    document.getElementById('btn-step2-next')?.addEventListener('click', () => {
      const S = State.get();
      const loc = S.report.location;
      if (!loc) { State.toast('Indiquez une localisation', 'err'); return; }
      const addrInput = document.getElementById('input-adresse');
      if (addrInput?.value) loc.detail = addrInput.value;
      State.Actions.setReportLocation(loc, loc.coords || null);
    });

    /* ── Étape 3 : photo & description ── */
    document.getElementById('btn-step3-back')?.addEventListener('click', () => {
      State.Actions.setReportStep(2);
    });

    /* Photo input avec compression */
    document.getElementById('input-photo')?.addEventListener('change', _handlePhotoInput);

    document.getElementById('btn-remove-photo')?.addEventListener('click', e => {
      e.stopPropagation();
      _resetPhotoZone();
    });

    UI.bindCharCount('input-desc');
    document.getElementById('input-desc')?.addEventListener('blur', e => {
      State.setSilentNested('report', { description: e.target.value });
    });

    document.getElementById('btn-step3-next')?.addEventListener('click', () => {
      const { description } = State.get().report;
      if (!description.trim()) { State.toast('Ajoutez une description', 'err'); return; }
      State.Actions.setReportStep(4);
    });

    /* ── Étape 4 : confirmation ── */
    document.getElementById('btn-step4-back')?.addEventListener('click', () => {
      State.Actions.setReportStep(3);
    });

    document.getElementById('toggle-anon')?.addEventListener('change', e => {
      State.Actions.setPref('anonymous', e.target.checked);
    });

    document.getElementById('btn-submit')?.addEventListener('click', async () => {
      await State.Actions.submitReport();
    });

    /* ── Étape 5 : succès ── */
    document.getElementById('btn-go-suivi')?.addEventListener('click', () => {
      State.Actions.resetReport();
      Router.push('suivi');
    });

    document.getElementById('btn-new-report')?.addEventListener('click', () => {
      State.Actions.resetReport();
    });

    document.getElementById('btn-go-home')?.addEventListener('click', () => {
      State.Actions.resetReport();
      Router.push('home');
    });
  }

  /* ── Helpers internes ── */

  function _updateStep2NextBtn() {
    const btn = document.getElementById('btn-step2-next');
    const loc = State.get().report.location;
    if (btn) btn.disabled = !loc;
  }

  function _getGPS() {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) { reject(new Error('GPS non supporté')); return; }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 30000,
      });
    });
  }

  /* Compression image via canvas avant stockage */
  function compressImage(dataUrl, maxWidth = 1024, quality = 0.75) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio  = Math.min(maxWidth / img.width, 1);
        canvas.width  = img.width  * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    });
  }

  /* Handler photo asynchrone avec compression */
  async function _handlePhotoInput(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const photoZone = document.getElementById('photo-zone');
    if (!photoZone) return;
    photoZone.innerHTML = `
      <div class="photo-loading">
        <div class="inline-spinner"></div>
        <p>Compression…</p>
      </div>
    `;
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = ev => resolve(ev.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const compressed = await compressImage(dataUrl, 1024, 0.75);
      State.setSilentNested('report', { photo: compressed });
      _renderPhotoPreview(compressed);
    } catch (err) {
      _resetPhotoZone();
      State.toast('Erreur lors de la lecture de la photo', 'err');
    }
  }

  function _renderPhotoPreview(src) {
    const photoZone = document.getElementById('photo-zone');
    if (!photoZone) return;
    photoZone.innerHTML = `
      <img src="${src}" alt="Photo du signalement" class="photo-preview" id="photo-preview">
      <button class="photo-remove" id="btn-remove-photo" aria-label="Supprimer la photo" type="button">
        <i class="ti ti-x" aria-hidden="true"></i>
      </button>
      <input type="file" id="input-photo" accept="image/*" capture="environment"
        style="position:absolute;inset:0;opacity:0;cursor:pointer" aria-hidden="true">
    `;
    document.getElementById('btn-remove-photo')?.addEventListener('click', e => {
      e.stopPropagation();
      _resetPhotoZone();
    });
    document.getElementById('input-photo')?.addEventListener('change', _handlePhotoInput);
  }

  function _resetPhotoZone() {
    State.setSilentNested('report', { photo: null });
    const photoZone = document.getElementById('photo-zone');
    if (!photoZone) return;
    photoZone.innerHTML = `
      <div class="photo-placeholder">
        <i class="ti ti-camera" aria-hidden="true"></i>
        <p>Prendre une photo</p>
        <span>ou appuyez pour choisir depuis la galerie</span>
      </div>
      <input type="file" id="input-photo" accept="image/*" capture="environment"
        style="position:absolute;inset:0;opacity:0;cursor:pointer" aria-hidden="true">
    `;
    document.getElementById('input-photo')?.addEventListener('change', _handlePhotoInput);
  }

  return { render, bind, CATEGORIES };

})();

window.Report = Report;
