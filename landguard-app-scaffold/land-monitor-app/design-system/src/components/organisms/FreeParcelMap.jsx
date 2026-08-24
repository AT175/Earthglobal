import { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  MapContainer,
  TileLayer,
  WMSTileLayer,
  Polygon,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon paths (not used for polygons, but prevents console errors)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MapWrapper = styled.div`
  position: relative;
  width: 100%;
  height: ${({ $height }) => $height || '500px'};
  border-radius: ${({ theme }) => theme.radii.xl};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.glowCard};

  .leaflet-container {
    width: 100%;
    height: 100%;
    background: ${({ theme }) => theme.colors.backgroundSecondary};
  }

  .leaflet-control-attribution {
    background: ${({ theme }) => theme.colors.surface}CC !important;
    color: ${({ theme }) => theme.colors.textMuted} !important;
    font-size: 10px !important;
    border-radius: ${({ theme }) => theme.radii.sm} 0 0 0;
  }

  .leaflet-control-attribution a {
    color: ${({ theme }) => theme.colors.primaryBright} !important;
  }

  .leaflet-bar {
    border: 1px solid ${({ theme }) => theme.colors.border} !important;
    border-radius: ${({ theme }) => theme.radii.sm} !important;
    overflow: hidden;
  }

  .leaflet-bar a {
    background: ${({ theme }) => theme.colors.surface} !important;
    color: ${({ theme }) => theme.colors.text} !important;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border} !important;

    &:hover {
      background: ${({ theme }) => theme.colors.surfaceLight} !important;
    }
  }
`;

const StyleSwitcher = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.spacing[3]};
  right: ${({ theme }) => theme.spacing[3]};
  z-index: 1000;
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
  background: ${({ theme }) => theme.colors.surface}CC;
  backdrop-filter: blur(12px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.full};
  padding: ${({ theme }) => theme.spacing[1]};
`;

const StyleButton = styled.button`
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.radii.full};
  border: none;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  cursor: pointer;
  color: ${({ theme, $active }) => ($active ? theme.colors.text : theme.colors.textMuted)};
  background: ${({ theme, $active }) => ($active ? theme.colors.primary : 'transparent')};
  box-shadow: ${({ theme, $active }) => ($active ? theme.shadows.glowSoft : 'none')};
  transition: all ${({ theme }) => theme.durations.fast} ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

// Free fallback tile layers — no API key required
const fallbackTiles = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
    maxNativeZoom: 19,
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, &copy; OpenTopoMap',
    maxZoom: 19,
    maxNativeZoom: 17,
  },
  street: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 19,
    maxNativeZoom: 19,
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
    maxNativeZoom: 19,
  },
  ndviFallback: {
    url: 'https://services.sentinel-hub.com/ogc/wms/5758d8eb-2aa7-4f6e-9bd2-5f62e2c1f2c2',
    layers: 'NDVI',
    attribution: '&copy; Sentinel Hub',
    maxZoom: 18,
    maxNativeZoom: 16,
  },
};

const layerOptions = [
  { value: 'satellite', label: 'Satellite' },
  { value: 'osm', label: 'Street' },
  { value: 'ndvi', label: 'NDVI' },
  { value: 'terrain', label: 'Terrain' },
  { value: 'street', label: 'Dark' },
];

// Polygon colors matching the EarthGlobal theme
const polygonColors = {
  active: { color: '#3ba7ff', fillColor: '#1677ff', fillOpacity: 0 },
  draft: { color: '#5ce1ff', fillColor: '#5ce1ff', fillOpacity: 0 },
  alert: { color: '#ff6048', fillColor: '#ff6048', fillOpacity: 0 },
};

// Helper component to recenter the map when path changes
function Recenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], zoom || 17);
    }
  }, [center, zoom, map]);
  return null;
}

