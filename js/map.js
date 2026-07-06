/* ════════════════════════════════════════════════
   CityReport PWA — Carte SVG (js/map.js)
   Carte Cotonou / Abomey-Calavi avec :
   - Quartiers dessinés en SVG
   - Pins de signalements animés
   - Filtre par catégorie
   - Tap sur un pin → détail
   - Légende interactive
   ════════════════════════════════════════════════ */

const MapView = (() => {

  /* ── Données géographiques simplifiées ──────────
     Coordonnées normalisées 0-100 (viewBox 0 0 400 340)
     Basées sur la géographie réelle de Cotonou/Calavi
  ─────────────────────────────────────────────── */
  const ZONES = [
    /* Cotonou — arrondissements */
    {
      id: 'akpakpa', label: 'Akpakpa', city: 'Cotonou',
      path: 'M 285 180 L 340 170 L 360 200 L 355 230 L 310 240 L 285 220 Z',
      color: '#0F1825',
    },
    {
      id: 'cadjehoun', label: 'Cadjehoun', city: 'Cotonou',
      path: 'M 200 160 L 240 155 L 255 175 L 250 200 L 210 205 L 195 185 Z',
      color: '#0C1520',
    },
    {
      id: 'godomey-s', label: 'Godomey S.', city: 'Cotonou',
      path: 'M 155 165 L 200 160 L 195 185 L 175 200 L 150 195 Z',
      color: '#0F1825',
    },
    {
      id: 'agla', label: 'Agla', city: 'Cotonou',
      path: 'M 215 205 L 250 200 L 255 225 L 235 240 L 210 235 Z',
      color: '#0C1520',
    },
    {
      id: 'fidjrosse', label: 'Fidjrossè', city: 'Cotonou',
      path: 'M 150 195 L 175 200 L 180 225 L 160 240 L 140 230 L 138 210 Z',
      color: '#0F1825',
    },
    {
      id: 'vedoko', label: 'Vèdoko', city: 'Cotonou',
      path: 'M 210 235 L 235 240 L 240 265 L 220 275 L 200 265 L 200 245 Z',
      color: '#0C1520',
    },
    {
      id: 'gbegamey', label: 'Gbégamey', city: 'Cotonou',
      path: 'M 240 155 L 285 148 L 290 170 L 270 182 L 255 175 Z',
      color: '#0F1825',
    },
    {
      id: 'jonquet', label: 'Jonquet', city: 'Cotonou',
      path: 'M 285 148 L 330 142 L 340 170 L 310 178 L 290 170 Z',
      color: '#0C1520',
    },
    {
      id: 'haie-vive', label: 'Haie Vive', city: 'Cotonou',
      path: 'M 255 175 L 270 182 L 285 180 L 285 220 L 265 225 L 250 200 Z',
      color: '#111825',
    },
    {
      id: 'zongo', label: 'Zongo', city: 'Cotonou',
      path: 'M 330 142 L 370 138 L 380 165 L 360 175 L 340 170 Z',
      color: '#0F1825',
    },
    /* Littoral / Lac */
    {
      id: 'lac', label: 'Lac Nokoué', city: '',
      path: 'M 200 100 L 380 90 L 390 140 L 370 138 L 330 142 L 285 148 L 240 155 L 200 160 L 180 140 Z',
      color: '#0A1628',
      isWater: true,
    },
    {
      id: 'ocean', label: 'Océan Atlantique', city: '',
      path: 'M 100 290 L 400 290 L 400 340 L 100 340 Z',
      color: '#071422',
      isWater: true,
    },
    /* Abomey-Calavi */
    {
      id: 'tankpe', label: 'Tankpè', city: 'Abomey-Calavi',
      path: 'M 40 140 L 90 135 L 100 160 L 90 185 L 50 190 L 35 170 Z',
      color: '#0C1520',
    },
    {
      id: 'calavi-centre', label: 'Calavi Centre', city: 'Abomey-Calavi',
      path: 'M 90 135 L 138 128 L 150 155 L 138 175 L 100 160 Z',
      color: '#0F1825',
    },
    {
      id: 'godomey', label: 'Godomey', city: 'Abomey-Calavi',
      path: 'M 100 160 L 138 175 L 150 195 L 138 210 L 100 205 L 90 185 Z',
      color: '#0C1520',
    },
    {
      id: 'kpanroun', label: 'Kpanroun', city: 'Abomey-Calavi',
      path: 'M 40 190 L 90 185 L 100 205 L 90 225 L 45 220 Z',
      color: '#0F1825',
    },
    /* Routes principales */
  ];

  /* ── Routes et axes ── */
  const ROADS = [
    /* Route des Pêches (côte) */
    { id:'rp', d:'M 100 270 L 200 265 L 280 268 L 370 272', w:3, color:'#1A2035', label:'Route des Pêches' },
    /* Boulevard Steinmetz */
    { id:'bs', d:'M 155 165 L 200 160 L 285 148 L 330 142', w:2, color:'#151A28' },
    /* Carrefour Cadjehoun–Agla */
    { id:'ca', d:'M 210 205 L 250 200 L 285 180', w:2, color:'#151A28' },
    /* Route Godomey–Calavi */
    { id:'gc', d:'M 100 185 L 90 165 L 60 155 L 40 145', w:2.5, color:'#1A2035' },
    /* Axe nord-sud Cotonou */
    { id:'ns', d:'M 255 148 L 250 200 L 245 265', w:2, color:'#151A28' },
  ];

  /* ── Signalements de démo ── */
  const DEMO_PINS = [
    { id:1, x:220, y:238, cat:'roads',    status:'urgent',   label:'Route dégradée', loc:'Agla' },
    { id:2, x:163, y:215, cat:'flood',    status:'progress', label:'Inondation',     loc:'Fidjrossè' },
    { id:3, x:305, y:198, cat:'light',    status:'new',      label:'Éclairage',      loc:'Haie Vive' },
    { id:4, x:72,  y:170, cat:'waste',    status:'done',     label:'Déchets',        loc:'Tankpè' },
    { id:5, x:248, y:178, cat:'water',    status:'progress', label:'Fuite d\'eau',   loc:'Gbégamey' },
    { id:6, x:115, y:185, cat:'roads',    status:'new',      label:'Nid de poule',   loc:'Godomey' },
    { id:7, x:340, y:158, cat:'security', status:'new',      label:'Sécurité',       loc:'Jonquet' },
    { id:8, x:195, y:262, cat:'health',   status:'urgent',   label:'Santé publique', loc:'Vèdoko' },
  ];

  /* ── Couleurs catégories ── */
  const CAT_COLOR = {
    roads:    'var(--cat-roads)',
    water:    'var(--cat-water)',
    waste:    'var(--cat-waste)',
    light:    'var(--cat-light)',
    flood:    'var(--cat-flood)',
    health:   'var(--cat-health)',
    security: 'var(--cat-security)',
    other:    'var(--cat-other)',
  };

  const CAT_ICON = {
    roads:'🛣️', water:'💧', waste:'🗑️', light:'💡',
    flood:'🌊', health:'🏥', security:'🛡️', other:'📍',
  };

  const STATUS_COLOR = {
    urgent:   '#FF3B30',
    progress: '#FF9500',
    new:      '#0A84FF',
    done:     '#32D74B',
  };

  /* ── État local ── */
  let _activeFilter = null;   /* null = tout afficher */
  let _activePinId  = null;
  let _onPinClick   = null;


  /* ════════════════════════════════════════════
     RENDER HTML
     ════════════════════════════════════════════ */

  function render({ onPinClick } = {}) {
    _onPinClick = onPinClick || null;

    return `
      <div class="map-container" id="map-container">

        <!-- SVG Carte -->
        <svg
          id="city-map"
          viewBox="30 85 370 220"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Carte de Cotonou et Abomey-Calavi"
          role="img"
        >
          <defs>
            <!-- Filtre glow pour les pins urgents -->
            <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glow-lime" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <!-- Gradient fond carte -->
            <linearGradient id="map-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#060810"/>
              <stop offset="100%" stop-color="#080B14"/>
            </linearGradient>
          </defs>

          <!-- Fond -->
          <rect x="0" y="0" width="400" height="340" fill="url(#map-bg)"/>

          <!-- Grille légère -->
          ${_renderGrid()}

          <!-- Zones / quartiers -->
          ${ZONES.map(z => _renderZone(z)).join('')}

          <!-- Routes -->
          ${ROADS.map(r => `
            <path d="${r.d}" stroke="${r.color}" stroke-width="${r.w}" fill="none" stroke-linecap="round"/>
          `).join('')}

          <!-- Labels quartiers -->
          ${ZONES.filter(z => !z.isWater).map(z => _renderZoneLabel(z)).join('')}

          <!-- Labels eau -->
          <text x="290" y="125" text-anchor="middle" fill="#0D2840" font-size="7" font-family="monospace" opacity=".8">LAC NOKOUÉ</text>
          <text x="250" y="320" text-anchor="middle" fill="#071830" font-size="8" font-family="monospace" opacity=".7">OCÉAN ATLANTIQUE</text>

          <!-- Séparateur ville -->
          <line x1="130" y1="125" x2="130" y2="250" stroke="#1A2035" stroke-width="1" stroke-dasharray="4 3" opacity=".6"/>
          <text x="75" y="123" text-anchor="middle" fill="#252840" font-size="6" font-family="monospace">ABOMEY-CALAVI</text>
          <text x="260" y="123" text-anchor="middle" fill="#252840" font-size="6" font-family="monospace">COTONOU</text>

          <!-- Pins signalements -->
          ${_renderPins()}

        </svg>

        <!-- Overlay tooltip pin actif -->
        <div class="map-tooltip" id="map-tooltip" style="display:none"></div>

        <!-- Filtre catégories -->
        <div class="map-filters" id="map-filters">
          <button class="map-filter-btn active" data-filter="null" aria-label="Tous">
            <span>Tous</span>
          </button>
          ${Object.entries(CAT_ICON).map(([k, ico]) => `
            <button class="map-filter-btn" data-filter="${k}" aria-label="${k}"
              style="--cat-c:${CAT_COLOR[k]}">
              <span>${ico}</span>
            </button>
          `).join('')}
        </div>

        <!-- Compteur -->
        <div class="map-counter" id="map-counter">
          <span id="map-count">${DEMO_PINS.length}</span> signalements
        </div>

      </div>
    `;
  }

  /* ════════════════════════════════════════════
     HEATMAP — Carte de chaleur
     ════════════════════════════════════════════ */

  function densityColor(ratio) {
    const hue = Math.round(200 - ratio * 200);
    return `hsl(${hue}, 90%, 55%)`;
  }

  function renderHeatmap(data = {}) {
    const maxCount = Math.max(1, ...Object.values(data));

    const heatZones = ZONES.map(z => {
      const count = data[z.id] || 0;
      const ratio = Math.min(count / maxCount, 1);
      const fill = count > 0 ? densityColor(ratio) : z.color;
      const opacity = count > 0 ? Math.min(ratio, 1) * 0.7 + 0.15 : z.isWater ? 1 : 0.5;
      return { ...z, _fill: fill, _opacity: opacity, _count: count, _ratio: ratio };
    });

    return `
      <div class="map-container" id="map-container">

        <svg
          id="city-map"
          viewBox="30 85 370 220"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Carte de chaleur Cotonou et Abomey-Calavi"
          role="img"
        >
          <defs>
            <linearGradient id="heat-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#060810"/>
              <stop offset="100%" stop-color="#080B14"/>
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="400" height="340" fill="url(#heat-bg)"/>

          ${_renderGrid()}

          ${heatZones.map(z => `
            <path
              d="${z.path}"
              fill="${z._fill}"
              stroke="${z.isWater ? 'none' : '#1A1D2E'}"
              stroke-width="${z.isWater ? 0 : 0.6}"
              opacity="${z._opacity}"
              data-zone="${z.id}"
              class="map-zone${z.isWater ? ' map-water' : ''}"
            >
              <title>${z.label}${z._count > 0 ? ` : ${z._count} signalement${z._count > 1 ? 's' : ''}` : ''}</title>
            </path>
          `).join('')}

          ${ROADS.map(r => `
            <path d="${r.d}" stroke="#1A2035" stroke-width="${r.w}" fill="none" stroke-linecap="round" opacity=".4"/>
          `).join('')}

          ${ZONES.filter(z => !z.isWater).map(z => _renderZoneLabel(z, true)).join('')}

          <text x="290" y="125" text-anchor="middle" fill="#0D2840" font-size="7" font-family="monospace" opacity=".5">LAC NOKOUÉ</text>
          <text x="250" y="320" text-anchor="middle" fill="#071830" font-size="8" font-family="monospace" opacity=".5">OCÉAN ATLANTIQUE</text>
        </svg>

        <!-- Légende heatmap -->
        <div class="heatmap-legend" id="heatmap-legend">
          <div class="heatmap-legend-bar">
            <span class="micro" style="color:var(--text-dim)">Faible</span>
            <div class="heatmap-legend-gradient"></div>
            <span class="micro" style="color:var(--text-dim)">Élevée</span>
          </div>
          <span class="micro" style="color:var(--text-muted)">Densité de signalements par quartier</span>
        </div>

        <!-- Compteur -->
        <div class="map-counter" id="map-counter">
          <span>${Object.values(data).reduce((s, v) => s + v, 0)}</span> signalements
        </div>

      </div>
    `;
  }

  function _renderGrid() {
    const lines = [];
    for (let x = 50; x < 400; x += 40) {
      lines.push(`<line x1="${x}" y1="85" x2="${x}" y2="305" stroke="#0D1020" stroke-width=".5"/>`);
    }
    for (let y = 100; y < 305; y += 30) {
      lines.push(`<line x1="30" y1="${y}" x2="400" y2="${y}" stroke="#0D1020" stroke-width=".5"/>`);
    }
    return lines.join('');
  }

  function _renderZone(z) {
    const isActive = !_activeFilter || true; /* toujours visible, les pins filtrent */
    return `
      <path
        d="${z.path}"
        fill="${z.color}"
        stroke="${z.isWater ? 'none' : '#141828'}"
        stroke-width="${z.isWater ? 0 : 0.8}"
        opacity="${z.isWater ? 1 : 0.95}"
        data-zone="${z.id}"
        class="map-zone${z.isWater ? ' map-water' : ''}"
      />
    `;
  }

  function _renderZoneLabel(z, heatLabel) {
    const nums = z.path.match(/[\d.]+/g).map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0);
    const ys = nums.filter((_, i) => i % 2 === 1);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const fill = heatLabel ? '#8A8DA0' : '#1E2440';

    return `
      <text
        x="${cx}" y="${cy + 1}"
        text-anchor="middle"
        fill="${fill}"
        font-size="5.5"
        font-family="monospace"
        font-weight="bold"
        pointer-events="none"
        opacity=".9"
      >${z.label}</text>
    `;
  }

  function _renderPins() {
    return DEMO_PINS
      .filter(p => !_activeFilter || p.cat === _activeFilter)
      .map(p => {
        const color  = STATUS_COLOR[p.status] || '#888';
        const catC   = CAT_COLOR[p.cat] || '#888';
        const urgent = p.status === 'urgent';
        const active = _activePinId === p.id;

        return `
          <g class="map-pin${urgent ? ' pin-urgent' : ''}${active ? ' pin-active' : ''}"
             data-pin-id="${p.id}"
             data-pin-cat="${p.cat}"
             transform="translate(${p.x}, ${p.y})"
             style="cursor:pointer"
          >
            <!-- Halo pulsant pour les urgents -->
            ${urgent ? `
              <circle r="14" fill="${color}" opacity=".12" class="pin-halo"/>
              <circle r="9"  fill="${color}" opacity=".18" class="pin-halo-inner"/>
            ` : ''}

            <!-- Ombre -->
            <ellipse cx="0" cy="14" rx="6" ry="2.5" fill="rgba(0,0,0,.4)"/>

            <!-- Corps du pin -->
            <path
              d="M 0 -16 C -7 -16 -7 -6 0 0 C 7 -6 7 -16 0 -16 Z"
              fill="${active ? catC : color}"
              ${urgent ? 'filter="url(#glow-red)"' : ''}
            />

            <!-- Tête du pin -->
            <circle cy="-16" r="5.5" fill="${active ? catC : color}" opacity=".95"/>
            <circle cy="-16" r="3" fill="rgba(0,0,0,.3)"/>
            <circle cy="-16" r="1.5" fill="rgba(255,255,255,.6)"/>
          </g>
        `;
      }).join('');
  }


  /* ════════════════════════════════════════════
     BIND — events interactifs
     ════════════════════════════════════════════ */

  function bind() {
    /* ── Pins → tooltip + callback ── */
    document.querySelectorAll('.map-pin').forEach(pin => {
      pin.addEventListener('click', e => {
        e.stopPropagation();
        const id  = parseInt(pin.dataset.pinId, 10);
        const data = DEMO_PINS.find(p => p.id === id);
        if (!data) return;

        _activePinId = id;
        _showTooltip(pin, data);
        _reRenderPins();

        if (_onPinClick) _onPinClick(data);
      });
    });

    /* ── Clic hors pin → fermer tooltip ── */
    const mapEl = document.getElementById('city-map');
    if (mapEl) {
      mapEl.addEventListener('click', () => {
        _activePinId = null;
        _hideTooltip();
        _reRenderPins();
      });
    }

    /* ── Zones heatmap → tooltip mobile (touch) ── */
    document.querySelectorAll('.map-zone:not(.map-water)').forEach(zone => {
      const showZoneTooltip = () => {
        const title = zone.querySelector('title');
        const label = title ? title.textContent : zone.dataset.zone;
        const box = zone.getBoundingClientRect();
        const existing = document.getElementById('heat-tooltip');
        if (existing) existing.remove();
        const tip = document.createElement('div');
        tip.id = 'heat-tooltip';
        tip.style.cssText = 'position:fixed;background:var(--surface);color:var(--text);padding:6px 12px;border-radius:6px;font-size:13px;pointer-events:none;z-index:100;border:1px solid var(--lime);white-space:nowrap';
        tip.textContent = label;
        document.body.appendChild(tip);
        const tipW = tip.offsetWidth;
        tip.style.left = Math.min(box.left + box.width / 2 - tipW / 2, window.innerWidth - tipW - 8) + 'px';
        tip.style.top = (box.top - 36) + 'px';
      };
      zone.addEventListener('mouseenter', showZoneTooltip);
      zone.addEventListener('mouseleave', () => {
        document.getElementById('heat-tooltip')?.remove();
      });
      zone.addEventListener('touchstart', e => {
        e.preventDefault();
        showZoneTooltip();
      });
    });

    /* ── Filtres catégorie ── */
    document.querySelectorAll('.map-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const f = btn.dataset.filter;
        _activeFilter = (f === 'null') ? null : f;
        _activePinId  = null;
        _hideTooltip();

        /* Mettre à jour l'état actif des boutons */
        document.querySelectorAll('.map-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        /* Re-rendre les pins */
        _reRenderPins();

        /* Mettre à jour le compteur */
        const visible = DEMO_PINS.filter(p => !_activeFilter || p.cat === _activeFilter);
        const counter = document.getElementById('map-count');
        if (counter) counter.textContent = visible.length;
      });
    });
  }

  function _showTooltip(pinEl, data) {
    const tooltip = document.getElementById('map-tooltip');
    if (!tooltip) return;

    const catC = CAT_COLOR[data.cat] || 'var(--text-muted)';
    tooltip.innerHTML = `
      <div class="map-tooltip-inner" style="border-color:${catC}">
        <span class="map-tooltip-cat" style="color:${catC}">${CAT_ICON[data.cat]} ${data.cat}</span>
        <p class="map-tooltip-label">${data.label}</p>
        <p class="map-tooltip-loc">📍 ${data.loc}</p>
        <span class="map-tooltip-status map-tooltip-${data.status}">${data.status}</span>
      </div>
    `;
    tooltip.style.display = 'block';
  }

  function _hideTooltip() {
    const tooltip = document.getElementById('map-tooltip');
    if (tooltip) tooltip.style.display = 'none';
  }

  function _reRenderPins() {
    /* Remplacer uniquement les pins dans le SVG */
    const svg = document.getElementById('city-map');
    if (!svg) return;

    svg.querySelectorAll('.map-pin').forEach(el => el.remove());

    const pinsHTML = _renderPins();
    const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    tmp.innerHTML = pinsHTML;
    while (tmp.firstChild) svg.appendChild(tmp.firstChild);

    /* Rebinder les nouveaux pins */
    svg.querySelectorAll('.map-pin').forEach(pin => {
      pin.addEventListener('click', e => {
        e.stopPropagation();
        const id   = parseInt(pin.dataset.pinId, 10);
        const data = DEMO_PINS.find(p => p.id === id);
        if (!data) return;
        _activePinId = id;
        _showTooltip(pin, data);
        _reRenderPins();
        if (_onPinClick) _onPinClick(data);
      });
    });
  }

  return { render, renderHeatmap, bind, DEMO_PINS };

})();

window.MapView = MapView;
