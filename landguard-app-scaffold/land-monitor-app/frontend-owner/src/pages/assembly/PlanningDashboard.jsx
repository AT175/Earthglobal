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
  ChevronRight, Map as MapIcon, Navigation, Clock, Zap, Activity, Globe,
  Menu,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useRealTime, NavList, NavItem } from '@earthglobal/design-system';

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
  height: 100vh;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.body};
  display: flex;
  flex-direction: column;
`;

const TopBar = styled.header`
  position: sticky; top: 0; z-index: 1600;
  background: ${({ theme }) => theme.colors.background}f0;
  backdrop-filter: blur(12px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  @media (max-width: 768px) { padding: 12px 16px; }
`;

const MenuToggleBtn = styled.button`
  display: none;
`;

const Logo = styled.div`
  display: flex; align-items: center; gap: ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.fontSizes.xl}; font-weight: ${({ theme }) => theme.fontWeights.bold};
  white-space: nowrap; overflow: hidden;
  @media (max-width: 640px) { font-size: 1rem; gap: 8px; }
`;

const LogoIcon = styled.div`
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.gradientPrimary};
  box-shadow: ${({ theme }) => theme.shadows.glowSoft};
  flex-shrink: 0;
  @media (max-width: 640px) { width: 32px; height: 32px; }
`;

const UserInfo = styled.div`
  display: flex; align-items: center; gap: ${({ theme }) => theme.spacing[4]};
  @media (max-width: 640px) { gap: 8px; }
`;

const UserBadge = styled.div`
  display: flex; flex-direction: column; align-items: flex-end;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  span:first-child { font-weight: 600; }
  span:last-child { color: ${({ theme }) => theme.colors.textMuted}; font-size: 0.75rem; }
  @media (max-width: 480px) { display: none; }
`;

const LiveIndicatorLabel = styled.span`
  @media (max-width: 480px) { display: none; }
`;

const LogoutBtn = styled.button`
  display: flex; align-items: center; gap: 6px;
  background: none; border: 1px solid ${({ theme }) => theme.colors.borderDark};
  color: ${({ theme }) => theme.colors.textMuted};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.radii.md}; cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm}; transition: all 0.2s;
  white-space: nowrap;
  &:hover { color: ${({ theme }) => theme.colors.error}; border-color: ${({ theme }) => theme.colors.error}40; }
  @media (max-width: 640px) {
    padding: 8px; font-size: 0;
    svg { width: 16px; height: 16px; }
  }
`;

const Content = styled.div`display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; position: relative;`;

// ── Top control bar (replaces the left sidebar) ──
const TopControlBar = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  display: flex; flex-direction: column;
  max-height: 40vh; overflow-y: auto;
  flex-shrink: 0;
`;

const TopBarRow = styled.div`
  display: flex; align-items: center; gap: 12px;
  padding: 8px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  flex-wrap: wrap;
  &:last-child { border-bottom: none; }
`;

const TopBarGroup = styled.div`
  display: flex; align-items: center; gap: 8px;
  flex-shrink: 0;
`;

const TopBarDivider = styled.div`
  width: 1px; height: 24px; background: ${({ theme }) => theme.colors.borderDark};
  flex-shrink: 0;
`;

const TopBarSectionLabel = styled.span`
  font-size: 0.7rem; font-weight: 600; color: ${({ theme }) => theme.colors.textMuted};
  text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap;
`;

const InlineLayerToggle = styled.label`
  display: flex; align-items: center; gap: 4px;
  padding: 4px 8px; cursor: pointer;
  font-size: 0.78rem; color: ${({ theme }) => theme.colors.text};
  background: rgba(8,15,36,0.4); border-radius: 6px;
  white-space: nowrap; transition: background 0.2s;
  &:hover { background: rgba(92,225,255,0.1); }
`;

const InlineStat = styled.div`
  display: flex; align-items: center; gap: 4px;
  font-size: 0.75rem; color: ${({ theme }) => theme.colors.textMuted};
  white-space: nowrap;
  strong { color: ${({ $color }) => $color || 'inherit'}; font-weight: 700; }
`;

const CompactSelect = styled.select`
  padding: 4px 8px; background: rgba(8,15,36,0.6);
  border: 1px solid rgba(92,225,255,0.15); border-radius: 6px;
  color: ${({ theme }) => theme.colors.text}; font-size: 0.78rem; outline: none;
  max-width: 200px;
`;

const CompactInput = styled.input`
  padding: 4px 8px; background: rgba(8,15,36,0.6);
  border: 1px solid rgba(92,225,255,0.15); border-radius: 6px;
  color: ${({ theme }) => theme.colors.text}; font-size: 0.78rem; outline: none;
  width: 160px;
`;

const BuildingListHorizontal = styled.div`
  display: flex; gap: 8px; overflow-x: auto; padding: 8px 16px;
  scrollbar-width: thin;
  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(92,225,255,0.3); border-radius: 4px; }
`;

const BuildingCard = styled.div`
  flex-shrink: 0; width: 200px; padding: 10px;
  background: ${({ theme }) => theme.colors.surfaceLight};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-left: 3px solid ${({ $accent }) => $accent || '#fbbf24'};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer; transition: all 0.2s;
  &:hover { background: rgba(92,225,255,0.08); }
  ${({ $selected }) => $selected && `border-color: #1677ff; background: rgba(22,119,255,0.1);`}
`;

// ── Bottom bar (replaces floating map overlays) ──
const BottomBar = styled.div`
  background: rgba(13,23,51,0.95); backdrop-filter: blur(12px);
  border-top: 1px solid rgba(92,225,255,0.2);
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px; flex-shrink: 0;
  overflow-x: auto; scrollbar-width: thin;
  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(92,225,255,0.3); border-radius: 4px; }
  z-index: 1000;
`;

const BottomBarGroup = styled.div`
  display: flex; align-items: center; gap: 6px; flex-shrink: 0;
`;

const BottomBarDivider = styled.div`
  width: 1px; height: 28px; background: rgba(92,225,255,0.15);
  flex-shrink: 0;
`;

const BaseLayerRadio = styled.label`
  display: flex; align-items: center; gap: 4px;
  padding: 4px 10px; cursor: pointer;
  font-size: 0.78rem; color: ${({ theme }) => theme.colors.text};
  background: rgba(8,15,36,0.5); border: 1px solid rgba(92,225,255,0.1);
  border-radius: 6px; white-space: nowrap; transition: all 0.2s;
  &:hover { border-color: rgba(92,225,255,0.3); }
  input { accent-color: ${({ theme }) => theme.colors.primary}; width: 14px; height: 14px; }
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

const MapArea = styled.div`flex: 1; min-height: 0; position: relative; display: flex; flex-direction: column;`;

