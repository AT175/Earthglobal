import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Landmark, MapPin, LogOut, Layers, FileText, Upload, Download, Trash2,
  CheckCircle2, XCircle, Loader, Map as MapIcon, Building2, Globe,
  ChevronRight, X, Plus, Ruler,
} from 'lucide-react';
import api from '../../services/api';
import { NavList, NavItem } from '@earthglobal/design-system';

// ═══════════════════════════════════════════════════════════
// Styled Components (mirrors PlanningDashboard's visual language)
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

const MainArea = styled.div`flex: 1; overflow-y: auto; padding: 24px;`;

const SchemeGrid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px; margin-top: 16px;
`;

const SchemeCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.borderDark)};
  border-radius: ${({ theme }) => theme.radii.lg}; padding: 16px; cursor: pointer;
  transition: all 0.2s;
  &:hover { border-color: ${({ theme }) => theme.colors.primary}; box-shadow: ${({ theme }) => theme.shadows.glowSoft}; }
`;

const SchemeCardTitle = styled.div`
  font-weight: 600; font-size: 1rem; display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
`;

const SchemeCardMeta = styled.div`
  font-size: 0.8rem; color: ${({ theme }) => theme.colors.textMuted};
  display: flex; flex-direction: column; gap: 4px;
`;

const StatusBadge = styled.span`
  display: inline-flex; align-items: center; gap: 3px;
  padding: 1px 8px; border-radius: 999px;
  font-size: 0.65rem; font-weight: 600;
  background: ${({ $bg }) => $bg}; color: ${({ $color }) => $color};
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.lg}; padding: 20px;
`;

const FormGroup = styled.div`margin-bottom: 14px;`;

const Label = styled.label`
  display: block; font-size: 0.8rem; color: ${({ theme }) => theme.colors.textMuted}; margin-bottom: 6px;
`;

const Input = styled.input`
  width: 100%; padding: 10px 12px; background: rgba(8,15,36,0.8);
  border: 1px solid rgba(92,225,255,0.15); border-radius: 8px;
  color: ${({ theme }) => theme.colors.text}; font-size: 0.9rem; outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const TextArea = styled.textarea`
  width: 100%; padding: 10px 12px; background: rgba(8,15,36,0.8);
  border: 1px solid rgba(92,225,255,0.15); border-radius: 8px;
  color: ${({ theme }) => theme.colors.text}; font-size: 0.9rem; outline: none;
  min-height: 60px; resize: vertical;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const Select = styled.select`
  width: 100%; padding: 10px 12px; background: rgba(8,15,36,0.8);
  border: 1px solid rgba(92,225,255,0.15); border-radius: 8px;
  color: ${({ theme }) => theme.colors.text}; font-size: 0.9rem; outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const FileDropZone = styled.label`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 32px; border: 2px dashed rgba(92,225,255,0.25); border-radius: 12px;
  cursor: pointer; transition: all 0.2s; text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  &:hover { border-color: ${({ theme }) => theme.colors.primary}; background: rgba(22,119,255,0.05); }
`;

const Btn = styled.button`
  display: flex; align-items: center; gap: 6px;
  padding: 10px 18px; border: none; border-radius: 8px;
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
  background: transparent; border: 1px solid rgba(239,68,68,0.3); color: #f87171;
