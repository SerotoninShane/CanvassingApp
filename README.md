# CanvassingApp

A high-performance door-to-door canvassing application built for **Maricopa County, AZ** — rendering **1.3 million+ property pins** on an interactive map using MapLibre GL JS and PMTiles.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![MapLibre](https://img.shields.io/badge/MapLibre_GL-JS-blue?logo=maplibre)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?logo=tailwindcss)

## Features

- **Interactive Map** — Pan, zoom, and tap 1.3M+ property pins across Maricopa County
- **Interaction Tracking** — Tap a pin to log a status (Contacted, Not Home, Lead, etc.) with notes
- **Custom Statuses** — Define your own interaction statuses with custom colors in Settings
- **List View** — Searchable, paginated table of all properties with address details
- **Reporting** — Dashboard with status breakdowns, bar charts, and recent activity
- **Offline-Ready Data** — All property data served from a local PMTiles file (no external tile server)
- **Free Map Tiles** — Uses [OpenFreeMap](https://openfreemap.org) for base map (no API key required)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Map | MapLibre GL JS + PMTiles protocol |
| Base Tiles | OpenFreeMap (Liberty style) |
| Data | 1.3M properties from Maricopa County GeoJSON → PMTiles via tippecanoe |
| Styling | Tailwind CSS 3.4 |
| Storage | localStorage for interaction data |

## Project Structure

```
app/
  canvassing/
    map/          → Interactive map with property pins
    list/         → Searchable property table
    report/       → Status reporting dashboard
    settings/     → Manage interaction statuses
  api/
    properties/   → Server-side property search API
components/
  MapView.jsx     → MapLibre map with PMTiles + interaction overlay
  PropertyPanel.jsx → Slide-up panel for pin interactions
  BottomNav.jsx   → Tab navigation (Map, List, Report, Settings)
lib/
  canvass-store.js → localStorage CRUD for statuses & interactions
  mapConfig.js     → Map center, zoom, pin styles
scripts/
  convert-maricopa.js → Stream-converts Maricopa County GeoJSON to app format
public/
  homes.pmtiles        → Vector tiles (generated, not in repo)
  data/
    phoenix_homes_wgs84.geojson → Converted property data (generated, not in repo)
```

## Getting Started

### Prerequisites

- Node.js 18+
- [tippecanoe](https://github.com/felt/tippecanoe) (for generating PMTiles from GeoJSON)

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment

Create `.env.local`:

```env
NEXT_PUBLIC_PMTILES_URL=/homes.pmtiles
NEXT_PUBLIC_MAP_STYLE=https://tiles.openfreemap.org/styles/liberty
```

### 3. Prepare property data

If you have a Maricopa County GeoJSON export, convert it:

```bash
node scripts/convert-maricopa.js path/to/Maricopa.geojson
```

This outputs `public/data/phoenix_homes_wgs84.geojson`.

### 4. Generate vector tiles

Using tippecanoe:

```bash
tippecanoe \
  --output=public/homes.pmtiles \
  --layer=homes \
  --minimum-zoom=10 \
  --maximum-zoom=16 \
  --drop-densest-as-needed \
  --no-tile-size-limit \
  --no-feature-limit \
  --force \
  public/data/phoenix_homes_wgs84.geojson
```

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000/canvassing/map](http://localhost:3000/canvassing/map).

## Data Pipeline

```
Maricopa.geojson (660MB, single-line, EPSG:4326)
  │
  ├── scripts/convert-maricopa.js (streaming parser)
  │
  ▼
phoenix_homes_wgs84.geojson (438MB, line-per-feature)
  │
  ├── tippecanoe
  │
  ▼
homes.pmtiles (76MB, vector tiles z10-z16)
  │
  ├── MapLibre GL JS + PMTiles protocol
  │
  ▼
Interactive map with 1.3M+ pins
```

## Large Files

The following files are gitignored because they exceed GitHub's 100MB limit:

- `public/data/phoenix_homes_wgs84.geojson` (438 MB) — regenerate with `convert-maricopa.js`
- `public/homes.pmtiles` (76 MB) — regenerate with tippecanoe

## License

Private project.
