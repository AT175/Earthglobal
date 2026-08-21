import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  MapContainer, TileLayer, GeoJSON, useMap, useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import {
  Building2, MapPin, Trees, Satellite, Loader, RefreshCw, CheckCircle2,
  XCircle, AlertTriangle, LogOut, Landmark, Search, Save, X, Layers,
  Ruler, Download, Upload, UserPlus, Trash2, Edit3, Plus, FileText,
  ChevronRight, Map as MapIcon, Navigation,
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
  position: sticky; top: 0; z-index: 1000;
  background: ${({ theme }) => theme.colors.background}f0;
  backdrop-filter: blur(12px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
  display: flex; align-items: center; justify-content: space-between;
`;

const Logo = styled.div`
  display: flex; align-items: center; gap: ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.fontSizes.xl}; font-weight: ${({ theme }) => theme.fontWeights.bold};
`;

const LogoIcon = styled.div`
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.gradientPrimary};
  box-shadow: ${({ theme }) => theme.shadows.glowSoft};
`;

const UserInfo = styled.div`display: flex; align-items: center; gap: ${({ theme }) => theme.spacing[4]};`;

const UserBadge = styled.div`
  display: flex; flex-direction: column; align-items: flex-end;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  span:first-child { font-weight: 600; }
  span:last-child { color: ${({ theme }) => theme.colors.textMuted}; font-size: 0.75rem; }
`;

const LogoutBtn = styled.button`
  display: flex; align-items: center; gap: 6px;
  background: none; border: 1px solid ${({ theme }) => theme.colors.borderDark};
  color: ${({ theme }) => theme.colors.textMuted};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.radii.md}; cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm}; transition: all 0.2s;
  &:hover { color: ${({ theme }) => theme.colors.error}; border-color: ${({ theme }) => theme.colors.error}40; }
`;

const Content = styled.div`display: flex; flex: 1; overflow: hidden;`;

const Sidebar = styled.aside`
  width: 340px; background: ${({ theme }) => theme.colors.surface};
  border-right: 1px solid ${({ theme }) => theme.colors.borderDark};
  overflow-y: auto; display: flex; flex-direction: column;
  @media (max-width: 1024px) { width: 280px; }
  @media (max-width: 768px) { display: none; }
`;

const SidebarSection = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
`;

const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.sm}; font-weight: 600;
  color: ${({ theme }) => theme.colors.textMuted}; text-transform: uppercase;
  letter-spacing: 0.05em; margin-bottom: ${({ theme }) => theme.spacing[3]};
  display: flex; align-items: center; gap: 6px;
`;

const LayerToggle = styled.label`
  display: flex; align-items: center; gap: 10px;
  padding: 8px 0; cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm}; color: ${({ theme }) => theme.colors.text};
  transition: color 0.2s;
  &:hover { color: ${({ theme }) => theme.colors.primaryBright}; }
`;

const Checkbox = styled.input`
  width: 16px; height: 16px; accent-color: ${({ theme }) => theme.colors.primary}; cursor: pointer;
`;

const StatsGrid = styled.div`display: grid; grid-template-columns: 1fr 1fr; gap: 8px;`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.surfaceLight};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md}; padding: 12px;
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xl}; font-weight: 700;
  color: ${({ $color }) => $color || 'inherit'};
`;

const StatLabel = styled.div`
  font-size: 0.7rem; color: ${({ theme }) => theme.colors.textMuted}; margin-top: 2px;
`;

const BuildingList = styled.div`flex: 1; overflow-y: auto;`;

const BuildingItem = styled.div`
  padding: 12px ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  cursor: pointer; transition: background 0.2s;
  &:hover { background: ${({ theme }) => theme.colors.surfaceLight}; }
  ${({ $selected }) => $selected && `background: rgba(22,119,255,0.1); border-left: 3px solid #1677ff;`}
`;

const BuildingName = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm}; font-weight: 500;
  display: flex; align-items: center; gap: 6px;
`;

const BuildingMeta = styled.div`
  font-size: 0.75rem; color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 4px; display: flex; gap: 12px;
`;

const StatusBadge = styled.span`
  display: inline-flex; align-items: center; gap: 3px;
  padding: 1px 8px; border-radius: 999px;
  font-size: 0.65rem; font-weight: 600;
  background: ${({ $bg }) => $bg}; color: ${({ $color }) => $color};
`;

const MapArea = styled.div`flex: 1; position: relative; display: flex; flex-direction: column;`;

const MapWrapper = styled.div`
  flex: 1; position: relative;
  .leaflet-container { width: 100%; height: 100%; background: #080f24; }
  .leaflet-control-attribution {
    background: rgba(8,15,36,0.8) !important; color: #aab7d4 !important; font-size: 10px !important;
  }
  .leaflet-control-attribution a { color: #5ce1ff !important; }
  .leaflet-bar {
    border: 1px solid rgba(92,225,255,0.2) !important; border-radius: 8px !important; overflow: hidden;
  }
  .leaflet-bar a {
    background: rgba(13,23,51,0.9) !important; color: #e6edf7 !important;
    border-bottom: 1px solid rgba(92,225,255,0.1) !important;
    &:hover { background: rgba(22,119,255,0.2) !important; }
  }
  .leaflet-draw { display: none !important; }
  .leaflet-draw-toolbar a { background: rgba(13,23,51,0.9) !important; border-color: rgba(92,225,255,0.2) !important; }
`;

