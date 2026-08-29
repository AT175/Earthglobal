import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import {
  Landmark, MapPin, LogOut, Layers, FileText, Building2, Ruler,
  CheckCircle2, XCircle, Loader, Map as MapIcon, Search, X,
  AlertTriangle, ChevronLeft, ChevronRight, Download, ArrowLeft,
} from 'lucide-react';
import api from '../../services/api';
import { NavList, NavItem } from '@earthglobal/design-system';

// ═══════════════════════════════════════════════════════════
// Styled Components
// ═══════════════════════════════════════════════════════════
const Page = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.body};
  display: flex; flex-direction: column;
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

const Logo = styled.div`
  display: flex; align-items: center; gap: ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.fontSizes.xl}; font-weight: ${({ theme }) => theme.fontWeights.bold};
  white-space: nowrap;
  @media (max-width: 640px) { font-size: 1rem; gap: 8px; }
`;

const LogoIcon = styled.div`
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.gradientPrimary};
  box-shadow: ${({ theme }) => theme.shadows.glowSoft};
  flex-shrink: 0;
`;

const Content = styled.div`
  flex: 1; display: flex; overflow: hidden;
  @media (max-width: 768px) { flex-direction: column; }
`;

const Sidebar = styled.aside`
  width: 260px; background: ${({ theme }) => theme.colors.surface};
  border-right: 1px solid ${({ theme }) => theme.colors.borderDark};
  overflow-y: auto; display: flex; flex-direction: column;
  @media (max-width: 768px) { width: 100%; border-right: none; border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark}; }
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

const MainArea = styled.div`
  flex: 1; overflow-y: auto; padding: ${({ theme }) => theme.spacing[6]};
  @media (max-width: 768px) { padding: 16px; }
`;

const Toolbar = styled.div`
  display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;
`;

const SearchInput = styled.input`
  padding: 8px 12px; background: rgba(8,15,36,0.6);
  border: 1px solid rgba(92,225,255,0.15); border-radius: 8px;
  color: ${({ theme }) => theme.colors.text}; font-size: 0.85rem; outline: none;
  min-width: 250px; flex: 1;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const FilterSelect = styled.select`
  padding: 8px 12px; background: rgba(8,15,36,0.6);
  border: 1px solid rgba(92,225,255,0.15); border-radius: 8px;
  color: ${({ theme }) => theme.colors.text}; font-size: 0.85rem; outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.primary }; }
`;

const TableWrapper = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.lg}; overflow: hidden;
`;

const Table = styled.table`
  width: 100%; border-collapse: collapse; font-size: 0.85rem;
`;

const Th = styled.th`
  text-align: left; padding: 12px 16px;
  background: ${({ theme }) => theme.colors.surfaceLight};
  color: ${({ theme }) => theme.colors.textMuted}; font-weight: 600;
  font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em;
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  white-space: nowrap;
  cursor: ${({ $sortable }) => ($sortable ? 'pointer' : 'default')};
  &:hover { color: ${({ $sortable, theme }) => ($sortable ? theme.colors.primaryBright : theme.colors.textMuted)}; }
`;

const Td = styled.td`
  padding: 10px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  white-space: nowrap;
`;

const Tr = styled.tr`
  cursor: pointer; transition: background 0.15s;
  &:hover { background: ${({ theme }) => theme.colors.surfaceLight}; }
  &:last-child td { border-bottom: none; }
`;

const StatusBadge = styled.span`
  display: inline-flex; align-items: center; gap: 3px;
  padding: 2px 8px; border-radius: 999px;
  font-size: 0.7rem; font-weight: 600;
  background: ${({ $bg }) => $bg}; color: ${({ $color }) => $color};
`;

const Pagination = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: ${({ theme }) => theme.colors.surfaceLight};
  border-top: 1px solid ${({ theme }) => theme.colors.borderDark};
  font-size: 0.8rem; color: ${({ theme }) => theme.colors.textMuted};
`;

const PageBtn = styled.button`
  display: flex; align-items: center; gap: 4px;
  padding: 6px 12px; background: rgba(8,15,36,0.6);
  border: 1px solid rgba(92,225,255,0.15); border-radius: 6px;
  color: ${({ theme }) => theme.colors.text}; font-size: 0.8rem;
  cursor: pointer; transition: all 0.2s;
  &:hover:not(:disabled) { border-color: ${({ theme }) => theme.colors.primary}; background: rgba(22,119,255,0.1); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const StatsBar = styled.div`
  display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap;
