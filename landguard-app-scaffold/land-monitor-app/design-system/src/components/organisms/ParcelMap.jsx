import { useState } from 'react';
import styled from 'styled-components';
import { GoogleMap, Polygon, useJsApiLoader } from '@react-google-maps/api';
import { mapStyles, parcelPolygonStyles, mapTypeOptions } from './mapStyles';
import Spinner from '../atoms/Spinner';
import FreeParcelMap from './FreeParcelMap';

const MapContainer = styled.div`
  position: relative;
  width: 100%;
  height: ${({ $height }) => $height || '500px'};
  border-radius: ${({ theme }) => theme.radii.xl};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.glowCard};
`;

const StyleSwitcher = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.spacing[3]};
  right: ${({ theme }) => theme.spacing[3]};
  z-index: 10;
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

const LoadingWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: ${({ theme }) => theme.colors.backgroundSecondary};
`;

/**
 * ParcelMap — shared EarthGlobal map component.
 * Renders a Google Map with satellite/terrain/EarthGlobal-styled base layers,
 * a style switcher, and a parcel boundary polygon in the appropriate state color.
 *
 * If no Google Maps API key is provided, automatically falls back to FreeParcelMap
 * (Leaflet + OpenStreetMap / Esri satellite tiles — no API key required).
 *
 * @param {{lat:number,lng:number}[]} path - polygon path for the parcel boundary
 * @param {'active'|'draft'|'alert'} status - determines polygon coloring
 * @param {string} googleMapsApiKey - Google Maps API key (optional — falls back to free map)
 */
export default function ParcelMap({
  path = [],
  center,
  status = 'active',
  height,
  googleMapsApiKey,
  children,
}) {
  // Fall back to the free Leaflet-based map when no Google Maps API key is set
  if (!googleMapsApiKey || googleMapsApiKey === 'your_google_maps_key') {
    return <FreeParcelMap path={path} center={center} status={status} height={height} />;
  }

  const [mapType, setMapType] = useState('hybrid');
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey });

  if (!isLoaded) {
    return (
      <MapContainer $height={height}>
        <LoadingWrapper>
          <Spinner size="32px" />
        </LoadingWrapper>
      </MapContainer>
    );
  }

  const resolvedCenter = center || path[0];

  return (
    <MapContainer $height={height}>
      <StyleSwitcher role="group" aria-label="Map style">
        {mapTypeOptions.map((opt) => (
          <StyleButton
            key={opt.value}
            type="button"
            $active={mapType === opt.value}
            aria-pressed={mapType === opt.value}
            onClick={() => setMapType(opt.value)}
          >
            {opt.label}
          </StyleButton>
        ))}
      </StyleSwitcher>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={resolvedCenter}
        zoom={17}
        mapTypeId={mapType}
        options={{
          styles: mapType === 'roadmap' ? mapStyles.dark : undefined,
          disableDefaultUI: false,
          fullscreenControl: true,
          streetViewControl: false,
        }}
      >
        {path.length > 0 && (
          <Polygon paths={path} options={parcelPolygonStyles[status] || parcelPolygonStyles.active} />
        )}
        {children}
      </GoogleMap>
    </MapContainer>
  );
}