const MapOverlay = styled.div`
  position: absolute; top: 16px; left: 16px; z-index: 1000;
  display: flex; flex-direction: column; gap: 8px;
`;

const MapButton = styled.button`
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; background: rgba(13,23,51,0.9); backdrop-filter: blur(12px);
  border: 1px solid rgba(92,225,255,0.2); border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text}; font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600; cursor: pointer; transition: all 0.2s;
  &:hover { border-color: ${({ theme }) => theme.colors.primary}; background: rgba(22,119,255,0.15); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const LayerControl = styled.div`
  position: absolute; top: 16px; right: 16px; z-index: 1000;
  background: rgba(13,23,51,0.9); backdrop-filter: blur(12px);
  border: 1px solid rgba(92,225,255,0.2); border-radius: ${({ theme }) => theme.radii.md};
  padding: 12px; min-width: 180px;
`;

const LayerControlTitle = styled.div`
  font-size: 0.8rem; font-weight: 600; color: ${({ theme }) => theme.colors.textMuted};
  text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;
  display: flex; align-items: center; gap: 6px;
`;

const DetectionPanel = styled.div`
  position: absolute; bottom: 16px; left: 16px; right: 16px; z-index: 1000;
  background: rgba(13,23,51,0.95); backdrop-filter: blur(12px);
  border: 1px solid rgba(92,225,255,0.2); border-radius: ${({ theme }) => theme.radii.lg};
  padding: 16px; display: ${({ $show }) => ($show ? 'block' : 'none')};
`;

const DetectionTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm}; font-weight: 600;
  display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
`;

const DetectionStats = styled.div`
  display: flex; gap: 24px; font-size: 0.85rem; color: ${({ theme }) => theme.colors.textMuted};
  strong { color: ${({ theme }) => theme.colors.text}; font-size: 1.1rem; }
`;

const FloatingPanel = styled.div`
  position: absolute; bottom: 16px; right: 16px; z-index: 1000;
  background: rgba(13,23,51,0.95); backdrop-filter: blur(12px);
  border: 1px solid rgba(92,225,255,0.3); border-radius: ${({ theme }) => theme.radii.lg};
  padding: 20px; width: 380px; max-height: 70vh; overflow-y: auto;
  display: ${({ $show }) => ($show ? 'block' : 'none')};
`;

const PanelTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.md}; font-weight: 600;
  margin-bottom: 12px; display: flex; align-items: center; gap: 8px;
`;

const FormGroup = styled.div`margin-bottom: 12px;`;

const Label = styled.label`
  display: block; font-size: 0.8rem; color: ${({ theme }) => theme.colors.textMuted}; margin-bottom: 4px;
`;

const Input = styled.input`
  width: 100%; padding: 8px 10px; background: rgba(8,15,36,0.8);
  border: 1px solid rgba(92,225,255,0.15); border-radius: 8px;
  color: ${({ theme }) => theme.colors.text}; font-size: 0.85rem; outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const Select = styled.select`
  width: 100%; padding: 8px 10px; background: rgba(8,15,36,0.8);
  border: 1px solid rgba(92,225,255,0.15); border-radius: 8px;
  color: ${({ theme }) => theme.colors.text}; font-size: 0.85rem; outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const TextArea = styled.textarea`
  width: 100%; padding: 8px 10px; background: rgba(8,15,36,0.8);
  border: 1px solid rgba(92,225,255,0.15); border-radius: 8px;
  color: ${({ theme }) => theme.colors.text}; font-size: 0.85rem; outline: none;
  min-height: 60px; resize: vertical;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const BtnRow = styled.div`display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;`;

