/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  HOSPITAL COMPARE MALAYSIA — Configuration               ║
 * ║                                                          ║
 * ║  THIS IS THE ONLY FILE YOU NEED TO EDIT.                ║
 * ║                                                          ║
 * ║  Step 1: Open your Google Sheet                         ║
 * ║  Step 2: Share → Anyone with the link → Viewer          ║
 * ║  Step 3: Copy the Sheet ID from the URL                 ║
 * ║           URL: .../spreadsheets/d/ [COPY THIS] /edit    ║
 * ║  Step 4: Paste it as GOOGLE_SHEET_ID below              ║
 * ║  Step 5: Save and commit this file on GitHub            ║
 * ║                                                          ║
 * ║  Done! The site now reads live from your Google Sheet.  ║
 * ║  Every refresh = latest data from the sheet.            ║
 * ╚══════════════════════════════════════════════════════════╝
 */

const SITE_CONFIG = {

  // ── YOUR GOOGLE SHEET ─────────────────────────────────────
  //
  //  Paste your Sheet ID here.
  //  Find it in your Google Sheet URL:
  //  https://docs.google.com/spreadsheets/d/  SHEET_ID  /edit
  //
  GOOGLE_SHEET_ID: 'YOUR_SHEET_ID_HERE',

  //  Names of the tabs in your Google Sheet.
  //  The first tab is required. The others are optional.
  //
  SHEET_TABS: {
    hospitals:         'hospitals',        // REQUIRED — main data tab
    mypsq_trend:       'mypsq_trend',      // optional — yearly trend data
    hpia_indicators:   'hpia_indicators',  // optional — individual HPIA sub-scores
    clisqi_indicators: 'clisqi_indicators',// optional — individual CliSQI sub-scores
  },

  // ── FALLBACK ───────────────────────────────────────────────
  //  If GOOGLE_SHEET_ID is not set (still says 'YOUR_SHEET_ID_HERE'),
  //  the app will load from data/hospitals.json instead.
  //  This is useful for testing before your sheet is ready.
  //
  FALLBACK_JSON: '../data/hospitals.json',
  FALLBACK_JSON_ROOT: './data/hospitals.json',

  // ── SITE INFO ──────────────────────────────────────────────
  SITE_NAME:    'Hospital Compare Malaysia',
  SITE_TAGLINE: 'KKM Hospital Quality & Patient Experience',
  DATA_SOURCE:  'Kementerian Kesihatan Malaysia (KKM)',

  // ── SCORING WEIGHTS ────────────────────────────────────────
  //  Official KKM HPIA 2025 methodology.
  //  Only change these if KKM publishes updated weights.
  //
  SCORING_WEIGHTS: {
    hpia:    0.50,   // 50% — Hospital Performance Indicator Assessment
    cluster: 0.25,   // 25% — Cluster Hospital Performance
    mypsq:   0.15,   // 15% — Patient Satisfaction (PSQ-18)
    casemix: 0.10,   // 10% — Casemix Performance
  },

  // ── MAP ────────────────────────────────────────────────────
  MAP_CENTER:         [4.2105, 108.9758],  // centre of Malaysia
  MAP_DEFAULT_ZOOM:   6,
  MAP_CLUSTER_RADIUS: 60,

  // ── RESULTS ────────────────────────────────────────────────
  RESULTS_PER_PAGE: 20,
  MAX_COMPARE:      4,

  // ── COLUMN MAP ─────────────────────────────────────────────
  //  Maps YOUR Google Sheet column headers → app field names.
  //
  //  LEFT  = exactly what your column header says in the sheet
  //  RIGHT = internal field name (do not change the right side)
  //
  //  Example: if your sheet has "Nama Hospital" instead of "hospital_name":
  //    Change:  'hospital_name': 'hospital_name',
  //    To:      'Nama Hospital':  'hospital_name',
  //
  COLUMN_MAP: {
    // Identity
    'hospital_id':            'hospital_id',
    'hospital_name':          'hospital_name',
    'official_name':          'official_name',

    // Location
    'state':                  'state',
    'district':               'district',
    'town':                   'town',
    'address':                'address',
    'postcode':               'postcode',
    'latitude':               'latitude',
    'longitude':              'longitude',

    // Contact
    'phone':                  'phone',
    'website':                'website',

    // Classification
    'hospital_type':          'hospital_type',
    'hospital_category':      'hospital_category',
    'specialist_status':      'specialist_status',

    // Cluster
    'cluster_name':           'cluster_name',
    'cluster_role':           'cluster_role',
    'lead_hospital':          'lead_hospital',

    // Operational
    'services':               'services',
    'bed_count':              'bed_count',
    'data_year':              'data_year',
    'last_updated':           'last_updated',

    // Overall quality
    'overall_score':          'overall_score',
    'overall_star_rating':    'overall_star_rating',

    // HPIA
    'hpia_score':             'hpia_score',
    'hpia_star_rating':       'hpia_star_rating',
    'hpia_percentile':        'hpia_percentile',
    'hpia_status':            'hpia_status',
    'hpia_year':              'hpia_year',

    // CliSQI
    'clisqi_score':           'clisqi_score',
    'clisqi_star_rating':     'clisqi_star_rating',
    'clisqi_status':          'clisqi_status',
    'clisqi_year':            'clisqi_year',

    // Cluster performance
    'cluster_score':          'cluster_score',
    'cluster_star_rating':    'cluster_star_rating',
    'cluster_status':         'cluster_status',
    'cluster_year':           'cluster_year',

    // MyPSQ / PSQ-18
    'mypsq_score':            'mypsq_score',
    'mypsq_star_rating':      'mypsq_star_rating',
    'mypsq_satisfaction_pct': 'mypsq_satisfaction_pct',
    'mypsq_response_count':   'mypsq_response_count',
    'mypsq_survey_period':    'mypsq_survey_period',
    'mypsq_status':           'mypsq_status',
    'mypsq_year':             'mypsq_year',

    // Casemix
    'casemix_score':          'casemix_score',
    'casemix_star_rating':    'casemix_star_rating',
    'casemix_cmi':            'casemix_cmi',
    'casemix_status':         'casemix_status',
    'casemix_year':           'casemix_year',
  },
};

window.SITE_CONFIG = SITE_CONFIG;
