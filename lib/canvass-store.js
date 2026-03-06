/**
 * Canvassing Store — client-side localStorage persistence
 *
 * Two stores:
 * 1. Interaction Statuses (user-configurable: name + color)
 * 2. Property Interactions (propertyId → status + notes + metadata)
 */

const STATUSES_KEY = 'canvass_statuses';
const INTERACTIONS_KEY = 'canvass_interactions';

// ─── Default statuses ────────────────────────────────────────────────────────

const DEFAULT_STATUSES = [
  { id: 'unknocked',      name: 'Unknocked',       color: '#9ca3af' },
  { id: 'not_home',       name: 'Not Home',        color: '#f97316' },
  { id: 'contacted',      name: 'Contacted',       color: '#3b82f6' },
  { id: 'lead',           name: 'Lead',            color: '#10b981' },
  { id: 'not_interested', name: 'Not Interested',  color: '#ef4444' },
  { id: 'left_sticky',    name: 'Left Sticky',     color: '#eab308' },
  { id: 'no_soliciting',  name: 'No Soliciting',   color: '#dc2626' },
  { id: 'inaccessible',   name: 'Inaccessible',    color: '#6b7280' },
  { id: 'selling',        name: 'Selling',         color: '#8b5cf6' },
  { id: 'renting',        name: 'Renting',         color: '#06b6d4' },
];

// ─── Statuses CRUD ───────────────────────────────────────────────────────────

export function getStatuses() {
  if (typeof window === 'undefined') return DEFAULT_STATUSES;
  try {
    const raw = localStorage.getItem(STATUSES_KEY);
    if (!raw) {
      localStorage.setItem(STATUSES_KEY, JSON.stringify(DEFAULT_STATUSES));
      return [...DEFAULT_STATUSES];
    }
    return JSON.parse(raw);
  } catch {
    return [...DEFAULT_STATUSES];
  }
}

export function saveStatuses(statuses) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STATUSES_KEY, JSON.stringify(statuses));
}

export function addStatus(name, color) {
  const statuses = getStatuses();
  const base = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  const id = statuses.find(s => s.id === base) ? `${base}_${Date.now()}` : base;
  const newStatus = { id, name, color };
  statuses.push(newStatus);
  saveStatuses(statuses);
  return newStatus;
}

export function updateStatus(id, updates) {
  const statuses = getStatuses();
  const idx = statuses.findIndex(s => s.id === id);
  if (idx === -1) return null;
  statuses[idx] = { ...statuses[idx], ...updates };
  saveStatuses(statuses);
  return statuses[idx];
}

export function deleteStatus(id) {
  const statuses = getStatuses().filter(s => s.id !== id);
  saveStatuses(statuses);
  // Clear interactions with this status
  const interactions = getInteractions();
  for (const key of Object.keys(interactions)) {
    if (interactions[key].statusId === id) {
      delete interactions[key];
    }
  }
  saveInteractions(interactions);
}

// ─── Interactions CRUD ───────────────────────────────────────────────────────

export function getInteractions() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(INTERACTIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveInteractions(interactions) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(INTERACTIONS_KEY, JSON.stringify(interactions));
}

export function setInteraction(propertyId, data) {
  const interactions = getInteractions();
  interactions[String(propertyId)] = {
    ...interactions[String(propertyId)],
    ...data,
    timestamp: new Date().toISOString(),
  };
  saveInteractions(interactions);
  return interactions[String(propertyId)];
}

export function getInteraction(propertyId) {
  return getInteractions()[String(propertyId)] || null;
}

export function removeInteraction(propertyId) {
  const interactions = getInteractions();
  delete interactions[String(propertyId)];
  saveInteractions(interactions);
}

export function getInteractionCounts() {
  const interactions = getInteractions();
  const counts = {};
  for (const data of Object.values(interactions)) {
    if (data.statusId) {
      counts[data.statusId] = (counts[data.statusId] || 0) + 1;
    }
  }
  return counts;
}

export function getInteractedProperties() {
  const interactions = getInteractions();
  return Object.entries(interactions).map(([propertyId, data]) => ({
    propertyId,
    ...data,
  }));
}
