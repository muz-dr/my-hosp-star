/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  HOSPITAL COMPARE MALAYSIA — Google Sheets Live Data Layer  ║
 * ║                                                              ║
 * ║  Uses the gviz/tq technique to read directly from a public  ║
 * ║  Google Sheet — no API keys, no backend, no scripts.        ║
 * ║                                                              ║
 * ║  Every page load fetches fresh data from your sheet.        ║
 * ║  Update the sheet → refresh the page → data is updated.     ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

'use strict';

/* ============================================================
   GVIZ CORE — identical technique to your AMR system
   ============================================================ */

/**
 * Build the gviz URL for a given sheet tab.
 * The sheet must be shared as "Anyone with the link can view".
 */
function gvizURL(sheetId, tabName) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&headers=1&sheet=${encodeURIComponent(tabName)}`;
}

/**
 * Fetch one tab from Google Sheets via gviz.
 * Returns an array of plain objects keyed by column header.
 */
async function fetchSheetTab(sheetId, tabName) {
  const url = gvizURL(sheetId, tabName);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching tab "${tabName}"`);

  const txt = await res.text();

  // gviz wraps JSON in a callback — strip it exactly as in your AMR system
  const json = JSON.parse(txt.substring(txt.indexOf('{'), txt.lastIndexOf('}') + 1));

  if (!json.table || json.status === 'error') {
    throw new Error(`Tab "${tabName}" not found or sheet not shared publicly.`);
  }

  // Extract column headers
  const cols = json.table.cols.map(c => (c.label || c.id || '').trim());

  // Map each row to a plain object
  const rows = (json.table.rows || []).map(r => {
    const obj = {};
    (r.c || []).forEach((cell, i) => {
      // Prefer value (v), fall back to formatted string (f)
      obj[cols[i]] = cell ? (cell.v != null ? cell.v : (cell.f || null)) : null;
    });
    return obj;
  });

  // Drop completely empty rows
  return rows.filter(row => Object.values(row).some(v => v !== null && v !== ''));
}

/* ============================================================
   TYPE COERCERS
   ============================================================ */
function toFloat(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v).replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

function toInt(v) {
  if (v == null || v === '') return null;
  const n = parseInt(String(v).replace(/,/g, ''), 10);
  return isNaN(n) ? null : n;
}

function toBool(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim().toLowerCase();
  return ['yes', 'true', '1', 'ya', 'specialist'].includes(s);
}

function toList(v) {
  if (v == null || v === '') return [];
  return String(v).split(',').map(s => s.trim()).filter(Boolean);
}

function normaliseState(s) {
  if (!s) return null;
  const map = {
    'kl':                   'Kuala Lumpur',
    'w.p. kuala lumpur':    'Kuala Lumpur',
    'wp kuala lumpur':      'Kuala Lumpur',
    'wilayah persekutuan kuala lumpur': 'Kuala Lumpur',
    'w.p. putrajaya':       'Putrajaya',
    'wp putrajaya':         'Putrajaya',
    'w.p. labuan':          'Labuan',
    'wp labuan':            'Labuan',
    'n. sembilan':          'Negeri Sembilan',
    'negeri sembilan':      'Negeri Sembilan',
    'n9':                   'Negeri Sembilan',
    'p. pinang':            'Penang',
    'pulau pinang':         'Penang',
    'penang':               'Penang',
  };
  return map[s.trim().toLowerCase()] || s.trim();
}

const VALID_STATUSES = new Set([
  'available', 'not_available', 'not_reported',
  'not_applicable', 'suppressed', 'pending', 'estimated'
]);

function normaliseStatus(v) {
  if (v == null || v === '') return 'not_available';
  const s = String(v).trim().toLowerCase().replace(/\s+/g, '_');
  return VALID_STATUSES.has(s) ? s : 'not_available';
}

function generateId(name, state) {
  return ('H_' + name + '_' + state)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 40);
}

/* ============================================================
   ROW → NORMALIZED HOSPITAL
   Reads the COLUMN_MAP from config.js to support custom headers
   ============================================================ */

function mapColumn(row, sheetHeader) {
  // Direct lookup
  if (row[sheetHeader] !== undefined) return row[sheetHeader];
  // Case-insensitive fallback
  const lower = sheetHeader.toLowerCase();
  for (const key of Object.keys(row)) {
    if (key.toLowerCase() === lower) return row[key];
  }
  return null;
}

function get(row, fieldName) {
  // Find the sheet column that maps to this field name
  const map = window.SITE_CONFIG?.COLUMN_MAP || {};
  const sheetHeader = Object.keys(map).find(k => map[k] === fieldName);
  if (sheetHeader) {
    const val = mapColumn(row, sheetHeader);
    if (val !== undefined && val !== null && val !== '') return val;
  }
  // Also try fieldName directly (if headers match field names)
  const direct = mapColumn(row, fieldName);
  return direct ?? null;
}

