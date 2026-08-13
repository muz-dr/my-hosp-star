/**
 * Malaysia Hospital Compare — Core Application
 * app.js — Shared utilities, data management, components
 */

'use strict';

/* ============================================================
   CONFIG
   ============================================================ */
const APP_CONFIG = {
  DATA_URL: '../data/hospitals.json',  // relative to pages/
  DATA_URL_ROOT: './data/hospitals.json', // relative to root index.html
  MAX_COMPARE: 4,
  DEFAULT_SORT: 'name_az',
  MAP_CENTER: [4.2105, 108.9758], // Malaysia center
  MAP_ZOOM: 6,
  SCORING: {
    hpia:    0.50,
    casemix: 0.10,
    cluster: 0.25,
    mypsq:   0.15
  }
};

/* ============================================================
   DATA STORE — single source of truth
   ============================================================ */
const DataStore = {
  hospitals: [],
  meta: {},
  scoringConfig: {},
  loaded: false,
  compareList: [],

  async load(urlOverride) {
    if (this.loaded) return this;

    const cfg     = window.SITE_CONFIG || {};
    const sheetId = cfg.GOOGLE_SHEET_ID || '';
    const isConfigured = sheetId && sheetId !== 'YOUR_SHEET_ID_HERE';

    // ── Path A: Live Google Sheets (gviz) ──────────────────
    if (isConfigured && window.SheetsLoader) {
      try {
        console.log('[DataStore] Loading from Google Sheets…');
        const result = await window.SheetsLoader.load(sheetId, {
          tabMain:          cfg.SHEET_TABS?.hospitals         || 'hospitals',
          tabTrend:         cfg.SHEET_TABS?.mypsq_trend       || 'mypsq_trend',
          tabHpia:          cfg.SHEET_TABS?.hpia_indicators   || 'hpia_indicators',
          tabClisqi:        cfg.SHEET_TABS?.clisqi_indicators || 'clisqi_indicators',
        });
        this.hospitals = result.hospitals;
        this.meta      = result.meta;
        this.loaded    = true;
        console.log(`[DataStore] ✅ ${this.hospitals.length} hospitals from Google Sheets`);
        return this;
      } catch (err) {
        console.error('[DataStore] Google Sheets failed — trying JSON fallback…', err);
        // Fall through to JSON fallback
      }
    }

    // ── Path B: Static JSON fallback ───────────────────────
    const isInPages = window.location.pathname.includes('/pages/');
    const jsonUrl   = urlOverride
      || (isInPages ? cfg.FALLBACK_JSON     || '../data/hospitals.json'
                    : cfg.FALLBACK_JSON_ROOT || './data/hospitals.json');

    try {
      console.log(`[DataStore] Loading from JSON: ${jsonUrl}`);
      const res  = await fetch(jsonUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.hospitals    = data.hospitals    || [];
      this.meta         = data.meta         || {};
      this.scoringConfig = data.scoring_config || {};
      this.loaded       = true;
      console.log(`[DataStore] ✅ ${this.hospitals.length} hospitals from JSON`);
    } catch (err) {
      console.error('[DataStore] JSON fallback also failed:', err);
      throw new Error(
        'Could not load hospital data.\n' +
        (isConfigured
          ? 'Check your Google Sheet ID and sharing settings in assets/js/config.js'
          : 'Set your GOOGLE_SHEET_ID in assets/js/config.js, or make sure data/hospitals.json exists.')
      );
    }
    return this;
  },

  getAll() { return this.hospitals; },

  getById(id) { return this.hospitals.find(h => h.hospital_id === id); },

  getStates() {
    return [...new Set(this.hospitals.map(h => h.state))].sort();
  },

  getClusters() {
    return [...new Set(this.hospitals.map(h => h.cluster_name).filter(Boolean))].sort();
  },

  getTypes() {
    return [...new Set(this.hospitals.map(h => h.hospital_type).filter(Boolean))].sort();
  },

  // Stats for hero section
  getStats() {
    return {
      total: this.hospitals.length,
      states: this.getStates().length,
      clusters: this.getClusters().length,
      withRating: this.hospitals.filter(h => h.quality?.overall_star_rating != null).length,
    };
  },

  // Compare list management
  addToCompare(id) {
    if (this.compareList.includes(id)) return false;
    if (this.compareList.length >= APP_CONFIG.MAX_COMPARE) return false;
    this.compareList.push(id);
    this._saveCompare();
    return true;
  },

  removeFromCompare(id) {
    this.compareList = this.compareList.filter(i => i !== id);
    this._saveCompare();
  },

  clearCompare() {
    this.compareList = [];
    this._saveCompare();
  },

  inCompare(id) { return this.compareList.includes(id); },

  _saveCompare() {
    try { sessionStorage.setItem('kkm_compare', JSON.stringify(this.compareList)); } catch(e) {}
  },

  _loadCompare() {
    try {
      const saved = sessionStorage.getItem('kkm_compare');
      if (saved) this.compareList = JSON.parse(saved);
    } catch(e) {}
  }
};

DataStore._loadCompare();


/* ============================================================
   STAR RATING RENDERER
   ============================================================ */
const StarRating = {
  /**
   * Render star rating HTML
   * @param {number|null} score  — the raw score (e.g. 4.6)
   * @param {number|null} stars  — star rating (1–5, supports 0.5 steps)
   * @param {Object} opts        — { size: 'sm'|'md'|'lg', showScore: bool, label: string }
   */
  render(score, stars, opts = {}) {
    const { size = 'md', showScore = true, maxStars = 5 } = opts;

    if (stars == null && score == null) {
      return `<span class="text-muted" style="font-size:var(--text-sm)">Not rated</span>`;
    }

    const displayStars = stars ?? Math.round(score * 2) / 2;
    const displayScore = score ?? stars;

    const starsHtml = this._buildStars(displayStars, maxStars);
    const sizeClass = size === 'lg' ? 'star-rating-lg' : '';

    const scoreHtml = showScore
      ? `<span class="star-score">${Utils.formatScore(displayScore)}</span>
         <span class="star-max">/ ${maxStars}</span>`
      : '';

    return `
      <div class="star-rating ${sizeClass}" 
           role="img" 
           aria-label="${displayScore} out of ${maxStars} stars">
        <div class="stars" aria-hidden="true">${starsHtml}</div>
        ${scoreHtml}
      </div>`;
  },

  _buildStars(rating, max) {
    let html = '';
    for (let i = 1; i <= max; i++) {
      if (rating >= i) {
        html += `<span class="star full" aria-hidden="true">★</span>`;
      } else if (rating >= i - 0.5) {
        // Half star using CSS clip trick
        html += `<span class="star half" aria-hidden="true" style="
          background: linear-gradient(90deg, #f59e0b 50%, var(--grey-300) 50%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;">★</span>`;
      } else {
        html += `<span class="star empty" aria-hidden="true">★</span>`;
      }
    }
    return html;
  }
};


/* ============================================================
   DATA STATUS RENDERER
   ============================================================ */
const DataStatus = {
  LABELS: {
    available:      'Available',
    not_available:  'Not available',
    not_reported:   'Not reported',
    not_applicable: 'Not applicable',
    suppressed:     'Suppressed',
    pending:        'Pending',
    estimated:      'Estimated'
  },

  render(status) {
    const label = this.LABELS[status] || 'Unknown';
    return `<span class="data-status ${status}">${label}</span>`;
  },

  renderScore(value, status, unit = '') {
    if (value != null) {
      return `<strong>${Utils.formatScore(value)}${unit}</strong>`;
    }
    return `<span class="text-muted" style="font-size:var(--text-sm)">${this.LABELS[status] || 'Data not available'}</span>`;
  }
};


/* ============================================================
   UTILS
   ============================================================ */
const Utils = {
  formatScore(val, decimals = 1) {
    if (val == null) return '—';
    return Number(val).toFixed(decimals);
  },

  formatPct(val) {
    if (val == null) return '—';
    return `${Math.round(val)}%`;
  },

  formatDistance(km) {
    if (km == null) return null;
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  },

  slugify(str) {
    return str.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = this._toRad(lat2 - lat1);
    const dLng = this._toRad(lng2 - lng1);
    const a = Math.sin(dLat/2)**2 +
              Math.cos(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) *
              Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  },

  _toRad(deg) { return deg * Math.PI / 180; },

  // Sort hospitals by various criteria
  sortHospitals(hospitals, sortKey, userLat, userLng) {
    return [...hospitals].sort((a, b) => {
      switch (sortKey) {
        case 'closest':
          if (userLat == null) return 0;
          return (a._distance ?? 999) - (b._distance ?? 999);
        case 'rating_desc':
          return (b.quality?.overall_score ?? -1) - (a.quality?.overall_score ?? -1);
        case 'satisfaction_desc':
          return (b.quality?.mypsq?.overall_satisfaction_pct ?? -1) -
                 (a.quality?.mypsq?.overall_satisfaction_pct ?? -1);
        case 'hpia_desc':
          return (b.quality?.hpia?.score ?? -1) - (a.quality?.hpia?.score ?? -1);
        case 'clisqi_desc':
          return (b.quality?.clisqi?.score ?? -1) - (a.quality?.clisqi?.score ?? -1);
        case 'cluster_desc':
          return (b.quality?.cluster?.score ?? -1) - (a.quality?.cluster?.score ?? -1);
        case 'casemix_desc':
          return (b.quality?.casemix?.score ?? -1) - (a.quality?.casemix?.score ?? -1);
        case 'name_az':
        default:
          return a.hospital_name.localeCompare(b.hospital_name);
      }
    });
  },

  // Fuzzy search
  searchHospitals(hospitals, query) {
    if (!query || query.trim().length < 2) return hospitals;
    const q = query.toLowerCase().trim();
    return hospitals.filter(h => {
      return h.hospital_name.toLowerCase().includes(q) ||
             h.state.toLowerCase().includes(q) ||
             h.district?.toLowerCase().includes(q) ||
             h.town?.toLowerCase().includes(q) ||
             h.postcode?.includes(q) ||
             h.cluster_name?.toLowerCase().includes(q) ||
             h.hospital_type?.toLowerCase().includes(q);
    });
  },

  // Filter hospitals by active filters
  filterHospitals(hospitals, filters) {
    return hospitals.filter(h => {
      if (filters.states?.length && !filters.states.includes(h.state)) return false;
      if (filters.types?.length && !filters.types.includes(h.hospital_type)) return false;
      if (filters.clusters?.length && !filters.clusters.includes(h.cluster_name)) return false;
      if (filters.specialist != null && h.specialist_status !== filters.specialist) return false;
      if (filters.clusterRole && h.cluster_role?.toLowerCase() !== filters.clusterRole.toLowerCase()) return false;
      if (filters.minRating != null && (h.quality?.overall_score ?? 0) < filters.minRating) return false;
      if (filters.maxDistance != null && h._distance != null && h._distance > filters.maxDistance) return false;
      return true;
    });
  },

  // Add distance to each hospital
  addDistances(hospitals, lat, lng) {
    return hospitals.map(h => ({
      ...h,
      _distance: (h.latitude && h.longitude)
        ? this.haversineKm(lat, lng, h.latitude, h.longitude)
        : null
    }));
  },

  // Decode URL search params for shareable state
  getUrlParams() {
    return Object.fromEntries(new URLSearchParams(window.location.search));
  },

  setUrlParams(params, replace = false) {
    const url = new URL(window.location);
    Object.entries(params).forEach(([k, v]) => {
      if (v == null || v === '') url.searchParams.delete(k);
      else url.searchParams.set(k, v);
    });
    if (replace) window.history.replaceState({}, '', url);
    else window.history.pushState({}, '', url);
  },

  // Show toast notification
  toast(message, type = 'info', duration = 3000) {
    let container = document.querySelector('.notification');
    if (!container) {
      container = document.createElement('div');
      container.className = 'notification';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  }
};


/* ============================================================
   HOSPITAL CARD RENDERER
   ============================================================ */
const HospitalCard = {
  render(hospital, opts = {}) {
    const { showDistance = true, showCompareBtn = true } = opts;
    const q = hospital.quality || {};
    const mypsq = q.mypsq || {};
    const hpia  = q.hpia  || {};
    const clisqi = q.clisqi || {};
    const cluster = q.cluster || {};
    const casemix = q.casemix || {};

    const distanceHtml = showDistance && hospital._distance != null
      ? `<span class="distance-tag">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
           </svg>
           ${Utils.formatDistance(hospital._distance)} away
         </span>`
      : '';

    const satisfactionHtml = mypsq.status === 'available' && mypsq.overall_satisfaction_pct != null
      ? `<div class="satisfaction-bar-wrap">
           <div class="satisfaction-bar-label">
             <span class="satisfaction-bar-label-text">Patient Satisfaction</span>
             <span class="satisfaction-bar-label-pct">${Utils.formatPct(mypsq.overall_satisfaction_pct)}</span>
           </div>
           <div class="satisfaction-bar" role="progressbar" 
                aria-valuenow="${mypsq.overall_satisfaction_pct}" aria-valuemin="0" aria-valuemax="100">
             <div class="satisfaction-bar-fill" style="width:${mypsq.overall_satisfaction_pct}%"></div>
           </div>
         </div>`
      : '';

    const inCompare = DataStore.inCompare(hospital.hospital_id);
    const compareLabel = inCompare ? '✓ Added' : '+ Compare';

    return `
      <article class="hospital-card" 
               data-id="${hospital.hospital_id}"
               aria-label="${hospital.hospital_name}">
        
        <div class="hospital-card-header">
          <h3 class="hospital-card-name">
            <a href="hospital.html?id=${hospital.hospital_id}">
              ${hospital.hospital_name}
            </a>
          </h3>
          <div class="hospital-card-badges">
            ${hospital.hospital_type ? `<span class="badge badge-type">${hospital.hospital_type}</span>` : ''}
            ${hospital.specialist_status ? `<span class="badge badge-specialist">Specialist</span>` : ''}
            ${hospital.cluster_role === 'Lead' ? `<span class="badge badge-lead">Lead Hospital</span>` : ''}
          </div>
        </div>

        <div class="hospital-card-location">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          ${hospital.town || hospital.district || ''}, ${hospital.state}
          ${hospital.cluster_name ? `· ${hospital.cluster_name}` : ''}
        </div>

        <div class="hospital-card-rating">
          ${StarRating.render(q.overall_score, q.overall_star_rating)}
          <span class="rating-label">Overall Quality</span>
        </div>

        ${satisfactionHtml}

        <div class="quality-grid">
          ${this._qualityPill('HPIA', hpia.score, hpia.status)}
          ${this._qualityPill('CliSQI', clisqi.score, clisqi.status)}
          ${this._qualityPill('Cluster', cluster.score, cluster.status)}
          ${this._qualityPill('MyPSQ', mypsq.score, mypsq.status)}
          ${this._qualityPill('Casemix', casemix.score, casemix.status)}
        </div>

        <div class="hospital-card-footer">
          ${distanceHtml}
          <div class="card-actions">
            <a href="hospital.html?id=${hospital.hospital_id}" 
               class="btn btn-primary btn-sm">View Hospital</a>
            ${showCompareBtn ? `
            <button class="btn btn-compare btn-sm ${inCompare ? 'selected' : ''}"
                    onclick="toggleCompare('${hospital.hospital_id}', event)"
                    aria-label="${inCompare ? 'Remove from comparison' : 'Add to comparison'}"
                    aria-pressed="${inCompare}">
              ${compareLabel}
            </button>` : ''}
          </div>
        </div>
      </article>`;
  },

  _qualityPill(label, score, status) {
    const valueHtml = score != null
      ? `<div class="quality-pill-value">${Utils.formatScore(score)}</div>`
      : `<div class="quality-pill-value na">${DataStatus.LABELS[status] || 'N/A'}</div>`;
    return `
      <div class="quality-pill" data-tooltip="${label}">
        <div class="quality-pill-label">${label}</div>
        ${valueHtml}
      </div>`;
  }
};


/* ============================================================
   COMPARE TRAY
   ============================================================ */
const CompareTray = {
  el: null,

  init() {
    this.el = document.getElementById('compare-tray');
    if (!this.el) return;
    this.render();
  },

  render() {
    if (!this.el) return;
    const list = DataStore.compareList;

    if (list.length === 0) {
      this.el.classList.remove('visible');
      return;
    }

    this.el.classList.add('visible');

    const slots = [];
    for (let i = 0; i < APP_CONFIG.MAX_COMPARE; i++) {
      if (i < list.length) {
        const h = DataStore.getById(list[i]);
        slots.push(`
          <div class="compare-tray-hospital">
            <span>${h ? h.hospital_name : list[i]}</span>
            <button class="compare-tray-remove" 
                    onclick="removeCompare('${list[i]}')"
                    aria-label="Remove ${h?.hospital_name || list[i]} from comparison">×</button>
          </div>`);
      } else {
        slots.push(`<div class="compare-tray-slot">Add hospital ${i + 1}</div>`);
      }
    }

    this.el.innerHTML = `
      <div class="compare-tray-inner">
        <span class="compare-tray-title">Compare (${list.length})</span>
        <div class="compare-tray-hospitals">${slots.join('')}</div>
        <div style="display:flex;gap:var(--space-2)">
          <button class="btn btn-ghost btn-sm" onclick="clearCompare()">Clear all</button>
          <a href="compare.html?ids=${list.join(',')}" class="btn btn-primary btn-sm">Compare Hospitals →</a>
        </div>
      </div>`;
  }
};


/* ============================================================
   GLOBAL COMPARE HANDLERS (called from card HTML)
   ============================================================ */
window.toggleCompare = function(id, e) {
  e?.stopPropagation();
  if (DataStore.inCompare(id)) {
    DataStore.removeFromCompare(id);
  } else {
    const added = DataStore.addToCompare(id);
    if (!added) {
      Utils.toast(`You can compare up to ${APP_CONFIG.MAX_COMPARE} hospitals at a time.`, 'warning');
      return;
    }
    const h = DataStore.getById(id);
    Utils.toast(`${h?.hospital_name || id} added to comparison`);
  }
  // Refresh compare button state in DOM
  document.querySelectorAll(`[data-id="${id}"] .btn-compare`).forEach(btn => {
    const inCompare = DataStore.inCompare(id);
    btn.textContent = inCompare ? '✓ Added' : '+ Compare';
    btn.classList.toggle('selected', inCompare);
    btn.setAttribute('aria-pressed', inCompare);
  });
  CompareTray.render();
};

window.removeCompare = function(id) {
  DataStore.removeFromCompare(id);
  CompareTray.render();
  document.querySelectorAll(`[data-id="${id}"] .btn-compare`).forEach(btn => {
    btn.textContent = '+ Compare';
    btn.classList.remove('selected');
    btn.setAttribute('aria-pressed', 'false');
  });
};

window.clearCompare = function() {
  DataStore.clearCompare();
  CompareTray.render();
  document.querySelectorAll('.btn-compare.selected').forEach(btn => {
    btn.textContent = '+ Compare';
    btn.classList.remove('selected');
    btn.setAttribute('aria-pressed', 'false');
  });
};


/* ============================================================
   GEOLOCATION HELPER
   ============================================================ */
const GeoHelper = {
  userLat: null,
  userLng: null,

  requestLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => {
          this.userLat = pos.coords.latitude;
          this.userLng = pos.coords.longitude;
          resolve({ lat: this.userLat, lng: this.userLng });
        },
        err => reject(err),
        { timeout: 10000 }
      );
    });
  }
};