const MapWrapper = styled.div`
  flex: 1; min-height: 0; position: relative;
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

const MapButton = styled.button`
  display: flex; align-items: center; gap: 6px;
  padding: 6px 12px; background: rgba(13,23,51,0.8);
  border: 1px solid rgba(92,225,255,0.2); border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text}; font-size: 0.78rem;
  font-weight: 600; cursor: pointer; transition: all 0.2s;
  white-space: nowrap;
  &:hover { border-color: ${({ theme }) => theme.colors.primary}; background: rgba(22,119,255,0.15); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
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
  padding: 20px; width: 380px; max-width: calc(100vw - 32px); max-height: 70vh; overflow-y: auto;
  display: ${({ $show }) => ($show ? 'block' : 'none')};
  @media (max-width: 768px) { left: 16px; width: auto; }
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
// Supports drawing polygons (for parcels) or rectangles (for detection area)
function DrawControl({ active, onDrawn, shape = 'polygon' }) {
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

    const drawOptions = {
      allowIntersection: false,
      showArea: true,
      shapeOptions: {
        color: '#5ce1ff', fillColor: '#1677ff', fillOpacity: 0.2, weight: 2,
      },
    };

    const drawHandler = shape === 'rectangle'
      ? new L.Draw.Rectangle(map, drawOptions)
      : new L.Draw.Polygon(map, drawOptions);
    drawHandler.enable();
    map._drawHandler = drawHandler;

    const onDrawCreated = (e) => {
      const layer = e.layer;

      if (shape === 'rectangle') {
        // Rectangle — extract bounds as GeoJSON polygon
        const bounds = layer.getBounds();
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const coordinates = [
          [sw.lng, sw.lat],
          [ne.lng, sw.lat],
          [ne.lng, ne.lat],
          [sw.lng, ne.lat],
          [sw.lng, sw.lat], // close the ring
        ];
        const geojson = { type: 'Polygon', coordinates: [coordinates] };
        onDrawn(geojson, {
          minLng: sw.lng, minLat: sw.lat,
          maxLng: ne.lng, maxLat: ne.lat,
        });
      } else {
        // Polygon — extract latlngs
        const latlngs = layer.getLatLngs()[0];
        const coordinates = latlngs.map(ll => [ll.lng, ll.lat]);
        // Close the ring
        if (coordinates.length > 0) {
          coordinates.push([coordinates[0][0], coordinates[0][1]]);
        }
        const geojson = { type: 'Polygon', coordinates: [coordinates] };
        onDrawn(geojson);
      }

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
  }, [map, active, onDrawn, shape]);

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

  // Change detection
  const [changeDetecting, setChangeDetecting] = useState(false);
  const [changeResult, setChangeResult] = useState(null);
  const [changeHistory, setChangeHistory] = useState([]);
  const [showChangePanel, setShowChangePanel] = useState(false);
  const [realtimeAlert, setRealtimeAlert] = useState(null);

  // Real-time WebSocket subscription
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const { connected: wsConnected, on: onWsEvent } = useRealTime({ token });

  // Layer visibility
  const [showParcels, setShowParcels] = useState(true);
  const [showBuildings, setShowBuildings] = useState(true);
  const [showProtected, setShowProtected] = useState(true);
  const [showDistrict, setShowDistrict] = useState(true);
  const [showHazards, setShowHazards] = useState(true);
  const [showGoogleBuildings, setShowGoogleBuildings] = useState(false);
  const [showOSMBuildings, setShowOSMBuildings] = useState(false);
  const [baseLayer, setBaseLayer] = useState('satellite');

  // Reference buildings (Google Open Buildings + OSM)
  const [googleBuildingsFC, setGoogleBuildingsFC] = useState(null);
  const [osmBuildingsFC, setOSMBuildingsFC] = useState(null);
  const [loadingRefBuildings, setLoadingRefBuildings] = useState(false);
  const [refComparison, setRefComparison] = useState(null);

  // Environmental hazards
  const [hazardsFC, setHazardsFC] = useState(null);
  const [detectingHazards, setDetectingHazards] = useState(false);
  const [hazardResult, setHazardResult] = useState(null);
  const [showHazardPanel, setShowHazardPanel] = useState(false);
  const [hazardQuery, setHazardQuery] = useState({
    hazard_type: '', severity: '', date_from: '', date_to: '',
    region: '', lat: '', lng: '', radius_km: '5', status: '',
  });
  const [queryingHazards, setQueryingHazards] = useState(false);
  const [hazardStats, setHazardStats] = useState(null);

  // Active panel: 'building' | 'transfer' | 'parcelCreate' | 'parcelEdit' | null
  const [activePanel, setActivePanel] = useState(null);
  const [drawMode, setDrawMode] = useState(false);
  const [drawnBoundary, setDrawnBoundary] = useState(null);

  // Detection area box (editable rectangle for building/hazard detection)
  const [detectionBox, setDetectionBox] = useState(null);       // { geojson, bbox }
  const [drawDetectionMode, setDrawDetectionMode] = useState(false);

  // FAO GAUL 2015 district selector
  const [faoDistricts, setFAODistricts] = useState([]);          // [{ name, level }]
  const [faoRegions, setFAORegions] = useState([]);              // [{ name, level }]
  const [selectedDistrict, setSelectedDistrict] = useState('');  // name string
  const [selectedDistrictBoundary, setSelectedDistrictBoundary] = useState(null); // { geojson, bbox, level }
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingDistrictBoundary, setLoadingDistrictBoundary] = useState(false);

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
    loadChangeHistory();
  }, []);

  // ── Real-time WebSocket: listen for building change detections ──
  useEffect(() => {
    if (!onWsEvent) return;
    const unsub = onWsEvent('building_change:detected', (payload) => {
      setRealtimeAlert(payload);
      showToast(`REAL-TIME ALERT: ${payload.newBuildingsCount} new buildings detected!`, 'error');
      // Reload buildings to show the newly detected ones
      api.get('/assembly/planning/buildings-geojson').then(({ data }) => setBuildingsFC(data)).catch(() => {});
      api.get('/assembly/planning/change-detection/history').then(({ data }) => setChangeHistory(data)).catch(() => {});
      // Auto-show the change panel
      setChangeResult({
        newBuildingsCount: payload.newBuildingsCount,
        newBuiltupAreaSqm: payload.newBuiltupAreaSqm,
        beforeTileUrl: payload.beforeTileUrl,
        afterTileUrl: payload.afterTileUrl,
        changeTileUrl: payload.changeTileUrl,
        detectionId: payload.detectionId,
      });
      setShowChangePanel(true);
    });
    return unsub;
  }, [onWsEvent]);

  // ── Real-time WebSocket: listen for environmental hazard detections ──
  useEffect(() => {
    if (!onWsEvent) return;
    const unsub = onWsEvent('hazard:detected', (payload) => {
      setRealtimeAlert(payload);
      showToast(`ENVIRONMENTAL ALERT: ${payload.totalHazards} hazard(s) detected!`, 'error');
      // Reload hazards + stats
      api.get('/assembly/planning/hazards-geojson').then(({ data }) => setHazardsFC(data)).catch(() => {});
      api.get('/assembly/planning/hazard-stats').then(({ data }) => setHazardStats(data)).catch(() => {});
      setShowHazardPanel(true);
    });
    return unsub;
  }, [onWsEvent]);

  // Expose functions for Leaflet popup buttons (updated when parcels change)
  useEffect(() => {
    window.__editParcel = (parcelId) => {
      const parcel = parcelsFC?.features?.find(f => f.properties.id === parcelId);
      if (parcel) startParcelEdit(parcelId, parcel.properties);
    };
    window.__deleteParcel = (parcelId, name) => deleteParcel(parcelId, name);
    window.__generateSitePlan = (parcelId) => generateSitePlan(parcelId);
    window.__verifyHazard = (hazardId) => updateHazardStatus(hazardId, 'verified');
    window.__resolveHazard = (hazardId) => updateHazardStatus(hazardId, 'resolved');
    window.__falsePosHazard = (hazardId) => updateHazardStatus(hazardId, 'false_positive');

    return () => {
      delete window.__editParcel;
      delete window.__deleteParcel;
      delete window.__generateSitePlan;
      delete window.__verifyHazard;
      delete window.__resolveHazard;
      delete window.__falsePosHazard;
    };
  }, [parcelsFC]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAll = async () => {
    try {
      const [org, parcels, buildings, protectedAreas, district, ownersRes, hazards, hStats] = await Promise.all([
        api.get('/assembly/organization'),
        api.get('/assembly/planning/parcels-geojson'),
        api.get('/assembly/planning/buildings-geojson'),
        api.get('/assembly/planning/protected-areas-geojson'),
        api.get('/assembly/planning/district-boundary'),
        api.get('/assembly/planning/owners'),
        api.get('/assembly/planning/hazards-geojson').catch(() => ({ data: { type: 'FeatureCollection', features: [] } })),
        api.get('/assembly/planning/hazard-stats').catch(() => ({ data: null })),
      ]);

      setOrgInfo(org.data);
      setParcelsFC(parcels.data);
      setBuildingsFC(buildings.data);
      setProtectedFC(protectedAreas.data);
      setDistrictBoundary(district.data);
      setOwners(ownersRes.data);
      setHazardsFC(hazards.data);
      setHazardStats(hStats.data);

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
  // If a district is selected from the dropdown, uses that district's FAO boundary.
  // If useFAOBoundary is true, no bbox is sent — the backend uses the
  // FAO GAUL 2015 boundary for the organization's district/region.
  // If a detection box has been drawn, uses that instead of the map viewport.
  const runDetection = async (useFAOBoundary = false) => {
    if (!useFAOBoundary && !selectedDistrict && !detectionBox && !mapBounds) { showToast('Map not loaded yet', 'error'); return; }

    setDetecting(true);
    setActivePanel(null);
    try {
      let payload;
      if (selectedDistrict) {
        // Selected district from dropdown takes priority
        payload = { districtName: selectedDistrict };
      } else if (useFAOBoundary) {
        payload = { useFAOBoundary: true };
      } else {
        payload = { bbox: detectionBox ? detectionBox.bbox : {
            minLng: mapBounds.minLng, minLat: mapBounds.minLat,
            maxLng: mapBounds.maxLng, maxLat: mapBounds.maxLat,
          } };
      }
      const { data } = await api.post('/assembly/planning/detect-buildings', payload);

      if (data.detected) {
        setDetectionResult(data);
        setBaseLayer('detection');
        const savedCount = data.stats?.vectorized_buildings || 0;
        const boundaryLabel = data.boundary_source?.startsWith('fao_gaul')
          ? ` (${data.boundary})`
          : '';
        showToast(`Detected ~${data.stats.estimated_buildings} buildings${boundaryLabel}. ${savedCount} vectorized & saved.`);
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

  // ── Run building change detection (ML time-series comparison) ──
  const runChangeDetection = async () => {
    if (!detectionBox && !mapBounds) { showToast('Map not loaded yet', 'error'); return; }

    setChangeDetecting(true);
    setShowChangePanel(true);
    setActivePanel(null);
    setChangeResult(null);

    try {
      const bbox = detectionBox ? detectionBox.bbox : {
        minLng: mapBounds.minLng, minLat: mapBounds.minLat,
        maxLng: mapBounds.maxLng, maxLat: mapBounds.maxLat,
      };

      const { data } = await api.post('/assembly/planning/change-detection', { bbox });

      if (data.status === 'completed') {
        setChangeResult(data);
        showToast(`Change detection complete: ${data.newBuildingsCount} new buildings found!`);
        // Reload buildings + history
        const [buildingsRes, historyRes] = await Promise.all([
          api.get('/assembly/planning/buildings-geojson'),
          api.get('/assembly/planning/change-detection/history'),
        ]);
        setBuildingsFC(buildingsRes.data);
        setChangeHistory(historyRes.data);
      } else {
        showToast(data.error || 'Change detection failed', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Change detection failed', 'error');
    } finally {
      setChangeDetecting(false);
    }
  };

  // ── Load change detection history ──
  const loadChangeHistory = async () => {
    try {
      const { data } = await api.get('/assembly/planning/change-detection/history');
      setChangeHistory(data);
    } catch {}
  };

  // ── Load Google Open Buildings for the current map view ──
  const loadGoogleBuildings = async () => {
    if (!mapBounds) { showToast('Map not loaded yet', 'error'); return; }
    setLoadingRefBuildings(true);
    try {
      const bbox = `${mapBounds.minLng},${mapBounds.minLat},${mapBounds.maxLng},${mapBounds.maxLat}`;
      const { data } = await api.get(`/assembly/planning/google-buildings?bbox=${bbox}`);
      setGoogleBuildingsFC(data);
      if (data.capped) {
        showToast(`Loaded ${data.returned} of ${data.total_in_area} Google buildings (capped). Zoom in for more.`);
      } else {
        showToast(`Loaded ${data.returned} Google Open Buildings`);
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load Google buildings', 'error');
    } finally {
      setLoadingRefBuildings(false);
    }
  };

  // ── Load OSM buildings for the current map view ──
  const loadOSMBuildings = async () => {
    if (!mapBounds) { showToast('Map not loaded yet', 'error'); return; }
    setLoadingRefBuildings(true);
    try {
      const bbox = `${mapBounds.minLng},${mapBounds.minLat},${mapBounds.maxLng},${mapBounds.maxLat}`;
      const { data } = await api.get(`/assembly/planning/osm-buildings?bbox=${bbox}`);
      setOSMBuildingsFC(data);
      showToast(`Loaded ${data.total} OSM buildings`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load OSM buildings', 'error');
    } finally {
      setLoadingRefBuildings(false);
    }
  };

  // ── Run building source comparison ──
  const runBuildingComparison = async () => {
    if (!buildingsFC?.features?.length && !googleBuildingsFC?.features?.length && !osmBuildingsFC?.features?.length) {
      showToast('Need at least one building dataset loaded', 'error');
      return;
    }
    setLoadingRefBuildings(true);
    try {
      const { data } = await api.post('/assembly/planning/buildings-comparison', {
        detected: buildingsFC || { type: 'FeatureCollection', features: [] },
        google: googleBuildingsFC || { type: 'FeatureCollection', features: [] },
        osm: osmBuildingsFC || { type: 'FeatureCollection', features: [] },
      });
      setRefComparison(data);
      showToast(`Comparison: ${data.coverage.detected_matched_to_google_pct}% match with Google, ${data.coverage.detected_matched_to_osm_pct}% with OSM`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Comparison failed', 'error');
    } finally {
      setLoadingRefBuildings(false);
    }
  };

  // ── Toggle Google buildings layer ──
  const toggleGoogleBuildings = (checked) => {
    setShowGoogleBuildings(checked);
    if (checked && !googleBuildingsFC) {
      loadGoogleBuildings();
    }
  };

  // ── Toggle OSM buildings layer ──
  const toggleOSMBuildings = (checked) => {
    setShowOSMBuildings(checked);
    if (checked && !osmBuildingsFC) {
      loadOSMBuildings();
    }
  };

  // ── Run environmental hazard detection via EE ──
  const runHazardDetection = async () => {
    if (!detectionBox && !mapBounds) { showToast('Map not loaded yet', 'error'); return; }

    setDetectingHazards(true);
    setShowHazardPanel(true);
    setActivePanel(null);
    setHazardResult(null);

    try {
      const bbox = detectionBox ? detectionBox.bbox : {
        minLng: mapBounds.minLng, minLat: mapBounds.minLat,
        maxLng: mapBounds.maxLng, maxLat: mapBounds.maxLat,
      };

      const { data } = await api.post('/assembly/planning/detect-hazards', { bbox });

      if (data.detected) {
        setHazardResult(data);
        setBaseLayer('hazard');
        showToast(`Hazard detection complete: ${data.total_hazards} hazard(s) found!`);
        // Reload hazards + stats
        const [hazardsRes, statsRes] = await Promise.all([
          api.get('/assembly/planning/hazards-geojson'),
          api.get('/assembly/planning/hazard-stats'),
        ]);
        setHazardsFC(hazardsRes.data);
        setHazardStats(statsRes.data);
      } else {
        setHazardResult(data);
        showToast(data.error || 'No hazards detected in this area');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Hazard detection failed', 'error');
    } finally {
      setDetectingHazards(false);
    }
  };

  // ── Manual hazard query with parameters ──
  const runHazardQuery = async () => {
    setQueryingHazards(true);
    try {
      const params = { ...hazardQuery };
      // Convert empty strings to undefined
      Object.keys(params).forEach(k => { if (params[k] === '') delete params[k]; });
      // Convert lat/lng/radius to numbers
      if (params.lat) params.lat = parseFloat(params.lat);
      if (params.lng) params.lng = parseFloat(params.lng);
      if (params.radius_km) params.radius_km = parseFloat(params.radius_km);

      const { data } = await api.post('/assembly/planning/hazards/query', params);
      setHazardsFC(data);
      showToast(`Query returned ${data.total} hazard(s)`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Query failed', 'error');
    } finally {
      setQueryingHazards(false);
    }
  };

  // ── Update hazard status ──
  const updateHazardStatus = async (hazardId, newStatus) => {
    try {
      await api.patch(`/assembly/planning/hazards/${hazardId}`, { status: newStatus });
      showToast(`Hazard marked as ${newStatus}`);
      // Reload hazards
      const [hazardsRes, statsRes] = await Promise.all([
        api.get('/assembly/planning/hazards-geojson'),
        api.get('/assembly/planning/hazard-stats'),
      ]);
      setHazardsFC(hazardsRes.data);
      setHazardStats(statsRes.data);
    } catch (err) {
      showToast('Failed to update hazard', 'error');
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

  // ── On detection box drawn ──
  const onDetectionBoxDrawn = (geojson, bbox) => {
    setDetectionBox({ geojson, bbox });
    setDrawDetectionMode(false);
    showToast('Detection area set — run detection to scan this area');
  };

  // ── Clear detection box ──
  const clearDetectionBox = () => {
    setDetectionBox(null);
    showToast('Detection area cleared — will use map viewport');
  };

  // ── Load FAO GAUL 2015 districts + regions list ──
  const loadFAODistricts = async () => {
    setLoadingDistricts(true);
    try {
      const { data } = await api.get('/assembly/planning/fao-districts');
      setFAODistricts(data.districts || []);
      setFAORegions(data.regions || []);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load district list', 'error');
    } finally {
      setLoadingDistricts(false);
    }
  };

  // ── Select a district from the dropdown — fetch its boundary ──
  const onSelectDistrict = async (name) => {
    setSelectedDistrict(name);
    if (!name) {
      setSelectedDistrictBoundary(null);
      return;
    }
    setLoadingDistrictBoundary(true);
    try {
      const { data } = await api.get(`/assembly/planning/fao-district-boundary?name=${encodeURIComponent(name)}`);
      setSelectedDistrictBoundary({ geojson: data.boundary, bbox: data.bbox, level: data.level, name });
      // Fit map to the district boundary
      if (data.bbox) {
        const { minLng, minLat, maxLng, maxLat } = data.bbox;
        setMapBounds([[minLat, minLng], [maxLat, maxLng]]);
      }
      showToast(`${data.level === 'region' ? 'Region' : 'District'} "${name}" boundary loaded`);
    } catch (err) {
      setSelectedDistrictBoundary(null);
      showToast(err.response?.data?.error || 'Failed to load district boundary', 'error');
    } finally {
      setLoadingDistrictBoundary(false);
    }
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

  // ── Generate site plan for a parcel ──
  const generateSitePlan = async (parcelId) => {
    const parcel = parcelsFC?.features?.find(f => f.properties.id === parcelId);
    const parcelName = parcel?.properties?.name || 'this parcel';
    if (!confirm(`Generate a site plan for "${parcelName}"?`)) return;
    try {
      showToast('Generating site plan...');
      const { data } = await api.post('/site-plans/generate', { parcel_id: parcelId });
      showToast(`Site plan generated (status: ${data.status}). Assembly can certify it from the dashboard.`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to generate site plan', 'error');
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

  // ── Hazard style by type + severity ──
  const hazardTypeColors = {
    water_pollution: { color: '#06b6d4', fillColor: '#06b6d4' },
    flood_prone: { color: '#3b82f6', fillColor: '#3b82f6' },
    illegal_mining: { color: '#a855f7', fillColor: '#a855f7' },
    open_dump: { color: '#ef4444', fillColor: '#ef4444' },
    deforestation: { color: '#84cc16', fillColor: '#84cc16' },
    air_quality: { color: '#f97316', fillColor: '#f97316' },
    urban_heat: { color: '#dc2626', fillColor: '#dc2626' },
    wetland_loss: { color: '#0ea5e9', fillColor: '#0ea5e9' },
  };
  const severityOpacity = { low: 0.2, moderate: 0.35, high: 0.5, critical: 0.6 };
  const hazardStyle = (feature) => {
    const p = feature.properties || {};
    const typeColor = hazardTypeColors[p.hazard_type] || { color: '#fbbf24', fillColor: '#fbbf24' };
    const opacity = severityOpacity[p.severity] || 0.3;
    return { ...typeColor, fillOpacity: opacity, weight: 2 };
  };

  // ── Building list ──
  const buildingList = buildingsFC?.features || [];
  const filteredBuildings = buildingList.filter(b => {
    const s = b.properties.status || '';
    return s.toLowerCase().includes(search.toLowerCase()) ||
      (b.properties.parcel_name || '').toLowerCase().includes(search.toLowerCase());
  });

  const parcelList = parcelsFC?.features || [];

  const fallbackSatellite = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const fallbackStreet = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

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
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: '0.75rem', color: wsConnected ? '#4ade80' : '#6b7280',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: wsConnected ? '#4ade80' : '#6b7280',
              boxShadow: wsConnected ? '0 0 8px #4ade80' : 'none',
              flexShrink: 0,
            }} />
            <LiveIndicatorLabel>{wsConnected ? 'Live' : 'Offline'}</LiveIndicatorLabel>
          </div>
          <LogoutBtn onClick={handleLogout}><LogOut size={16} /> Logout</LogoutBtn>
        </UserInfo>
      </TopBar>

      <Content>
        {/* ── Top Control Bar (replaces left sidebar) ── */}
        <TopControlBar>
          {/* Row 1: Nav + Org info + FAO District + Search + Tools */}
          <TopBarRow>
            <TopBarGroup>
              <NavItem as={Link} to="/assembly/planning" $active>
                <MapIcon size={14} aria-hidden="true" /> Planning Map
              </NavItem>
              <NavItem as={Link} to="/assembly/planning/buildings">
                <Building2 size={14} aria-hidden="true" /> Buildings List
              </NavItem>
              <NavItem as={Link} to="/assembly/planning/schemes">
                <FileText size={14} aria-hidden="true" /> Schemes
              </NavItem>
            </TopBarGroup>

            {orgInfo && (
              <>
                <TopBarDivider />
                <TopBarGroup style={{ fontSize: '0.78rem', color: '#aab7d4' }}>
                  <MapPin size={12} /> {orgInfo.name} — {orgInfo.region}
                </TopBarGroup>
              </>
            )}

            <TopBarDivider />

            {/* FAO District Selector */}
            <TopBarGroup>
              <TopBarSectionLabel>District:</TopBarSectionLabel>
              {faoDistricts.length === 0 && !loadingDistricts && (
                <ActionBtn onClick={loadFAODistricts} style={{ fontSize: '0.72rem', padding: '4px 8px' }}>
                  <Globe size={10} /> Load
                </ActionBtn>
              )}
              {loadingDistricts && (
                <span style={{ fontSize: '0.75rem', color: '#aab7d4' }}>
                  <Loader size={10} className="animate-spin" style={{ marginRight: 4 }} /> Loading…
                </span>
              )}
              {faoDistricts.length > 0 && (
                <CompactSelect
                  value={selectedDistrict}
                  onChange={(e) => onSelectDistrict(e.target.value)}
                  disabled={loadingDistrictBoundary}
                >
                  <option value="">— Select district/region —</option>
                  {faoRegions.length > 0 && (
                    <optgroup label="Regions (Level 1)">
                      {faoRegions.map(r => (
                        <option key={r.name} value={r.name}>{r.name}</option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label={`Districts (${faoDistricts.length})`}>
                    {faoDistricts.map(d => (
                      <option key={d.name} value={d.name}>{d.name}</option>
                    ))}
                  </optgroup>
                </CompactSelect>
              )}
              {loadingDistrictBoundary && (
                <Loader size={12} className="animate-spin" style={{ color: '#5ce1ff' }} />
              )}
              {selectedDistrictBoundary && (
                <span style={{ fontSize: '0.72rem', color: '#4ade80', whiteSpace: 'nowrap' }}>
                  ✓ {selectedDistrictBoundary.name}
                </span>
              )}
            </TopBarGroup>

            <TopBarDivider />

            {/* Search */}
            <TopBarGroup>
              <Search size={12} color="#aab7d4" />
              <CompactInput placeholder="Search buildings..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </TopBarGroup>

            <TopBarDivider />

            {/* Geospatial Tools */}
            <TopBarGroup>
              <ActionBtn onClick={exportKML} style={{ fontSize: '0.72rem', padding: '4px 8px' }}>
                <Download size={10} /> KML
              </ActionBtn>
              <ActionBtn onClick={startParcelCreate} style={{ fontSize: '0.72rem', padding: '4px 8px' }}>
                <Plus size={10} /> New Parcel
              </ActionBtn>
              <ActionBtn onClick={() => { setActivePanel('transfer'); setTransferForm({ parcel_id: '', new_owner_id: '', transfer_reason: '', transfer_document_ref: '' }); }} style={{ fontSize: '0.72rem', padding: '4px 8px' }}>
                <UserPlus size={10} /> Transfer
              </ActionBtn>
            </TopBarGroup>
          </TopBarRow>

          {/* Row 2: Map Layers + Stats (inline, horizontal) */}
          <TopBarRow>
            <TopBarSectionLabel>Layers:</TopBarSectionLabel>
            <InlineLayerToggle>
              <Checkbox type="checkbox" checked={showParcels} onChange={(e) => setShowParcels(e.target.checked)} />
              <MapPin size={12} color="#3ba7ff" /> Parcels ({parcelsFC?.features?.length || 0})
            </InlineLayerToggle>
            <InlineLayerToggle>
              <Checkbox type="checkbox" checked={showBuildings} onChange={(e) => setShowBuildings(e.target.checked)} />
              <Building2 size={12} color="#fbbf24" /> Buildings ({buildingsFC?.features?.length || 0})
            </InlineLayerToggle>
            <InlineLayerToggle>
              <Checkbox type="checkbox" checked={showProtected} onChange={(e) => setShowProtected(e.target.checked)} />
              <Trees size={12} color="#22c55e" /> Protected ({protectedFC?.features?.length || 0})
            </InlineLayerToggle>
            <InlineLayerToggle>
              <Checkbox type="checkbox" checked={showDistrict} onChange={(e) => setShowDistrict(e.target.checked)} />
              <MapPin size={12} color="#5ce1ff" /> District
            </InlineLayerToggle>
            <InlineLayerToggle>
              <Checkbox type="checkbox" checked={showHazards} onChange={(e) => setShowHazards(e.target.checked)} />
              <AlertTriangle size={12} color="#ef4444" /> Hazards ({hazardsFC?.features?.length || 0})
            </InlineLayerToggle>
            <InlineLayerToggle>
              <Checkbox type="checkbox" checked={showGoogleBuildings} onChange={(e) => toggleGoogleBuildings(e.target.checked)} disabled={loadingRefBuildings} />
              <Building2 size={12} color="#22d3ee" /> Google ({googleBuildingsFC?.features?.length || 0})
              {loadingRefBuildings && <Loader size={8} className="animate-spin" />}
            </InlineLayerToggle>
            <InlineLayerToggle>
              <Checkbox type="checkbox" checked={showOSMBuildings} onChange={(e) => toggleOSMBuildings(e.target.checked)} disabled={loadingRefBuildings} />
              <Building2 size={12} color="#a3e635" /> OSM ({osmBuildingsFC?.features?.length || 0})
            </InlineLayerToggle>

            <TopBarDivider />

            {/* Building stats inline */}
            <TopBarSectionLabel>Buildings:</TopBarSectionLabel>
            <InlineStat $color="#fbbf24"><strong>{buildingList.filter(b => b.properties.status === 'unverified').length}</strong> unverified</InlineStat>
            <InlineStat $color="#4ade80"><strong>{buildingList.filter(b => b.properties.status === 'verified_permitted').length}</strong> permitted</InlineStat>
            <InlineStat $color="#f87171"><strong>{buildingList.filter(b => b.properties.status === 'verified_unpermitted').length}</strong> unpermitted</InlineStat>
            <InlineStat $color="#c084fc"><strong>{buildingList.filter(b => b.properties.status === 'under_investigation').length}</strong> investigating</InlineStat>

            {/* Hazard stats inline */}
            {hazardStats && (
              <>
                <TopBarDivider />
                <TopBarSectionLabel>Hazards:</TopBarSectionLabel>
                <InlineStat $color="#ef4444"><strong>{hazardStats.total_active || 0}</strong> active</InlineStat>
                <InlineStat $color="#f97316"><strong>{hazardStats.by_severity?.find(s => s.severity === 'high')?.count || 0}</strong> high</InlineStat>
                <InlineStat $color="#16a34a"><strong>{hazardStats.total_verified || 0}</strong> verified</InlineStat>
              </>
            )}
          </TopBarRow>

          {/* Row 3: Building list link (full list on separate page) */}
          <TopBarRow>
            <TopBarSectionLabel>Buildings:</TopBarSectionLabel>
            <span style={{ fontSize: '0.78rem', color: '#aab7d4' }}>
              {filteredBuildings.length} building{filteredBuildings.length !== 1 ? 's' : ''} loaded
            </span>
            <Link to="/assembly/planning/buildings" style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', background: 'rgba(22,119,255,0.1)',
              border: '1px solid rgba(22,119,255,0.3)', borderRadius: 6,
              color: '#5ce1ff', fontSize: '0.78rem', textDecoration: 'none', whiteSpace: 'nowrap',
            }}>
              <Building2 size={12} /> View All Buildings →
            </Link>
          </TopBarRow>
        </TopControlBar>

        {/* ── Map ── */}
        <MapArea>
          <MapWrapper>
            <MapContainer center={DEFAULT_CENTER} zoom={14} scrollWheelZoom maxZoom={19} minZoom={2} style={{ width: '100%', height: '100%' }}>
              {/* Base layer */}
              {baseLayer === 'satellite' && (
                <TileLayer url={fallbackSatellite} attribution="Tiles &copy; Esri" maxZoom={19} maxNativeZoom={19} />
              )}
              {baseLayer === 'recent' && (
                <TileLayer url={satelliteTiles?.url || fallbackSatellite} attribution={satelliteTiles?.attribution || '&copy; Copernicus Sentinel-2 via EE'} maxZoom={18} maxNativeZoom={16} />
              )}
              {baseLayer === 'street' && (
                <TileLayer url={fallbackStreet} attribution="&copy; OpenStreetMap, &copy; CARTO" maxZoom={19} maxNativeZoom={19} />
              )}
              {baseLayer === 'detection' && detectionResult?.tileUrl && (
                <>
                  <TileLayer url={fallbackSatellite} attribution="" maxZoom={19} />
                  <TileLayer url={detectionResult.tileUrl} attribution={detectionResult.attribution} maxZoom={19} opacity={0.6} />
                </>
              )}

              {/* Change detection tile layers */}
              {baseLayer === 'before' && changeResult?.beforeTileUrl && (
                <TileLayer url={changeResult.beforeTileUrl} attribution="&copy; Copernicus Sentinel-2 via EE" maxZoom={19} />
              )}
              {baseLayer === 'after' && changeResult?.afterTileUrl && (
                <TileLayer url={changeResult.afterTileUrl} attribution="&copy; Copernicus Sentinel-2 via EE" maxZoom={19} />
              )}
              {baseLayer === 'change' && changeResult?.changeTileUrl && (
                <>
                  <TileLayer url={changeResult.afterTileUrl || fallbackSatellite} attribution="" maxZoom={19} />
                  <TileLayer url={changeResult.changeTileUrl} attribution="Building changes &copy; Sentinel-2 via EE" maxZoom={19} opacity={0.7} />
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
                        <button onclick="window.__generateSitePlan('${p.id}')" style="margin-left:4px;cursor:pointer;color:#5ce1ff">Generate Site Plan</button>
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

              {/* Buildings (detected via Sentinel-2) */}
              {showBuildings && buildingsFC && (
                <GeoJSON data={buildingsFC} style={buildingStyle}
                  onEachFeature={(feature, layer) => {
                    if (feature.properties) {
                      const p = feature.properties;
                      layer.bindPopup(`<b>Detected Building</b><br/>Status: ${p.status?.replace(/_/g, ' ')}<br/>Area: ${Math.round(p.area_sqm)} m²<br/>
                        ${p.estimated_height_m ? 'Height: ~' + p.estimated_height_m + 'm (' + (p.estimated_floors || '?') + ' floors)<br/>' : ''}
                        ${p.centroid_lat ? 'Centroid: ' + p.centroid_lat.toFixed(4) + ', ' + p.centroid_lng.toFixed(4) + '<br/>' : ''}
                        ${p.parcel_name ? 'Parcel: ' + p.parcel_name + '<br/>' : ''}
                        ${p.in_protected_area ? '<b style="color:red">In protected area!</b><br/>' : ''}
                        ${p.metadata && Object.keys(p.metadata).length > 0 ? '<b>Metadata:</b><br/>' + Object.entries(p.metadata).map(([k,v]) => k + ': ' + (typeof v === 'object' ? JSON.stringify(v).substring(0, 80) : v)).join('<br/>') : ''}`);
                      layer.on('click', () => onBuildingClick(feature));
                    }
                  }}
                />
              )}

              {/* Google Open Buildings (reference layer) */}
              {showGoogleBuildings && googleBuildingsFC && googleBuildingsFC.features && (
                <GeoJSON data={googleBuildingsFC}
                  style={{ color: '#22d3ee', fillColor: '#22d3ee', fillOpacity: 0.15, weight: 1.5 }}
                  onEachFeature={(feature, layer) => {
                    if (feature.properties) {
                      const p = feature.properties;
                      layer.bindPopup(`<b style="color:#22d3ee">Google Open Building</b><br/>
                        Area: ${p.area_sqm ? Math.round(p.area_sqm) + ' m²' : '—'}<br/>
                        Confidence: ${p.confidence ? (p.confidence * 100).toFixed(0) + '%' : '—'}<br/>
                        ${p.centroid_lat ? 'Centroid: ' + p.centroid_lat.toFixed(4) + ', ' + p.centroid_lng.toFixed(4) : ''}<br/>
                        <small style="color:#888">Source: Google Research Open Buildings</small>`);
                    }
                  }}
                />
              )}

              {/* OSM Buildings (reference layer) */}
              {showOSMBuildings && osmBuildingsFC && osmBuildingsFC.features && (
                <GeoJSON data={osmBuildingsFC}
                  style={{ color: '#a3e635', fillColor: '#a3e635', fillOpacity: 0.15, weight: 1.5 }}
                  onEachFeature={(feature, layer) => {
                    if (feature.properties) {
                      const p = feature.properties;
                      layer.bindPopup(`<b style="color:#a3e635">OSM Building</b><br/>
                        ${p.name ? 'Name: ' + p.name + '<br/>' : ''}
                        Type: ${p.building || 'yes'}<br/>
                        ${p.building_levels ? 'Floors: ' + p.building_levels + '<br/>' : ''}
                        ${p.building_height ? 'Height: ' + p.building_height + '<br/>' : ''}
                        Area: ${p.area_sqm ? Math.round(p.area_sqm) + ' m²' : '—'}<br/>
                        ${p.centroid_lat ? 'Centroid: ' + p.centroid_lat.toFixed(4) + ', ' + p.centroid_lng.toFixed(4) : ''}<br/>
                        <small style="color:#888">Source: OpenStreetMap contributors</small>`);
                    }
                  }}
                />
              )}

              {/* Environmental Hazards */}
              {showHazards && hazardsFC && hazardsFC.features && hazardsFC.features.length > 0 && (
                <GeoJSON data={hazardsFC} style={hazardStyle}
                  onEachFeature={(feature, layer) => {
                    if (feature.properties) {
                      const p = feature.properties;
                      const typeLabels = { water_pollution: 'Water Pollution', flood_prone: 'Flood-Prone Area', illegal_mining: 'Illegal Mining', open_dump: 'Open Dump', deforestation: 'Deforestation', air_quality: 'Air Quality (NO2)', urban_heat: 'Urban Heat Island', wetland_loss: 'Wetland Degradation' };
                      const sevColors = { low: '#fbbf24', moderate: '#f97316', high: '#ef4444', critical: '#991b1b' };
                      const label = typeLabels[p.hazard_type] || p.hazard_type;
                      const sevColor = sevColors[p.severity] || '#fbbf24';
                      layer.bindPopup(`
                        <b style="color:${sevColor}">${label}</b><br/>
                        <b>Severity: ${p.severity?.toUpperCase()}</b><br/>
                        Area: ${Math.round(p.area_sqm).toLocaleString()} m²<br/>
                        ${p.centroid_lat ? 'Location: ' + p.centroid_lat.toFixed(4) + ', ' + p.centroid_lng.toFixed(4) + '<br/>' : ''}
                        Detected: ${p.detected_at ? new Date(p.detected_at).toLocaleDateString() : '—'}<br/>
                        Status: ${p.status}<br/>
                        ${p.confidence ? 'Confidence: ' + (p.confidence * 100).toFixed(0) + '%<br/>' : ''}
                        ${p.description ? '<br/>' + p.description + '<br/>' : ''}
                        <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">
                          <button onclick="window.__verifyHazard('${p.id}')" style="cursor:pointer;padding:2px 8px;background:#16a34a;color:white;border:none;border-radius:4px">Verify</button>
                          <button onclick="window.__resolveHazard('${p.id}')" style="cursor:pointer;padding:2px 8px;background:#6b7280;color:white;border:none;border-radius:4px">Resolve</button>
                          <button onclick="window.__falsePosHazard('${p.id}')" style="cursor:pointer;padding:2px 8px;background:#dc2626;color:white;border:none;border-radius:4px">False Positive</button>
                        </div>
                      `);
                    }
                  }}
                />
              )}

              {/* Hazard detection tile overlay */}
              {baseLayer === 'hazard' && hazardResult?.tileUrl && (
                <TileLayer url={hazardResult.tileUrl} attribution="Hazard detection &copy; Sentinel-2 via EE" maxZoom={19} opacity={0.6} />
              )}

              {/* Drawn boundary preview */}
              {drawnBoundary && (
                <GeoJSON data={{ type: 'Feature', geometry: drawnBoundary, properties: {} }} style={drawnParcelStyle} />
              )}

              {/* Detection area box (editable rectangle for detection) */}
              {detectionBox && (
                <GeoJSON
                  data={{ type: 'Feature', geometry: detectionBox.geojson, properties: {} }}
                  style={() => ({
                    color: '#fbbf24', fillColor: '#fbbf24', fillOpacity: 0.1, weight: 3,
                    dashArray: '8,4',
                  })}
                />
              )}

              {/* Selected FAO district boundary */}
              {selectedDistrictBoundary && (
                <GeoJSON
                  key={selectedDistrictBoundary.name}
                  data={{ type: 'Feature', geometry: selectedDistrictBoundary.geojson, properties: { name: selectedDistrictBoundary.name } }}
                  style={() => ({
                    color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.08, weight: 3,
                  })}
                />
              )}

              {/* Drawing tools — polygon for parcels, rectangle for detection area */}
              <DrawControl active={drawMode} onDrawn={onDrawn} shape="polygon" />
              <DrawControl active={drawDetectionMode} onDrawn={onDetectionBoxDrawn} shape="rectangle" />
              <FitBounds bounds={mapBounds} />
              <MapBoundsTracker onBoundsChange={setMapBounds} />
            </MapContainer>

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

            {/* ── Real-time alert banner (WebSocket) ── */}
            {realtimeAlert && (
              <div style={{
                position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 3000,
                background: 'rgba(239,68,68,0.95)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(239,68,68,0.5)', borderRadius: 12,
                padding: '12px 20px', color: 'white', fontSize: '0.9rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 20px rgba(239,68,68,0.3)',
              }}>
                <Zap size={18} />
                REAL-TIME: {realtimeAlert.newBuildingsCount} new buildings detected!
                <button onClick={() => setRealtimeAlert(null)}
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: 4, padding: '2px 6px' }}>
                  <X size={14} />
                </button>
              </div>
            )}

            {/* ── Building Change Detection Panel ── */}
            <FloatingPanel $show={showChangePanel}>
              <PanelTitle>
                <Activity size={18} color="#f87171" /> Building Change Detection
                <button onClick={() => setShowChangePanel(false)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#aab7d4', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </PanelTitle>

              {changeDetecting && (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Loader size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '0.9rem', color: '#aab7d4' }}>
                    Running ML change detection...
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 8 }}>
                    Comparing satellite imagery between time periods using NDBI/NDVI/BSI indices
                  </div>
                </div>
              )}

              {!changeDetecting && changeResult && (
                <>
                  <div style={{
                    background: changeResult.newBuildingsCount > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                    border: `1px solid ${changeResult.newBuildingsCount > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                    borderRadius: 8, padding: 12, marginBottom: 12,
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: changeResult.newBuildingsCount > 0 ? '#f87171' : '#4ade80' }}>
                      {changeResult.newBuildingsCount} new buildings
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#aab7d4', marginTop: 4 }}>
                      {(changeResult.newBuiltupAreaSqm || 0).toLocaleString()} m² of new built-up area detected
                    </div>
                  </div>

                  {/* Before / After / Change tile layer switcher */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    {changeResult.beforeTileUrl && (
                      <button onClick={() => setBaseLayer('before')}
                        style={{
                          flex: 1, padding: '6px 8px', fontSize: '0.75rem', cursor: 'pointer',
                          background: baseLayer === 'before' ? 'rgba(22,119,255,0.2)' : 'rgba(8,15,36,0.8)',
                          border: `1px solid ${baseLayer === 'before' ? '#1677ff' : 'rgba(92,225,255,0.15)'}`,
                          borderRadius: 6, color: '#e6edf7',
                        }}>
                        Before
                      </button>
                    )}
                    {changeResult.afterTileUrl && (
                      <button onClick={() => setBaseLayer('after')}
                        style={{
                          flex: 1, padding: '6px 8px', fontSize: '0.75rem', cursor: 'pointer',
                          background: baseLayer === 'after' ? 'rgba(22,119,255,0.2)' : 'rgba(8,15,36,0.8)',
                          border: `1px solid ${baseLayer === 'after' ? '#1677ff' : 'rgba(92,225,255,0.15)'}`,
                          borderRadius: 6, color: '#e6edf7',
                        }}>
                        After
                      </button>
                    )}
                    {changeResult.changeTileUrl && (
                      <button onClick={() => setBaseLayer('change')}
                        style={{
                          flex: 1, padding: '6px 8px', fontSize: '0.75rem', cursor: 'pointer',
                          background: baseLayer === 'change' ? 'rgba(239,68,68,0.2)' : 'rgba(8,15,36,0.8)',
                          border: `1px solid ${baseLayer === 'change' ? '#f87171' : 'rgba(92,225,255,0.15)'}`,
                          borderRadius: 6, color: '#e6edf7',
                        }}>
                        Changes (red)
                      </button>
                    )}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 12 }}>
                    {changeResult.method || 'Sentinel-2 multi-temporal NDBI/NDVI/BSI change detection'}
                  </div>

                  {/* Detection history */}
                  {changeHistory.length > 0 && (
                    <div>
                      <Label>Detection History</Label>
                      <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                        {changeHistory.slice(0, 10).map((h, i) => (
                          <div key={h.id || i} style={{
                            padding: '6px 8px', marginBottom: 4, fontSize: '0.75rem',
                            background: 'rgba(8,15,36,0.6)', borderRadius: 6,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          }}>
                            <div>
                              <span style={{ color: h.status === 'completed' ? '#4ade80' : h.status === 'failed' ? '#f87171' : '#fbbf24' }}>
                                {h.status}
                              </span>
                              {' — '}
                              {h.new_buildings_count || 0} buildings
                            </div>
                            <span style={{ color: '#6b7280' }}>
                              {h.completed_at ? new Date(h.completed_at).toLocaleDateString() : '...'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {!changeDetecting && !changeResult && (
                <div style={{ fontSize: '0.85rem', color: '#aab7d4', textAlign: 'center', padding: 20 }}>
                  <Activity size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  Click "Change Detection (ML)" to compare satellite imagery over time and find new buildings.
                  <div style={{ fontSize: '0.75rem', marginTop: 8, color: '#6b7280' }}>
                    Runs automatically every Sunday at 4 AM UTC. Real-time alerts push via WebSocket.
                  </div>
                </div>
              )}
            </FloatingPanel>

            {/* ── Environmental Hazard Panel ── */}
            {/* ── Building Source Comparison Panel ── */}
            <FloatingPanel $show={!!refComparison}>
              <PanelTitle>
                <Layers size={18} color="#22d3ee" /> Building Source Comparison
                <button onClick={() => setRefComparison(null)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#aab7d4', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </PanelTitle>

              {refComparison && (
                <>
                  {/* Summary counts */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <div style={{ padding: 10, background: 'rgba(251,191,36,0.1)', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fbbf24' }}>{refComparison.summary.detected.count}</div>
                      <div style={{ fontSize: '0.7rem', color: '#aab7d4' }}>Detected (S2)</div>
                    </div>
                    <div style={{ padding: 10, background: 'rgba(34,211,238,0.1)', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#22d3ee' }}>{refComparison.summary.google.count}</div>
                      <div style={{ fontSize: '0.7rem', color: '#aab7d4' }}>Google</div>
                    </div>
                    <div style={{ padding: 10, background: 'rgba(163,230,53,0.1)', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#a3e635' }}>{refComparison.summary.osm.count}</div>
                      <div style={{ fontSize: '0.7rem', color: '#aab7d4' }}>OSM</div>
                    </div>
                  </div>

                  {/* Coverage analysis */}
                  <div style={{ padding: 12, background: 'rgba(8,15,36,0.4)', borderRadius: 8, marginBottom: 12 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: '#5ce1ff' }}>Coverage Analysis</div>
                    <div style={{ fontSize: '0.75rem', color: '#aab7d4', lineHeight: 1.8 }}>
                      <div>Detected → Google match: <strong style={{ color: refComparison.coverage.detected_matched_to_google_pct > 70 ? '#4ade80' : refComparison.coverage.detected_matched_to_google_pct > 40 ? '#fbbf24' : '#f87171' }}>{refComparison.coverage.detected_matched_to_google_pct}%</strong> ({refComparison.coverage.detected_matched_to_google} buildings within 15m)</div>
                      <div>Detected → OSM match: <strong style={{ color: refComparison.coverage.detected_matched_to_osm_pct > 70 ? '#4ade80' : refComparison.coverage.detected_matched_to_osm_pct > 40 ? '#fbbf24' : '#f87171' }}>{refComparison.coverage.detected_matched_to_osm_pct}%</strong> ({refComparison.coverage.detected_matched_to_osm} buildings within 15m)</div>
                      <div>Google only (missed by detection): <strong style={{ color: '#fbbf24' }}>{refComparison.coverage.google_only}</strong></div>
                      <div>OSM only (missed by detection): <strong style={{ color: '#fbbf24' }}>{refComparison.coverage.osm_only}</strong></div>
                      <div>Detected only (not in Google/OSM): <strong style={{ color: '#22d3ee' }}>{refComparison.coverage.detected_only}</strong></div>
                    </div>
                  </div>

                  {/* Accuracy assessment */}
                  {refComparison.accuracy_assessment.detection_precision != null && (
                    <div style={{ padding: 12, borderRadius: 8, marginBottom: 12,
                      background: refComparison.accuracy_assessment.detection_precision > 70 ? 'rgba(74,222,128,0.1)' :
                                 refComparison.accuracy_assessment.detection_precision > 40 ? 'rgba(251,191,36,0.1)' : 'rgba(239,68,68,0.1)',
                      border: `1px solid ${refComparison.accuracy_assessment.detection_precision > 70 ? 'rgba(74,222,128,0.3)' :
                                 refComparison.accuracy_assessment.detection_precision > 40 ? 'rgba(251,191,36,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 4,
                        color: refComparison.accuracy_assessment.detection_precision > 70 ? '#4ade80' :
                               refComparison.accuracy_assessment.detection_precision > 40 ? '#fbbf24' : '#f87171' }}>
                        Detection Precision: {refComparison.accuracy_assessment.detection_precision}%
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#aab7d4' }}>{refComparison.accuracy_assessment.note}</div>
                    </div>
                  )}

                  {/* Area statistics */}
                  <div style={{ fontSize: '0.75rem', color: '#aab7d4' }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Area Statistics (m²)</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          <th style={{ textAlign: 'left', padding: '4px 0' }}>Source</th>
                          <th style={{ textAlign: 'right' }}>Mean</th>
                          <th style={{ textAlign: 'right' }}>Median</th>
                          <th style={{ textAlign: 'right' }}>Min</th>
                          <th style={{ textAlign: 'right' }}>Max</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td style={{ color: '#fbbf24' }}>Detected</td><td style={{ textAlign: 'right' }}>{refComparison.summary.detected.mean}</td><td style={{ textAlign: 'right' }}>{refComparison.summary.detected.median}</td><td style={{ textAlign: 'right' }}>{refComparison.summary.detected.min}</td><td style={{ textAlign: 'right' }}>{refComparison.summary.detected.max}</td></tr>
                        <tr><td style={{ color: '#22d3ee' }}>Google</td><td style={{ textAlign: 'right' }}>{refComparison.summary.google.mean}</td><td style={{ textAlign: 'right' }}>{refComparison.summary.google.median}</td><td style={{ textAlign: 'right' }}>{refComparison.summary.google.min}</td><td style={{ textAlign: 'right' }}>{refComparison.summary.google.max}</td></tr>
                        <tr><td style={{ color: '#a3e635' }}>OSM</td><td style={{ textAlign: 'right' }}>{refComparison.summary.osm.mean}</td><td style={{ textAlign: 'right' }}>{refComparison.summary.osm.median}</td><td style={{ textAlign: 'right' }}>{refComparison.summary.osm.min}</td><td style={{ textAlign: 'right' }}>{refComparison.summary.osm.max}</td></tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Sample matches */}
                  {refComparison.matches && refComparison.matches.length > 0 && (
                    <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8 }}>Sample Matches (top {Math.min(20, refComparison.matches.length)})</div>
                      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {refComparison.matches.slice(0, 20).map((m, i) => (
                          <div key={i} style={{ padding: 6, marginBottom: 4, background: 'rgba(8,15,36,0.4)', borderRadius: 6, fontSize: '0.7rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#fbbf24' }}>Detected: {Math.round(m.detected_area)}m²</span>
                              {m.google_match && (
                                <span style={{ color: m.google_match.distance_m < 15 ? '#4ade80' : '#aab7d4' }}>
                                  Google: {m.google_match.distance_m}m {m.google_match.distance_m < 15 ? '✓' : '✗'}
                                </span>
                              )}
                              {m.osm_match && (
                                <span style={{ color: m.osm_match.distance_m < 15 ? '#4ade80' : '#aab7d4' }}>
                                  OSM: {m.osm_match.distance_m}m {m.osm_match.distance_m < 15 ? '✓' : '✗'}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 12 }}>
                    <ActionBtn onClick={() => { if (!googleBuildingsFC) loadGoogleBuildings(); if (!osmBuildingsFC) loadOSMBuildings(); }}>
                      <Building2 size={12} /> Load Both Reference Layers
                    </ActionBtn>
                  </div>
                </>
              )}
            </FloatingPanel>

            {/* ── Hazard Panel ── */}
            <FloatingPanel $show={showHazardPanel}>
              <PanelTitle>
                <AlertTriangle size={18} color="#c084fc" /> Environmental Hazards
                <button onClick={() => setShowHazardPanel(false)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#aab7d4', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </PanelTitle>

              {/* Detection Result */}
              {detectingHazards && (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Loader size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '0.85rem', color: '#aab7d4' }}>
                    Running Earth Engine multi-satellite analysis...
                    <div style={{ fontSize: '0.75rem', marginTop: 4 }}>Sentinel-2: NDWI, MNDWI, NDBI, BSI, NDVI | Sentinel-5P: NO2 | Landsat 9: LST</div>
                  </div>
                </div>
              )}

              {!detectingHazards && hazardResult && (
                <div>
                  {hazardResult.detected ? (
                    <>
                      <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', borderRadius: 8, marginBottom: 12 }}>
                        <AlertTriangle size={16} color="#ef4444" />
                        <span style={{ marginLeft: 8, fontWeight: 600, color: '#ef4444' }}>
                          {hazardResult.total_hazards} hazard(s) detected
                        </span>
                      </div>
                      {Object.entries(hazardResult.results || {}).map(([type, info]) => (
                        info.detected_clusters > 0 && (
                          <div key={type} style={{ marginBottom: 8, padding: 10, background: 'rgba(8,15,36,0.4)', borderRadius: 8 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize' }}>
                              {info.label} ({info.severity})
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#aab7d4', marginTop: 4 }}>
                              {info.detected_clusters} cluster(s) | {Math.round(info.area_sqm).toLocaleString()} m² affected
                            </div>
                          </div>
                        )
                      ))}
                      <div style={{ marginTop: 8 }}>
                        <ActionBtn onClick={() => setBaseLayer('hazard')}>
                          <Satellite size={12} /> View Detection Overlay
                        </ActionBtn>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: 20, textAlign: 'center', color: '#4ade80' }}>
                      <CheckCircle2 size={28} style={{ margin: '0 auto 8px' }} />
                      <div>No hazards detected in this area.</div>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Query Form */}
              {!detectingHazards && (
                <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: '#c084fc' }}>
                    Manual Query — Search Hazard Database
                  </div>
                  <FormGroup>
                    <Label>Hazard Type</Label>
                    <Select value={hazardQuery.hazard_type} onChange={(e) => setHazardQuery({ ...hazardQuery, hazard_type: e.target.value })}>
                      <option value="">All Types</option>
                      <option value="water_pollution">Water Pollution</option>
                      <option value="flood_prone">Flood-Prone Area</option>
                      <option value="illegal_mining">Illegal Mining</option>
                      <option value="open_dump">Open Dump</option>
                      <option value="deforestation">Deforestation</option>
                      <option value="air_quality">Air Quality (NO2)</option>
                      <option value="urban_heat">Urban Heat Island</option>
                      <option value="wetland_loss">Wetland Degradation</option>
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <Label>Severity</Label>
                    <Select value={hazardQuery.severity} onChange={(e) => setHazardQuery({ ...hazardQuery, severity: e.target.value })}>
                      <option value="">All Severities</option>
                      <option value="low">Low</option>
                      <option value="moderate">Moderate</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <Label>Status</Label>
                    <Select value={hazardQuery.status} onChange={(e) => setHazardQuery({ ...hazardQuery, status: e.target.value })}>
                      <option value="">Active + Verified</option>
                      <option value="active">Active Only</option>
                      <option value="verified">Verified Only</option>
                      <option value="resolved">Resolved</option>
                      <option value="false_positive">False Positive</option>
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <Label>Region</Label>
                    <Input value={hazardQuery.region} onChange={(e) => setHazardQuery({ ...hazardQuery, region: e.target.value })}
                      placeholder="e.g., Greater Accra" />
                  </FormGroup>
                  <FormGroup>
                    <Label>Search by Location (lat, lng, radius km)</Label>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Input value={hazardQuery.lat} onChange={(e) => setHazardQuery({ ...hazardQuery, lat: e.target.value })}
                        placeholder="Lat" style={{ flex: 1 }} />
                      <Input value={hazardQuery.lng} onChange={(e) => setHazardQuery({ ...hazardQuery, lng: e.target.value })}
                        placeholder="Lng" style={{ flex: 1 }} />
                      <Input value={hazardQuery.radius_km} onChange={(e) => setHazardQuery({ ...hazardQuery, radius_km: e.target.value })}
                        placeholder="km" style={{ width: 60 }} />
                    </div>
                  </FormGroup>
                  <FormGroup>
                    <Label>Date Range</Label>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Input type="date" value={hazardQuery.date_from} onChange={(e) => setHazardQuery({ ...hazardQuery, date_from: e.target.value })} />
                      <Input type="date" value={hazardQuery.date_to} onChange={(e) => setHazardQuery({ ...hazardQuery, date_to: e.target.value })} />
                    </div>
                  </FormGroup>
                  <BtnRow>
                    <PrimaryBtn onClick={runHazardQuery} disabled={queryingHazards}>
                      {queryingHazards ? <Loader size={14} className="animate-spin" /> : <Search size={14} />}
                      {queryingHazards ? 'Searching...' : 'Search Hazards'}
                    </PrimaryBtn>
                  </BtnRow>
                </div>
              )}

              {/* Hazard List */}
              {hazardsFC?.features && hazardsFC.features.length > 0 && (
                <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>
                    Hazards on Map ({hazardsFC.features.length})
                  </div>
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {hazardsFC.features.map((f, i) => {
                      const p = f.properties;
                      const typeLabels = { water_pollution: 'Water Pollution', flood_prone: 'Flood', illegal_mining: 'Mining', open_dump: 'Dump', deforestation: 'Deforestation', air_quality: 'Air Quality', urban_heat: 'Heat Island', wetland_loss: 'Wetland Loss' };
                      const sevColors = { low: '#fbbf24', moderate: '#f97316', high: '#ef4444', critical: '#991b1b' };
                      return (
                        <div key={i} style={{ padding: 8, marginBottom: 4, background: 'rgba(8,15,36,0.4)', borderRadius: 6, fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: sevColors[p.severity] || '#fbbf24', fontWeight: 600 }}>
                              {typeLabels[p.hazard_type] || p.hazard_type}
                            </span>
                            <span style={{ color: '#aab7d4', fontSize: '0.7rem' }}>{p.severity}</span>
                          </div>
                          <div style={{ color: '#6b7280', fontSize: '0.7rem', marginTop: 2 }}>
                            {Math.round(p.area_sqm).toLocaleString()} m² | {p.detected_at ? new Date(p.detected_at).toLocaleDateString() : '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!detectingHazards && !hazardResult && hazardsFC?.features?.length === 0 && (
                <div style={{ fontSize: '0.85rem', color: '#aab7d4', textAlign: 'center', padding: 20 }}>
                  <AlertTriangle size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  Click "Detect Hazards (EE)" to scan for environmental hazards, or use the manual query form below to search the database.
                  <div style={{ fontSize: '0.75rem', marginTop: 8, color: '#6b7280' }}>
                    Detects: water pollution, flood-prone areas, illegal mining, open dumps, deforestation, air quality (NO2), urban heat islands, and wetland degradation via Sentinel-2/5P + Landsat 9 spectral analysis.
                  </div>
                </div>
              )}
            </FloatingPanel>

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
                const meta = p.metadata || {};
                const comparison = meta.nearby_comparison || null;
                const heightInfo = meta.height_estimation || {};
                return (
                  <>
                    <div style={{ fontSize: '0.8rem', color: '#aab7d4', marginBottom: 12 }}>
                      Area: {Math.round(p.area_sqm)} m²
                      {p.centroid_lat && ` | Centroid: ${p.centroid_lat.toFixed(4)}, ${p.centroid_lng.toFixed(4)}`}
                      {p.parcel_name && ` | Parcel: ${p.parcel_name}`}
                    </div>

                    {/* ── Building Height Estimation ── */}
                    {(p.estimated_height_m != null || heightInfo.height_m != null) && (
                      <div style={{ padding: 10, background: 'rgba(92,225,255,0.08)', borderRadius: 8, marginBottom: 12, border: '1px solid rgba(92,225,255,0.2)' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#5ce1ff', marginBottom: 6 }}>
                          Height Estimation
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#aab7d4', display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                          <span>Height: <strong style={{ color: '#fff' }}>{p.estimated_height_m || heightInfo.height_m}m</strong></span>
                          {(p.estimated_floors || heightInfo.estimated_floors) && (
                            <span>Floors: <strong style={{ color: '#fff' }}>~{p.estimated_floors || heightInfo.estimated_floors}</strong></span>
                          )}
                          <span>Method: <strong style={{ color: '#fff' }}>{(p.height_method || heightInfo.method || '').replace(/_/g, ' ')}</strong></span>
                          {(p.height_confidence || heightInfo.confidence) != null && (
                            <span>Confidence: <strong style={{ color: (p.height_confidence || heightInfo.confidence) > 0.5 ? '#4ade80' : '#fbbf24' }}>{Math.round((p.height_confidence || heightInfo.confidence) * 100)}%</strong></span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── Size Comparison to Nearby Buildings ── */}
                    {comparison && comparison.nearby_count > 0 && (
                      <div style={{ padding: 10, background: 'rgba(132,204,22,0.08)', borderRadius: 8, marginBottom: 12, border: '1px solid rgba(132,204,22,0.2)' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#84cc16', marginBottom: 6 }}>
                          Size Comparison ({comparison.nearby_count} nearby)
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#aab7d4', display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                          {comparison.median_area != null && <span>Median nearby: <strong style={{ color: '#fff' }}>{comparison.median_area} m²</strong></span>}
                          {comparison.mean_area != null && <span>Mean: <strong style={{ color: '#fff' }}>{comparison.mean_area} m²</strong></span>}
                          {comparison.percentile_rank != null && <span>Percentile: <strong style={{ color: '#fff' }}>{comparison.percentile_rank}%</strong></span>}
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <span style={{
                            fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4,
                            background: comparison.size_category === 'unusually_large' ? 'rgba(239,68,68,0.2)' :
                                        comparison.size_category === 'larger_than_average' ? 'rgba(251,191,36,0.2)' :
                                        comparison.size_category === 'unusually_small' ? 'rgba(59,130,246,0.2)' :
                                        comparison.size_category === 'smaller_than_average' ? 'rgba(6,182,212,0.2)' :
                                        'rgba(74,222,128,0.2)',
                            color: comparison.size_category === 'unusually_large' ? '#f87171' :
                                   comparison.size_category === 'larger_than_average' ? '#fbbf24' :
                                   comparison.size_category === 'unusually_small' ? '#60a5fa' :
                                   comparison.size_category === 'smaller_than_average' ? '#22d3ee' : '#4ade80',
                            textTransform: 'capitalize',
                          }}>
                            {comparison.size_category.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {comparison.height_comparison && (
                          <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: 4 }}>
                            Nearby median height: {comparison.height_comparison.median_height_m}m ({comparison.height_comparison.nearby_with_height_data} buildings with height data)
                          </div>
                        )}
                      </div>
                    )}
                    {comparison && comparison.nearby_count === 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 12, padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                        First building in this area — no nearby buildings for comparison.
                      </div>
                    )}

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
            {changeDetecting && (
              <LoadingOverlay>
                <Activity size={32} className="animate-pulse" color="#f87171" />
                Running ML building change detection...
                <div style={{ fontSize: '0.75rem', color: '#aab7d4', maxWidth: 400, textAlign: 'center' }}>
                  Comparing Sentinel-2 satellite imagery between time periods using NDBI, NDVI, BSI indices
                  + morphological cleaning to identify new buildings
                </div>
              </LoadingOverlay>
            )}
          </MapWrapper>
        </MapArea>

        {/* ── Bottom Bar (action buttons + base layers) ── */}
        <BottomBar>
          {/* Action buttons */}
          <BottomBarGroup>
            <MapButton onClick={() => runDetection(true)} disabled={detecting}
              style={{ borderColor: 'rgba(34,197,94,0.4)', color: '#4ade80' }}>
              {detecting ? <Loader size={14} className="animate-spin" /> : <Globe size={14} />}
              {detecting ? 'Detecting...' : selectedDistrict ? `Detect (${selectedDistrict})` : 'Detect (FAO)'}
            </MapButton>
            <MapButton onClick={() => runDetection(false)} disabled={detecting}>
              {detecting ? <Loader size={14} className="animate-spin" /> : <Satellite size={14} />}
              {detecting ? 'Detecting...' : detectionBox ? 'Detect (Drawn)' : 'Detect (Viewport)'}
            </MapButton>
            <MapButton
              onClick={() => drawDetectionMode ? setDrawDetectionMode(false) : setDrawDetectionMode(true)}
              style={{ borderColor: drawDetectionMode ? 'rgba(251,191,36,0.6)' : 'rgba(251,191,36,0.3)', color: '#fbbf24' }}>
              <Edit3 size={14} /> {drawDetectionMode ? 'Drawing…' : 'Draw Area'}
            </MapButton>
            {detectionBox && (
              <MapButton onClick={clearDetectionBox} style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#f87171' }}>
                <X size={14} /> Clear Area
              </MapButton>
            )}
          </BottomBarGroup>

          <BottomBarDivider />

          <BottomBarGroup>
            <MapButton onClick={runChangeDetection} disabled={changeDetecting}
              style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#f87171' }}>
              {changeDetecting ? <Loader size={14} className="animate-spin" /> : <Activity size={14} />}
              {changeDetecting ? 'Analyzing...' : 'Change Detection'}
            </MapButton>
            <MapButton onClick={runHazardDetection} disabled={detectingHazards}
              style={{ borderColor: 'rgba(168,85,247,0.4)', color: '#c084fc' }}>
              {detectingHazards ? <Loader size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
              {detectingHazards ? 'Scanning...' : 'Detect Hazards'}
            </MapButton>
            <MapButton onClick={() => setShowHazardPanel(!showHazardPanel)}
              style={{ borderColor: 'rgba(168,85,247,0.3)', color: '#c084fc' }}>
              <Search size={14} /> Hazard Query
            </MapButton>
            <MapButton onClick={runBuildingComparison} disabled={loadingRefBuildings}
              style={{ borderColor: 'rgba(34,211,238,0.4)', color: '#22d3ee' }}>
              {loadingRefBuildings ? <Loader size={14} className="animate-spin" /> : <Layers size={14} />}
              {loadingRefBuildings ? 'Comparing...' : 'Compare'}
            </MapButton>
          </BottomBarGroup>

          <BottomBarDivider />

          <BottomBarGroup>
            <MapButton onClick={loadAll}><RefreshCw size={14} /> Refresh</MapButton>
            <MapButton onClick={exportKML}><Download size={14} /> KML</MapButton>
            {drawMode && (
              <MapButton onClick={() => setDrawMode(false)} style={{ borderColor: 'rgba(251,191,36,0.4)', color: '#fbbf24' }}>
                <X size={14} /> Cancel Draw
              </MapButton>
            )}
            {drawDetectionMode && (
              <MapButton onClick={() => setDrawDetectionMode(false)} style={{ borderColor: 'rgba(251,191,36,0.4)', color: '#fbbf24' }}>
                <X size={14} /> Cancel Area
              </MapButton>
            )}
          </BottomBarGroup>

          <BottomBarDivider />

          {/* Base layer radios */}
          <BottomBarGroup>
            <TopBarSectionLabel>Base:</TopBarSectionLabel>
            <BaseLayerRadio>
              <input type="radio" name="baseLayer" checked={baseLayer === 'satellite'} onChange={() => setBaseLayer('satellite')} />
              <Satellite size={12} /> Satellite
            </BaseLayerRadio>
            <BaseLayerRadio>
              <input type="radio" name="baseLayer" checked={baseLayer === 'recent'} onChange={() => setBaseLayer('recent')} />
              <Clock size={12} color="#5ce1ff" /> Sentinel-2
            </BaseLayerRadio>
            <BaseLayerRadio>
              <input type="radio" name="baseLayer" checked={baseLayer === 'street'} onChange={() => setBaseLayer('street')} />
              <MapPin size={12} /> Street
            </BaseLayerRadio>
            {detectionResult && (
              <BaseLayerRadio>
                <input type="radio" name="baseLayer" checked={baseLayer === 'detection'} onChange={() => setBaseLayer('detection')} />
                <Building2 size={12} /> Detection
              </BaseLayerRadio>
            )}
            {changeResult?.beforeTileUrl && (
              <BaseLayerRadio>
                <input type="radio" name="baseLayer" checked={baseLayer === 'before'} onChange={() => setBaseLayer('before')} />
                <Clock size={12} /> Before
              </BaseLayerRadio>
            )}
            {changeResult?.afterTileUrl && (
              <BaseLayerRadio>
                <input type="radio" name="baseLayer" checked={baseLayer === 'after'} onChange={() => setBaseLayer('after')} />
                <Clock size={12} /> After
              </BaseLayerRadio>
            )}
            {changeResult?.changeTileUrl && (
              <BaseLayerRadio>
                <input type="radio" name="baseLayer" checked={baseLayer === 'change'} onChange={() => setBaseLayer('change')} />
                <Activity size={12} color="#f87171" /> Changes
              </BaseLayerRadio>
            )}
            {hazardResult?.tileUrl && (
              <BaseLayerRadio>
                <input type="radio" name="baseLayer" checked={baseLayer === 'hazard'} onChange={() => setBaseLayer('hazard')} />
                <AlertTriangle size={12} color="#c084fc" /> Hazard
              </BaseLayerRadio>
            )}
          </BottomBarGroup>
        </BottomBar>
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
