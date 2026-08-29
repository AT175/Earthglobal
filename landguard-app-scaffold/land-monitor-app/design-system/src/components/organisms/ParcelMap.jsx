import FreeParcelMap from './FreeParcelMap';

/**
 * ParcelMap — shared EarthGlobal map component.
 *
 * Always uses FreeParcelMap (Leaflet + Esri World Imagery / Sentinel-2 via EE).
 * No Google Maps API key required — completely free.
 *
 * Esri World Imagery provides sub-meter satellite imagery (Maxar/DigitalGlobe)
 * at zoom levels up to 19 — comparable to Google Maps satellite, but free.
 *
 * @param {{lat:number,lng:number}[]} path - polygon path for the parcel boundary
 * @param {'active'|'draft'|'alert'} status - determines polygon coloring
 * @param {string} googleMapsApiKey - ignored (kept for API compatibility)
 */
export default function ParcelMap({
  path = [],
  center,
  status = 'active',
  height,
  googleMapsApiKey,
  children,
}) {
  // Always use the free Leaflet-based map — no Google Maps API key needed.
  // Esri World Imagery provides sub-meter satellite imagery for free.
  return <FreeParcelMap path={path} center={center} status={status} height={height}>{children}</FreeParcelMap>;
}