// Dynamic tile layer that switches between Earth Engine and fallback tiles
function DynamicTileLayer({ layerType, eeTiles, path }) {
  // For satellite/ndvi: use Earth Engine tiles if available, else fallback
  // For terrain/street/osm: always use free tiles
  if (layerType === 'ndvi') {
    if (eeTiles.ndvi) {
      return <TileLayer url={eeTiles.ndvi.url} attribution={eeTiles.ndvi.attribution} maxZoom={19} maxNativeZoom={19} />;
    }
    // No Earth Engine NDVI available — use free Sentinel Hub WMS NDVI tiles
    const ndvi = fallbackTiles.ndviFallback;
    return (
      <WMSTileLayer
        url={ndvi.url}
        layers={ndvi.layers}
        attribution={ndvi.attribution}
        maxZoom={ndvi.maxZoom}
        maxNativeZoom={ndvi.maxNativeZoom}
        format="image/png"
        transparent
        tileSize={256}
      />
    );
  }

  // Always use Esri World Imagery for satellite — it's higher resolution (sub-meter)
  // than Sentinel-2 (10m/px). EE tiles are only used for NDVI.
  const tile = fallbackTiles[layerType] || fallbackTiles.satellite;
  return <TileLayer url={tile.url} attribution={tile.attribution} maxZoom={tile.maxZoom} maxNativeZoom={tile.maxNativeZoom} />;
}

/**
 * FreeParcelMap — a free map using Leaflet. When Earth Engine is configured on
 * the backend, satellite and NDVI layers use real Sentinel-2 satellite imagery
 * via Earth Engine tile URLs. Otherwise, falls back to free Esri/OpenTopoMap/
 * CARTO tiles — no API key or billing required either way.
 *
 * @param {{lat:number,lng:number}[]} path - polygon path for the parcel boundary
 * @param {'active'|'draft'|'alert'} status - determines polygon coloring
 * @param {string} height - CSS height for the map container
 */
export default function FreeParcelMap({ path = [], center, status = 'active', height }) {
  const [layerType, setLayerType] = useState('satellite');
  const [eeTiles, setEeTiles] = useState({ satellite: null, ndvi: null });
  const resolvedCenter = center || path[0];
  const positions = path.map((p) => [p.lat, p.lng]);
  const polyStyle = polygonColors[status] || polygonColors.active;

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;

  // Compute a bbox from the path for Earth Engine region filtering
  const bbox = path.length > 0
    ? [
        Math.min(...path.map((p) => p.lng)) - 0.01,
        Math.min(...path.map((p) => p.lat)) - 0.01,
        Math.max(...path.map((p) => p.lng)) + 0.01,
        Math.max(...path.map((p) => p.lat)) + 0.01,
      ].join(',')
    : null;

  // Fetch Earth Engine satellite tiles on mount
  useEffect(() => {
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };
    const satelliteUrl = bbox
      ? `${apiUrl}/map-tiles/satellite?bbox=${bbox}`
      : `${apiUrl}/map-tiles/satellite`;

    fetch(satelliteUrl, { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data.url) {
          setEeTiles((prev) => ({ ...prev, satellite: data }));
        }
      })
      .catch(() => {});

    // Fetch NDVI tiles only if we have a bbox
    if (bbox) {
      fetch(`${apiUrl}/map-tiles/ndvi?bbox=${bbox}`, { headers })
        .then((res) => res.json())
        .then((data) => {
          if (data.url) {
            setEeTiles((prev) => ({ ...prev, ndvi: data }));
          }
        })
        .catch(() => {});
    }
  }, [apiUrl, token, bbox]);

  return (
    <MapWrapper $height={height}>
      <StyleSwitcher role="group" aria-label="Map style">
        {layerOptions.map((opt) => (
          <StyleButton
            key={opt.value}
            type="button"
            $active={layerType === opt.value}
            aria-pressed={layerType === opt.value}
            onClick={() => setLayerType(opt.value)}
          >
            {opt.label}
          </StyleButton>
        ))}
      </StyleSwitcher>
      <MapContainer
        center={resolvedCenter ? [resolvedCenter.lat, resolvedCenter.lng] : [0, 0]}
        zoom={17}
        maxZoom={19}
        scrollWheelZoom
        style={{ width: '100%', height: '100%' }}
      >
        <DynamicTileLayer layerType={layerType} eeTiles={eeTiles} path={path} />
        {positions.length > 0 && (
          <Polygon
            positions={positions}
            pathOptions={{
              color: polyStyle.color,
              fillColor: polyStyle.fillColor,
              fillOpacity: polyStyle.fillOpacity,
              weight: 2,
            }}
          />
        )}
        <Recenter center={resolvedCenter} zoom={17} />
      </MapContainer>
    </MapWrapper>
  );
}