`;

const StatChip = styled.div`
  display: flex; align-items: center; gap: 6px;
  padding: 6px 14px; background: ${({ theme }) => theme.colors.surfaceLight};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: 999px; font-size: 0.8rem;
  strong { color: ${({ $color }) => $color || 'inherit'}; font-weight: 700; }
`;

const EmptyState = styled.div`
  padding: 60px 20px; text-align: center; color: ${({ theme }) => theme.colors.textMuted};
`;

const BackBtn = styled.button`
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px; background: rgba(8,15,36,0.6);
  border: 1px solid rgba(92,225,255,0.15); border-radius: 8px;
  color: ${({ theme }) => theme.colors.text}; font-size: 0.85rem;
  cursor: pointer; transition: all 0.2s; white-space: nowrap;
  &:hover { border-color: ${({ theme }) => theme.colors.primary}; background: rgba(22,119,255,0.1); }
`;

const LogoutBtn = styled.button`
  display: flex; align-items: center; gap: 6px;
  background: none; border: 1px solid ${({ theme }) => theme.colors.borderDark};
  color: ${({ theme }) => theme.colors.textMuted};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.radii.md}; cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm}; transition: all 0.2s; white-space: nowrap;
  &:hover { color: ${({ theme }) => theme.colors.error}; border-color: ${({ theme }) => theme.colors.error}40; }
