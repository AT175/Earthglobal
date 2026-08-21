import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  MapContainer, TileLayer, Polygon, GeoJSON, useMap, CircleMarker, Popup,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Building2, MapPin, Trees, Satellite, Loader, RefreshCw, CheckCircle2,
  XCircle, AlertTriangle, LogOut, Landmark, Search, Save, X, Layers,
  Ruler, Eye, EyeOff, ZoomIn,
} from 'lucide-react';
import api from '../../services/api';

// Fix Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ═══════════════════════════════════════════════════════════
// Styled Components
// ═══════════════════════════════════════════════════════════
const Page = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.body};
  display: flex;
  flex-direction: column;
`;

const TopBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 1000;
  background: ${({ theme }) => theme.colors.background}f0;
  backdrop-filter: blur(12px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
`;

const LogoIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.gradientPrimary};
  box-shadow: ${({ theme }) => theme.shadows.glowSoft};
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const UserBadge = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: ${({ theme }) => theme.fontSizes.sm};

  span:first-child { font-weight: 600; }
  span:last-child { color: ${({ theme }) => theme.colors.textMuted}; font-size: 0.75rem; }
`;

const LogoutBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  color: ${({ theme }) => theme.colors.textMuted};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s;

  &:hover { color: ${({ theme }) => theme.colors.error}; border-color: ${({ theme }) => theme.colors.error}40; }
`;

const Content = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const Sidebar = styled.aside`
  width: 340px;
  background: ${({ theme }) => theme.colors.surface};
  border-right: 1px solid ${({ theme }) => theme.colors.borderDark};
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  @media (max-width: 1024px) {
    width: 280px;
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const SidebarSection = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
`;

const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const LayerToggle = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text};
  transition: color 0.2s;

  &:hover { color: ${({ theme }) => theme.colors.primaryBright}; }
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  accent-color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.surfaceLight};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 12px;
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: 700;
  color: ${({ $color }) => $color || 'inherit'};
`;

const StatLabel = styled.div`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 2px;
`;

const BuildingList = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const BuildingItem = styled.div`
  padding: 12px ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  cursor: pointer;
  transition: background 0.2s;

  &:hover { background: ${({ theme }) => theme.colors.surfaceLight}; }
  ${({ $selected }) => $selected && `background: rgba(22,119,255,0.1); border-left: 3px solid #1677ff;`}
`;

const BuildingName = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const BuildingMeta = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 4px;
  display: flex;
  gap: 12px;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 600;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`;

const MapArea = styled.div`
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
`;

const MapWrapper = styled.div`
  flex: 1;
  position: relative;

  .leaflet-container {
    width: 100%;
    height: 100%;
    background: #080f24;
  }

  .leaflet-control-attribution {
    background: rgba(8,15,36,0.8) !important;
    color: #aab7d4 !important;
    font-size: 10px !important;
  }

  .leaflet-control-attribution a {
    color: #5ce1ff !important;
  }

  .leaflet-bar {
    border: 1px solid rgba(92,225,255,0.2) !important;
    border-radius: 8px !important;
    overflow: hidden;
  }

  .leaflet-bar a {
    background: rgba(13,23,51,0.9) !important;
    color: #e6edf7 !important;
    border-bottom: 1px solid rgba(92,225,255,0.1) !important;

    &:hover { background: rgba(22,119,255,0.2) !important; }
  }
`;

const MapOverlay = styled.div`
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const MapButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(13,23,51,0.9);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(92,225,255,0.2);
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover { border-color: ${({ theme }) => theme.colors.primary}; background: rgba(22,119,255,0.15); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const LayerControl = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1000;
  background: rgba(13,23,51,0.9);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(92,225,255,0.2);
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 12px;
  min-width: 180px;
`;

const LayerControlTitle = styled.div`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const DetectionPanel = styled.div`
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
  z-index: 1000;
  background: rgba(13,23,51,0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(92,225,255,0.2);
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 16px;
  display: ${({ $show }) => ($show ? 'block' : 'none')};
`;

const DetectionTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const DetectionStats = styled.div`
  display: flex;
  gap: 24px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textMuted};

  strong { color: ${({ theme }) => theme.colors.text}; font-size: 1.1rem; }