const Btn = styled.button`
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px; border: none; border-radius: 8px;
  cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.2s;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const PrimaryBtn = styled(Btn)`
  background: linear-gradient(135deg, #1677ff, #5ce1ff); color: white;
`;

const SecondaryBtn = styled(Btn)`
  background: transparent; border: 1px solid rgba(92,225,255,0.2); color: ${({ theme }) => theme.colors.textMuted};
`;

const DangerBtn = styled(Btn)`
  background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #f87171;
`;

const Toast = styled.div`
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 3000;
  display: flex; align-items: center; gap: 8px; padding: 12px 20px;
  background: ${({ $type }) => $type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'};
  border: 1px solid ${({ $type }) => $type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'};
  border-radius: 12px; color: ${({ $type }) => $type === 'error' ? '#f87171' : '#4ade80'};
  font-size: 0.9rem; backdrop-filter: blur(12px);
`;

const LoadingOverlay = styled.div`
  position: absolute; inset: 0; z-index: 2000;
  display: flex; align-items: center; justify-content: center;
  background: rgba(8,15,36,0.7); backdrop-filter: blur(4px);
  flex-direction: column; gap: 12px; color: ${({ theme }) => theme.colors.text}; font-size: 0.9rem;
`;

const MetadataRow = styled.div`
  display: flex; gap: 6px; margin-bottom: 6px; align-items: center;
`;

const MetaKey = styled(Input)`flex: 1;`;
const MetaValue = styled(Input)`flex: 2;`;

const ActionButtons = styled.div`
  display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px;
`;

const ActionBtn = styled.button`
  display: flex; align-items: center; gap: 4px;
  padding: 6px 10px; background: rgba(92,225,255,0.1);
  border: 1px solid rgba(92,225,255,0.2); border-radius: 6px;
  color: #5ce1ff; font-size: 0.75rem; cursor: pointer; transition: all 0.2s;
  &:hover { background: rgba(92,225,255,0.2); }
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

// ── Helper: Track map bounds on move ──
function MapBoundsTracker({ onBoundsChange }) {
  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      onBoundsChange({
        minLng: b.getWest(), minLat: b.getSouth(),
        maxLng: b.getEast(), maxLat: b.getNorth(),
      });
    },
  });
  useEffect(() => {
    const b = map.getBounds();
    onBoundsChange({
      minLng: b.getWest(), minLat: b.getSouth(),
      maxLng: b.getEast(), maxLat: b.getNorth(),
    });
  }, [map, onBoundsChange]);
  return null;
}

