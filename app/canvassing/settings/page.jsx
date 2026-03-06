'use client';

import { useState, useEffect } from 'react';
import { getStatuses, saveStatuses, addStatus, updateStatus, deleteStatus } from '@/lib/canvass-store';

export default function SettingsPage() {
  const [statuses, setStatusList] = useState([]);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  useEffect(() => {
    setStatusList(getStatuses());
  }, []);

  function handleAdd() {
    if (!newName.trim()) return;
    addStatus(newName.trim(), newColor);
    setStatusList(getStatuses());
    setNewName('');
    setNewColor('#3b82f6');
  }

  function handleEdit(status) {
    setEditingId(status.id);
    setEditName(status.name);
    setEditColor(status.color);
  }

  function handleSaveEdit() {
    if (!editName.trim()) return;
    updateStatus(editingId, { name: editName.trim(), color: editColor });
    setStatusList(getStatuses());
    setEditingId(null);
  }

  function handleDelete(id) {
    if (!confirm('Delete this status? Properties with this status will be cleared.')) return;
    deleteStatus(id);
    setStatusList(getStatuses());
  }

  function handleReorder(fromIndex, direction) {
    const newList = [...statuses];
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= newList.length) return;
    [newList[fromIndex], newList[toIndex]] = [newList[toIndex], newList[fromIndex]];
    saveStatuses(newList);
    setStatusList(newList);
  }

  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage interaction statuses used during canvassing</p>
        </div>

        {/* Add new status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Add New Status</h2>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
            />
            <input
              type="text"
              placeholder="Status name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008C99] focus:border-transparent"
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="px-4 py-2 bg-[#008C99] text-white text-sm font-semibold rounded-lg hover:bg-[#006d78] disabled:opacity-40 transition"
            >
              Add
            </button>
          </div>
        </div>

        {/* Status list */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Interaction Statuses ({statuses.length})
          </h2>
          <div className="space-y-2">
            {statuses.map((status, index) => (
              <div
                key={status.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition"
              >
                {editingId === status.id ? (
                  <>
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-8 h-8 rounded border cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                      className="flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#008C99]"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1 bg-[#008C99] text-white text-xs font-semibold rounded-lg hover:bg-[#006d78]"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 bg-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className="w-5 h-5 rounded-full flex-shrink-0 border border-gray-200"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="flex-1 text-sm font-medium text-gray-800">{status.name}</span>

                    {/* Reorder */}
                    <button
                      onClick={() => handleReorder(index, -1)}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-20"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleReorder(index, 1)}
                      disabled={index === statuses.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-20"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleEdit(status)}
                      className="p-1 text-gray-400 hover:text-[#008C99] transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(status.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
