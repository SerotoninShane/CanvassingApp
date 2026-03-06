/**
 * Canvassing Data Abstraction Layer
 *
 * Currently uses localStorage for persistence.
 * Designed so each method can be swapped to Supabase queries later.
 *
 * Property schema:
 *   id            - string (uuid)
 *   address       - string
 *   lat           - number
 *   lng           - number
 *   year_built    - number
 *   property_type - string
 *   canvass_status - 'not_visited' | 'contacted' | 'not_home' | 'no_interest' | 'interested'
 *   notes         - string
 *   canvassed_by  - string (user_id)
 *   canvassed_at  - string (ISO timestamp) | null
 */

const STORAGE_KEY = 'canvass_properties';

// ─── Status colors (shared across components) ────────────────────────────────
export const STATUS_CONFIG = {
  unknocked:      { label: 'Unknocked',      color: '#9ca3af', bg: 'bg-gray-400',    ring: 'ring-gray-300'    },
  lead:           { label: 'Lead',           color: '#10b981', bg: 'bg-emerald-500', ring: 'ring-emerald-400' },
  not_home:       { label: 'Not Home',       color: '#f97316', bg: 'bg-orange-500',  ring: 'ring-orange-400'  },
  left_sticky:    { label: 'Left Sticky',    color: '#eab308', bg: 'bg-yellow-500',  ring: 'ring-yellow-400'  },
  no_soliciting:  { label: 'No Soliciting',  color: '#ef4444', bg: 'bg-red-500',     ring: 'ring-red-400'     },
  inaccessible:   { label: 'Inaccessible',   color: '#6b7280', bg: 'bg-gray-500',    ring: 'ring-gray-400'    },
  not_interested: { label: 'Not Interested', color: '#dc2626', bg: 'bg-red-600',     ring: 'ring-red-500'     },
  selling:        { label: 'Selling',        color: '#8b5cf6', bg: 'bg-violet-500',  ring: 'ring-violet-400'  },
  meet_here:      { label: 'Meet Here',      color: '#3b82f6', bg: 'bg-blue-500',    ring: 'ring-blue-400'    },
  renting:        { label: 'Renting',        color: '#06b6d4', bg: 'bg-cyan-500',    ring: 'ring-cyan-400'    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function readStore() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    console.error('[canvass-data] Failed to read localStorage');
    return [];
  }
}

function writeStore(properties) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
  } catch (err) {
    console.error('[canvass-data] Failed to write localStorage', err);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get all properties as plain objects.
 * TODO: Replace with  →  supabase.from('properties').select('*')
 */
export async function getProperties() {
  // TODO: Supabase →
  // const { data, error } = await supabase.from('properties').select('*');
  // if (error) throw error;
  // return data;
  return readStore();
}

/**
 * Get all properties as a GeoJSON FeatureCollection for the map.
 */
export async function getPropertiesAsGeoJSON() {
  const properties = await getProperties();
  return {
    type: 'FeatureCollection',
    features: properties.map(propertyToFeature),
  };
}

/**
 * Look up one property by id.
 * TODO: Replace with  →  supabase.from('properties').select('*').eq('id', id).single()
 */
export async function getPropertyById(id) {
  // TODO: Supabase →
  // const { data, error } = await supabase.from('properties').select('*').eq('id', id).single();
  // if (error) throw error;
  // return data;
  const all = readStore();
  const prop = all.find((p) => p.id === id);
  if (!prop) throw new Error(`Property ${id} not found`);
  return prop;
}

/**
 * Update a property's fields (status, notes, etc.).
 * Returns the updated property.
 * TODO: Replace with  →  supabase.from('properties').update(updates).eq('id', id).select().single()
 */
export async function updateProperty(id, updates) {
  // TODO: Supabase →
  // const { data, error } = await supabase
  //   .from('properties')
  //   .update({ ...updates, canvassed_at: new Date().toISOString() })
  //   .eq('id', id)
  //   .select()
  //   .single();
  // if (error) throw error;
  // return data;

  const all = readStore();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`Property ${id} not found`);

  all[idx] = {
    ...all[idx],
    ...updates,
    canvassed_at: new Date().toISOString(),
  };
  writeStore(all);
  return all[idx];
}

/**
 * Bulk-upload an array of property objects (already validated).
 * Returns the count of inserted records.
 * TODO: Replace with  →  supabase.from('properties').insert(rows)
 */
export async function bulkUploadProperties(rows) {
  // TODO: Supabase →
  // const { data, error } = await supabase.from('properties').insert(rows).select();
  // if (error) throw error;
  // return data.length;

  const existing = readStore();
  const newRows = rows.map((row) => ({
    id: generateId(),
    address: row.address || '',
    lat: Number(row.lat),
    lng: Number(row.lng),
    year_built: Number(row.year_built) || 0,
    property_type: row.property_type || 'unknown',
    canvass_status: row.canvass_status || 'unknocked',
    notes: row.notes || '',
    canvassed_by: row.canvassed_by || '',
    canvassed_at: null,
  }));

  writeStore([...existing, ...newRows]);
  return newRows.length;
}

/**
 * Delete all properties (useful for dev/testing).
 * TODO: Replace with  →  supabase.from('properties').delete().neq('id', '')
 */
export async function clearAllProperties() {
  // TODO: Supabase →
  // const { error } = await supabase.from('properties').delete().neq('id', '');
  // if (error) throw error;
  writeStore([]);
}

/**
 * Get aggregated stats for dashboard cards.
 * TODO: Could be optimized with Supabase `.select('canvass_status', { count: 'exact', head: true })`
 */
export async function getStats() {
  const properties = await getProperties();
  const total = properties.length;
  const byStatus = {};

  for (const key of Object.keys(STATUS_CONFIG)) {
    byStatus[key] = 0;
  }
  for (const p of properties) {
    if (byStatus[p.canvass_status] !== undefined) {
      byStatus[p.canvass_status]++;
    }
  }

  return {
    total,
    ...byStatus,
    leads: byStatus.lead || 0,
    remaining: total - (byStatus.lead || 0),
  };
}

// ─── Conversion helpers ──────────────────────────────────────────────────────

/**
 * Convert a flat property object into a GeoJSON Feature.
 */
export function propertyToFeature(property) {
  const { lat, lng, ...rest } = property;
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [lng, lat], // GeoJSON is [lng, lat]
    },
    properties: { ...rest, lat, lng },
  };
}

/**
 * Convert a GeoJSON Feature back to a flat property object.
 */
export function featureToProperty(feature) {
  const coords = feature.geometry.coordinates;
  return {
    ...feature.properties,
    lng: coords[0],
    lat: coords[1],
  };
}

/**
 * Validate a raw row (from CSV import) has required fields.
 * Returns { valid: boolean, errors: string[] }
 */
export function validatePropertyRow(row) {
  const errors = [];
  if (!row.address) errors.push('Missing address');
  const lat = Number(row.lat);
  const lng = Number(row.lng);
  if (isNaN(lat) || lat < -90 || lat > 90) errors.push('Invalid lat (must be -90..90)');
  if (isNaN(lng) || lng < -180 || lng > 180) errors.push('Invalid lng (must be -180..180)');
  return { valid: errors.length === 0, errors };
}
