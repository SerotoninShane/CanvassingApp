export const MAP_CONFIG = {
  style: process.env.NEXT_PUBLIC_MAP_STYLE,
  pmtilesUrl: process.env.NEXT_PUBLIC_PMTILES_URL,
  defaultCenter: [-112.074, 33.4484], // Phoenix, AZ (matches original map center)
  defaultZoom: 11,
  minZoom: 3,
  maxZoom: 18,
};

export const HOMES_LAYER_CONFIG = {
  sourceId: 'homes-source',
  layerId: 'homes-layer',
  layerIdHover: 'homes-layer-hover',
  sourceLayer: 'homes', // must match --layer name used in tippecanoe
};

// Pin appearance
export const PIN_STYLE = {
  defaultColor: '#2563eb',   // blue
  visitedColor: '#16a34a',   // green
  selectedColor: '#dc2626',  // red
  radius: 5,
  strokeWidth: 1.5,
  strokeColor: '#ffffff',
};
