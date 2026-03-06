'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import PropertyPanel from '@/components/PropertyPanel';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-100">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-[#008C99]" />
        <span className="text-sm text-gray-500">Loading map…</span>
      </div>
    </div>
  ),
});

export default function MapPage() {
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePinClick = useCallback((property) => {
    setSelectedProperty(property);
  }, []);

  const handleStatusChange = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedProperty(null);
  }, []);

  return (
    <main className="relative w-full h-[calc(100vh-4rem)] overflow-hidden">
      <MapView
        refreshKey={refreshKey}
        onPinClick={handlePinClick}
      />
      {selectedProperty && (
        <PropertyPanel
          property={selectedProperty}
          onClose={handleClosePanel}
          onStatusChange={handleStatusChange}
        />
      )}
    </main>
  );
}