`;

// ── Status colors ──
const statusColors = {
  unverified: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  verified_permitted: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  verified_unpermitted: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  under_investigation: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc' },
  demolished: { bg: 'rgba(107,112,128,0.15)', color: '#9ca3af' },
};

const validationColors = {
  validated: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  pending: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  conflict: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  rejected: { bg: 'rgba(107,112,128,0.15)', color: '#9ca3af' },
};

const PAGE_SIZE = 50;

export default function BuildingsList() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [validationFilter, setValidationFilter] = useState('');
  const [validating, setValidating] = useState(false);
  const [sortBy, setSortBy] = useState('detected_at');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) setUser(JSON.parse(userStr));
    loadBuildings();
  }, []);

  const loadBuildings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/assembly/planning/buildings-geojson');
      setBuildings(data.features || []);
    } catch (err) {
      console.error('Failed to load buildings:', err);
    } finally {
      setLoading(false);
    }
  };

  const runValidation = async () => {
    setValidating(true);
    try {
      const { data } = await api.post('/assembly/planning/validate-buildings', { limit: 50 });
      // Reload buildings to show updated validation status
      await loadBuildings();
    } catch (err) {
      console.error('Validation failed:', err);
    } finally {
      setValidating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // ── Filter + sort ──
  let filtered = buildings.filter(b => {
    const p = b.properties || {};
    const s = search.toLowerCase();
    const matchesSearch = !s ||
      (p.status || '').toLowerCase().includes(s) ||
      (p.parcel_name || '').toLowerCase().includes(s) ||
      (p.building_type || '').toLowerCase().includes(s) ||
      (p.owner_name || '').toLowerCase().includes(s) ||
      (p.building_name || '').toLowerCase().includes(s) ||
      (p.centroid_lat && `${p.centroid_lat.toFixed(4)}, ${p.centroid_lng?.toFixed(4)}`.includes(s));
    const matchesStatus = !statusFilter || p.status === statusFilter;
    const matchesValidation = !validationFilter || p.validation_status === validationFilter;
    return matchesSearch && matchesStatus && matchesValidation;
  });

  filtered.sort((a, b) => {
    const pa = a.properties || {};
    const pb = b.properties || {};
    let va, vb;
    switch (sortBy) {
      case 'area_sqm': va = pa.area_sqm || 0; vb = pb.area_sqm || 0; break;
      case 'status': va = pa.status || ''; vb = pb.status || ''; break;
      case 'parcel_name': va = pa.parcel_name || ''; vb = pb.parcel_name || ''; break;
      case 'height': va = pa.estimated_height_m || 0; vb = pb.estimated_height_m || 0; break;
      default: va = pa.detected_at || ''; vb = pb.detected_at || ''; break;
    }
    if (typeof va === 'string') {
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    return sortDir === 'asc' ? va - vb : vb - va;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (col) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  // ── Stats ──
  const stats = {
    total: buildings.length,
    unverified: buildings.filter(b => b.properties.status === 'unverified').length,
    permitted: buildings.filter(b => b.properties.status === 'verified_permitted').length,
    unpermitted: buildings.filter(b => b.properties.status === 'verified_unpermitted').length,
    investigating: buildings.filter(b => b.properties.status === 'under_investigation').length,
  };

  const exportCSV = () => {
    const headers = ['ID', 'Status', 'Validation', 'Area (m²)', 'Type', 'Height (m)', 'Floors', 'Owner', 'Building Name', 'Parcel', 'Google Conf.', 'OSM ID', 'Lat', 'Lng', 'Detected At', 'Validated At'];
    const rows = filtered.map(b => {
      const p = b.properties || {};
      return [p.id, p.status, p.validation_status, Math.round(p.area_sqm || 0), p.building_type || '',
        p.estimated_height_m || '', p.estimated_floors || '', p.owner_name || '', p.building_name || '',
        p.parcel_name || '', p.google_confidence ? (p.google_confidence * 100).toFixed(0) + '%' : '',
        p.osm_id || '', p.centroid_lat?.toFixed(6) || '', p.centroid_lng?.toFixed(6) || '',
        p.detected_at ? new Date(p.detected_at).toISOString() : '',
        p.validated_at ? new Date(p.validated_at).toISOString() : ''];
    });
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const url = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `buildings_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Page>
      <TopBar>
        <Logo>
          <LogoIcon><Landmark size={22} /></LogoIcon>
          EarthGlobal <span style={{ color: '#5ce1ff' }}>Buildings</span>
        </Logo>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BackBtn onClick={() => navigate('/assembly/planning')}>
            <ArrowLeft size={16} /> Back to Map
          </BackBtn>
          <LogoutBtn onClick={handleLogout}><LogOut size={16} /> Logout</LogoutBtn>
        </div>
      </TopBar>

      <Content>
        {/* ── Sidebar ── */}
        <Sidebar>
          <SidebarSection>
            <SectionTitle><Layers size={14} /> Navigation</SectionTitle>
            <NavList>
              <NavItem as={Link} to="/assembly/planning">
                <MapIcon size={16} aria-hidden="true" /> Planning Map
              </NavItem>
              <NavItem as={Link} to="/assembly/planning/buildings" $active>
                <Building2 size={16} aria-hidden="true" /> Buildings List
              </NavItem>
              <NavItem as={Link} to="/assembly/planning/schemes">
                <FileText size={16} aria-hidden="true" /> Scheme Management
              </NavItem>
            </NavList>
          </SidebarSection>

          <SidebarSection>
            <SectionTitle><Building2 size={14} /> Building Stats</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <StatChip $color="#5ce1ff"><Building2 size={14} /> Total: <strong>{stats.total}</strong></StatChip>
              <StatChip $color="#fbbf24">Unverified: <strong>{stats.unverified}</strong></StatChip>
              <StatChip $color="#4ade80">Permitted: <strong>{stats.permitted}</strong></StatChip>
              <StatChip $color="#f87171">Unpermitted: <strong>{stats.unpermitted}</strong></StatChip>
              <StatChip $color="#c084fc">Investigating: <strong>{stats.investigating}</strong></StatChip>
            </div>
          </SidebarSection>

          {selectedBuilding && (
            <SidebarSection>
              <SectionTitle>
                <Building2 size={14} /> Building Details
                <button onClick={() => setSelectedBuilding(null)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#aab7d4', cursor: 'pointer' }}>
                  <X size={14} />
                </button>
              </SectionTitle>
              {(() => {
                const p = selectedBuilding.properties || {};
                const badge = statusColors[p.status] || statusColors.unverified;
                const valBadge = validationColors[p.validation_status] || validationColors.pending;
                return (
                  <div style={{ fontSize: '0.85rem', lineHeight: 1.8 }}>
                    <div><strong>ID:</strong> <span style={{ color: '#aab7d4' }}>{p.id?.substring(0, 8)}…</span></div>
                    <div><strong>Status:</strong> <StatusBadge $bg={badge.bg} $color={badge.color}>{p.status?.replace(/_/g, ' ')}</StatusBadge></div>
                    <div><strong>Validation:</strong> <StatusBadge $bg={valBadge.bg} $color={valBadge.color}>{p.validation_status || 'pending'}</StatusBadge></div>
                    <div><strong>Area:</strong> {Math.round(p.area_sqm)} m²</div>
                    {p.building_type && <div><strong>Type:</strong> {p.building_type}</div>}
                    {p.building_name && <div><strong>Name:</strong> {p.building_name}</div>}
                    {p.estimated_height_m != null && <div><strong>Height:</strong> {p.estimated_height_m}m ({p.estimated_floors || '?'} floors)</div>}
                    {p.owner_name && <div><strong>Owner:</strong> {p.owner_name}</div>}
                    {p.owner_contact && <div><strong>Contact:</strong> {p.owner_contact}</div>}
                    {p.parcel_name && <div><strong>Parcel:</strong> {p.parcel_name}</div>}
                    {p.centroid_lat && <div><strong>Centroid:</strong> {p.centroid_lat.toFixed(4)}, {p.centroid_lng.toFixed(4)}</div>}
                    {p.google_confidence != null && <div><strong>Google Conf.:</strong> {(p.google_confidence * 100).toFixed(0)}% ({p.google_match_distance_m ? Math.round(p.google_match_distance_m) : '?'}m)</div>}
                    {p.osm_id && <div><strong>OSM ID:</strong> {p.osm_id} ({p.osm_match_distance_m ? Math.round(p.osm_match_distance_m) : '?'}m)</div>}
                    {p.validation_sources?.length > 0 && <div><strong>Sources:</strong> {p.validation_sources.join(', ')}</div>}
                    {p.in_protected_area && <div style={{ color: '#f87171' }}><AlertTriangle size={12} /> In protected area</div>}
                    {p.detected_at && <div><strong>Detected:</strong> {new Date(p.detected_at).toLocaleDateString()}</div>}
                    {p.validated_at && <div><strong>Validated:</strong> {new Date(p.validated_at).toLocaleDateString()}</div>}
                    {p.metadata && Object.keys(p.metadata).length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <strong>Metadata:</strong>
                        <div style={{ color: '#aab7d4', fontSize: '0.78rem', marginTop: 4 }}>
                          {Object.entries(p.metadata).slice(0, 10).map(([k, v]) => (
                            <div key={k}>{k}: {typeof v === 'object' ? JSON.stringify(v).substring(0, 80) : String(v).substring(0, 80)}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    <button onClick={() => navigate('/assembly/planning')}
                      style={{ marginTop: 12, width: '100%', padding: '8px', background: 'rgba(22,119,255,0.15)', border: '1px solid rgba(22,119,255,0.3)', borderRadius: 6, color: '#5ce1ff', cursor: 'pointer', fontSize: '0.8rem' }}>
                      <MapIcon size={12} style={{ marginRight: 4 }} /> View on Map
                    </button>
                  </div>
                );
              })()}
            </SidebarSection>
          )}
        </Sidebar>

        {/* ── Main table area ── */}
        <MainArea>
          <Toolbar>
            <SearchInput
              placeholder="Search by status, parcel, or coordinates..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
            <FilterSelect value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
              <option value="">All Statuses</option>
              <option value="unverified">Unverified</option>
              <option value="verified_permitted">Verified - Permitted</option>
              <option value="verified_unpermitted">Verified - Unpermitted</option>
              <option value="under_investigation">Under Investigation</option>
              <option value="demolished">Demolished</option>
            </FilterSelect>
            <FilterSelect value={validationFilter} onChange={(e) => { setValidationFilter(e.target.value); setPage(0); }}>
              <option value="">All Validation</option>
              <option value="validated">Validated</option>
              <option value="pending">Pending</option>
              <option value="conflict">Conflict</option>
              <option value="rejected">Rejected</option>
            </FilterSelect>
            <button onClick={runValidation} disabled={validating} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)',
              borderRadius: 8, color: '#c084fc', fontSize: '0.85rem', cursor: 'pointer',
            }}>
              {validating ? <Loader size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Validate
            </button>
            <button onClick={exportCSV} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 8, color: '#4ade80', fontSize: '0.85rem', cursor: 'pointer',
            }}>
              <Download size={14} /> Export CSV
            </button>
            <button onClick={loadBuildings} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: 'rgba(8,15,36,0.6)', border: '1px solid rgba(92,225,255,0.15)',
              borderRadius: 8, color: '#aab7d4', fontSize: '0.85rem', cursor: 'pointer',
            }}>
              <Loader size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </Toolbar>

          <StatsBar>
            <StatChip $color="#5ce1ff"><Building2 size={14} /> <strong>{filtered.length}</strong> shown</StatChip>
            <StatChip $color="#fbbf24"><strong>{stats.unverified}</strong> unverified</StatChip>
            <StatChip $color="#4ade80"><strong>{stats.permitted}</strong> permitted</StatChip>
            <StatChip $color="#f87171"><strong>{stats.unpermitted}</strong> unpermitted</StatChip>
            <StatChip $color="#c084fc"><strong>{stats.investigating}</strong> investigating</StatChip>
          </StatsBar>

          {loading ? (
            <EmptyState>
              <Loader size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              <div>Loading buildings…</div>
            </EmptyState>
          ) : pageData.length === 0 ? (
            <EmptyState>
              <Building2 size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div>No buildings found. Run detection from the Planning Map to find buildings.</div>
              <BackBtn onClick={() => navigate('/assembly/planning')} style={{ margin: '16px auto 0' }}>
                <MapIcon size={16} /> Go to Planning Map
              </BackBtn>
            </EmptyState>
          ) : (
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <Th>#</Th>
                    <Th $sortable onClick={() => toggleSort('status')}>Status {sortBy === 'status' && (sortDir === 'asc' ? '↑' : '↓')}</Th>
                    <Th>Validation</Th>
                    <Th $sortable onClick={() => toggleSort('area_sqm')}>Area (m²) {sortBy === 'area_sqm' && (sortDir === 'asc' ? '↑' : '↓')}</Th>
                    <Th>Type</Th>
                    <Th $sortable onClick={() => toggleSort('height')}>Height {sortBy === 'height' && (sortDir === 'asc' ? '↑' : '↓')}</Th>
                    <Th>Owner</Th>
                    <Th $sortable onClick={() => toggleSort('parcel_name')}>Parcel {sortBy === 'parcel_name' && (sortDir === 'asc' ? '↑' : '↓')}</Th>
                    <Th>Centroid</Th>
                    <Th>Protected</Th>
                    <Th $sortable onClick={() => toggleSort('detected_at')}>Detected {sortBy === 'detected_at' && (sortDir === 'asc' ? '↑' : '↓')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((b, i) => {
                    const p = b.properties || {};
                    const badge = statusColors[p.status] || statusColors.unverified;
                    const valBadge = validationColors[p.validation_status] || validationColors.pending;
                    return (
                      <Tr
                        key={p.id || i}
                        $selected={selectedBuilding?.properties?.id === p.id}
                        onClick={() => setSelectedBuilding(b)}
                        style={selectedBuilding?.properties?.id === p.id ? { background: 'rgba(22,119,255,0.1)' } : {}}
                      >
                        <Td style={{ color: '#6b7280' }}>{page * PAGE_SIZE + i + 1}</Td>
                        <Td><StatusBadge $bg={badge.bg} $color={badge.color}>{p.status?.replace(/_/g, ' ')}</StatusBadge></Td>
                        <Td><StatusBadge $bg={valBadge.bg} $color={valBadge.color}>{p.validation_status || 'pending'}</StatusBadge></Td>
                        <Td><Ruler size={11} style={{ marginRight: 4, display: 'inline' }} />{Math.round(p.area_sqm || 0)}</Td>
                        <Td style={{ fontSize: '0.78rem' }}>{p.building_type || '—'}</Td>
                        <Td>{p.estimated_height_m != null ? `${p.estimated_height_m}m` : '—'}</Td>
                        <Td style={{ fontSize: '0.78rem', color: '#aab7d4' }}>{p.owner_name || '—'}</Td>
                        <Td>{p.parcel_name || '—'}</Td>
                        <Td style={{ color: '#aab7d4', fontSize: '0.78rem' }}>
                          {p.centroid_lat ? `${p.centroid_lat.toFixed(4)}, ${p.centroid_lng.toFixed(4)}` : '—'}
                        </Td>
                        <Td>{p.in_protected_area ? <AlertTriangle size={14} color="#f87171" /> : '—'}</Td>
                        <Td style={{ color: '#aab7d4', fontSize: '0.78rem' }}>
                          {p.detected_at ? new Date(p.detected_at).toLocaleDateString() : '—'}
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
              <Pagination>
                <div>
                  Showing <strong>{page * PAGE_SIZE + 1}</strong>–<strong>{Math.min((page + 1) * PAGE_SIZE, filtered.length)}</strong> of <strong>{filtered.length}</strong>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <PageBtn onClick={() => setPage(0)} disabled={page === 0}>
                    <ChevronLeft size={14} /> First
                  </PageBtn>
                  <PageBtn onClick={() => setPage(page - 1)} disabled={page === 0}>
                    <ChevronLeft size={14} /> Prev
                  </PageBtn>
                  <span style={{ padding: '6px 12px', color: '#aab7d4' }}>
                    Page {page + 1} / {totalPages || 1}
                  </span>
                  <PageBtn onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}>
                    Next <ChevronRight size={14} />
                  </PageBtn>
                  <PageBtn onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>
                    Last <ChevronRight size={14} />
                  </PageBtn>
                </div>
              </Pagination>
            </TableWrapper>
          )}
        </MainArea>
      </Content>
    </Page>
  );
}
