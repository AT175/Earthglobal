// Custom Google Maps style JSON arrays for EarthGlobal.
// Passed as `options={{ styles: mapStyles.dark }}` to <GoogleMap>.
// "satellite" and "hybrid" mapTypeId already look natural for parcel imagery;
// these vector styles are for the "roadmap"/"terrain" base layers so the chrome
// (roads, labels, water, POIs) matches the deep-navy/electric-blue EarthGlobal theme.

const darkBase = [
  { elementType: 'geometry', stylers: [{ color: '#0d1733' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#080f24' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#aab7d4' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#172647' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#111d3a' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1677ff' }, { weight: 0.4 }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#172647' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0a1a3d' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#5ce1ff' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#0f1c38' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#111d3a' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#123a2b' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
];

export const mapStyles = {
  // Default EarthGlobal dark theme for the roadmap/terrain view
  dark: darkBase,
  // Minimal, high-contrast variant used behind the parcel-drawing UI
  drawing: [
    ...darkBase,
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ],
};

// Parcel boundary render styles, keyed by state (draft/active/alert).
export const parcelPolygonStyles = {
  active: {
    fillColor: '#1677ff',
    fillOpacity: 0.18,
    strokeColor: '#3ba7ff',
    strokeWeight: 2,
    strokeOpacity: 0.9,
  },
  draft: {
    fillColor: '#5ce1ff',
    fillOpacity: 0.12,
    strokeColor: '#5ce1ff',
    strokeWeight: 2,
    strokeOpacity: 0.8,
    strokeOpacity_dashed: true,
  },
  alert: {
    fillColor: '#ff6048',
    fillOpacity: 0.2,
    strokeColor: '#ff6048',
    strokeWeight: 2,
    strokeOpacity: 0.9,
  },
};

// Base map type options surfaced in the map style switcher UI.
export const mapTypeOptions = [
  { value: 'hybrid', label: 'Satellite' },
  { value: 'terrain', label: 'Terrain' },
  { value: 'roadmap', label: 'EarthGlobal' },
];

export default mapStyles;
