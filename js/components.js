/* ════════════════════════════════════════════════
   CityReport PWA — UI Components (js/components.js)
   Fonctions qui génèrent le HTML des composants
   avec tous leurs états : loading, error, success…
   ════════════════════════════════════════════════ */

const UI = (() => {

  /* ════════════════════════════════════════════
     BOUTONS
     ════════════════════════════════════════════ */

  /*
   * btn({ label, icon, variant, size, full, loading, disabled, id, onClick })
   * variant : primary | secondary | ghost | danger | lime-outline
   * size    : sm | md (défaut) | lg
   */
  function btn({
    label = '',
    icon = null,
    variant = 'primary',
    size = 'md',
    full = false,
    loading = false,
    disabled = false,
    id = '',
    type = 'button',
  } = {}) {
    const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
    const classes = [
      'btn',
      `btn-${variant}`,
      sizeClass,
      full ? 'btn-full' : '',
      loading ? 'btn-loading' : '',
      'ripple',
    ].filter(Boolean).join(' ');

    const iconHTML = icon
      ? `<i class="ti ti-${icon}" aria-hidden="true"></i>`
      : '';

    const spinnerHTML = loading
      ? `<span class="btn-spinner" aria-hidden="true"></span>`
      : '';

    return `
      <button
        class="${classes}"
        ${id ? `id="${id}"` : ''}
        type="${type}"
        ${disabled || loading ? 'disabled' : ''}
        ${loading ? 'aria-busy="true"' : ''}
      >
        ${loading ? spinnerHTML : iconHTML}
        ${label ? `<span>${label}</span>` : ''}
      </button>
    `;
  }

  /* Bouton icône seul */
  function iconBtn({ icon, label, variant = 'ghost', size = 'md', id = '' } = {}) {
    const sizeClass = size === 'sm' ? 'btn-icon-sm' : 'btn-icon';
    return `
      <button
        class="btn btn-${variant} ${sizeClass}"
        ${id ? `id="${id}"` : ''}
        aria-label="${label}"
        type="button"
      >
        <i class="ti ti-${icon}" aria-hidden="true"></i>
      </button>
    `;
  }

  /* Groupe de 2 boutons côte à côte (annuler / confirmer) */
  function btnGroup({ cancelLabel = 'Annuler', confirmLabel = 'Confirmer', confirmVariant = 'primary', confirmId = '', cancelId = '', confirmIcon = null, confirmLoading = false } = {}) {
    return `
      <div class="btn-group">
        ${btn({ label: cancelLabel, variant: 'ghost', id: cancelId })}
        ${btn({ label: confirmLabel, variant: confirmVariant, icon: confirmIcon, id: confirmId, loading: confirmLoading })}
      </div>
    `;
  }


  /* ════════════════════════════════════════════
     INPUTS
     ════════════════════════════════════════════ */

  /*
   * input({ id, label, type, placeholder, value, hint, error, required, icon })
   */
  function input({
    id = '',
    label = '',
    type = 'text',
    placeholder = '',
    value = '',
    hint = '',
    error = '',
    required = false,
    icon = null,
    maxlength = '',
  } = {}) {
    const hasError = !!error;
    const inputId = id || `input-${Math.random().toString(36).slice(2, 7)}`;

    return `
      <div class="input-wrap">
        ${label ? `
          <label class="input-label" for="${inputId}">
            ${label}${required ? ' <span style="color:var(--red)">*</span>' : ''}
          </label>
        ` : ''}
        <div class="input-field-wrap${icon ? ' input-has-icon' : ''}">
          ${icon ? `<i class="ti ti-${icon} input-icon" aria-hidden="true"></i>` : ''}
          <input
            class="input${hasError ? ' error' : ''}"
            id="${inputId}"
            type="${type}"
            placeholder="${placeholder}"
            value="${value}"
            ${required ? 'required' : ''}
            ${maxlength ? `maxlength="${maxlength}"` : ''}
            autocomplete="${type === 'tel' ? 'tel' : type === 'email' ? 'email' : 'off'}"
          >
        </div>
        ${hint && !hasError ? `<p class="input-hint">${hint}</p>` : ''}
        ${hasError ? `<p class="input-error-msg" role="alert"><i class="ti ti-alert-circle" style="font-size:12px"></i> ${error}</p>` : ''}
      </div>
    `;
  }

  /* Textarea */
  function textarea({
    id = '',
    label = '',
    placeholder = '',
    value = '',
    hint = '',
    error = '',
    required = false,
    rows = 4,
    maxlength = 500,
  } = {}) {
    const hasError = !!error;
    const inputId = id || `ta-${Math.random().toString(36).slice(2, 7)}`;

    return `
      <div class="input-wrap">
        ${label ? `
          <label class="input-label" for="${inputId}">
            ${label}${required ? ' <span style="color:var(--red)">*</span>' : ''}
          </label>
        ` : ''}
        <textarea
          class="textarea${hasError ? ' error' : ''}"
          id="${inputId}"
          placeholder="${placeholder}"
          rows="${rows}"
          ${required ? 'required' : ''}
          ${maxlength ? `maxlength="${maxlength}"` : ''}
        >${value}</textarea>
        <div class="flex-between">
          ${hint && !hasError ? `<p class="input-hint">${hint}</p>` : '<span></span>'}
          ${maxlength ? `<p class="input-hint" id="${inputId}-count">0 / ${maxlength}</p>` : ''}
        </div>
        ${hasError ? `<p class="input-error-msg" role="alert"><i class="ti ti-alert-circle" style="font-size:12px"></i> ${error}</p>` : ''}
      </div>
    `;
  }

  /* Select */
  function select({
    id = '',
    label = '',
    options = [],   /* [{ value, label, selected }] */
    hint = '',
    error = '',
    required = false,
  } = {}) {
    const hasError = !!error;
    const selectId = id || `sel-${Math.random().toString(36).slice(2, 7)}`;

    return `
      <div class="input-wrap">
        ${label ? `
          <label class="input-label" for="${selectId}">
            ${label}${required ? ' <span style="color:var(--red)">*</span>' : ''}
          </label>
        ` : ''}
        <div class="select-wrap">
          <select class="select${hasError ? ' error' : ''}" id="${selectId}" ${required ? 'required' : ''}>
            ${options.map(o => `
              <option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}</option>
            `).join('')}
          </select>
        </div>
        ${hint && !hasError ? `<p class="input-hint">${hint}</p>` : ''}
        ${hasError ? `<p class="input-error-msg" role="alert"><i class="ti ti-alert-circle" style="font-size:12px"></i> ${error}</p>` : ''}
      </div>
    `;
  }

  /* Toggle */
  function toggle({ id = '', label = '', sub = '', checked = false } = {}) {
    const toggleId = id || `tog-${Math.random().toString(36).slice(2, 7)}`;
    return `
      <div class="toggle-wrap">
        <div class="flex-1">
          <label class="toggle-label" for="${toggleId}">${label}</label>
          ${sub ? `<p class="toggle-sub">${sub}</p>` : ''}
        </div>
        <label class="toggle">
          <input type="checkbox" id="${toggleId}" ${checked ? 'checked' : ''}>
          <span class="toggle-track"></span>
        </label>
      </div>
    `;
  }


  /* ════════════════════════════════════════════
     FEEDBACK & ÉTATS
     ════════════════════════════════════════════ */

  /* État vide (empty state) */
  function empty({ icon = 'mood-empty', title = 'Rien ici', sub = '', action = null, color = '' } = {}) {
    return `
      <div class="empty-state">
        <div class="empty-icon${color ? ' ' + color : ''}">
          <i class="ti ti-${icon}" aria-hidden="true"></i>
        </div>
        <p class="empty-title">${title}</p>
        ${sub ? `<p class="empty-sub">${sub}</p>` : ''}
        ${action ? `<div style="margin-top:var(--space-md)">${btn(action)}</div>` : ''}
      </div>
    `;
  }

  /* Loader plein écran */
  function screenLoader(label = 'Chargement…') {
    return `
      <div class="screen-loader" role="status" aria-live="polite">
        <div class="loader-ring" aria-hidden="true"></div>
        <p class="loader-label">${label}</p>
      </div>
    `;
  }

  /* Trois points pulsants */
  function pulseDots() {
    return `
      <div class="pulse-dots" aria-hidden="true">
        <div class="pulse-dot"></div>
        <div class="pulse-dot"></div>
        <div class="pulse-dot"></div>
      </div>
    `;
  }

  /* État erreur réseau */
  function errorState({ title = 'Erreur', sub = 'Vérifiez votre connexion', onRetry = null } = {}) {
    return `
      <div class="error-state" role="alert">
        <div class="error-icon"><i class="ti ti-wifi-off" aria-hidden="true"></i></div>
        <p class="error-title">${title}</p>
        <p class="error-sub">${sub}</p>
        ${onRetry ? `<div style="margin-top:var(--space-md)">${btn({ label: 'Réessayer', icon: 'refresh', variant: 'secondary', id: 'btn-retry' })}</div>` : ''}
      </div>
    `;
  }

  /* Skeleton ligne */
  function skeletonLine(width = '100%', height = '14px') {
    return `<div class="skeleton skeleton-text" style="width:${width};height:${height};margin-bottom:8px"></div>`;
  }

  /* Skeleton card signalement */
  function skeletonCard() {
    return `
      <div class="skeleton-report-card">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <div class="skeleton skeleton-thumb" style="width:32px;height:32px"></div>
          <div style="flex:1">
            ${skeletonLine('55%', '13px')}
            ${skeletonLine('35%', '10px')}
          </div>
          <div class="skeleton" style="width:64px;height:20px;border-radius:100px"></div>
        </div>
        ${skeletonLine('92%', '13px')}
        ${skeletonLine('68%', '13px')}
        <div style="display:flex;justify-content:space-between;margin-top:10px">
          ${skeletonLine('38%', '11px')}
          ${skeletonLine('24%', '11px')}
        </div>
      </div>
    `;
  }

  /* Skeleton liste de cards (n fois) */
  function skeletonList(n = 3) {
    return Array.from({ length: n }, () => skeletonCard()).join('');
  }

  /* Skeleton carte home */
  function skeletonMap() {
    return `
      <div class="skeleton-map" style="height:200px;margin-bottom:var(--space-md)">
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:8px">
          <i class="ti ti-map-2" style="font-size:32px;color:var(--text-dim)" aria-hidden="true"></i>
          <span style="font-size:12px;color:var(--text-dim)">Chargement de la carte…</span>
        </div>
      </div>
    `;
  }

  /* Skeleton KPI card (dashboard) */
  function skeletonKPI() {
    return `
      <div class="skeleton-kpi">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px">
          ${skeletonLine('40%', '11px')}
          <div class="skeleton" style="width:32px;height:32px;border-radius:var(--radius-sm)"></div>
        </div>
        <div class="skeleton skeleton-title" style="width:60%;margin-bottom:8px"></div>
        ${skeletonLine('50%', '11px')}
      </div>
    `;
  }

  /* Skeleton profil utilisateur */
  function skeletonProfile() {
    return `
      <div class="card" style="display:flex;align-items:center;gap:var(--space-md);margin-bottom:var(--space-md)">
        <div class="skeleton skeleton-avatar" style="width:56px;height:56px;flex-shrink:0"></div>
        <div style="flex:1">
          ${skeletonLine('50%', '16px')}
          ${skeletonLine('70%', '12px')}
        </div>
      </div>
    `;
  }

  /* Bannière alerte inline */
  function alert({ type = 'info', message = '', icon = null } = {}) {
    const cfg = {
      info:    { color: 'var(--blue)',   bg: 'var(--blue-dim)',   border: 'var(--blue-border)',   icon: 'info-circle' },
      success: { color: 'var(--teal)',   bg: 'var(--teal-dim)',   border: 'var(--teal-border)',   icon: 'circle-check' },
      warning: { color: 'var(--orange)', bg: 'var(--orange-dim)', border: 'var(--orange-border)', icon: 'alert-triangle' },
      error:   { color: 'var(--red)',    bg: 'var(--red-dim)',    border: 'var(--red-border)',    icon: 'circle-x' },
    };
    const c = cfg[type] || cfg.info;
    return `
      <div class="alert-banner" role="alert" style="background:${c.bg};border:1px solid ${c.border};border-radius:var(--radius-sm);padding:var(--space-sm) var(--space-md);display:flex;align-items:flex-start;gap:10px">
        <i class="ti ti-${icon || c.icon}" style="color:${c.color};font-size:18px;flex-shrink:0;margin-top:1px" aria-hidden="true"></i>
        <p style="color:${c.color};font-size:var(--text-sm);line-height:1.5">${message}</p>
      </div>
    `;
  }

  /* Indicateur réseau offline */
  function offlineBanner() {
    return `
      <div class="offline-banner" id="offline-banner" style="display:none" role="status">
        <i class="ti ti-wifi-off" aria-hidden="true"></i>
        <span>Hors ligne — les signalements seront envoyés dès reconnexion</span>
      </div>
    `;
  }


  /* ════════════════════════════════════════════
     CARDS COMPOSITES
     ════════════════════════════════════════════ */

  /* Card signalement (liste) */
  function reportCard({ id, category, location, status, time, votes, urgent = false, description = '' } = {}) {
    const statusCfg = {
      new:      { label: 'Nouveau',   cls: 'status-new' },
      progress: { label: 'En cours',  cls: 'status-progress' },
      done:     { label: 'Résolu',    cls: 'status-done' },
      rejected: { label: 'Rejeté',   cls: 'status-rejected' },
      urgent:   { label: 'Urgent',    cls: 'status-urgent' },
    };
    const catCfg = {
      roads:    { icon: 'road',                label: 'Voirie',    cls: 'cat-roads' },
      water:    { icon: 'droplet',             label: 'Eau',       cls: 'cat-water' },
      waste:    { icon: 'trash',               label: 'Déchets',   cls: 'cat-waste' },
      light:    { icon: 'bulb',                label: 'Éclairage', cls: 'cat-light' },
      flood:    { icon: 'ripple',              label: 'Inondation',cls: 'cat-flood' },
      health:   { icon: 'heart-rate-monitor', label: 'Santé',     cls: 'cat-health' },
      security: { icon: 'shield',              label: 'Sécurité',  cls: 'cat-security' },
      other:    { icon: 'dots',                label: 'Autre',     cls: 'cat-other' },
    };
    const s = statusCfg[status] || statusCfg.new;
    const cat = catCfg[category] || catCfg.other;

    return `
      <div class="card card-hover report-card${urgent ? ' card-urgent' : ''}" data-report-id="${id}" data-status="${status}" style="margin-bottom:var(--space-sm);cursor:pointer" role="button" tabindex="0" aria-label="${s.label} : ${cat.label}${description ? ` — ${description.slice(0,60)}` : ''}">
        <div class="flex-between mb-sm">
          <div class="flex items-center flex-gap-sm">
            <div class="cat-item ${cat.cls}" style="padding:6px;border-radius:var(--radius-sm);width:32px;height:32px;min-width:32px">
              <div class="cat-icon" style="width:20px;height:20px;font-size:14px;border-radius:4px">
                <i class="ti ti-${cat.icon}" aria-hidden="true"></i>
              </div>
            </div>
            <span class="micro">${cat.label}</span>
          </div>
          <span class="badge ${s.cls}">${urgent ? '<i class="ti ti-alert-triangle" style="font-size:10px"></i> ' : ''}${s.label}</span>
        </div>
        ${description ? `<p class="body truncate" style="margin-bottom:6px">${description}</p>` : ''}
        <div class="flex-between">
          <div class="flex items-center flex-gap-sm">
            <i class="ti ti-map-pin" style="font-size:13px;color:var(--text-dim)" aria-hidden="true"></i>
            <span class="micro">${location}</span>
          </div>
          <div class="flex items-center flex-gap-sm">
            <i class="ti ti-arrow-up" style="font-size:13px;color:var(--text-dim)" aria-hidden="true"></i>
            <span class="micro">${votes}</span>
            <span class="micro" style="color:var(--text-dim)">·</span>
            <span class="micro">${time}</span>
          </div>
        </div>
        <button class="report-card-share" data-share-report="${id}" aria-label="Partager ce signalement" style="position:absolute;top:8px;right:8px;background:none;border:none;color:var(--text-dim);cursor:pointer;padding:6px;font-size:14px;opacity:0;transition:opacity .15s" onmouseover="this.style.opacity='1'" onmouseleave="this.style.opacity='0'" onclick="event.stopPropagation()">
          <i class="ti ti-share" aria-hidden="true"></i>
        </button>
      </div>
    `;
  }

  /* KPI card (dashboard) */
  function kpiCard({ label, value, sub = '', icon, color = 'var(--lime)', trend = null } = {}) {
    const trendIcon = trend > 0 ? 'trending-up' : trend < 0 ? 'trending-down' : null;
    const trendColor = trend > 0 ? 'var(--teal)' : 'var(--red)';
    return `
      <div class="card kpi-card">
        <div class="flex-between mb-sm">
          <span class="micro">${label}</span>
          <div style="width:32px;height:32px;border-radius:var(--radius-sm);background:${color}22;display:flex;align-items:center;justify-content:center">
            <i class="ti ti-${icon}" style="color:${color};font-size:16px" aria-hidden="true"></i>
          </div>
        </div>
        <p style="font-family:var(--font-display);font-size:36px;color:var(--text);line-height:1">${value}</p>
        <div class="flex items-center flex-gap-sm mt-sm">
          ${trendIcon ? `<i class="ti ti-${trendIcon}" style="color:${trendColor};font-size:13px" aria-hidden="true"></i>` : ''}
          <span class="micro">${sub}</span>
        </div>
      </div>
    `;
  }


  /* ════════════════════════════════════════════
     BIND HELPERS
     appelés depuis App.bind() après render()
     ════════════════════════════════════════════ */

  /* Compteur de caractères pour les textareas */
  function bindCharCount(textareaId) {
    const ta = document.getElementById(textareaId);
    const counter = document.getElementById(`${textareaId}-count`);
    if (!ta || !counter) return;
    const max = ta.getAttribute('maxlength') || 500;
    const update = () => { counter.textContent = `${ta.value.length} / ${max}`; };
    ta.addEventListener('input', update);
    update();
  }

  /* Validation input en temps réel */
  function bindValidation(inputId, validatorFn) {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.addEventListener('blur', () => {
      const errorMsg = validatorFn(el.value);
      const errEl = el.closest('.input-wrap')?.querySelector('.input-error-msg');
      if (errorMsg) {
        el.classList.add('error');
        if (!errEl) {
          const p = document.createElement('p');
          p.className = 'input-error-msg';
          p.setAttribute('role', 'alert');
          p.innerHTML = `<i class="ti ti-alert-circle" style="font-size:12px"></i> ${errorMsg}`;
          el.closest('.input-wrap').appendChild(p);
        }
      } else {
        el.classList.remove('error');
        if (errEl) errEl.remove();
      }
    });
  }

  /* Bouton loading state */
  function setLoading(btnId, loading = true) {
    const el = document.getElementById(btnId);
    if (!el) return;
    if (loading) {
      el.disabled = true;
      el.setAttribute('aria-busy', 'true');
      el.classList.add('btn-loading');
      const spinner = document.createElement('span');
      spinner.className = 'btn-spinner';
      el.prepend(spinner);
    } else {
      el.disabled = false;
      el.removeAttribute('aria-busy');
      el.classList.remove('btn-loading');
      el.querySelector('.btn-spinner')?.remove();
    }
  }

  /* Bandeau offline */
  function bindOfflineBanner() {
    const banner = document.getElementById('offline-banner');
    if (!banner) return;
    const update = () => { banner.style.display = navigator.onLine ? 'none' : 'flex'; };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
  }

  /* Clic sur une report-card → naviguer vers le détail
     Les cards .report-card-pending (en attente d'envoi) sont ignorées */
  function bindReportCards() {
    document.querySelectorAll('.report-card:not(.report-card-pending)').forEach(card => {
      const _open = () => {
        const id = card.dataset.reportId;
        State.go({ selectedReport: id });
        Router.push('rapport', [id]);
      };
      card.addEventListener('click', _open);
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          _open();
        }
      });
    });
  }


  /* ════════════════════════════════════════════
     VALIDATORS
     ════════════════════════════════════════════ */

  const Validators = {
    required: v => v.trim() ? '' : 'Ce champ est obligatoire',
    phone: v => /^(\+229|00229)?[0-9]{8}$/.test(v.replace(/\s/g, ''))
      ? '' : 'Numéro béninois invalide (ex: 97123456)',
    minLength: n => v => v.trim().length >= n ? '' : `Minimum ${n} caractères`,
    maxLength: n => v => v.trim().length <= n ? '' : `Maximum ${n} caractères`,
  };


  function receiptCard({ ref, amount, method, date, description } = {}) {
    const dateStr = date ? new Date(date).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' }) : '';
    const methodLabels = { mtn_money: 'MTN MoMo', moov_money: 'Moov Money', card: 'Carte bancaire' };
    return `
      <div class="card receipt-card">
        <div class="flex-between mb-xs">
          <span class="micro" style="color:var(--text-dim)">${dateStr}</span>
          <span class="badge badge-teal" style="font-size:10px">Payé</span>
        </div>
        <div class="flex-between">
          <div class="min-w-0 flex-1">
            <p class="body truncate">${description || 'Paiement'}</p>
            <p class="micro" style="color:var(--text-muted)">${ref} · ${methodLabels[method] || method || '—'}</p>
          </div>
          <p style="font-family:var(--font-display);color:var(--lime);white-space:nowrap;margin-left:var(--space-sm)">
            ${(amount || 0).toLocaleString()} <span class="micro" style="color:var(--text-dim)">FCFA</span>
          </p>
        </div>
      </div>
    `;
  }

  /* API publique */
  return {
    btn, iconBtn, btnGroup,
    input, textarea, select, toggle,
    empty, screenLoader, pulseDots, errorState,
    skeletonLine, skeletonCard, skeletonList, skeletonMap, skeletonKPI, skeletonProfile,
    alert, offlineBanner,
    reportCard, kpiCard, receiptCard,
    bindCharCount, bindValidation, setLoading, bindOfflineBanner, bindReportCards,
    Validators,
  };

})();

window.UI = UI;
