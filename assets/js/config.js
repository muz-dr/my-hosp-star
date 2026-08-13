/**
 * HOSPITAL COMPARE MALAYSIA — Configuration
 * ==========================================
 * Edit GOOGLE_SHEET_ID below with your actual Sheet ID.
 * Everything else works automatically.
 */

const SITE_CONFIG = {

  // ── YOUR GOOGLE SHEET ID ────────────────────────────────────
  // From your sheet URL: .../spreadsheets/d/ [THIS PART] /edit
  GOOGLE_SHEET_ID: '1SftF7z--q62-Ipfq6k9NIu-2Wed9c6EM92NCHL5fX94',

  // Tab names in your Google Sheet
  SHEET_TABS: {
    hospitals:         'hospitals',         // REQUIRED
    mypsq_trend:       'mypsq_trend',       // optional — yearly PSQ trend
    hpia_indicators:   'hpia_indicators',   // optional — HPIA sub-indicators
    clisqi_indicators: 'clisqi_indicators', // optional — CliSQI sub-indicators
  },

  // Fallback JSON (used only if Google Sheets fails)
  FALLBACK_JSON:      '../data/hospitals.json',
  FALLBACK_JSON_ROOT: './data/hospitals.json',

  // Site info
  SITE_NAME:    'Hospital Compare Malaysia',
  SITE_TAGLINE: 'KKM Hospital Quality & Patient Experience',
  DATA_SOURCE:  'Kementerian Kesihatan Malaysia (KKM)',

  // KKM HPIA 2025 scoring weights — only change if KKM updates methodology
  SCORING_WEIGHTS: {
    hpia:    0.50,
    cluster: 0.25,
    mypsq:   0.15,
    casemix: 0.10,
  },

  // Map
  MAP_CENTER:         [4.2105, 108.9758],
  MAP_DEFAULT_ZOOM:   6,
  MAP_CLUSTER_RADIUS: 60,

  // Results
  RESULTS_PER_PAGE: 20,
  MAX_COMPARE:      4,

  // ── COLUMN MAP ──────────────────────────────────────────────
  // Left = your Google Sheet column header (exact spelling)
  // Right = internal field name (do not change)
  //
  // Your current sheet columns are already matched below.
  // If you add new columns later (phone, website, beds etc.),
  // just add them here and in your sheet.
  COLUMN_MAP: {
    // Identity & location
    'hospital_id':            'hospital_id',
    'hospital_name':          'hospital_name',
    'official_name':          'official_name',
    'state':                  'state',
    'district':               'district',
    'town':                   'town',
    'address':                'address',
    'postcode':               'postcode',
    'latitude':               'latitude',
    'longitude':              'longitude',

    // Contact — add these columns to your sheet when ready
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

    // Operational — add these columns to your sheet when ready
    'services':               'services',
    'bed_count':              'bed_count',
    'data_year':              'data_year',
    'last_updated':           'last_updated',

    // Overall
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
