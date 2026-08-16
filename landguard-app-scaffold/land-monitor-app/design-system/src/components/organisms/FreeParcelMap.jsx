import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  MapContainer,
  TileLayer,
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

// Free tile layer options — no API key required
const tileLayers = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, &copy; OpenTopoMap',
    maxZoom: 17,
  },
  street: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 19,
  },
};

const layerOptions = [
  { value: 'satellite', label: 'Satellite' },
  { value: 'terrain', label: 'Terrain' },
  { value: 'street', label: 'Dark' },
];

// Polygon colors matching the EarthGlobal theme
const polygonColors = {
  active: { color: '#3ba7ff', fillColor: '#1677ff', fillOpacity: 0.18 },
  draft: { color: '#5ce1ff', fillColor: '#5ce1ff', fillOpacity: 0.12 },
  alert: { color: '#ff6048', fillColor: '#ff6048', fillOpacity: 0.2 },
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

/**
 * FreeParcelMap — a free, no-API-key-required map using Leaflet + OpenStreetMap
 * tiles (with Esri satellite imagery as a free satellite option). Automatically
 * used by ParcelMap when no Google Maps API key is provided.
 *
 * @param {{lat:number,lng:number}[]} path - polygon path for the parcel boundary
 * @param {'active'|'draft'|'alert'} status - determines polygon coloring
 * @param {string} height - CSS height for the map container
 */
export default function FreeParcelMap({ path = [], center, status = 'active', height }) {
  const [layerType, setLayerType] = useState('satellite');
  const resolvedCenter = center || path[0];
  const positions = path.map((p) => [p.lat, p.lng]);
  const polyStyle = polygonColors[status] || polygonColors.active;

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
        scrollWheelZoom
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url={tileLayers[layerType].url}
          attribution={tileLayers[layerType].attribution}
          maxZoom={tileLayers[layerType].maxZoom}
        />
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
