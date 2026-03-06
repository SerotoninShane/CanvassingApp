'use client';

import { useState, useEffect } from 'react';
import { getStatuses, getInteractionCounts, getInteractedProperties } from '@/lib/canvass-store';

export default function ReportPage() {
  const [statuses, setStatuses] = useState([]);
  const [counts, setCounts] = useState({});
  const [interactions, setInteractionData] = useState([]);

  useEffect(() => {
    setStatuses(getStatuses());
    setCounts(getInteractionCounts());
    setInteractionData(getInteractedProperties());
  }, []);

  const totalInteractions = Object.values(counts).reduce((sum, c) => sum + c, 0);
  const statusMap = Object.fromEntries(statuses.map(s => [s.id, s]));

  const breakdown = statuses.map(s => ({
    ...s,
    count: counts[s.id] || 0,
    pct: totalInteractions > 0 ? ((counts[s.id] || 0) / totalInteractions * 100).toFixed(1) : 0,
  }));

  // Recent activity
  const recent = [...interactions]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 15);

  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Canvassing Report</h1>
          <p className="text-sm text-gray-500 mt-1">Interaction tracking and status breakdown</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#008C99] text-white rounded-xl p-4 shadow-md">
            <p className="text-xs font-medium opacity-80">Total Interactions</p>
            <p className="text-2xl font-bold mt-1">{totalInteractions}</p>
          </div>
          {breakdown.filter(b => b.count > 0).slice(0, 3).map(b => (
            <div key={b.id} className="text-white rounded-xl p-4 shadow-md" style={{ backgroundColor: b.color }}>
              <p className="text-xs font-medium opacity-80">{b.name}</p>
              <p className="text-2xl font-bold mt-1">{b.count}</p>
              <p className="text-xs opacity-70">{b.pct}%</p>
            </div>
          ))}
        </div>

        {/* Status breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Status Breakdown</h2>
          {totalInteractions === 0 ? (
            <p className="text-sm text-gray-400">No interactions recorded yet. Click pins on the map to start canvassing.</p>
          ) : (
            <div className="space-y-3">
              {breakdown.map(b => (
                <div key={b.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} />
                      <span className="text-sm text-gray-700">{b.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">
                      {b.count} <span className="text-xs font-normal text-gray-400">({b.pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: b.pct + '%', backgroundColor: b.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent Activity</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-400">No activity yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2 font-medium text-gray-500">Address</th>
                    <th className="pb-2 font-medium text-gray-500">City</th>
                    <th className="pb-2 font-medium text-gray-500">Status</th>
                    <th className="pb-2 font-medium text-gray-500 hidden sm:table-cell">Date</th>
                    <th className="pb-2 font-medium text-gray-500 hidden md:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recent.map((item) => {
                    const status = statusMap[item.statusId];
                    return (
                      <tr key={item.propertyId} className="hover:bg-gray-50">
                        <td className="py-2.5 pr-3 text-gray-800 max-w-[200px] truncate">{item.address || '\u2014'}</td>
                        <td className="py-2.5 pr-3 text-gray-600">{item.city || '\u2014'}</td>
                        <td className="py-2.5 pr-3">
                          {status ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: status.color }}>
                              {status.name}
                            </span>
                          ) : '\u2014'}
                        </td>
                        <td className="py-2.5 pr-3 text-gray-500 text-xs hidden sm:table-cell">
                          {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '\u2014'}
                        </td>
                        <td className="py-2.5 text-gray-400 text-xs max-w-[200px] truncate hidden md:table-cell">
                          {item.notes || '\u2014'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