function rowToHospital(row) {
  const g = (field) => get(row, field);

  // Generate or use provided hospital_id
  const name  = g('hospital_name') || g('hospital_id') || '';
  const state = g('state') || '';
  const id    = String(g('hospital_id') || generateId(name, state)).trim();

  // specialist_status: accept Yes/No, TRUE/FALSE, 1/0, or "Specialist"/"Non-Specialist"
  const specRaw = g('specialist_status');
  const specialistStatus = specRaw != null
    ? ['yes','true','1','ya','specialist'].includes(String(specRaw).trim().toLowerCase())
    : null;

  return {
    hospital_id:       id,
    hospital_name:     g('hospital_name'),
    official_name:     g('official_name') || g('hospital_name'),
    state:             normaliseState(state),
    district:          g('district'),
    town:              g('town'),
    address:           g('address'),
    postcode:          String(g('postcode') || '').trim(),
    latitude:          toFloat(g('latitude')),
    longitude:         toFloat(g('longitude')),
    phone:             g('phone'),
    website:           g('website'),
    hospital_type:     g('hospital_type'),
    hospital_category: g('hospital_category'),
    specialist_status: specialistStatus,
    cluster_name:      g('cluster_name'),
    cluster_role:      g('cluster_role'),
    lead_hospital:     g('lead_hospital'),
    services:          toList(g('services')),
    bed_count:         toInt(g('bed_count')),
    data_year:         toInt(g('data_year')),
    last_updated:      g('last_updated'),

    quality: {
      overall_score:        toFloat(g('overall_score')),
      overall_star_rating:  toFloat(g('overall_star_rating')),

      hpia: {
        score:          toFloat(g('hpia_score')),
        star_rating:    toFloat(g('hpia_star_rating')),
        percentile:     toFloat(g('hpia_percentile')),
        reporting_year: toInt(g('hpia_year')),
        status:         normaliseStatus(g('hpia_status')),
        indicators:     [],
      },

      clisqi: {
        score:          toFloat(g('clisqi_score')),
        star_rating:    toFloat(g('clisqi_star_rating')),
        reporting_year: toInt(g('clisqi_year')),
        status:         normaliseStatus(g('clisqi_status')),
        indicators:     [],
      },

      cluster: {
        score:          toFloat(g('cluster_score')),
        star_rating:    toFloat(g('cluster_star_rating')),
        reporting_year: toInt(g('cluster_year')),
        status:         normaliseStatus(g('cluster_status')),
        indicators:     [],
      },

      mypsq: {
        score:                    toFloat(g('mypsq_score')),
        star_rating:              toFloat(g('mypsq_star_rating')),
        overall_satisfaction_pct: toFloat(g('mypsq_satisfaction_pct')),
        response_count:           toInt(g('mypsq_response_count')),
        survey_period:            g('mypsq_survey_period'),
        reporting_year:           toInt(g('mypsq_year')),
        status:                   normaliseStatus(g('mypsq_status')),
        trend:                    [],
        indicators:               [],
      },

      casemix: {
        score:          toFloat(g('casemix_score')),
        star_rating:    toFloat(g('casemix_star_rating')),
        case_mix_index: toFloat(g('casemix_cmi')),
        reporting_year: toInt(g('casemix_year')),
        status:         normaliseStatus(g('casemix_status')),
        indicators:     [],
      },
    },
  };
}

/* ============================================================
   MERGE OPTIONAL TABS
   ============================================================ */

function mergeTrendData(hospitals, trendRows) {
  const byId = Object.fromEntries(hospitals.map(h => [h.hospital_id, h]));
  for (const row of trendRows) {
    const id   = String(row['hospital_id'] || '').trim();
    const year = toInt(row['year']);
    if (!id || !year) continue;
    const h = byId[id];
    if (!h) continue;
    h.quality.mypsq.trend.push({
      year,
      score:            toFloat(row['score']),
      satisfaction_pct: toFloat(row['satisfaction_pct']),
    });
  }
  // Sort trend by year
  hospitals.forEach(h => {
    h.quality.mypsq.trend.sort((a, b) => a.year - b.year);
  });
}

function mergeHpiaIndicators(hospitals, indicatorRows) {
  const byId = Object.fromEntries(hospitals.map(h => [h.hospital_id, h]));
  for (const row of indicatorRows) {
    const id = String(row['hospital_id'] || '').trim();
    const h  = byId[id];
    if (!h) continue;
    h.quality.hpia.indicators.push({
      name:      row['indicator_name'] || '',
      value:     toFloat(row['value']),
      benchmark: toFloat(row['benchmark']),
      target:    toFloat(row['target']),
      year:      toInt(row['year']),
      status:    normaliseStatus(row['status']),
    });
  }
}

function mergeClisqiIndicators(hospitals, indicatorRows) {
  const byId = Object.fromEntries(hospitals.map(h => [h.hospital_id, h]));
  for (const row of indicatorRows) {
    const id = String(row['hospital_id'] || '').trim();
    const h  = byId[id];
    if (!h) continue;
    h.quality.clisqi.indicators.push({
      name:      row['indicator_name'] || '',
      value:     toFloat(row['value']),
      benchmark: toFloat(row['benchmark']),
      target:    toFloat(row['target']),
      unit:      row['unit'] || '',
      year:      toInt(row['year']),
      status:    normaliseStatus(row['status']),
    });
  }
}

