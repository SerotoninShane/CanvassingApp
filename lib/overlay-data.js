/**
 * Overlay Data Abstraction Layer
 *
 * Manages map overlays stored in localStorage.
 * Three overlay types:
 *   - "territory" → Colored territory assigned to a canvasser or zone
 *   - "no_go"     → Red/dashed overlay marking areas to avoid
 *
 * Overlay schema:
 *   id           - string (uuid)
 *   name         - string (e.g. "Peoria Strip")
 *   type         - 'territory' | 'no_go'
 *   assignee     - string (canvasser name or zone label)
 *   canvasser_id - string (future CRM integration hook)
 *   color        - string (hex color)
 *   geojson      - GeoJSON object (Polygon, MultiPolygon, or FeatureCollection)
 *   created_at   - string (ISO timestamp)
 */

const STORAGE_KEY = 'canvass_overlays';

// ─── Default overlay colors ──────────────────────────────────────────────────
export const OVERLAY_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export const NO_GO_COLOR = '#ef4444'; // red

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function readStore() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    console.error('[overlay-data] Failed to read localStorage');
    return [];
  }
}

function writeStore(overlays) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overlays));
  } catch (err) {
    console.error('[overlay-data] Failed to write localStorage', err);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Get all overlays. */
export async function getOverlays() {
  return readStore();
}

/** Get overlays by type ('territory' | 'no_go'). */
export async function getOverlaysByType(type) {
  return readStore().filter((o) => o.type === type);
}

/** Get overlays assigned to a specific canvasser. */
export async function getOverlaysByCanvasser(canvasserName) {
  return readStore().filter(
    (o) => o.assignee?.toLowerCase() === canvasserName?.toLowerCase()
  );
}

/** Get an overlay by id. */
export async function getOverlayById(id) {
  const overlay = readStore().find((o) => o.id === id);
  if (!overlay) throw new Error(`Overlay ${id} not found`);
  return overlay;
}

/**
 * Create a new overlay.
 * @param {object} data - { name, type, assignee, canvasser_id, color, geojson }
 * @returns the created overlay
 */
export async function createOverlay(data) {
  const overlay = {
    id: generateId(),
    name: data.name || 'Untitled Overlay',
    type: data.type || 'territory',
    assignee: data.assignee || '',
    canvasser_id: data.canvasser_id || '',
    color: data.color || OVERLAY_COLORS[0],
    geojson: data.geojson,
    created_at: new Date().toISOString(),
  };
  const all = readStore();
  all.push(overlay);
  writeStore(all);
  return overlay;
}

/**
 * Update an overlay's fields.
 */
export async function updateOverlay(id, updates) {
  const all = readStore();
  const idx = all.findIndex((o) => o.id === id);
  if (idx === -1) throw new Error(`Overlay ${id} not found`);
  all[idx] = { ...all[idx], ...updates };
  writeStore(all);
  return all[idx];
}

/**
 * Delete an overlay.
 */
export async function deleteOverlay(id) {
  const all = readStore();
  writeStore(all.filter((o) => o.id !== id));
}

/** Delete all overlays. */
export async function clearAllOverlays() {
  writeStore([]);
}

/**
 * Parse a GeoJSON file and extract polygon geometries.
 * Accepts FeatureCollection, Feature, Polygon, or MultiPolygon.
 * Returns the normalized GeoJSON as a FeatureCollection.
 */
export function parseOverlayGeoJSON(text) {
  const geojson = JSON.parse(text);

  // Already a FeatureCollection
  if (geojson.type === 'FeatureCollection') {
    const polygons = geojson.features.filter(
      (f) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'
    );
    if (polygons.length === 0) throw new Error('No Polygon or MultiPolygon features found');
    return { ...geojson, features: polygons };
  }

  // Single Feature
  if (geojson.type === 'Feature') {
    if (geojson.geometry?.type !== 'Polygon' && geojson.geometry?.type !== 'MultiPolygon') {
      throw new Error('Feature geometry must be Polygon or MultiPolygon');
    }
    return { type: 'FeatureCollection', features: [geojson] };
  }

  // Raw geometry
  if (geojson.type === 'Polygon' || geojson.type === 'MultiPolygon') {
    return {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry: geojson }],
    };
  }

  throw new Error('Invalid GeoJSON: expected FeatureCollection, Feature, Polygon, or MultiPolygon');
}

// ─── Test overlay data – 5 vertical strips across Phoenix metro ──────────────
// North-south: ~33.30 to ~33.72
// West-east divided into 5 strips: Peoria, Glendale, Phoenix, Tempe, Mesa

const TEST_OVERLAYS_KEY = 'canvass_overlays_seeded';

const STRIP_N = 33.72;
const STRIP_S = 33.30;

const TEST_OVERLAYS = [
  {
    name: 'Peoria',
    assignee: 'Jake Morrison',
    color: '#3b82f6', // blue
    west: -112.35,
    east: -112.15,
  },
  {
    name: 'Glendale',
    assignee: 'Sarah Chen',
    color: '#10b981', // emerald
    west: -112.15,
    east: -112.01,
  },
  {
    name: 'Phoenix',
    assignee: 'Marcus Williams',
    color: '#8b5cf6', // violet
    west: -112.01,
    east: -111.90,
  },
  {
    name: 'Tempe',
    assignee: 'Jessica Torres',
    color: '#f59e0b', // amber
    west: -111.90,
    east: -111.80,
  },
  {
    name: 'Mesa',
    assignee: 'David Park',
    color: '#06b6d4', // cyan
    west: -111.80,
    east: -111.60,
  },
];

function makeStripGeoJSON(west, east) {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [west, STRIP_N],
            [east, STRIP_N],
            [east, STRIP_S],
            [west, STRIP_S],
            [west, STRIP_N],
          ]],
        },
      },
    ],
  };
}

/** Returns true if test overlays have already been seeded. */
export function hasTestOverlays() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(TEST_OVERLAYS_KEY) === 'true';
}

/** Seed the 5 Phoenix metro test overlays. */
export function seedTestOverlays() {
  if (typeof window === 'undefined') return;
  const existing = readStore();
  const overlays = [
    ...existing,
    ...TEST_OVERLAYS.map((strip) => ({
      id: generateId(),
      name: strip.name,
      type: 'territory',
      assignee: strip.assignee,
      canvasser_id: '',
      color: strip.color,
      geojson: makeStripGeoJSON(strip.west, strip.east),
      created_at: new Date().toISOString(),
    })),
  ];
  writeStore(overlays);
  localStorage.setItem(TEST_OVERLAYS_KEY, 'true');
}
