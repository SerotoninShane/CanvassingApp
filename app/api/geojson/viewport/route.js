import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/geojson/viewport
 *
 * Returns properties within the requested map viewport.
 *
 * Query params:
 *   north, south, east, west  – viewport bounding box (WGS84)
 *   zoom                      – current map zoom level
 *   limit                     – optional, max features to return (default varies by zoom)
 *
 * The endpoint reads pre-processed grid tile files produced by
 * scripts/preprocess-geojson.js and returns only the tiles that
 * overlap the requested viewport, capped at a per-zoom limit
 * to prevent the browser from choking.
 */

const TILES_DIR = path.join(process.cwd(), 'public', 'data', 'tiles');

// ── Cached index ──────────────────────────────────────────────────────────────
let _index = null;

function getIndex() {
  if (_index) return _index;
  const indexPath = path.join(TILES_DIR, 'index.json');
  if (!fs.existsSync(indexPath)) return null;
  _index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  return _index;
}

// ── Zoom-based feature limits ─────────────────────────────────────────────────
function getMaxFeatures(zoom, explicitLimit) {
  if (explicitLimit) return Math.min(explicitLimit, 20000);
  if (zoom >= 17) return 5000;
  if (zoom >= 16) return 3000;
  if (zoom >= 15) return 2000;
  if (zoom >= 14) return 1500;
  if (zoom >= 13) return 800;
  if (zoom >= 12) return 500;
  if (zoom >= 11) return 300;
  return 150; // valley-wide view – sparse representative points
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const north = parseFloat(searchParams.get('north'));
    const south = parseFloat(searchParams.get('south'));
    const east = parseFloat(searchParams.get('east'));
    const west = parseFloat(searchParams.get('west'));
    const zoom = parseInt(searchParams.get('zoom') || '10', 10);
    const explicitLimit = searchParams.get('limit') ? parseInt(searchParams.get('limit'), 10) : null;

    if ([north, south, east, west].some(isNaN)) {
      return NextResponse.json(
        { error: 'Missing or invalid bounds. Required: north, south, east, west' },
        { status: 400 }
      );
    }

    const index = getIndex();
    if (!index) {
      return NextResponse.json(
        {
          error: 'Tile index not found. Run: node scripts/preprocess-geojson.js',
          hint: 'The GeoJSON must be pre-processed into grid tiles first.',
        },
        { status: 503 }
      );
    }

    const maxFeatures = getMaxFeatures(zoom, explicitLimit);
    const gridSize = index.gridSize || 0.05;

    // Determine which grid cells overlap the viewport
    const latMin = Math.floor(south / gridSize);
    const latMax = Math.floor(north / gridSize);
    const lngMin = Math.floor(west / gridSize);
    const lngMax = Math.floor(east / gridSize);

    let features = [];
    let cellsLoaded = 0;
    let totalInViewport = 0;
    let truncated = false;

    // Read overlapping cells
    for (let latCell = latMin; latCell <= latMax; latCell++) {
      for (let lngCell = lngMin; lngCell <= lngMax; lngCell++) {
        const key = `${latCell}_${lngCell}`;
        const cellInfo = index.cells[key];
        if (!cellInfo) continue;

        // Quick bounds overlap check
        const cb = cellInfo.bounds;
        if (cb.north < south || cb.south > north || cb.east < west || cb.west > east) continue;

        totalInViewport += cellInfo.count;

        // Read the tile file
        const tilePath = path.join(TILES_DIR, `${key}.json`);
        try {
          const tileData = JSON.parse(fs.readFileSync(tilePath, 'utf-8'));

          // Fine-grained bbox filter (cell edges may extend outside viewport)
          const inView = tileData.filter(
            (f) => f.lat >= south && f.lat <= north && f.lng >= west && f.lng <= east
          );

          features.push(...inView);
          cellsLoaded++;
        } catch {
          // Tile file missing or corrupt – skip
        }

        // Early exit if we already have more than enough
        if (features.length >= maxFeatures * 2) break;
      }
      if (features.length >= maxFeatures * 2) break;
    }

    // Downsample if needed
    if (features.length > maxFeatures) {
      truncated = true;
      // Deterministic sampling: take every Nth feature
      const step = features.length / maxFeatures;
      const sampled = [];
      for (let i = 0; i < maxFeatures; i++) {
        sampled.push(features[Math.floor(i * step)]);
      }
      features = sampled;
    }

    return NextResponse.json({
      type: 'FeatureCollection',
      features: features.map((f) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [f.lng, f.lat] },
        properties: f,
      })),
      meta: {
        returned: features.length,
        totalInViewport,
        cellsLoaded,
        maxFeatures,
        truncated,
        zoom,
      },
    });
  } catch (err) {
    console.error('[viewport API]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
