'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { MAP_CONFIG, HOMES_LAYER_CONFIG } from '@/lib/mapConfig';
import { getStatuses, getInteractions } from '@/lib/canvass-store';
import '@/styles/map.css';

// Register PMTiles protocol globally (only once)
let protocolRegistered = false;
function registerPMTilesProtocol() {
  if (protocolRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol('pmtiles', protocol.tile);
  protocolRegistered = true;
}

// Generate a house-in-circle icon as an ImageData for MapLibre
function createHouseIcon(color, size = 28) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const r = size / 2;

  ctx.beginPath();
  ctx.arc(r, r, r - 1.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.moveTo(r, size * 0.25);
  ctx.lineTo(r + size * 0.25, size * 0.46);
  ctx.lineTo(r - size * 0.25, size * 0.46);
  ctx.closePath();
  ctx.fill();
  const bx = r - size * 0.18;
  const by = size * 0.44;
  const bw = size * 0.36;
  const bh = size * 0.26;
  ctx.fillRect(bx, by, bw, bh);

  return ctx.getImageData(0, 0, size, size);
}

const DEFAULT_PIN_COLOR = '#9ca3af';

export default function MapView({ refreshKey = 0, onPinClick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const onPinClickRef = useRef(onPinClick);
  const [mapReady, setMapReady] = useState(false);

  // Keep callback ref fresh without re-initializing map
  useEffect(() => { onPinClickRef.current = onPinClick; }, [onPinClick]);

  // ─── Initialize map (runs once) ───────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    registerPMTilesProtocol();

    const m = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_CONFIG.style,
      center: MAP_CONFIG.defaultCenter,
      zoom: MAP_CONFIG.defaultZoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      antialias: false,
      refreshExpiredTiles: false,
      fadeDuration: 0,
      scrollZoom: true,
    });
    mapRef.current = m;

    m.on('load', () => {
      // Default (gray) house icon
      m.addImage('house-default', createHouseIcon(DEFAULT_PIN_COLOR, 28), { pixelRatio: 1 });

      // ── PMTiles source ──
      m.addSource(HOMES_LAYER_CONFIG.sourceId, {
        type: 'vector',
        url: `pmtiles://${MAP_CONFIG.pmtilesUrl}`,
        minzoom: 10,
        maxzoom: 16,
      });

      // Dot layer (z10-13)
      m.addLayer({
        id: 'homes-dots',
        type: 'circle',
        source: HOMES_LAYER_CONFIG.sourceId,
        'source-layer': HOMES_LAYER_CONFIG.sourceLayer,
        minzoom: 10,
        maxzoom: 13,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 13, 3],
          'circle-color': DEFAULT_PIN_COLOR,
          'circle-stroke-width': 0.5,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.85,
        },
      });

      // Icon layer (z13+)
      m.addLayer({
        id: 'homes-icons',
        type: 'symbol',
        source: HOMES_LAYER_CONFIG.sourceId,
        'source-layer': HOMES_LAYER_CONFIG.sourceLayer,
        minzoom: 13,
        layout: {
          'icon-image': 'house-default',
          'icon-size': ['interpolate', ['linear'], ['zoom'], 13, 0.55, 15, 0.85, 18, 1.2],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      });

      // ── Interactions overlay (GeoJSON — colored pins for interacted properties) ──
      m.addSource('interactions-overlay', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Overlay dots (z10-13)
      m.addLayer({
        id: 'overlay-dots',
        type: 'circle',
        source: 'interactions-overlay',
        minzoom: 10,
        maxzoom: 13,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 2.5, 13, 5],
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.95,
        },
      });

      // Overlay icons (z13+)
      m.addLayer({
        id: 'overlay-icons',
        type: 'symbol',
        source: 'interactions-overlay',
        minzoom: 13,
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': ['interpolate', ['linear'], ['zoom'], 13, 0.65, 15, 0.95, 18, 1.3],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      });

      // ── Click handler (single, map-level, with priority for overlay) ──
      m.on('click', (e) => {
        // Check overlay first
        const overlayHits = m.queryRenderedFeatures(e.point, {
          layers: ['overlay-icons', 'overlay-dots'],
        });
        if (overlayHits.length) {
          const f = overlayHits[0];
          const [lng, lat] = f.geometry.coordinates;
          onPinClickRef.current?.({ ...f.properties, lat, lng });
          return;
        }
        // Then PMTiles
        const pmHits = m.queryRenderedFeatures(e.point, {
          layers: ['homes-icons', 'homes-dots'],
        });
        if (pmHits.length) {
          const f = pmHits[0];
          const [lng, lat] = f.geometry.coordinates;
          onPinClickRef.current?.({ ...f.properties, lat, lng });
          return;
        }
      });

      // Cursor changes
      const allLayers = ['overlay-icons', 'overlay-dots', 'homes-icons', 'homes-dots'];
      for (const id of allLayers) {
        m.on('mouseenter', id, () => { m.getCanvas().style.cursor = 'pointer'; });
        m.on('mouseleave', id, () => { m.getCanvas().style.cursor = ''; });
      }

      // Smooth zoom
      m.scrollZoom.setWheelZoomRate(1 / 200);
      m.scrollZoom.setZoomRate(1 / 100);

      // Controls
      m.addControl(new maplibregl.NavigationControl(), 'top-right');
      m.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
        }),
        'top-right'
      );

      setMapReady(true);
    });

    return () => {
      m.remove();
      mapRef.current = null;
    };
  }, []);

  // ─── Sync interaction overlay whenever refreshKey changes ─────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const m = mapRef.current;

    const statuses = getStatuses();
    const interactions = getInteractions();

    // Ensure a house icon image exists for each status color
    for (const status of statuses) {
      const imageId = `house-${status.id}`;
      if (m.hasImage(imageId)) m.removeImage(imageId);
      m.addImage(imageId, createHouseIcon(status.color, 28), { pixelRatio: 1 });
    }

    // Build overlay GeoJSON
    const statusMap = new Map(statuses.map(s => [s.id, s]));
    const features = Object.entries(interactions)
      .filter(([, d]) => d.lat != null && d.lng != null && d.statusId)
      .map(([propId, data]) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [data.lng, data.lat],
        },
        properties: {
          id: propId,
          address: data.address || '',
          city: data.city || '',
          zip: data.zip || '',
          area: data.area || 0,
          puc: data.puc || '',
          floor: data.floor || 0,
          color: statusMap.get(data.statusId)?.color || DEFAULT_PIN_COLOR,
          icon: `house-${data.statusId}`,
        },
      }));

    const source = m.getSource('interactions-overlay');
    if (source) {
      source.setData({ type: 'FeatureCollection', features });
    }
  }, [mapReady, refreshKey]);

  return <div ref={containerRef} className="map-container" />;
}
