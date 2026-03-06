'use client';

import { useState, useRef } from 'react';
import { bulkUploadProperties, validatePropertyRow } from '@/lib/canvass-data';

/**
 * PropertyUpload – Accepts CSV or GeoJSON files, validates, previews, and imports.
 *
 * Props:
 *   onUploaded(count)  - called after successful import with # of properties added
 *   onClose()          - dismiss the upload UI
 *
 * CSV Requirements:
 *   Required columns: address, lat, lng
 *   Optional columns: year_built, property_type, notes
 *
 * GeoJSON Requirements:
 *   FeatureCollection with Point features. Properties should contain address, year_built, etc.
 */
export default function PropertyUpload({ onUploaded, onClose }) {
  const fileRef = useRef(null);
  const [rows, setRows] = useState([]);            // parsed & validated rows
  const [errors, setErrors] = useState([]);         // validation errors
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState('select');     // select | preview | done
  const [resultCount, setResultCount] = useState(0);

  // ── Parse the selected file ────────────────────────────────────────────────
  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrors([]);
    setRows([]);

    const text = await file.text();
    const ext = file.name.toLowerCase();

    if (ext.endsWith('.geojson') || ext.endsWith('.json')) {
      parseGeoJSON(text);
    } else if (ext.endsWith('.csv')) {
      parseCSV(text);
    } else {
      setErrors([{ row: 0, messages: ['Unsupported file type. Use .csv, .geojson, or .json'] }]);
    }
  }

  function parseGeoJSON(text) {
    try {
      const geojson = JSON.parse(text);
      if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
        setErrors([{ row: 0, messages: ['Invalid GeoJSON: expected a FeatureCollection'] }]);
        return;
      }

      const parsed = [];
      const errs = [];

      geojson.features.forEach((feature, i) => {
        if (feature.geometry?.type !== 'Point') {
          errs.push({ row: i + 1, messages: ['Feature is not a Point'] });
          return;
        }

        const [lng, lat] = feature.geometry.coordinates;
        const row = {
          address: feature.properties?.address || '',
          lat,
          lng,
          year_built: feature.properties?.year_built || 0,
          property_type: feature.properties?.property_type || 'unknown',
          notes: feature.properties?.notes || '',
        };

        const validation = validatePropertyRow(row);
        if (!validation.valid) {
          errs.push({ row: i + 1, messages: validation.errors });
        } else {
          parsed.push(row);
        }
      });

      setRows(parsed);
      setErrors(errs);
      if (parsed.length > 0) setStage('preview');
    } catch (err) {
      setErrors([{ row: 0, messages: ['Failed to parse JSON: ' + err.message] }]);
    }
  }

  function parseCSV(text) {
    // Simple CSV parser (no PapaParse dependency needed for basic CSV)
    // Handles quoted fields and common edge cases
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) {
      setErrors([{ row: 0, messages: ['CSV must have a header row and at least one data row'] }]);
      return;
    }

    const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
    const requiredCols = ['address', 'lat', 'lng'];
    const missing = requiredCols.filter((c) => !headers.includes(c));
    if (missing.length > 0) {
      setErrors([{ row: 0, messages: [`Missing required columns: ${missing.join(', ')}`] }]);
      return;
    }

    const parsed = [];
    const errs = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      const validation = validatePropertyRow(row);
      if (!validation.valid) {
        errs.push({ row: i + 1, messages: validation.errors });
      } else {
        parsed.push({
          address: row.address || '',
          lat: Number(row.lat),
          lng: Number(row.lng),
          year_built: Number(row.year_built) || 0,
          property_type: row.property_type || 'unknown',
          notes: row.notes || '',
        });
      }
    }

    setRows(parsed);
    setErrors(errs);
    if (parsed.length > 0) setStage('preview');
  }

  // Basic CSV line parser handling quoted fields
  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current);
    return result;
  }

  // ── Confirm import ─────────────────────────────────────────────────────────
  async function handleImport() {
    setUploading(true);
    try {
      const count = await bulkUploadProperties(rows);
      setResultCount(count);
      setStage('done');
      if (onUploaded) onUploaded(count);
    } catch (err) {
      setErrors([{ row: 0, messages: ['Import failed: ' + err.message] }]);
    } finally {
      setUploading(false);
    }
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  function reset() {
    setRows([]);
    setErrors([]);
    setFileName('');
    setStage('select');
    setResultCount(0);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Import Properties</h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            &times;
          </button>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* ─── Stage: Select File ──────────────────────────────────────────── */}
        {stage === 'select' && (
          <>
            <p className="text-sm text-gray-600">
              Upload a <strong>.csv</strong> or <strong>.geojson</strong> file.
              CSV must include columns: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">address, lat, lng</code>.
              Optional: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">year_built, property_type</code>.
            </p>

            <input
              ref={fileRef}
              type="file"
              accept=".csv,.geojson,.json"
              onChange={handleFileChange}
              className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 p-2.5 focus:outline-none focus:ring-2 focus:ring-[#008C99]"
            />
          </>
        )}

        {/* ─── Stage: Preview ──────────────────────────────────────────────── */}
        {stage === 'preview' && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">
                <strong>{rows.length}</strong> valid properties from <strong>{fileName}</strong>
              </p>
              <button onClick={reset} className="text-sm text-gray-500 hover:text-gray-700 underline">
                Choose different file
              </button>
            </div>

            {/* Preview table */}
            <div className="max-h-64 overflow-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 font-medium text-gray-600">#</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Address</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Lat</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Lng</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Year</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.slice(0, 50).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-1.5 truncate max-w-[200px]">{row.address}</td>
                      <td className="px-3 py-1.5">{Number(row.lat).toFixed(4)}</td>
                      <td className="px-3 py-1.5">{Number(row.lng).toFixed(4)}</td>
                      <td className="px-3 py-1.5">{row.year_built || '—'}</td>
                      <td className="px-3 py-1.5">{row.property_type || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 50 && (
                <p className="text-xs text-gray-400 px-3 py-2">Showing first 50 of {rows.length}…</p>
              )}
            </div>

            {/* Import button */}
            <button
              onClick={handleImport}
              disabled={uploading}
              className="w-full px-4 py-3 bg-[#008C99] text-white font-semibold rounded-lg shadow-md hover:bg-[#006670] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              {uploading ? 'Importing…' : `Import ${rows.length} Properties`}
            </button>
          </>
        )}

        {/* ─── Stage: Done ─────────────────────────────────────────────────── */}
        {stage === 'done' && (
          <div className="text-center py-6 space-y-3">
            <div className="text-4xl">✅</div>
            <p className="text-lg font-semibold text-gray-800">
              {resultCount} properties imported!
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
              >
                Import More
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-[#008C99] text-white font-semibold rounded-lg hover:bg-[#006670] transition"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── Validation errors ──────────────────────────────────────────── */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
            <p className="text-sm font-semibold text-red-800">Validation Issues</p>
            <ul className="text-xs text-red-700 space-y-0.5 max-h-32 overflow-auto">
              {errors.slice(0, 20).map((err, i) => (
                <li key={i}>
                  {err.row > 0 ? `Row ${err.row}: ` : ''}{err.messages.join(', ')}
                </li>
              ))}
              {errors.length > 20 && (
                <li className="text-red-500">…and {errors.length - 20} more issues</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
