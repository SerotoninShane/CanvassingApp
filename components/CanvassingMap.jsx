'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { STATUS_CONFIG } from '@/lib/canvass-data';

/**
 * CanvassingMap – Leaflet map with VIEWPORT-BASED property loading.
 *
 * Instead of receiving all properties as a prop, this component:
 *   1. Listens to map moveend / zoomend events
 *   2. Fetches only the properties visible in the current viewport
 *      from /api/geojson/viewport (backed by pre-processed grid tiles)
 *   3. Debounces requests to avoid flooding the API during panning
 *   4. Uses marker clustering for dense areas
 *
 * Props:
 *   properties       – (LEGACY) array of manually-added properties to always show
 *   statusFilter     – string | null – only show markers with this canvass status
 *   onMarkerClick(p) – called when a marker is tapped/clicked
 *   fullHeight       – fill parent container
 *   overlays         – array of overlay polygon objects
 *   highlightedOverlayId – id of overlay to highlight
 *   onViewportMeta(meta) – called with viewport query metadata (counts, etc.)
 */
export default function CanvassingMap({
  properties: manualProperties = [],
  statusFilter = null,
  onMarkerClick,
  fullHeight = false,
  overlays = [],
  highlightedOverlayId = null,
  onViewportMeta,
}) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markersRef = useRef(null);       // MarkerClusterGroup
  const leafletRef = useRef(null);
  const overlaysLayerRef = useRef(null);
  const abortRef = useRef(null);         // AbortController for in-flight fetches
  const debounceRef = useRef(null);      // Debounce timer
  const lastBoundsRef = useRef('');       // last fetched bounds key (prevents re-fetch loop)
  const updatingMarkersRef = useRef(false); // true while we're swapping markers (suppresses moveend)
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState(null);

  // Track viewport-loaded properties separately
  const viewportPropsRef = useRef([]);

  // ── Initialize map (once) ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      let MarkerClusterGroup;
      try {
        const mc = await import('leaflet.markercluster');
        await import('leaflet.markercluster/dist/MarkerCluster.css');
        await import('leaflet.markercluster/dist/MarkerCluster.Default.css');
        MarkerClusterGroup =
          mc.MarkerClusterGroup || (L.MarkerClusterGroup ? L.MarkerClusterGroup : null);
      } catch {
        MarkerClusterGroup = null;
      }

      if (cancelled || mapRef.current) return;

      // Fix default icon paths
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        center: [33.4484, -112.074],
        zoom: 11,
        zoomControl: true,
        attributionControl: true,
        inertia: true,
        inertiaDeceleration: 3000,
        easeLinearity: 0.25,
        markerZoomAnimation: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
        updateWhenZooming: false,
        updateWhenIdle: true,
      }).addTo(map);

      map.zoomControl.setPosition('bottomright');
      mapRef.current = map;

      // Marker cluster layer – zoom-aware radius so clusters stay
      // geographically tight at every zoom level
      if (MarkerClusterGroup) {
        const getClusterRadius = (zoom) => {
          if (zoom >= 17) return 8;
          if (zoom >= 16) return 20;
          if (zoom >= 15) return 35;
          if (zoom >= 14) return 50;
          if (zoom >= 13) return 60;
          if (zoom >= 12) return 70;
          return 80; // zoomed out — aggressive grouping
        };

        markersRef.current = new MarkerClusterGroup({
          maxClusterRadius: getClusterRadius,  // function → called per zoom
          disableClusteringAtZoom: 17,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          chunkedLoading: true,
          chunkInterval: 100,
          chunkDelay: 10,
          animate: false,
          removeOutsideVisibleBounds: true,
          singleMarkerMode: false,
          iconCreateFunction: (cluster) => {
            const count = cluster.getChildCount();
            let size = 28;
            let className = 'marker-cluster-small';
            if (count > 50) { size = 34; className = 'marker-cluster-medium'; }
            if (count > 200) { size = 42; className = 'marker-cluster-large'; }
            return L.divIcon({
              html: `<div><span>${count >= 1000 ? Math.round(count / 1000) + 'k' : count}</span></div>`,
              className: `marker-cluster ${className}`,
              iconSize: L.point(size, size),
            });
          },
        });
      } else {
        markersRef.current = L.layerGroup();
      }
      map.addLayer(markersRef.current);

      // Overlay layer
      overlaysLayerRef.current = L.layerGroup();
      map.addLayer(overlaysLayerRef.current);

      setReady(true);
    }

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // ── Pin icon builder ───────────────────────────────────────────────────────
  const createPinIcon = useCallback((color) => {
    const L = leafletRef.current;
    if (!L) return null;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="13" fill="${color}" stroke="#fff" stroke-width="2"/>
        <path d="M14 8l6 5h-2v5H10v-5H8l6-5z" fill="#fff" opacity="0.9"/>
      </svg>`;
    return L.divIcon({
      html: svg,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -16],
      tooltipAnchor: [0, -16],
    });
  }, []);

  const createMarker = useCallback(
    (property) => {
      const L = leafletRef.current;
      if (!L) return null;

      const status = property.canvass_status || 'unknocked';
      const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unknocked;
      const icon = createPinIcon(cfg.color);

      const marker = L.marker([property.lat, property.lng], { icon });
      marker.bindTooltip(property.address || 'Unknown address', {
        direction: 'top',
        offset: [0, -10],
      });
      marker.on('click', () => {
        if (onMarkerClick) onMarkerClick(property);
      });
      return marker;
    },
    [onMarkerClick, createPinIcon]
  );

  // ── Render markers from current data ───────────────────────────────────────
  const renderMarkers = useCallback(
    (viewportFeatures) => {
      if (!markersRef.current || !leafletRef.current) return;

      // Suppress moveend events while we swap markers
      updatingMarkersRef.current = true;

      const group = markersRef.current;
      group.clearLayers();

      // Combine viewport-loaded features + manual properties
      const all = [...viewportFeatures, ...manualProperties];
      const filtered = statusFilter ? all.filter((p) => p.canvass_status === statusFilter) : all;

      const markers = [];
      for (const prop of filtered) {
        if (prop.lat == null || prop.lng == null) continue;
        const marker = createMarker(prop);
        if (marker) markers.push(marker);
      }

      // Bulk add for performance
      if (markers.length > 0) {
        group.addLayers ? group.addLayers(markers) : markers.forEach((m) => group.addLayer(m));
      }

      // Re-enable moveend after a tick (cluster layer may fire events async)
      setTimeout(() => { updatingMarkersRef.current = false; }, 100);
    },
    [manualProperties, statusFilter, createMarker]
  );

  // ── Build a bounds key to detect if viewport actually changed ──────────────
  const getBoundsKey = useCallback(() => {
    const map = mapRef.current;
    if (!map) return '';
    const b = map.getBounds();
    const z = map.getZoom();
    // Round to 4 decimals (~11m) so tiny sub-pixel shifts don't trigger re-fetch
    return [
      b.getNorth().toFixed(4),
      b.getSouth().toFixed(4),
      b.getEast().toFixed(4),
      b.getWest().toFixed(4),
      z,
    ].join(',');
  }, []);

  // ── Fetch viewport data ────────────────────────────────────────────────────
  const fetchViewport = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    // Skip if viewport hasn't meaningfully changed
    const key = getBoundsKey();
    if (key === lastBoundsRef.current) return;
    lastBoundsRef.current = key;

    const bounds = map.getBounds();
    const zoom = map.getZoom();

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const params = new URLSearchParams({
      north: bounds.getNorth().toFixed(6),
      south: bounds.getSouth().toFixed(6),
      east: bounds.getEast().toFixed(6),
      west: bounds.getWest().toFixed(6),
      zoom: String(zoom),
    });

    setLoading(true);

    try {
      const res = await fetch(`/api/geojson/viewport?${params}`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        console.warn('[CanvassingMap] viewport fetch failed:', res.status);
        setLoading(false);
        return;
      }

      const data = await res.json();
      const features = (data.features || []).map((f) => f.properties);

      viewportPropsRef.current = features;
      renderMarkers(features);

      if (data.meta) {
        setMeta(data.meta);
        if (onViewportMeta) onViewportMeta(data.meta);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('[CanvassingMap] viewport fetch error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [renderMarkers, onViewportMeta, getBoundsKey]);

  // ── Debounced viewport loader (skips if markers are being updated) ─────────
  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Don't re-fetch if we just finished rendering markers
      if (updatingMarkersRef.current) return;
      fetchViewport();
    }, 500);
  }, [fetchViewport]);

  // ── Attach map event listeners once ready ──────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    // Initial load
    fetchViewport();

    // Re-fetch on pan/zoom – only moveend (zoomend also fires moveend)
    map.on('moveend', debouncedFetch);

    return () => {
      map.off('moveend', debouncedFetch);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [ready, fetchViewport, debouncedFetch]);

  // ── Re-render when filter or manual properties change ─────────────────────
  useEffect(() => {
    if (!ready) return;
    renderMarkers(viewportPropsRef.current);
  }, [statusFilter, manualProperties, ready, renderMarkers]);

  // ── Sync overlay polygons ──────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !overlaysLayerRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const layer = overlaysLayerRef.current;
    layer.clearLayers();

    for (const overlay of overlays) {
      if (!overlay.geojson) continue;
      const isNoGo = overlay.type === 'no_go';
      const isHighlighted = highlightedOverlayId === overlay.id;

      const geoLayer = L.geoJSON(overlay.geojson, {
        style: () => ({
          color: isNoGo ? '#ef4444' : overlay.color,
          weight: isHighlighted ? 3 : 2,
          opacity: isHighlighted ? 1 : 0.8,
          fillColor: isNoGo ? '#ef4444' : overlay.color,
          fillOpacity: isHighlighted ? 0.35 : isNoGo ? 0.2 : 0.15,
          dashArray: isNoGo ? '8 4' : undefined,
        }),
      });
      const label = isNoGo
        ? `⚠ ${overlay.name} (No-Go)`
        : `${overlay.name}${overlay.assignee ? ` — ${overlay.assignee}` : ''}`;
      geoLayer.bindTooltip(label, { sticky: true, className: 'overlay-tooltip' });
      layer.addLayer(geoLayer);
    }
  }, [overlays, highlightedOverlayId, ready]);

  // ── Invalidate size on resize ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !containerRef.current) return;
    const timer = setTimeout(() => mapRef.current?.invalidateSize(), 200);
    const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
    ro.observe(containerRef.current);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [ready]);

  return (
    <div
      className={`relative w-full overflow-hidden ${
        fullHeight ? 'h-full' : 'rounded-xl shadow-lg border border-gray-200'
      }`}
    >
      {/* Loading overlay */}
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-[#008C99]" />
            <span className="text-sm text-gray-500">Loading map…</span>
          </div>
        </div>
      )}

      {/* Viewport loading indicator */}
      {loading && ready && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg border border-gray-200 flex items-center gap-2">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-[#008C99]" />
          <span className="text-xs font-medium text-gray-600">Loading properties…</span>
        </div>
      )}

      {/* Viewport stats badge */}
      {meta && ready && !loading && (
        <div className="absolute top-3 right-3 z-[1000] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow border border-gray-200">
          <span className="text-xs text-gray-500">
            {meta.returned.toLocaleString()}
            {meta.truncated && ` of ${meta.totalInViewport.toLocaleString()}`}
            {' '}properties
          </span>
        </div>
      )}

      {/* Map container */}
      <div
        ref={containerRef}
        className="w-full"
        style={{
          height: fullHeight ? '100%' : 'calc(100vh - 320px)',
          minHeight: fullHeight ? '100%' : '350px',
        }}
      />
    </div>
  );
}