`;

const BuildingEditPanel = styled.div`
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 1000;
  background: rgba(13,23,51,0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(92,225,255,0.3);
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 20px;
  width: 340px;
  display: ${({ $show }) => ($show ? 'block' : 'none')};
`;

const PanelTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 600;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FormGroup = styled.div`margin-bottom: 12px;`;

const Label = styled.label`
  display: block;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: 4px;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 10px;
  background: rgba(8,15,36,0.8);
  border: 1px solid rgba(92,225,255,0.15);
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.85rem;
  outline: none;

  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const Select = styled.select`
  width: 100%;
  padding: 8px 10px;
  background: rgba(8,15,36,0.8);
  border: 1px solid rgba(92,225,255,0.15);
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.85rem;
  outline: none;

  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 8px 10px;
  background: rgba(8,15,36,0.8);
  border: 1px solid rgba(92,225,255,0.15);
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.85rem;
  outline: none;
  min-height: 60px;
  resize: vertical;

  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const BtnRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
`;

const Btn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s;

  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const PrimaryBtn = styled(Btn)`
  background: linear-gradient(135deg, #1677ff, #5ce1ff);
  color: white;
`;

const SecondaryBtn = styled(Btn)`
  background: transparent;
  border: 1px solid rgba(92,225,255,0.2);
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Toast = styled.div`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3000;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: ${({ $type }) => $type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'};
  border: 1px solid ${({ $type }) => $type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'};
  border-radius: 12px;
  color: ${({ $type }) => $type === 'error' ? '#f87171' : '#4ade80'};
  font-size: 0.9rem;
  backdrop-filter: blur(12px);
`;

const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(8,15,36,0.7);
  backdrop-filter: blur(4px);
  flex-direction: column;
  gap: 12px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.9rem;
`;

// ── Helper: Fit map to bounds ──
function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [bounds, map]);
  return null;
}

// ── Building status colors ──
const buildingStatusColors = {
  unverified: { color: '#fbbf24', fillColor: '#fbbf24', fillOpacity: 0.3 },
  verified_permitted: { color: '#4ade80', fillColor: '#4ade80', fillOpacity: 0.3 },
  verified_unpermitted: { color: '#f87171', fillColor: '#f87171', fillOpacity: 0.3 },
  under_investigation: { color: '#c084fc', fillColor: '#c084fc', fillOpacity: 0.3 },
  demolished: { color: '#6b7280', fillColor: '#6b7280', fillOpacity: 0.2 },
};

const statusBadgeColors = {
  unverified: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  verified_permitted: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  verified_unpermitted: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  under_investigation: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc' },
  demolished: { bg: 'rgba(107,112,128,0.15)', color: '#9ca3af' },
};

// Default center: Amansie West, Ashanti Region, Ghana
const DEFAULT_CENTER = [6.20, -1.85];

export default function PlanningDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [orgInfo, setOrgInfo] = useState(null);
  const [parcelsFC, setParcelsFC] = useState(null);
  const [buildingsFC, setBuildingsFC] = useState(null);
  const [protectedFC, setProtectedFC] = useState(null);
  const [districtBoundary, setDistrictBoundary] = useState(null);
  const [satelliteTiles, setSatelliteTiles] = useState(null);
  const [detectionResult, setDetectionResult] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mapBounds, setMapBounds] = useState(null);
  const [toast, setToast] = useState(null);

  // Layer visibility
  const [showParcels, setShowParcels] = useState(true);
  const [showBuildings, setShowBuildings] = useState(true);
  const [showProtected, setShowProtected] = useState(true);
  const [showDistrict, setShowDistrict] = useState(true);
  const [showDetection, setShowDetection] = useState(false);
  const [baseLayer, setBaseLayer] = useState('satellite');

  // Selected building
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [editForm, setEditForm] = useState({ status: '', notes: '', in_protected_area: false });
  const [savingBuilding, setSavingBuilding] = useState(false);

  // Building list search
  const [search, setSearch] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) setUser(JSON.parse(userStr));
    loadAll();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAll = async () => {
    try {
      const [org, parcels, buildings, protectedAreas, district] = await Promise.all([
        api.get('/assembly/organization'),
        api.get('/assembly/planning/parcels-geojson'),
        api.get('/assembly/planning/buildings-geojson'),
        api.get('/assembly/planning/protected-areas-geojson'),
        api.get('/assembly/planning/district-boundary'),
      ]);

      setOrgInfo(org.data);
      setParcelsFC(parcels.data);
      setBuildingsFC(buildings.data);
      setProtectedFC(protectedAreas.data);
      setDistrictBoundary(district.data);

      // Compute map bounds from all features
      const allCoords = [];
      if (parcels.data.features) {
        parcels.data.features.forEach(f => {
          if (f.geometry?.coordinates?.[0]) {
            f.geometry.coordinates[0].forEach(([lng, lat]) => allCoords.push([lat, lng]));
          }
        });
      }
      if (buildings.data.features) {
        buildings.data.features.forEach(f => {
          if (f.geometry?.coordinates?.[0]) {
            f.geometry.coordinates[0].forEach(([lng, lat]) => allCoords.push([lat, lng]));
          }
        });
      }
      if (allCoords.length > 0) {
        const latMin = Math.min(...allCoords.map(c => c[0]));
        const latMax = Math.max(...allCoords.map(c => c[0]));
        const lngMin = Math.min(...allCoords.map(c => c[1]));
        const lngMax = Math.max(...allCoords.map(c => c[1]));
        setMapBounds([[latMin, lngMin], [latMax, lngMax]]);
      }

      // Fetch satellite tiles for the area
      if (allCoords.length > 0) {
        const bbox = `${lngMin},${latMin},${lngMax},${latMax}`;
        try {
          const tilesRes = await api.get(`/assembly/planning/satellite-tiles?bbox=${bbox}`);
          if (tilesRes.data.url) setSatelliteTiles(tilesRes.data);
        } catch {}
      }
    } catch (err) {
      showToast('Failed to load planning data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Run building detection over current map view ──
  const runDetection = async () => {
    if (!mapBounds) {
      showToast('Map not loaded yet', 'error');
      return;
    }

    setDetecting(true);
    setShowDetection(true);
    setDetectionResult(null);

    try {
      const bbox = {
        minLng: mapBounds[0][1],
        minLat: mapBounds[0][0],
        maxLng: mapBounds[1][1],
        maxLat: mapBounds[1][0],
      };

      const { data } = await api.post('/assembly/planning/detect-buildings', { bbox });

      if (data.detected) {
        setDetectionResult(data);
        setBaseLayer('detection');
        showToast(`Detected ~${data.stats.estimated_buildings} buildings (${data.stats.builtup_area_sqm.toLocaleString()} m² built-up)`);
      } else {
        showToast(data.error || 'Earth Engine not configured', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Detection failed', 'error');
    } finally {
      setDetecting(false);
    }
  };

  // ── Building click handler ──
  const onBuildingClick = (feature) => {
    const props = feature.properties;
    setSelectedBuilding(props);
    setEditForm({
      status: props.status,
      notes: props.notes || '',
      in_protected_area: props.in_protected_area,
    });
  };

  // ── Save building update ──
  const saveBuilding = async () => {
    if (!selectedBuilding) return;
    setSavingBuilding(true);
    try {
      await api.patch(`/assembly/planning/buildings/${selectedBuilding.id}`, editForm);
      showToast('Building updated');
      setSelectedBuilding(null);
      // Reload buildings
      const { data } = await api.get('/assembly/planning/buildings-geojson');
      setBuildingsFC(data);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update', 'error');
    } finally {
      setSavingBuilding(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // ── GeoJSON style functions ──
  const parcelStyle = () => ({
    color: '#3ba7ff',
    fillColor: '#1677ff',
    fillOpacity: 0.1,
    weight: 2,
  });

  const protectedAreaStyle = () => ({
    color: '#22c55e',
    fillColor: '#22c55e',
    fillOpacity: 0.15,
    weight: 2,
    dashArray: '5,5',
  });

  const districtStyle = () => ({
    color: '#5ce1ff',
    fillColor: '#5ce1ff',
    fillOpacity: 0.05,
    weight: 3,
  });

  const buildingStyle = (feature) => {
    const colors = buildingStatusColors[feature.properties.status] || buildingStatusColors.unverified;
    return {
      ...colors,
      weight: 2,
    };
  };

  // ── Filtered building list ──
  const buildingList = buildingsFC?.features || [];
  const filteredBuildings = buildingList.filter(b => {
    const s = b.properties.status || '';
    return s.toLowerCase().includes(search.toLowerCase()) ||
      (b.properties.parcel_name || '').toLowerCase().includes(search.toLowerCase());
  });

  // ── Base tile layer ──
  const fallbackSatellite = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const fallbackStreet = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  return (
    <Page>
      <TopBar>
        <Logo>
          <LogoIcon><Landmark size={22} /></LogoIcon>
          EarthGlobal <span style={{ color: '#5ce1ff' }}>Planning</span>
        </Logo>
        <UserInfo>
          {user && (
            <UserBadge>
              <span>{user.name}</span>
              <span>{user.assemblyRole?.replace(/_/g, ' ')}</span>
            </UserBadge>
          )}
          <LogoutBtn onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </LogoutBtn>
        </UserInfo>
      </TopBar>

      <Content>
        {/* ── Sidebar ── */}
        <Sidebar>
          {orgInfo && (
            <SidebarSection>
              <SectionTitle><MapPin size={14} /> {orgInfo.name}</SectionTitle>
              <div style={{ fontSize: '0.8rem', color: '#aab7d4' }}>
                {orgInfo.region} — {(orgInfo.type || '').replace(/_/g, ' ')}
              </div>
            </SidebarSection>
          )}

          <SidebarSection>
            <SectionTitle><Layers size={14} /> Map Layers</SectionTitle>
            <LayerToggle>
              <Checkbox type="checkbox" checked={showParcels} onChange={(e) => setShowParcels(e.target.checked)} />
              <MapPin size={14} color="#3ba7ff" /> Parcels ({parcelsFC?.features?.length || 0})
            </LayerToggle>
            <LayerToggle>
              <Checkbox type="checkbox" checked={showBuildings} onChange={(e) => setShowBuildings(e.target.checked)} />
              <Building2 size={14} color="#fbbf24" /> Buildings ({buildingsFC?.features?.length || 0})
            </LayerToggle>
            <LayerToggle>
              <Checkbox type="checkbox" checked={showProtected} onChange={(e) => setShowProtected(e.target.checked)} />
              <Trees size={14} color="#22c55e" /> Protected Areas ({protectedFC?.features?.length || 0})
            </LayerToggle>
            <LayerToggle>
              <Checkbox type="checkbox" checked={showDistrict} onChange={(e) => setShowDistrict(e.target.checked)} />
              <MapPin size={14} color="#5ce1ff" /> District Boundary
            </LayerToggle>
          </SidebarSection>

          <SidebarSection>
            <SectionTitle><Building2 size={14} /> Building Stats</SectionTitle>
            <StatsGrid>
              <StatCard>
                <StatValue $color="#fbbf24">
                  {buildingList.filter(b => b.properties.status === 'unverified').length}
                </StatValue>
                <StatLabel>Unverified</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue $color="#4ade80">
                  {buildingList.filter(b => b.properties.status === 'verified_permitted').length}
                </StatValue>
                <StatLabel>Permitted</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue $color="#f87171">
                  {buildingList.filter(b => b.properties.status === 'verified_unpermitted').length}
                </StatValue>
                <StatLabel>Unpermitted</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue $color="#c084fc">
                  {buildingList.filter(b => b.properties.status === 'under_investigation').length}
                </StatValue>
                <StatLabel>Investigating</StatLabel>
              </StatCard>
            </StatsGrid>
          </SidebarSection>

          <SidebarSection style={{ borderBottom: 'none' }}>
            <SectionTitle><Search size={14} /> Search Buildings</SectionTitle>
            <Input
              placeholder="Search by status or parcel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </SidebarSection>

          <BuildingList>
            {filteredBuildings.map((b, i) => {
              const props = b.properties;
              const badge = statusBadgeColors[props.status] || statusBadgeColors.unverified;
              return (
                <BuildingItem
                  key={props.id || i}
                  $selected={selectedBuilding?.id === props.id}
                  onClick={() => onBuildingClick(b)}
                >
                  <BuildingName>
                    <Building2 size={14} color={badge.color} />
                    Building #{i + 1}
                  </BuildingName>
                  <BuildingMeta>
                    <span><Ruler size={11} /> {Math.round(props.area_sqm)}m²</span>
                    {props.parcel_name && <span>{props.parcel_name}</span>}
                  </BuildingMeta>
                  <div style={{ marginTop: 4 }}>
                    <StatusBadge $bg={badge.bg} $color={badge.color}>
                      {props.status?.replace(/_/g, ' ')}
                    </StatusBadge>
                    {props.in_protected_area && (
                      <StatusBadge $bg="rgba(239,68,68,0.15)" $color="#f87171" style={{ marginLeft: 4 }}>
                        <AlertTriangle size={9} /> Protected
                      </StatusBadge>
                    )}
                  </div>
                </BuildingItem>
              );
            })}
            {filteredBuildings.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#aab7d4', fontSize: '0.85rem' }}>
                No buildings found. Run detection to find new buildings.
              </div>
            )}
          </BuildingList>
        </Sidebar>

        {/* ── Map ── */}
        <MapArea>
          <MapWrapper>
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={14}
              scrollWheelZoom
              style={{ width: '100%', height: '100%' }}
            >
              {/* Base layer */}
              {baseLayer === 'satellite' && (
                <TileLayer
                  url={satelliteTiles?.url || fallbackSatellite}
                  attribution={satelliteTiles?.attribution || 'Tiles &copy; Esri'}
                  maxZoom={19}
                />
              )}
              {baseLayer === 'street' && (
                <TileLayer url={fallbackStreet} attribution="&copy; OpenStreetMap, &copy; CARTO" maxZoom={19} />
              )}
              {baseLayer === 'detection' && detectionResult?.tileUrl && (
                <>
                  <TileLayer url={satelliteTiles?.url || fallbackSatellite} attribution="" maxZoom={19} />
                  <TileLayer
                    url={detectionResult.tileUrl}
                    attribution={detectionResult.attribution}
                    maxZoom={19}
                    opacity={0.6}
                  />
                </>
              )}

              {/* District boundary */}
              {showDistrict && districtBoundary?.boundary && (
                <GeoJSON data={districtBoundary.boundary} style={districtStyle} />
              )}

              {/* Parcels */}
              {showParcels && parcelsFC && (
                <GeoJSON data={parcelsFC} style={parcelStyle}
                  onEachFeature={(feature, layer) => {
                    if (feature.properties) {
                      layer.bindPopup(`<b>${feature.properties.name}</b><br/>${feature.properties.region || ''}<br/>${Math.round(feature.properties.area_sqm)} m²<br/>Owner: ${feature.properties.owner_name || '—'}`);
                    }
                  }}
                />
              )}

              {/* Protected areas */}
              {showProtected && protectedFC && (
                <GeoJSON data={protectedFC} style={protectedAreaStyle}
                  onEachFeature={(feature, layer) => {
                    if (feature.properties) {
                      layer.bindPopup(`<b>${feature.properties.name}</b><br/>Type: ${feature.properties.type?.replace(/_/g, ' ')}<br/>${feature.properties.description || ''}`);
                    }
                  }}
                />
              )}

              {/* Buildings */}
              {showBuildings && buildingsFC && (
                <GeoJSON data={buildingsFC} style={buildingStyle}
                  onEachFeature={(feature, layer) => {
                    if (feature.properties) {
                      const p = feature.properties;
                      layer.bindPopup(`<b>Building</b><br/>Status: ${p.status?.replace(/_/g, ' ')}<br/>Area: ${Math.round(p.area_sqm)} m²<br/>${p.parcel_name ? 'Parcel: ' + p.parcel_name : ''}<br/>${p.in_protected_area ? '<b style="color:red">In protected area!</b>' : ''}`);
                      layer.on('click', () => onBuildingClick(feature));
                    }
                  }}
                />
              )}

              <FitBounds bounds={mapBounds} />
            </MapContainer>

            {/* Map overlay buttons */}
            <MapOverlay>
              <MapButton onClick={runDetection} disabled={detecting}>
                {detecting ? <Loader size={16} className="animate-spin" /> : <Satellite size={16} />}
                {detecting ? 'Detecting...' : 'Detect Buildings'}
              </MapButton>
              <MapButton onClick={loadAll}>
                <RefreshCw size={16} /> Refresh Data
              </MapButton>
            </MapOverlay>

            {/* Layer control */}
            <LayerControl>
              <LayerControlTitle><Layers size={14} /> Base Layer</LayerControlTitle>
              <LayerToggle>
                <input type="radio" name="baseLayer" checked={baseLayer === 'satellite'} onChange={() => setBaseLayer('satellite')} />
                <Satellite size={14} /> Satellite
              </LayerToggle>
              <LayerToggle>
                <input type="radio" name="baseLayer" checked={baseLayer === 'street'} onChange={() => setBaseLayer('street')} />
                <MapPin size={14} /> Dark Map
              </LayerToggle>
              {detectionResult && (
                <LayerToggle>
                  <input type="radio" name="baseLayer" checked={baseLayer === 'detection'} onChange={() => setBaseLayer('detection')} />
                  <Building2 size={14} /> Detection Overlay
                </LayerToggle>
              )}
            </LayerControl>

            {/* Detection results panel */}
            <DetectionPanel $show={!!detectionResult}>
              <DetectionTitle>
                <Satellite size={16} color="#5ce1ff" />
                Building Detection Results
                <button onClick={() => { setDetectionResult(null); setBaseLayer('satellite'); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#aab7d4', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </DetectionTitle>
              <DetectionStats>
                <div><strong>{detectionResult?.stats?.estimated_buildings || 0}</strong> estimated buildings</div>
                <div><strong>{(detectionResult?.stats?.builtup_area_sqm || 0).toLocaleString()}</strong> m² built-up area</div>
                <div><strong>{detectionResult?.stats?.builtup_pixels || 0}</strong> pixels</div>
              </DetectionStats>
              <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#aab7d4' }}>
                {detectionResult?.method}
              </div>
            </DetectionPanel>

            {/* Building edit panel */}
            <BuildingEditPanel $show={!!selectedBuilding}>
              <PanelTitle>
                <Building2 size={18} color="#5ce1ff" /> Update Building
                <button onClick={() => setSelectedBuilding(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#aab7d4', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </PanelTitle>

              {selectedBuilding && (
                <>
                  <div style={{ fontSize: '0.8rem', color: '#aab7d4', marginBottom: 12 }}>
                    Area: {Math.round(selectedBuilding.area_sqm)} m²
                    {selectedBuilding.parcel_name && ` - ${selectedBuilding.parcel_name}`}
                  </div>

                  <FormGroup>
                    <Label>Status</Label>
                    <Select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                      <option value="unverified">Unverified</option>
                      <option value="verified_permitted">Verified - Permitted</option>
                      <option value="verified_unpermitted">Verified - Unpermitted</option>
                      <option value="under_investigation">Under Investigation</option>
                      <option value="demolished">Demolished</option>
                    </Select>
                  </FormGroup>

                  <FormGroup>
                    <Label>Notes</Label>
                    <TextArea
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      placeholder="Add inspection notes..."
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label>
                      <input
                        type="checkbox"
                        checked={editForm.in_protected_area}
                        onChange={(e) => setEditForm({ ...editForm, in_protected_area: e.target.checked })}
                        style={{ marginRight: 6 }}
                      />
                      In Protected Area
                    </Label>
                  </FormGroup>

                  <BtnRow>
                    <PrimaryBtn onClick={saveBuilding} disabled={savingBuilding}>
                      {savingBuilding ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                      {savingBuilding ? 'Saving...' : 'Save'}
                    </PrimaryBtn>
                    <SecondaryBtn onClick={() => setSelectedBuilding(null)}>Cancel</SecondaryBtn>
                  </BtnRow>
                </>
              )}
            </BuildingEditPanel>

            {/* Loading overlay */}
            {loading && (
              <LoadingOverlay>
                <Loader size={32} className="animate-spin" />
                Loading planning data...
              </LoadingOverlay>
            )}

            {detecting && (
              <LoadingOverlay>
                <Satellite size={32} className="animate-pulse" color="#5ce1ff" />
                Running Earth Engine building detection...
              </LoadingOverlay>
            )}
          </MapWrapper>
        </MapArea>
      </Content>

      {toast && (
        <Toast $type={toast.type}>
          {toast.type === 'error' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.msg}
        </Toast>
      )}
    </Page>
  );
}