`;

const BtnRow = styled.div`display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap;`;

const MapPanel = styled.div`
  height: 520px; border-radius: ${({ theme }) => theme.radii.lg}; overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.borderDark}; position: relative; margin-top: 16px;
  .leaflet-container { width: 100%; height: 100%; background: #080f24; }
`;

const ParcelListPanel = styled.div`
  margin-top: 16px; max-height: 340px; overflow-y: auto;
`;

const ParcelRow = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  font-size: 0.85rem;
`;

const Toast = styled.div`
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  background: ${({ $type }) => ($type === 'error' ? '#7f1d1d' : '#14532d')};
  color: white; padding: 12px 20px; border-radius: 10px; z-index: 2000;
  display: flex; align-items: center; gap: 8px; font-size: 0.85rem;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
`;

const InfoBox = styled.div`
  background: rgba(22,119,255,0.08); border: 1px solid rgba(22,119,255,0.2);
  border-radius: 8px; padding: 10px 14px; font-size: 0.8rem; color: #aab7d4; margin-bottom: 14px;
`;

// Fix Leaflet default icons
if (typeof window !== 'undefined') {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

const DEFAULT_CENTER = [6.20, -1.85];

const LAND_USE_COLORS = {
  residential: '#3ba7ff',
  commercial: '#fbbf24',
  industrial: '#f97316',
  institutional: '#c084fc',
  mixed: '#4ade80',
  recreational: '#22c55e',
};

export default function SchemeManagement() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [schemes, setSchemes] = useState([]);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [schemeParcels, setSchemeParcels] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [projections, setProjections] = useState([]);
  const [extracting, setExtracting] = useState(null); // parcel id currently extracting

  // Upload form state
  const [uploadForm, setUploadForm] = useState({ name: '', description: '', source_crs: 'EPSG:4326', version: '1.0' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) setUser(JSON.parse(userStr));
    loadSchemes();
    loadProjections();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  async function loadSchemes() {
    setLoading(true);
    try {
      const { data } = await api.get('/assembly/planning/schemes');
      setSchemes(data.schemes || []);
    } catch (err) {
      showToast('Failed to load schemes', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadProjections() {
    try {
      const { data } = await api.get('/assembly/planning/projections');
      setProjections(data.projections || []);
    } catch {}
  }

  async function openScheme(scheme) {
    try {
      const [schemeRes, parcelsRes] = await Promise.all([
        api.get(`/assembly/planning/schemes/${scheme.id}`),
        api.get(`/assembly/planning/schemes/${scheme.id}/parcels`),
      ]);
      setSelectedScheme(schemeRes.data);
      setSchemeParcels(parcelsRes.data);
    } catch (err) {
      showToast('Failed to load scheme detail', 'error');
    }
  }

  async function deleteScheme(id, e) {
    e.stopPropagation();
    if (!window.confirm('Delete this planning scheme and all its parcels?')) return;
    try {
      await api.delete(`/assembly/planning/schemes/${id}`);
      showToast('Scheme deleted');
      if (selectedScheme?.id === id) { setSelectedScheme(null); setSchemeParcels(null); }
      loadSchemes();
    } catch (err) {
      showToast(err.response?.data?.error || 'Delete failed', 'error');
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (!uploadForm.name) {
      setUploadForm((f) => ({ ...f, name: file.name.replace(/\.[^/.]+$/, '') }));
    }
  }

  async function handleUpload() {
    if (!selectedFile) { showToast('Select a GeoJSON file to upload', 'error'); return; }
    if (!uploadForm.name) { showToast('Scheme name is required', 'error'); return; }

    setUploading(true);
    try {
      const text = await selectedFile.text();
      let geojson;
      try {
        geojson = JSON.parse(text);
      } catch {
        showToast('File must be valid GeoJSON. Convert Shapefile/KML to GeoJSON first.', 'error');
        setUploading(false);
        return;
      }

      // Accept either a FeatureCollection or a single Feature/Geometry
      if (geojson.type === 'Feature') {
        geojson = { type: 'FeatureCollection', features: [geojson] };
      } else if (geojson.type && geojson.type !== 'FeatureCollection') {
        geojson = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: geojson, properties: {} }] };
      }

      const selectedProjection = projections.find((p) => p.code === uploadForm.source_crs);

      const { data } = await api.post('/assembly/planning/schemes', {
        name: uploadForm.name,
        description: uploadForm.description,
        source_crs: uploadForm.source_crs,
        source_crs_name: selectedProjection?.name,
        format: 'geojson',
        version: uploadForm.version,
        geojson,
      });

      showToast(
        data.reprojected
          ? `Scheme uploaded & reprojected from ${data.source_crs_name || data.source_crs} to WGS84 (${data.parcel_count} parcels)`
          : `Scheme uploaded (${data.parcel_count} parcels)`
      );
      setShowUploadForm(false);
      setSelectedFile(null);
      setUploadForm({ name: '', description: '', source_crs: 'EPSG:4326', version: '1.0' });
      loadSchemes();
    } catch (err) {
      showToast(err.response?.data?.error || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function extractBuildings(parcelId) {
    if (!selectedScheme) return;
    setExtracting(parcelId);
    try {
      const { data } = await api.post(
        `/assembly/planning/schemes/${selectedScheme.id}/parcels/${parcelId}/extract-buildings`
      );
      showToast(`Extracted ${data.stats?.vectorized_buildings || 0} buildings for "${data.parcel_label}"`);
      // Refresh parcels to show updated extraction stats
      const { data: parcelsData } = await api.get(`/assembly/planning/schemes/${selectedScheme.id}/parcels`);
      setSchemeParcels(parcelsData);
    } catch (err) {
      showToast(err.response?.data?.error || 'Building extraction failed', 'error');
    } finally {
      setExtracting(null);
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  }

  const statusColors = {
    active: { bg: 'rgba(74,222,128,0.15)', color: '#4ade80' },
    draft: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
    superseded: { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af' },
  };

  return (
    <Page>
      <TopBar>
        <Logo>
          <LogoIcon><Landmark size={22} /></LogoIcon>
          EarthGlobal <span style={{ color: '#5ce1ff' }}>Planning</span>
        </Logo>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {user && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.85rem' }}>
              <span style={{ fontWeight: 600 }}>{user.name}</span>
              <span style={{ color: '#aab7d4', fontSize: '0.75rem' }}>{user.assemblyRole?.replace(/_/g, ' ')}</span>
            </div>
          )}
          <LogoutBtn onClick={handleLogout}><LogOut size={16} /> Logout</LogoutBtn>
        </div>
      </TopBar>

      <Content>
        {/* ── Sidebar (AppShell-style navigation) ── */}
        <Sidebar>
          <SidebarSection>
            <SectionTitle><Layers size={14} /> Planning</SectionTitle>
            <NavList style={{ marginTop: 0, gap: 2 }}>
              <NavItem as={Link} to="/assembly/planning">
                <MapIcon size={16} aria-hidden="true" /> Planning Map
              </NavItem>
              <NavItem as={Link} to="/assembly/planning/schemes" $active>
                <FileText size={16} aria-hidden="true" /> Scheme Management
              </NavItem>
            </NavList>
          </SidebarSection>

          <SidebarSection style={{ borderBottom: 'none', flex: 1 }}>
            <SectionTitle><FileText size={14} /> Planning Schemes ({schemes.length})</SectionTitle>
            <SecondaryBtn onClick={() => setShowUploadForm(true)} style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}>
              <Upload size={14} /> Upload Scheme
            </SecondaryBtn>

            {loading && <div style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Loading...</div>}

            {!loading && schemes.length === 0 && (
              <div style={{ color: '#aab7d4', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
                No schemes uploaded yet.
              </div>
            )}

            {schemes.map((s) => (
              <ParcelRow
                key={s.id}
                as="div"
                style={{
                  cursor: 'pointer', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                  background: selectedScheme?.id === s.id ? 'rgba(22,119,255,0.1)' : 'transparent',
                  borderLeft: selectedScheme?.id === s.id ? '3px solid #1677ff' : '3px solid transparent',
                  paddingLeft: 10,
                }}
                onClick={() => openScheme(s)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{s.name}</span>
                  <StatusBadge $bg={statusColors[s.status]?.bg} $color={statusColors[s.status]?.color}>
                    {s.status}
                  </StatusBadge>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#aab7d4' }}>
                  {s.parcel_count} parcels &middot; {s.source_crs_name || s.source_crs}
                </div>
              </ParcelRow>
            ))}
          </SidebarSection>
        </Sidebar>

        {/* ── Main Area ── */}
        <MainArea>
          {!selectedScheme && (
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <Globe size={22} color="#5ce1ff" />
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Scheme Management</h2>
              </div>
              <p style={{ color: '#aab7d4', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Upload the assembly's approved land-use planning scheme here. Each scheme is broken
                into parcels (zoned land-use areas) which become the basis for automated building
                extraction — run Sentinel-2 satellite detection per parcel to identify structures
                within each zoned plot.
              </p>
              <p style={{ color: '#aab7d4', fontSize: '0.9rem', lineHeight: 1.6 }}>
                If your scheme was surveyed in a local datum/projection (e.g. <strong>Accra / Ghana Grid</strong>),
                select it during upload — coordinates are automatically reprojected to WGS84 (lat/lng)
                so the scheme displays correctly on the map.
              </p>
              <BtnRow>
                <PrimaryBtn onClick={() => setShowUploadForm(true)}><Upload size={16} /> Upload a Scheme</PrimaryBtn>
              </BtnRow>
            </Card>
          )}

          {selectedScheme && (
            <>
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{selectedScheme.name}</h2>
                      <StatusBadge $bg={statusColors[selectedScheme.status]?.bg} $color={statusColors[selectedScheme.status]?.color}>
                        {selectedScheme.status}
                      </StatusBadge>
                    </div>
                    {selectedScheme.description && (
                      <p style={{ color: '#aab7d4', fontSize: '0.85rem', marginTop: 6 }}>{selectedScheme.description}</p>
                    )}
                    <div style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: '0.8rem', color: '#aab7d4' }}>
                      <span><Globe size={12} style={{ verticalAlign: -2 }} /> Source: {selectedScheme.source_crs_name || selectedScheme.source_crs}</span>
                      <span><Building2 size={12} style={{ verticalAlign: -2 }} /> {selectedScheme.parcel_count} parcels</span>
                      <span><Ruler size={12} style={{ verticalAlign: -2 }} /> {selectedScheme.total_area_sqm ? `${(selectedScheme.total_area_sqm / 10000).toFixed(2)} ha` : '—'}</span>
                    </div>
                  </div>
                  <DangerBtn onClick={(e) => deleteScheme(selectedScheme.id, e)}>
                    <Trash2 size={14} /> Delete
                  </DangerBtn>
                </div>

                {selectedScheme.source_crs !== 'EPSG:4326' && (
                  <InfoBox style={{ marginTop: 14 }}>
                    <CheckCircle2 size={14} style={{ verticalAlign: -2, marginRight: 6, color: '#4ade80' }} />
                    This scheme was uploaded in <strong>{selectedScheme.source_crs_name || selectedScheme.source_crs}</strong> and
                    has been automatically reprojected to WGS84 (EPSG:4326) for map visualization.
                  </InfoBox>
                )}

                <MapPanel>
                  <MapContainer center={DEFAULT_CENTER} zoom={13} style={{ width: '100%', height: '100%' }}>
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      attribution="&copy; CARTO"
                    />
                    {schemeParcels && schemeParcels.features?.length > 0 && (
                      <GeoJSON
                        key={selectedScheme.id}
                        data={schemeParcels}
                        style={(feature) => ({
                          color: LAND_USE_COLORS[feature.properties?.land_use] || '#5ce1ff',
                          weight: 2,
                          fillOpacity: 0.25,
                        })}
                        onEachFeature={(feature, layer) => {
                          const p = feature.properties;
                          layer.bindPopup(
                            `<strong>${p.parcel_label || 'Parcel'}</strong><br/>` +
                            `${p.land_use ? `Land use: ${p.land_use}<br/>` : ''}` +
                            `Area: ${p.area_sqm ? Math.round(p.area_sqm) + ' m²' : '—'}<br/>` +
                            `${p.last_extraction_count ? `Buildings extracted: ${p.last_extraction_count}` : 'Not yet extracted'}`
                          );
                        }}
                      />
                    )}
                  </MapContainer>
                </MapPanel>
              </Card>

              <Card style={{ marginTop: 16 }}>
                <SectionTitle style={{ marginBottom: 12 }}>
                  <Building2 size={14} /> Scheme Parcels — Building Extraction
                </SectionTitle>
                <p style={{ color: '#aab7d4', fontSize: '0.8rem', marginBottom: 8 }}>
                  Run Sentinel-2 building detection for each parcel individually. Detected buildings
                  are vectorized and saved against the parcel for verification in the Planning Map.
                </p>
                <ParcelListPanel>
                  {(schemeParcels?.features || []).map((f) => {
                    const p = f.properties;
                    return (
                      <ParcelRow key={p.id}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.parcel_label}</div>
                          <div style={{ fontSize: '0.72rem', color: '#aab7d4' }}>
                            {p.land_use ? `${p.land_use} · ` : ''}{p.area_sqm ? `${Math.round(p.area_sqm)} m²` : ''}
                            {p.last_extraction_count > 0 && (
                              <span style={{ color: '#4ade80' }}> · {p.last_extraction_count} buildings found</span>
                            )}
                          </div>
                        </div>
                        <SecondaryBtn onClick={() => extractBuildings(p.id)} disabled={extracting === p.id}>
                          {extracting === p.id ? <Loader size={13} className="animate-spin" /> : <Building2 size={13} />}
                          {extracting === p.id ? 'Extracting...' : 'Extract Buildings'}
                        </SecondaryBtn>
                      </ParcelRow>
                    );
                  })}
                  {(!schemeParcels || schemeParcels.features?.length === 0) && (
                    <div style={{ color: '#aab7d4', fontSize: '0.85rem', padding: '12px 0' }}>No parcels found in this scheme.</div>
                  )}
                </ParcelListPanel>
              </Card>
            </>
          )}
        </MainArea>
      </Content>

      {/* ── Upload Scheme Modal ── */}
      {showUploadForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Card style={{ width: 480, maxHeight: '85vh', overflowY: 'auto', position: 'relative' }}>
            <button
              onClick={() => setShowUploadForm(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#aab7d4', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
            <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Upload size={18} color="#5ce1ff" /> Upload Planning Scheme
            </h3>

            <FormGroup>
              <Label>Scheme Name *</Label>
              <Input value={uploadForm.name} onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                placeholder="e.g. Amansie West Layout Plan 2025" />
            </FormGroup>

            <FormGroup>
              <Label>Description</Label>
              <TextArea value={uploadForm.description} onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Optional notes about this scheme..." />
            </FormGroup>

            <FormGroup>
              <Label>Source Datum / Projection *</Label>
              <Select value={uploadForm.source_crs} onChange={(e) => setUploadForm({ ...uploadForm, source_crs: e.target.value })}>
                {projections.map((p) => (
                  <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
                ))}
              </Select>
              <div style={{ fontSize: '0.72rem', color: '#aab7d4', marginTop: 4 }}>
                If the scheme file's coordinates are in a local grid (not lat/lng), select the matching
                projection so it can be reprojected to WGS84 for map display.
              </div>
            </FormGroup>

            <FormGroup>
              <Label>Version</Label>
              <Input value={uploadForm.version} onChange={(e) => setUploadForm({ ...uploadForm, version: e.target.value })} placeholder="1.0" />
            </FormGroup>

            <FormGroup>
              <Label>Scheme File (GeoJSON) *</Label>
              <FileDropZone htmlFor="scheme-file-input">
                <FileText size={28} />
                {selectedFile ? (
                  <span style={{ color: '#e6edf7' }}>{selectedFile.name}</span>
                ) : (
                  <>
                    <span>Click to select a GeoJSON file</span>
                    <span style={{ fontSize: '0.7rem' }}>Convert Shapefile/KML/DXF to GeoJSON before uploading</span>
                  </>
                )}
              </FileDropZone>
              <input
                id="scheme-file-input" ref={fileInputRef} type="file" accept=".json,.geojson,application/geo+json"
                style={{ display: 'none' }} onChange={handleFileChange}
              />
            </FormGroup>

            <BtnRow>
              <PrimaryBtn onClick={handleUpload} disabled={uploading}>
                {uploading ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploading ? 'Uploading...' : 'Upload & Reproject'}
              </PrimaryBtn>
              <SecondaryBtn onClick={() => setShowUploadForm(false)}>Cancel</SecondaryBtn>
            </BtnRow>
          </Card>
        </div>
      )}

      {toast && (
        <Toast $type={toast.type}>
          {toast.type === 'error' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.msg}
        </Toast>
      )}
    </Page>
  );
}
