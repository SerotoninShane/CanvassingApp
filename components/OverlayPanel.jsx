'use client';

import { useState, useRef } from 'react';
import {
  createOverlay,
  parseOverlayGeoJSON,
  OVERLAY_COLORS,
  NO_GO_COLOR,
  deleteOverlay,
  updateOverlay,
} from '@/lib/overlay-data';

/**
 * OverlayPanel – Sidebar for managing map overlays (territories & no-go areas).
 *
 * Props:
 *   overlays          - array of overlay objects
 *   onOverlaysChanged - callback after create/update/delete
 *   onOverlayHover    - callback(overlayId | null) for map highlight
 */
export default function OverlayPanel({ overlays = [], onOverlaysChanged, onOverlayHover }) {
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState('territory');
  const [name, setName] = useState('');
  const [assignee, setAssignee] = useState('');
  const [color, setColor] = useState(OVERLAY_COLORS[0]);
  const [geojsonText, setGeojsonText] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editAssignee, setEditAssignee] = useState('');
  const fileRef = useRef(null);

  const territories = overlays.filter((o) => o.type === 'territory');
  const noGoOverlays = overlays.filter((o) => o.type === 'no_go');

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    try {
      const text = await file.text();
      parseOverlayGeoJSON(text); // validate
      setGeojsonText(text);
    } catch (err) {
      setError(err.message);
      setGeojsonText('');
    }
  }

  async function handleCreate() {
    if (!geojsonText) {
      setError('Please upload a GeoJSON file');
      return;
    }
    if (!name.trim()) {
      setError('Please enter an overlay name');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const geojson = parseOverlayGeoJSON(geojsonText);
      await createOverlay({
        name: name.trim(),
        type: addType,
        assignee: assignee.trim(),
        color: addType === 'no_go' ? NO_GO_COLOR : color,
        geojson,
      });
      // Reset
      setName('');
      setAssignee('');
      setGeojsonText('');
      setFileName('');
      setShowAdd(false);
      if (fileRef.current) fileRef.current.value = '';
      if (onOverlaysChanged) onOverlaysChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    await deleteOverlay(id);
    if (onOverlaysChanged) onOverlaysChanged();
  }

  async function handleUpdateAssignee(id) {
    await updateOverlay(id, { assignee: editAssignee.trim() });
    setEditingId(null);
    setEditAssignee('');
    if (onOverlaysChanged) onOverlaysChanged();
  }

  function startEdit(overlay) {
    setEditingId(overlay.id);
    setEditAssignee(overlay.assignee || '');
  }

  return (
    <div className="bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden" style={{ width: '340px' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-bold text-gray-800">Overlays</h2>
        <button
          onClick={() => { setShowAdd(!showAdd); setError(null); }}
          className="px-2.5 py-1 bg-[#008C99] text-white text-xs font-semibold rounded-lg hover:bg-[#006670] transition"
        >
          {showAdd ? 'Cancel' : '+ Add Overlay'}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="px-4 py-3 border-b border-gray-200 space-y-3 flex-shrink-0">
          {/* Type selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setAddType('territory')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${
                addType === 'territory'
                  ? 'bg-blue-500 text-white border-transparent'
                  : 'bg-white text-gray-600 border-gray-300'
              }`}
            >
              Territory
            </button>
            <button
              onClick={() => setAddType('no_go')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${
                addType === 'no_go'
                  ? 'bg-red-500 text-white border-transparent'
                  : 'bg-white text-gray-600 border-gray-300'
              }`}
            >
              No-Go Area
            </button>
          </div>

          {/* Name */}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={addType === 'no_go' ? 'e.g. Gated Community North' : 'e.g. North Phoenix'}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008C99]"
          />

          {/* Assignee / Canvasser (territory only) */}
          {addType === 'territory' && (
            <input
              type="text"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="Assign to canvasser or zone"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008C99]"
            />
          )}

          {/* Color (territory only) */}
          {addType === 'territory' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
              <div className="flex gap-1.5 flex-wrap">
                {OVERLAY_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition ${
                      color === c ? 'border-gray-800 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* GeoJSON upload */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">GeoJSON File</label>
            <input
              ref={fileRef}
              type="file"
              accept=".geojson,.json"
              onChange={handleFileChange}
              className="w-full text-xs text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 p-2 focus:outline-none"
            />
            {fileName && geojsonText && (
              <p className="text-xs text-green-600 mt-1">✓ {fileName} loaded</p>
            )}
          </div>

          {error && (
            <div className="p-2 text-xs rounded-lg bg-red-50 text-red-700">{error}</div>
          )}

          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full px-3 py-2 bg-[#008C99] text-white text-sm font-semibold rounded-lg hover:bg-[#006670] transition disabled:opacity-50"
          >
            {saving ? 'Creating…' : `Create ${addType === 'no_go' ? 'No-Go' : 'Territory'} Overlay`}
          </button>
        </div>
      )}

      {/* Overlay list */}
      <div className="flex-1 overflow-y-auto">
        {/* Territories */}
        {territories.length > 0 && (
          <div className="px-4 pt-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Territories ({territories.length})
            </h3>
            <div className="space-y-2">
              {territories.map((overlay) => (
                <div
                  key={overlay.id}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition"
                  onMouseEnter={() => onOverlayHover?.(overlay.id)}
                  onMouseLeave={() => onOverlayHover?.(null)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: overlay.color }} />
                    <span className="text-sm font-medium text-gray-800 truncate flex-1">{overlay.name}</span>
                    <button
                      onClick={() => handleDelete(overlay.id)}
                      className="text-gray-400 hover:text-red-500 text-xs"
                      title="Delete overlay"
                    >
                      ✕
                    </button>
                  </div>
                  {editingId === overlay.id ? (
                    <div className="flex gap-1 mt-1">
                      <input
                        type="text"
                        value={editAssignee}
                        onChange={(e) => setEditAssignee(e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#008C99]"
                        placeholder="Canvasser name or zone"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateAssignee(overlay.id)}
                      />
                      <button
                        onClick={() => handleUpdateAssignee(overlay.id)}
                        className="px-2 py-1 bg-[#008C99] text-white text-xs rounded"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <p
                      className="text-xs text-gray-500 cursor-pointer hover:text-[#008C99]"
                      onClick={() => startEdit(overlay)}
                    >
                      {overlay.assignee ? `👤 ${overlay.assignee}` : 'Click to assign canvasser…'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No-go overlays */}
        {noGoOverlays.length > 0 && (
          <div className="px-4 pt-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              No-Go Areas ({noGoOverlays.length})
            </h3>
            <div className="space-y-2">
              {noGoOverlays.map((overlay) => (
                <div
                  key={overlay.id}
                  className="bg-red-50 rounded-lg p-3 border border-red-200 hover:border-red-300 transition"
                  onMouseEnter={() => onOverlayHover?.(overlay.id)}
                  onMouseLeave={() => onOverlayHover?.(null)}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-red-800 truncate flex-1">{overlay.name}</span>
                    <button
                      onClick={() => handleDelete(overlay.id)}
                      className="text-red-300 hover:text-red-600 text-xs"
                      title="Delete overlay"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-xs text-red-500 mt-1">⚠ Do not canvass</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {overlays.length === 0 && !showAdd && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 px-6 text-center">
            <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p className="text-sm font-medium">No overlays yet</p>
            <p className="text-xs mt-1">Upload GeoJSON files to define canvasser territories and no-go areas</p>
          </div>
        )}
      </div>
    </div>
  );
}
