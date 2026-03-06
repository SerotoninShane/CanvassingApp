'use client';

import { useState, useEffect } from 'react';
import { STATUS_CONFIG, updateProperty } from '@/lib/canvass-data';

/**
 * PropertyModal – Slide-up drawer / modal for viewing + updating a property.
 *
 * Props:
 *   property      - the property object to display (null = hidden)
 *   onClose()     - called when the modal is dismissed
 *   onSaved(updatedProperty) - called after a successful save so parent can update state
 *
 * Features:
 *   - Shows address, year built, property type
 *   - 5 status buttons color-coded
 *   - Notes textarea
 *   - Optimistic save (calls onSaved immediately, writes in background)
 *   - Mobile-friendly bottom-sheet style
 */
export default function PropertyModal({ property, onClose, onSaved }) {
  const [status, setStatus] = useState('unknocked');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Sync local state when property changes
  useEffect(() => {
    if (property) {
      setStatus(property.canvass_status || 'unknocked');
      setNotes(property.notes || '');
      setError(null);
    }
  }, [property]);

  if (!property) return null;

  async function handleSave() {
    setSaving(true);
    setError(null);

    const updates = { canvass_status: status, notes };

    // Optimistic: notify parent immediately
    const optimistic = { ...property, ...updates, canvassed_at: new Date().toISOString() };
    if (onSaved) onSaved(optimistic);

    try {
      await updateProperty(property.id, updates);
    } catch (err) {
      console.error('[PropertyModal] Save failed', err);
      setError('Failed to save – changes may not persist.');
      // Revert optimistic update
      if (onSaved) onSaved(property);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[900] bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Panel – bottom sheet on mobile, centered modal on desktop */}
      <div className="fixed z-[950] inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center">
        <div className="bg-white w-full sm:max-w-lg sm:rounded-xl rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">{property.address || 'Unknown Address'}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {property.property_type || 'Property'} · Built {property.year_built || 'N/A'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="ml-3 text-gray-400 hover:text-gray-600 text-2xl leading-none"
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          <div className="px-5 py-4 space-y-5">
            {/* Coordinates */}
            <div className="text-xs text-gray-400">
              {property.lat?.toFixed(6)}, {property.lng?.toFixed(6)}
            </div>

            {/* Status selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Canvass Status</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setStatus(key)}
                    className={`
                      px-3 py-2.5 rounded-lg text-sm font-semibold transition-all
                      border-2 focus:outline-none focus:ring-2 focus:ring-offset-1
                      ${status === key
                        ? `${cfg.bg} text-white border-transparent ${cfg.ring}`
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                      }
                    `}
                  >
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle"
                      style={{ backgroundColor: status === key ? '#fff' : cfg.color }}
                    />
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add notes about this visit…"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008C99] focus:border-transparent resize-none"
              />
            </div>

            {/* Last canvassed info */}
            {property.canvassed_at && (
              <p className="text-xs text-gray-400">
                Last updated: {new Date(property.canvassed_at).toLocaleString()}
              </p>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 text-sm rounded-lg bg-red-50 text-red-700">{error}</div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-[#008C99] text-white font-semibold rounded-lg shadow-md hover:bg-[#006670] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
