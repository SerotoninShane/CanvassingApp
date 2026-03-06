import { NextResponse } from 'next/server';
import fs from 'fs';
import readline from 'readline';
import path from 'path';

export const runtime = 'nodejs';

// Module-level cache — survives across requests
let cachedProperties = null;
let loadPromise = null;

async function loadProperties() {
  if (cachedProperties) return cachedProperties;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const filePath = path.join(process.cwd(), 'public', 'data', 'phoenix_homes_wgs84.geojson');

    if (!fs.existsSync(filePath)) {
      console.warn('[search API] WGS84 GeoJSON not found at:', filePath);
      return [];
    }

    console.log('[search API] Building property index from GeoJSON (first request only)…');
    const start = Date.now();
    const properties = [];

    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of rl) {
      const trimmed = line.trim().replace(/,$/, '');
      try {
        const obj = JSON.parse(trimmed);
        if (obj.type === 'Feature' && obj.properties) {
          const [lng, lat] = obj.geometry?.coordinates || [0, 0];
          properties.push({
            id: obj.properties.id || '',
            address: obj.properties.address || '',
            city: obj.properties.city || '',
            zip: obj.properties.zip || '',
            area: obj.properties.area || 0,
            puc: obj.properties.puc || '',
            floor: obj.properties.floor || 0,
            lat,
            lng,
          });
        }
      } catch {
        // skip non-Feature lines (FeatureCollection wrapper, etc.)
      }
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[search API] Indexed ${properties.length.toLocaleString()} properties in ${elapsed}s`);

    cachedProperties = properties;
    return properties;
  })();

  return loadPromise;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')));
  const search = (searchParams.get('search') || '').trim().toLowerCase();

  try {
    const allProperties = await loadProperties();

    let filtered = allProperties;
    if (search) {
      filtered = allProperties.filter(p =>
        p.address.toLowerCase().includes(search) ||
        p.city.toLowerCase().includes(search) ||
        p.zip.includes(search) ||
        p.id.includes(search)
      );
    }

    const total = filtered.length;
    const pages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const results = filtered.slice(start, start + limit);

    return NextResponse.json({
      properties: results,
      total,
      page,
      limit,
      pages,
    });
  } catch (err) {
    console.error('[search API] Error:', err);
    return NextResponse.json({ error: 'Failed to load properties' }, { status: 500 });
  }
}