/* ============================================================
   SKELETON LOADER
   ============================================================ */
const Skeleton = {
  card() {
    return `
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-line" style="width:50%"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-sub"></div>
      </div>`;
  },

  cards(n = 6) {
    return Array(n).fill(0).map(() => this.card()).join('');
  }
};


/* ============================================================
   MOBILE NAV
   ============================================================ */
function initMobileNav() {
  const btn = document.querySelector('.mobile-menu-btn');
  const nav = document.querySelector('.site-nav');
  if (!btn || !nav) return;
  btn.addEventListener('click', () => {
    const open = nav.style.display === 'flex';
    nav.style.display = open ? 'none' : 'flex';
    nav.style.flexDirection = 'column';
    nav.style.position = 'absolute';
    nav.style.top = '64px';
    nav.style.left = '0'; nav.style.right = '0';
    nav.style.background = 'white';
    nav.style.padding = '1rem';
    nav.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
    btn.setAttribute('aria-expanded', !open);
  });
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  CompareTray.init();
});

// Export for use in page-specific scripts
window.AppConfig   = APP_CONFIG;
window.DataStore   = DataStore;
window.StarRating  = StarRating;
window.DataStatus  = DataStatus;
window.Utils       = Utils;
window.HospitalCard = HospitalCard;
window.CompareTray  = CompareTray;
window.GeoHelper    = GeoHelper;
window.Skeleton     = Skeleton;