// ── Helper: Draw control wrapper ──
function DrawControl({ active, onDrawn }) {
  const map = useMap();
  const drawnLayerRef = useRef(null);

  useEffect(() => {
    if (!map) return;
    // Import leaflet-draw dynamically to avoid SSR issues
    import('leaflet-draw').then(() => {
      // Already registered on L
    });

    if (!active) {
      // Remove any existing draw handler
      if (map._drawHandler) {
        map._drawHandler.disable();
        map._drawHandler = null;
      }
      return;
    }

    // Create a feature group for drawn items
    if (!drawnLayerRef.current) {
      drawnLayerRef.current = new L.FeatureGroup();
      map.addLayer(drawnLayerRef.current);
    }

    const drawHandler = new L.Draw.Polygon(map, {
      allowIntersection: false,
      showArea: true,
      shapeOptions: {
        color: '#5ce1ff', fillColor: '#1677ff', fillOpacity: 0.2, weight: 2,
      },
    });
    drawHandler.enable();
    map._drawHandler = drawHandler;

    const onDrawCreated = (e) => {
      const layer = e.layer;
      const latlngs = layer.getLatLngs()[0];
      const coordinates = latlngs.map(ll => [ll.lng, ll.lat]);
      // Close the ring
      if (coordinates.length > 0) {
        coordinates.push([coordinates[0][0], coordinates[0][1]]);
      }
      const geojson = { type: 'Polygon', coordinates: [coordinates] };
      onDrawn(geojson);
      drawHandler.disable();
      map._drawHandler = null;
      // Remove the drawn layer (we'll add it via GeoJSON)
      map.removeLayer(layer);
    };

    map.on(L.Draw.Event.CREATED, onDrawCreated);

    return () => {
      map.off(L.Draw.Event.CREATED, onDrawCreated);
      if (map._drawHandler) {
        map._drawHandler.disable();
        map._drawHandler = null;
      }
    };
  }, [map, active, onDrawn]);

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
  const [owners, setOwners] = useState([]);

  // Layer visibility
  const [showParcels, setShowParcels] = useState(true);
  const [showBuildings, setShowBuildings] = useState(true);
  const [showProtected, setShowProtected] = useState(true);
  const [showDistrict, setShowDistrict] = useState(true);
  const [baseLayer, setBaseLayer] = useState('satellite');

  // Active panel: 'building' | 'transfer' | 'parcelCreate' | 'parcelEdit' | null
  const [activePanel, setActivePanel] = useState(null);
  const [drawMode, setDrawMode] = useState(false);
  const [drawnBoundary, setDrawnBoundary] = useState(null);

  // Selected building
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [editForm, setEditForm] = useState({ status: '', notes: '', in_protected_area: false });
  const [metadataEntries, setMetadataEntries] = useState([]);
  const [savingBuilding, setSavingBuilding] = useState(false);

  // Land transfer
  const [transferForm, setTransferForm] = useState({ parcel_id: '', new_owner_id: '', transfer_reason: '', transfer_document_ref: '' });
  const [transferring, setTransferring] = useState(false);

  // Parcel create/edit
  const [parcelForm, setParcelForm] = useState({ name: '', region: '', owner_id: '', survey_date: '' });
  const [editingParcelId, setEditingParcelId] = useState(null);
  const [savingParcel, setSavingParcel] = useState(false);

  // Building list search
  const [search, setSearch] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) setUser(JSON.parse(userStr));
    loadAll();
  }, []);

  // Expose functions for Leaflet popup buttons (updated when parcels change)
  useEffect(() => {
    window.__editParcel = (parcelId) => {
      const parcel = parcelsFC?.features?.find(f => f.properties.id === parcelId);
      if (parcel) startParcelEdit(parcelId, parcel.properties);
    };
    window.__deleteParcel = (parcelId, name) => deleteParcel(parcelId, name);

    return () => {
      delete window.__editParcel;
      delete window.__deleteParcel;
    };
  }, [parcelsFC]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAll = async () => {
    try {
      const [org, parcels, buildings, protectedAreas, district, ownersRes] = await Promise.all([
        api.get('/assembly/organization'),
        api.get('/assembly/planning/parcels-geojson'),
        api.get('/assembly/planning/buildings-geojson'),
        api.get('/assembly/planning/protected-areas-geojson'),
        api.get('/assembly/planning/district-boundary'),
        api.get('/assembly/planning/owners'),
      ]);

      setOrgInfo(org.data);
      setParcelsFC(parcels.data);
      setBuildingsFC(buildings.data);
      setProtectedFC(protectedAreas.data);
      setDistrictBoundary(district.data);
      setOwners(ownersRes.data);

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

        // Fetch satellite tiles for the area
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

  // ── Run building detection + vectorize ──
  const runDetection = async () => {
    if (!mapBounds) { showToast('Map not loaded yet', 'error'); return; }

    setDetecting(true);
    setActivePanel(null);
    try {
      const bbox = {
        minLng: mapBounds.minLng, minLat: mapBounds.minLat,
        maxLng: mapBounds.maxLng, maxLat: mapBounds.maxLat,
      };
      const { data } = await api.post('/assembly/planning/detect-buildings', { bbox });

      if (data.detected) {
        setDetectionResult(data);
        setBaseLayer('detection');
        const savedCount = data.stats?.vectorized_buildings || 0;
        showToast(`Detected ~${data.stats.estimated_buildings} buildings. ${savedCount} vectorized & saved to database.`);
        // Reload buildings to show the newly saved ones
        const { data: newBuildings } = await api.get('/assembly/planning/buildings-geojson');
        setBuildingsFC(newBuildings);
      } else {
        showToast(data.error || 'Earth Engine not configured', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Detection failed', 'error');
    } finally {
      setDetecting(false);
    }
  };

  // ── KML Export ──
  const exportKML = async () => {
    try {
      showToast('Generating KML file...');
      const response = await api.get('/assembly/planning/export.kml', {
        responseType: 'blob',
        params: { layers: 'parcels,buildings,protected,district' },
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.google-earth.kml+xml' }));
      const link = document.createElement('a');
      link.href = url;
      const disposition = response.headers['content-disposition'];
      const filename = disposition ? disposition.match(/filename="(.+)"/)?.[1] : `earthglobal_export_${Date.now()}.kml`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('KML exported — open in Google Earth');
    } catch (err) {
      showToast('KML export failed', 'error');
    }
  };

  // ── Building click ──
  const onBuildingClick = (feature) => {
    const props = feature.properties;
    setSelectedBuilding(props.id);
    setEditForm({ status: props.status, notes: props.notes || '', in_protected_area: props.in_protected_area });
    // Convert metadata object to editable entries
    const meta = props.metadata || {};
    setMetadataEntries(Object.entries(meta).map(([key, value]) => ({ key, value: typeof value === 'object' ? JSON.stringify(value) : String(value) })));
    setActivePanel('building');
  };

  // ── Save building update ──
  const saveBuilding = async () => {
    const buildingId = selectedBuilding;
    setSavingBuilding(true);
    try {
      // Convert metadata entries back to object
      const metadata = {};
      metadataEntries.forEach(({ key, value }) => {
        if (key.trim()) metadata[key.trim()] = value;
      });

      await api.patch(`/assembly/planning/buildings/${buildingId}`, {
        ...editForm,
        metadata,
      });
      showToast('Building updated with metadata');
      setActivePanel(null);
      setSelectedBuilding(null);
      const { data } = await api.get('/assembly/planning/buildings-geojson');
      setBuildingsFC(data);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update', 'error');
    } finally {
      setSavingBuilding(false);
    }
  };

  // ── Land transfer ──
  const doTransfer = async () => {
    if (!transferForm.parcel_id || !transferForm.new_owner_id) {
      showToast('Select a parcel and new owner', 'error');
      return;
    }
    setTransferring(true);
    try {
      const { data } = await api.post('/assembly/planning/transfer-land', transferForm);
      showToast(data.message || 'Land transferred successfully');
      setTransferForm({ parcel_id: '', new_owner_id: '', transfer_reason: '', transfer_document_ref: '' });
      setActivePanel(null);
      // Reload parcels + owners
      const [parcelsRes, ownersRes] = await Promise.all([
        api.get('/assembly/planning/parcels-geojson'),
        api.get('/assembly/planning/owners'),
      ]);
      setParcelsFC(parcelsRes.data);
      setOwners(ownersRes.data);
    } catch (err) {
      showToast(err.response?.data?.error || 'Transfer failed', 'error');
    } finally {
      setTransferring(false);
    }
  };

  // ── Parcel create ──
  const startParcelCreate = () => {
    setDrawMode(true);
    setDrawnBoundary(null);
    setParcelForm({ name: '', region: '', owner_id: '', survey_date: '' });
    setEditingParcelId(null);
    setActivePanel('parcelCreate');
    showToast('Draw the parcel boundary on the map');
  };

  // ── Parcel edit ──
  const startParcelEdit = (parcelId, props) => {
    setDrawMode(true);
    setDrawnBoundary(null);
    setEditingParcelId(parcelId);
    setParcelForm({
      name: props.name || '',
      region: props.region || '',
      owner_id: props.owner_id || '',
      survey_date: props.survey_date || '',
    });
    setActivePanel('parcelEdit');
    showToast('Draw a new boundary to replace the existing one');
  };

  // ── On polygon drawn ──
  const onDrawn = (geojson) => {
    setDrawnBoundary(geojson);
    setDrawMode(false);
    showToast('Boundary captured — fill in details and save');
  };

  // ── Save parcel ──
  const saveParcel = async () => {
    if (!drawnBoundary) { showToast('Draw a boundary first', 'error'); return; }
    if (!parcelForm.name) { showToast('Parcel name is required', 'error'); return; }

    setSavingParcel(true);
    try {
      if (editingParcelId) {
        await api.patch(`/assembly/planning/parcels/${editingParcelId}`, {
          ...parcelForm,
          boundary: drawnBoundary,
        });
        showToast('Parcel updated');
      } else {
        await api.post('/assembly/planning/parcels', {
          ...parcelForm,
          boundary: drawnBoundary,
        });
        showToast('Parcel created');
      }
      setActivePanel(null);
      setDrawnBoundary(null);
      setEditingParcelId(null);
      const { data } = await api.get('/assembly/planning/parcels-geojson');
      setParcelsFC(data);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save parcel', 'error');
    } finally {
      setSavingParcel(false);
    }
  };

  // ── Delete parcel ──
  const deleteParcel = async (parcelId, name) => {
    if (!confirm(`Delete parcel "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/assembly/planning/parcels/${parcelId}`);
      showToast('Parcel deleted');
      const { data } = await api.get('/assembly/planning/parcels-geojson');
      setParcelsFC(data);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // ── GeoJSON style functions ──
  const parcelStyle = () => ({ color: '#3ba7ff', fillColor: '#1677ff', fillOpacity: 0.1, weight: 2 });
  const protectedAreaStyle = () => ({ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.15, weight: 2, dashArray: '5,5' });
  const districtStyle = () => ({ color: '#5ce1ff', fillColor: '#5ce1ff', fillOpacity: 0.05, weight: 3 });
  const buildingStyle = (feature) => {
    const colors = buildingStatusColors[feature.properties.status] || buildingStatusColors.unverified;
    return { ...colors, weight: 2 };
  };
  const drawnParcelStyle = () => ({ color: '#5ce1ff', fillColor: '#1677ff', fillOpacity: 0.25, weight: 3 });

  // ── Building list ──
  const buildingList = buildingsFC?.features || [];
  const filteredBuildings = buildingList.filter(b => {
    const s = b.properties.status || '';
    return s.toLowerCase().includes(search.toLowerCase()) ||
      (b.properties.parcel_name || '').toLowerCase().includes(search.toLowerCase());
  });

  const parcelList = parcelsFC?.features || [];

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
          <LogoutBtn onClick={handleLogout}><LogOut size={16} /> Logout</LogoutBtn>
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
                <StatValue $color="#fbbf24">{buildingList.filter(b => b.properties.status === 'unverified').length}</StatValue>
                <StatLabel>Unverified</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue $color="#4ade80">{buildingList.filter(b => b.properties.status === 'verified_permitted').length}</StatValue>
                <StatLabel>Permitted</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue $color="#f87171">{buildingList.filter(b => b.properties.status === 'verified_unpermitted').length}</StatValue>
                <StatLabel>Unpermitted</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue $color="#c084fc">{buildingList.filter(b => b.properties.status === 'under_investigation').length}</StatValue>
                <StatLabel>Investigating</StatLabel>
              </StatCard>
            </StatsGrid>
          </SidebarSection>

          <SidebarSection>
            <SectionTitle><FileText size={14} /> Geospatial Tools</SectionTitle>
            <ActionButtons>
              <ActionBtn onClick={exportKML}><Download size={12} /> Export KML</ActionBtn>
              <ActionBtn onClick={startParcelCreate}><Plus size={12} /> New Parcel</ActionBtn>
              <ActionBtn onClick={() => { setActivePanel('transfer'); setTransferForm({ parcel_id: '', new_owner_id: '', transfer_reason: '', transfer_document_ref: '' }); }}>
                <UserPlus size={12} /> Transfer Land
              </ActionBtn>
            </ActionButtons>
          </SidebarSection>

          <SidebarSection style={{ borderBottom: 'none' }}>
            <SectionTitle><Search size={14} /> Search Buildings</SectionTitle>
            <Input placeholder="Search by status or parcel..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </SidebarSection>

          <BuildingList>
            {filteredBuildings.map((b, i) => {
              const props = b.properties;
              const badge = statusBadgeColors[props.status] || statusBadgeColors.unverified;
              return (
                <BuildingItem key={props.id || i} $selected={selectedBuilding === props.id} onClick={() => onBuildingClick(b)}>
                  <BuildingName>
                    <Building2 size={14} color={badge.color} /> Building #{i + 1}
                    {props.centroid_lat && (
                      <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#6b7280' }}>
                        {props.centroid_lat.toFixed(4)}, {props.centroid_lng.toFixed(4)}
                      </span>
                    )}
                  </BuildingName>
                  <BuildingMeta>
                    <span><Ruler size={11} /> {Math.round(props.area_sqm)}m²</span>
                    {props.parcel_name && <span>{props.parcel_name}</span>}
                  </BuildingMeta>
                  <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <StatusBadge $bg={badge.bg} $color={badge.color}>{props.status?.replace(/_/g, ' ')}</StatusBadge>
                    {props.in_protected_area && (
                      <StatusBadge $bg="rgba(239,68,68,0.15)" $color="#f87171"><AlertTriangle size={9} /> Protected</StatusBadge>
                    )}
                    {props.metadata && Object.keys(props.metadata).length > 0 && (
                      <StatusBadge $bg="rgba(92,225,255,0.15)" $color="#5ce1ff">{Object.keys(props.metadata).length} meta</StatusBadge>
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
            <MapContainer center={DEFAULT_CENTER} zoom={14} scrollWheelZoom style={{ width: '100%', height: '100%' }}>
              {/* Base layer */}
              {baseLayer === 'satellite' && (
                <TileLayer url={satelliteTiles?.url || fallbackSatellite} attribution={satelliteTiles?.attribution || 'Tiles &copy; Esri'} maxZoom={19} />
              )}
              {baseLayer === 'street' && (
                <TileLayer url={fallbackStreet} attribution="&copy; OpenStreetMap, &copy; CARTO" maxZoom={19} />
              )}
              {baseLayer === 'detection' && detectionResult?.tileUrl && (
                <>
                  <TileLayer url={satelliteTiles?.url || fallbackSatellite} attribution="" maxZoom={19} />
                  <TileLayer url={detectionResult.tileUrl} attribution={detectionResult.attribution} maxZoom={19} opacity={0.6} />
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
                      const p = feature.properties;
                      layer.bindPopup(`<b>${p.name}</b><br/>${p.region || ''}<br/>${Math.round(p.area_sqm)} m²<br/>Owner: ${p.owner_name || '—'}<br/>
                        <button onclick="window.__editParcel('${p.id}')" style="margin-top:4px;cursor:pointer">Edit Boundary</button>
                        <button onclick="window.__deleteParcel('${p.id}','${p.name}')" style="margin-left:4px;cursor:pointer;color:red">Delete</button>`);
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
                      layer.bindPopup(`<b>Building</b><br/>Status: ${p.status?.replace(/_/g, ' ')}<br/>Area: ${Math.round(p.area_sqm)} m²<br/>
                        ${p.centroid_lat ? 'Centroid: ' + p.centroid_lat.toFixed(4) + ', ' + p.centroid_lng.toFixed(4) + '<br/>' : ''}
                        ${p.parcel_name ? 'Parcel: ' + p.parcel_name + '<br/>' : ''}
                        ${p.in_protected_area ? '<b style="color:red">In protected area!</b><br/>' : ''}
                        ${p.metadata && Object.keys(p.metadata).length > 0 ? '<b>Metadata:</b><br/>' + Object.entries(p.metadata).map(([k,v]) => k + ': ' + v).join('<br/>') : ''}`);
                      layer.on('click', () => onBuildingClick(feature));
                    }
                  }}
                />
              )}

              {/* Drawn boundary preview */}
              {drawnBoundary && (
                <GeoJSON data={{ type: 'Feature', geometry: drawnBoundary, properties: {} }} style={drawnParcelStyle} />
              )}

              {/* Drawing tools */}
              <DrawControl active={drawMode} onDrawn={onDrawn} />
              <FitBounds bounds={mapBounds} />
              <MapBoundsTracker onBoundsChange={setMapBounds} />
            </MapContainer>

            {/* Map overlay buttons */}
            <MapOverlay>
              <MapButton onClick={runDetection} disabled={detecting}>
                {detecting ? <Loader size={16} className="animate-spin" /> : <Satellite size={16} />}
                {detecting ? 'Detecting...' : 'Detect + Vectorize Buildings'}
              </MapButton>
              <MapButton onClick={loadAll}><RefreshCw size={16} /> Refresh Data</MapButton>
              <MapButton onClick={exportKML}><Download size={16} /> Export KML</MapButton>
              {drawMode && (
                <MapButton onClick={() => setDrawMode(false)} style={{ borderColor: 'rgba(251,191,36,0.4)', color: '#fbbf24' }}>
                  <X size={16} /> Cancel Drawing
                </MapButton>
              )}
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
                <Satellite size={16} color="#5ce1ff" /> Building Detection + Vectorization Results
                <button onClick={() => { setDetectionResult(null); setBaseLayer('satellite'); }}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#aab7d4', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </DetectionTitle>
              <DetectionStats>
                <div><strong>{detectionResult?.stats?.estimated_buildings || 0}</strong> estimated</div>
                <div><strong>{detectionResult?.stats?.vectorized_buildings || 0}</strong> vectorized & saved</div>
                <div><strong>{(detectionResult?.stats?.builtup_area_sqm || 0).toLocaleString()}</strong> m² built-up</div>
              </DetectionStats>
              <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#aab7d4' }}>{detectionResult?.method}</div>
            </DetectionPanel>

            {/* ── Building Edit Panel (with metadata) ── */}
            <FloatingPanel $show={activePanel === 'building'}>
              <PanelTitle>
                <Building2 size={18} color="#5ce1ff" /> Update Building
                <button onClick={() => { setActivePanel(null); setSelectedBuilding(null); }}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#aab7d4', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </PanelTitle>

              {buildingsFC?.features?.find(f => f.properties.id === selectedBuilding) && (() => {
                const b = buildingsFC.features.find(f => f.properties.id === selectedBuilding);
                const p = b.properties;
                return (
                  <>
                    <div style={{ fontSize: '0.8rem', color: '#aab7d4', marginBottom: 12 }}>
                      Area: {Math.round(p.area_sqm)} m²
                      {p.centroid_lat && ` | Centroid: ${p.centroid_lat.toFixed(4)}, ${p.centroid_lng.toFixed(4)}`}
                      {p.parcel_name && ` | Parcel: ${p.parcel_name}`}
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
                      <TextArea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Add inspection notes..." />
                    </FormGroup>

                    <FormGroup>
                      <Label>
                        <input type="checkbox" checked={editForm.in_protected_area}
                          onChange={(e) => setEditForm({ ...editForm, in_protected_area: e.target.checked })} style={{ marginRight: 6 }} />
                        In Protected Area
                      </Label>
                    </FormGroup>

                    {/* Flexible metadata editor */}
                    <FormGroup>
                      <Label>Metadata (flexible key-value pairs)</Label>
                      {metadataEntries.map((entry, i) => (
                        <MetadataRow key={i}>
                          <MetaKey placeholder="key" value={entry.key} onChange={(e) => {
                            const newEntries = [...metadataEntries];
                            newEntries[i] = { ...entry, key: e.target.value };
                            setMetadataEntries(newEntries);
                          }} />
                          <MetaValue placeholder="value" value={entry.value} onChange={(e) => {
                            const newEntries = [...metadataEntries];
                            newEntries[i] = { ...entry, value: e.target.value };
                            setMetadataEntries(newEntries);
                          }} />
                          <button onClick={() => setMetadataEntries(metadataEntries.filter((_, idx) => idx !== i))}
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}>
                            <X size={14} />
                          </button>
                        </MetadataRow>
                      ))}
                      <ActionBtn onClick={() => setMetadataEntries([...metadataEntries, { key: '', value: '' }])}>
                        <Plus size={12} /> Add Metadata Field
                      </ActionBtn>
                    </FormGroup>

                    <BtnRow>
                      <PrimaryBtn onClick={saveBuilding} disabled={savingBuilding}>
                        {savingBuilding ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                        {savingBuilding ? 'Saving...' : 'Save Building'}
                      </PrimaryBtn>
                      <SecondaryBtn onClick={() => { setActivePanel(null); setSelectedBuilding(null); }}>Cancel</SecondaryBtn>
                    </BtnRow>
                  </>
                );
              })()}
            </FloatingPanel>

            {/* ── Land Transfer Panel ── */}
            <FloatingPanel $show={activePanel === 'transfer'}>
              <PanelTitle>
                <UserPlus size={18} color="#5ce1ff" /> Transfer Land Ownership
                <button onClick={() => setActivePanel(null)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#aab7d4', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </PanelTitle>
              <div style={{ fontSize: '0.8rem', color: '#aab7d4', marginBottom: 12 }}>
                Transfer a parcel from its current owner to a new owner. A transaction record is created for audit.
              </div>

              <FormGroup>
                <Label>Select Parcel</Label>
                <Select value={transferForm.parcel_id} onChange={(e) => setTransferForm({ ...transferForm, parcel_id: e.target.value })}>
                  <option value="">-- Choose a parcel --</option>
                  {parcelList.map((p, i) => (
                    <option key={p.properties.id || i} value={p.properties.id}>
                      {p.properties.name} ({p.properties.owner_name || 'No owner'})
                    </option>
                  ))}
                </Select>
              </FormGroup>

              <FormGroup>
                <Label>New Owner</Label>
                <Select value={transferForm.new_owner_id} onChange={(e) => setTransferForm({ ...transferForm, new_owner_id: e.target.value })}>
                  <option value="">-- Choose new owner --</option>
                  {owners.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.email}) — {o.parcel_count} parcels
                    </option>
                  ))}
                </Select>
              </FormGroup>

              <FormGroup>
                <Label>Transfer Reason</Label>
                <Input value={transferForm.transfer_reason} onChange={(e) => setTransferForm({ ...transferForm, transfer_reason: e.target.value })}
                  placeholder="e.g. Sale, Inheritance, Court order..." />
              </FormGroup>

              <FormGroup>
                <Label>Document Reference</Label>
                <Input value={transferForm.transfer_document_ref} onChange={(e) => setTransferForm({ ...transferForm, transfer_document_ref: e.target.value })}
                  placeholder="e.g. Deed #12345, Court Order #2024-001" />
              </FormGroup>

              <BtnRow>
                <PrimaryBtn onClick={doTransfer} disabled={transferring}>
                  {transferring ? <Loader size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  {transferring ? 'Transferring...' : 'Execute Transfer'}
                </PrimaryBtn>
                <SecondaryBtn onClick={() => setActivePanel(null)}>Cancel</SecondaryBtn>
              </BtnRow>
            </FloatingPanel>

            {/* ── Parcel Create/Edit Panel ── */}
            <FloatingPanel $show={activePanel === 'parcelCreate' || activePanel === 'parcelEdit'}>
              <PanelTitle>
                <MapIcon size={18} color="#5ce1ff" /> {editingParcelId ? 'Edit Parcel' : 'Create New Parcel'}
                <button onClick={() => { setActivePanel(null); setDrawMode(false); setDrawnBoundary(null); setEditingParcelId(null); }}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#aab7d4', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </PanelTitle>

              <div style={{ fontSize: '0.8rem', color: '#aab7d4', marginBottom: 12, padding: '8px 10px', background: drawnBoundary ? 'rgba(34,197,94,0.1)' : 'rgba(251,191,36,0.1)', borderRadius: 8, border: `1px solid ${drawnBoundary ? 'rgba(34,197,94,0.2)' : 'rgba(251,191,36,0.2)'}` }}>
                {drawnBoundary
                  ? '✓ Boundary drawn — review and save below'
                  : drawMode
                    ? 'Draw the parcel boundary on the map by clicking points, then double-click to close'
                    : 'Click "Draw Boundary" to start drawing the parcel polygon'}
              </div>

              {!drawnBoundary && (
                <ActionBtn onClick={() => setDrawMode(true)} style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
                  <Edit3 size={14} /> Draw Boundary on Map
                </ActionBtn>
              )}

              <FormGroup style={{ marginTop: 12 }}>
                <Label>Parcel Name *</Label>
                <Input value={parcelForm.name} onChange={(e) => setParcelForm({ ...parcelForm, name: e.target.value })} placeholder="e.g. Farm at Manso Nkwanta" />
              </FormGroup>

              <FormGroup>
                <Label>Region</Label>
                <Input value={parcelForm.region} onChange={(e) => setParcelForm({ ...parcelForm, region: e.target.value })} placeholder="e.g. Ashanti Region" />
              </FormGroup>

              <FormGroup>
                <Label>Owner (optional)</Label>
                <Select value={parcelForm.owner_id} onChange={(e) => setParcelForm({ ...parcelForm, owner_id: e.target.value })}>
                  <option value="">-- No owner assigned --</option>
                  {owners.map(o => (
                    <option key={o.id} value={o.id}>{o.name} ({o.email})</option>
                  ))}
                </Select>
              </FormGroup>

              <FormGroup>
                <Label>Survey Date</Label>
                <Input type="date" value={parcelForm.survey_date} onChange={(e) => setParcelForm({ ...parcelForm, survey_date: e.target.value })} />
              </FormGroup>

              {drawnBoundary && (
                <div style={{ fontSize: '0.75rem', color: '#aab7d4', marginBottom: 8 }}>
                  Boundary: {drawnBoundary.coordinates[0].length - 1} vertices
                </div>
              )}

              <BtnRow>
                <PrimaryBtn onClick={saveParcel} disabled={savingParcel || !drawnBoundary}>
                  {savingParcel ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                  {savingParcel ? 'Saving...' : editingParcelId ? 'Update Parcel' : 'Create Parcel'}
                </PrimaryBtn>
                {drawnBoundary && (
                  <SecondaryBtn onClick={() => { setDrawnBoundary(null); setDrawMode(true); }}>
                    <Edit3 size={14} /> Redraw
                  </SecondaryBtn>
                )}
                {editingParcelId && (
                  <DangerBtn onClick={() => deleteParcel(editingParcelId, parcelForm.name)}>
                    <Trash2 size={14} /> Delete
                  </DangerBtn>
                )}
                <SecondaryBtn onClick={() => { setActivePanel(null); setDrawMode(false); setDrawnBoundary(null); setEditingParcelId(null); }}>Cancel</SecondaryBtn>
              </BtnRow>
            </FloatingPanel>

            {/* Loading overlays */}
            {loading && (
              <LoadingOverlay>
                <Loader size={32} className="animate-spin" /> Loading planning data...
              </LoadingOverlay>
            )}
            {detecting && (
              <LoadingOverlay>
                <Satellite size={32} className="animate-pulse" color="#5ce1ff" />
                Running Earth Engine building detection + vectorization...
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