/* ============================================================
   VALIDATION — warns in console, never crashes the app
   ============================================================ */

function validateAndFilter(hospitals) {
  const warnings = [];
  const seenIds  = new Set();
  const valid    = [];

  for (const h of hospitals) {
    if (!h.hospital_name) {
      warnings.push(`Row skipped: missing hospital_name`);
      continue;
    }

    if (seenIds.has(h.hospital_id)) {
      warnings.push(`Duplicate hospital_id "${h.hospital_id}" — keeping first occurrence`);
      continue;
    }
    seenIds.add(h.hospital_id);

    // Coordinate warnings (hospital stays in results, just excluded from map)
    if (h.latitude == null || h.longitude == null) {
      warnings.push(`${h.hospital_name}: Missing coordinates — excluded from map`);
    } else {
      if (h.latitude < 0.8 || h.latitude > 7.5)
        warnings.push(`${h.hospital_name}: Latitude ${h.latitude} outside Malaysia bounds`);
      if (h.longitude < 99.6 || h.longitude > 119.5)
        warnings.push(`${h.hospital_name}: Longitude ${h.longitude} outside Malaysia bounds`);
    }

    // Score range warnings
    const q = h.quality;
    if (q.overall_score != null && (q.overall_score < 0 || q.overall_score > 5))
      warnings.push(`${h.hospital_name}: overall_score ${q.overall_score} out of 0–5 range`);
    if (q.hpia.score != null && (q.hpia.score < 0 || q.hpia.score > 5))
      warnings.push(`${h.hospital_name}: hpia_score out of range`);

    valid.push(h);
  }

  if (warnings.length > 0) {
    console.group('[Hospital Compare] Data warnings');
    warnings.forEach(w => console.warn('⚠️', w));
    console.groupEnd();
  }

  return valid;
}

/* ============================================================
   MAIN LOADER — called by DataStore.load()
   ============================================================ */

async function loadFromGoogleSheets(sheetId, config = {}) {
  const tabMain     = config.tabMain     || 'hospitals';
  const tabTrend    = config.tabTrend    || 'mypsq_trend';
  const tabHpia     = config.tabHpia     || 'hpia_indicators';
  const tabClisqi   = config.tabClisqi   || 'clisqi_indicators';

  console.log(`[SheetsLoader] Fetching sheet: ${sheetId}`);

  // 1. Main hospitals tab (required)
  let mainRows;
  try {
    mainRows = await fetchSheetTab(sheetId, tabMain);
    console.log(`[SheetsLoader] Main tab: ${mainRows.length} rows`);
  } catch (err) {
    throw new Error(
      `Could not load the "${tabMain}" tab.\n` +
      `Make sure:\n` +
      `  1. Your Sheet ID is correct in assets/js/config.js\n` +
      `  2. The sheet is shared: Share → Anyone with the link → Viewer\n` +
      `  3. The tab is named "${tabMain}"\n` +
      `Original error: ${err.message}`
    );
  }

  // 2. Parse rows into hospital objects
  let hospitals = mainRows
    .map(rowToHospital)
    .filter(h => h.hospital_name); // drop blank rows

  // 3. Validate
  hospitals = validateAndFilter(hospitals);
  console.log(`[SheetsLoader] ${hospitals.length} valid hospitals`);

  // 4. Optional: trend data
  try {
    const trendRows = await fetchSheetTab(sheetId, tabTrend);
    mergeTrendData(hospitals, trendRows);
    console.log(`[SheetsLoader] Trend tab: ${trendRows.length} rows merged`);
  } catch {
    console.log(`[SheetsLoader] No "${tabTrend}" tab found (optional)`);
  }

  // 5. Optional: HPIA indicators
  try {
    const hpiaRows = await fetchSheetTab(sheetId, tabHpia);
    mergeHpiaIndicators(hospitals, hpiaRows);
    console.log(`[SheetsLoader] HPIA indicators: ${hpiaRows.length} rows merged`);
  } catch {
    console.log(`[SheetsLoader] No "${tabHpia}" tab found (optional)`);
  }

  // 6. Optional: CliSQI indicators
  try {
    const clisqiRows = await fetchSheetTab(sheetId, tabClisqi);
    mergeClisqiIndicators(hospitals, clisqiRows);
    console.log(`[SheetsLoader] CliSQI indicators: ${clisqiRows.length} rows merged`);
  } catch {
    console.log(`[SheetsLoader] No "${tabClisqi}" tab found (optional)`);
  }

  // Build metadata from the dataset itself
  const years = hospitals.map(h => h.data_year).filter(Boolean);
  const meta = {
    source:           'Kementerian Kesihatan Malaysia (KKM)',
    loaded_from:      'Google Sheets (live)',
    loaded_at:        new Date().toISOString(),
    reporting_year:   years.length ? Math.max(...years) : null,
    total_hospitals:  hospitals.length,
  };

  return { hospitals, meta };
}

// Expose for use in app.js
window.SheetsLoader = {
  load: loadFromGoogleSheets,
  fetchTab: fetchSheetTab,
};
