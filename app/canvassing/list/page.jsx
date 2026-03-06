'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getStatuses, getInteractions } from '@/lib/canvass-store';

export default function ListPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [statuses, setStatuses] = useState([]);
  const [interactions, setInteractionMap] = useState({});
  const searchTimer = useRef(null);

  const LIMIT = 50;

  useEffect(() => {
    setStatuses(getStatuses());
    setInteractionMap(getInteractions());
  }, []);

  const loadData = useCallback(async (searchTerm, pageNum) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: LIMIT.toString(),
      });
      if (searchTerm) params.set('search', searchTerm);

      const res = await fetch('/api/properties/search?' + params.toString());
      const data = await res.json();

      setProperties(data.properties || []);
      setTotalPages(data.pages || 0);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load properties', err);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    loadData(search, page);
  }, [page, loadData]);

  function handleSearch(value) {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      loadData(value, 1);
    }, 300);
  }

  const statusMap = Object.fromEntries(statuses.map(s => [s.id, s]));

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search address, city, or ZIP…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008C99] focus:border-transparent"
          />
        </div>
        <span className="text-sm text-gray-500 whitespace-nowrap">
          {total.toLocaleString()} properties
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading && initialLoad ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-[#008C99]" />
            <span className="text-sm text-gray-500">Loading properties… (first load may take a moment)</span>
          </div>
        ) : properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-sm">No properties found</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">Address</th>
                <th className="px-4 py-3 font-medium text-gray-600">City</th>
                <th className="px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">ZIP</th>
                <th className="px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Area (sqft)</th>
                <th className="px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Floors</th>
                <th className="px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Deed / Use Code</th>
                <th className="px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Parcel ID</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {properties.map((prop) => {
                const interaction = interactions[String(prop.id)];
                const status = interaction ? statusMap[interaction.statusId] : null;
                return (
                  <tr key={prop.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{prop.address || '\u2014'}</td>
                    <td className="px-4 py-3 text-gray-600">{prop.city || '\u2014'}</td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{prop.zip || '\u2014'}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{prop.area ? Number(prop.area).toLocaleString() : '\u2014'}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{prop.floor || '\u2014'}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell font-mono text-xs">{prop.puc || '\u2014'}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell font-mono text-xs">{prop.id || '\u2014'}</td>
                    <td className="px-4 py-3">
                      {status ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: status.color }}>
                          {status.name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">\u2014</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-gray-200 bg-white px-4 py-3 flex items-center justify-between flex-shrink-0">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages.toLocaleString()}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
