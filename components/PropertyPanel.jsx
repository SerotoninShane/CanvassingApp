'use client';

import { useState, useEffect } from 'react';
import { getStatuses, getInteraction, setInteraction, removeInteraction } from '@/lib/canvass-store';

export default function PropertyPanel({ property, onClose, onStatusChange }) {
  const [statuses, setStatusList] = useState([]);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setStatusList(getStatuses());
    if (property?.id) {
      const interaction = getInteraction(String(property.id));
      if (interaction) {
        setCurrentStatus(interaction.statusId);
        setNotes(interaction.notes || '');
      } else {
        setCurrentStatus(null);
        setNotes('');
      }
    }
  }, [property]);

  if (!property) return null;

  const propId = String(property.id);

  function saveData(statusId, noteText) {
    setInteraction(propId, {
      statusId,
      notes: noteText,
      address: property.address,
      city: property.city,
      zip: property.zip,
      area: property.area,
      puc: property.puc,
      floor: property.floor,
      lat: property.lat,
      lng: property.lng,
    });
  }

  function handleStatusClick(statusId) {
    if (currentStatus === statusId) {
      // Deselect — remove interaction
      setCurrentStatus(null);
      removeInteraction(propId);
      onStatusChange?.();
      return;
    }

    setCurrentStatus(statusId);
    saveData(statusId, notes);
    onStatusChange?.();
  }

  function handleNotesBlur() {
    if (currentStatus) {
      saveData(currentStatus, notes);
    }
  }

  const activeStatus = statuses.find(s => s.id === currentStatus);

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-40 max-h-[55vh] overflow-y-auto rounded-t-2xl animate-slide-up">
      {/* Drag handle */}
      <div className="flex justify-center pt-2 pb-1">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between px-4 pb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 truncate">
            {property.address || 'Unknown Address'}
          </h3>
          <p className="text-sm text-gray-500">
            {[property.city, property.zip].filter(Boolean).join(', ')}
          </p>
          {activeStatus && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold text-white mt-1.5"
              style={{ backgroundColor: activeStatus.color }}
            >
              {activeStatus.name}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="ml-3 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Property details */}
      <div className="px-4 py-2.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm border-t border-gray-100 bg-gray-50">
        <div>
          <span className="text-gray-400 text-xs block">Parcel ID</span>
          <p className="font-semibold text-gray-800 text-xs">{property.id}</p>
        </div>
        {property.area ? (
          <div>
            <span className="text-gray-400 text-xs block">Area (sqft)</span>
            <p className="font-semibold text-gray-800">{Number(property.area).toLocaleString()}</p>
          </div>
        ) : null}
        {property.floor ? (
          <div>
            <span className="text-gray-400 text-xs block">Floors</span>
            <p className="font-semibold text-gray-800">{property.floor}</p>
          </div>
        ) : null}
        {property.puc ? (
          <div>
            <span className="text-gray-400 text-xs block">Use Code (Deed)</span>
            <p className="font-semibold text-gray-800">{property.puc}</p>
          </div>
        ) : null}
      </div>

      {/* Status picker */}
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Set Status</p>
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => {
            const isActive = currentStatus === status.id;
            return (
              <button
                key={status.id}
                onClick={() => handleStatusClick(status.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  isActive
                    ? 'text-white shadow-md scale-105 border-transparent'
                    : 'text-gray-700 bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
                style={isActive ? { backgroundColor: status.color } : {}}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: status.color }}
                />
                {status.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div className="px-4 pb-4">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Add notes about this property…"
          rows={2}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008C99] focus:border-transparent resize-none"
        />
      </div>
    </div>
  );
}
