import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  Search, FileCheck, CheckCircle2, XCircle, Loader, Download, MapPin,
  LogOut, Landmark, User, Mail, Phone, FileText, Stamp, Upload, X,
  ChevronRight, AlertTriangle, Award, Map as MapIcon, Navigation,
  RefreshCw, Clock, Save,
} from 'lucide-react';
import api from '../../services/api';

// ═══════════════════════════════════════════════════════════
// Styled Components
// ═══════════════════════════════════════════════════════════
const Page = styled.div`
  min-height: 100vh; background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text}; font-family: ${({ theme }) => theme.fonts.body};
`;

const TopBar = styled.header`
  position: sticky; top: 0; z-index: 1000;
  background: ${({ theme }) => theme.colors.background}f0; backdrop-filter: blur(12px);
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

const TopNav = styled.nav`display: flex; gap: 8px;`;

const NavBtn = styled.button`
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px; border: 1px solid ${({ theme }) => theme.colors.borderDark};
  background: none; color: ${({ theme }) => theme.colors.textMuted};
  border-radius: ${({ theme }) => theme.radii.md}; cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm}; transition: all 0.2s;
  &:hover { color: ${({ theme }) => theme.colors.text}; border-color: ${({ theme }) => theme.colors.primary}40; }
`;

const Content = styled.div`
  max-width: 1200px; margin: 0 auto; padding: ${({ theme }) => theme.spacing[6]};
`;

const TitleRow = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']}; font-weight: 700;
  display: flex; align-items: center; gap: 10px;
`;

const Tabs = styled.div`
  display: flex; gap: 4px; margin-bottom: ${({ theme }) => theme.spacing[6]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
`;

const Tab = styled.button`
  padding: 10px 20px; border: none; background: none;
  color: ${({ $active, theme }) => $active ? theme.colors.primaryBright : theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm}; font-weight: 600;
  cursor: pointer; border-bottom: 2px solid ${({ $active, theme }) => $active ? theme.colors.primary : 'transparent'};
  transition: all 0.2s;
  &:hover { color: ${({ theme }) => theme.colors.text}; }
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[5]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const RequestCard = styled(Card)`
  cursor: pointer; transition: border-color 0.2s;
  &:hover { border-color: ${({ theme }) => theme.colors.primary}40; }
  ${({ $selected }) => $selected && `border-color: ${({ theme }) => theme.colors.primary};`}
`;

const Row = styled.div`
  display: flex; align-items: center; justify-content: space-between;
`;

const RequestName = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.md}; font-weight: 600;
  display: flex; align-items: center; gap: 8px;
`;

const RequestMeta = styled.div`
  font-size: 0.8rem; color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 4px; display: flex; gap: 16px; flex-wrap: wrap;
`;

const StatusPill = styled.span`
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 10px; border-radius: 999px;
  font-size: 0.7rem; font-weight: 600;
  background: ${({ $bg }) => $bg}; color: ${({ $color }) => $color};
`;

const statusColors = {
  pending: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  validated: { bg: 'rgba(92,225,255,0.15)', color: '#5ce1ff' },
  certified: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  rejected: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
};

const DetailGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const DetailItem = styled.div`
  padding: 12px; background: ${({ theme }) => theme.colors.surfaceLight};
  border-radius: ${({ theme }) => theme.radii.md};
`;

const DetailLabel = styled.div`
  font-size: 0.7rem; color: ${({ theme }) => theme.colors.textMuted};
  text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;
`;

const DetailValue = styled.div`
  font-size: 0.9rem; font-weight: 500;
`;

const Section = styled.div`margin-bottom: ${({ theme }) => theme.spacing[5]};`;

const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.md}; font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  display: flex; align-items: center; gap: 8px;
`;

const FormGroup = styled.div`margin-bottom: 12px;`;

const Label = styled.label`
  display: block; font-size: 0.8rem; color: ${({ theme }) => theme.colors.textMuted}; margin-bottom: 4px;
`;

const Input = styled.input`
  width: 100%; padding: 8px 12px; background: ${({ theme }) => theme.colors.surfaceLight};
  border: 1px solid ${({ theme }) => theme.colors.borderDark}; border-radius: 8px;
  color: ${({ theme }) => theme.colors.text}; font-size: 0.9rem; outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const TextArea = styled.textarea`
  width: 100%; padding: 8px 12px; background: ${({ theme }) => theme.colors.surfaceLight};
  border: 1px solid ${({ theme }) => theme.colors.borderDark}; border-radius: 8px;
  color: ${({ theme }) => theme.colors.text}; font-size: 0.9rem; outline: none;
  min-height: 80px; resize: vertical;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const Btn = styled.button`
  display: flex; align-items: center; gap: 6px;
  padding: 10px 20px; border: none; border-radius: 8px;
  cursor: pointer; font-size: 0.9rem; font-weight: 600; transition: all 0.2s;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const PrimaryBtn = styled(Btn)`
  background: linear-gradient(135deg, #1677ff, #5ce1ff); color: white;
`;

const SuccessBtn = styled(Btn)`
  background: linear-gradient(135deg, #16a34a, #4ade80); color: white;
`;

const SecondaryBtn = styled(Btn)`
  background: none; border: 1px solid ${({ theme }) => theme.colors.borderDark};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const DangerBtn = styled(Btn)`
  background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #f87171;
`;

const BtnRow = styled.div`display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px;`;

const SearchResults = styled.div`
  margin-top: 16px; max-height: 300px; overflow-y: auto;
`;

const SearchResult = styled.div`
  padding: 12px; margin-bottom: 8px;
  background: ${({ theme }) => theme.colors.surfaceLight};
  border: 1px solid ${({ $selected, theme }) => $selected ? theme.colors.primary : theme.colors.borderDark};
  border-radius: 8px; cursor: pointer; transition: all 0.2s;
  &:hover { border-color: ${({ theme }) => theme.colors.primary}40; }
`;

const EmptyState = styled.div`
  text-align: center; padding: 60px 20px; color: ${({ theme }) => theme.colors.textMuted};
`;

const Toast = styled.div`
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 3000;
  display: flex; align-items: center; gap: 8px; padding: 12px 20px;
  background: ${({ $type }) => $type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'};
  border: 1px solid ${({ $type }) => $type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'};
  border-radius: 12px; color: ${({ $type }) => $type === 'error' ? '#f87171' : '#4ade80'};
  font-size: 0.9rem; backdrop-filter: blur(12px);
`;

const StampPreview = styled.div`
  display: flex; gap: 16px; margin-top: 12px; flex-wrap: wrap;
`;

const StampBox = styled.div`
  width: 120px; height: 120px; border: 2px dashed ${({ theme }) => theme.colors.borderDark};
  border-radius: 8px; display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
  img { max-width: 100%; max-height: 100%; object-fit: contain; }
`;

const UploadLabel = styled.label`
  display: flex; align-items: center; justify-content: center;
  width: 120px; height: 120px; border: 2px dashed ${({ theme }) => theme.colors.borderDark};
  border-radius: 8px; cursor: pointer; color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.75rem; text-align: center; transition: all 0.2s;
  &:hover { border-color: ${({ theme }) => theme.colors.primary}; color: ${({ theme }) => theme.colors.primary}; }
  input { display: none; }
`;

export default function ValidationPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Search state
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [selectedParcelId, setSelectedParcelId] = useState(null);
  const [parcelExists, setParcelExists] = useState(true);
  const [plannerNotes, setPlannerNotes] = useState('');

  // Certify state
  const [certifying, setCertifying] = useState(false);
  const [stampInfo, setStampInfo] = useState({ has_stamp: false, has_signature: false });
  const [stampPreview, setStampPreview] = useState({ stamp: null, signature: null });
  const [uploadingStamp, setUploadingStamp] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) setUser(JSON.parse(userStr));
    loadRequests();
    loadStampInfo();
  }, []);

  useEffect(() => {
    loadRequests();
  }, [activeTab]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/validation/planner/requests?status=${activeTab}`);
      setRequests(data);
    } catch (err) {
      showToast('Failed to load requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStampInfo = async () => {
    try {
      const { data } = await api.get('/validation/planner/stamp');
      setStampInfo(data);
    } catch {}
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // ── Open a request and auto-search ──
  const openRequest = async (req) => {
    setSelectedRequest(req);
    setSearchResults(null);
    setSelectedParcelId(null);
    setPlannerNotes('');
    setParcelExists(true);

    // Auto-search the database for matching parcels
    setSearching(true);
    try {
      const { data } = await api.post('/validation/planner/search', { request_id: req.id });
      setSearchResults(data);
      if (data.matches.length === 1) {
        setSelectedParcelId(data.matches[0].id);
      }
    } catch (err) {
      showToast('Search failed', 'error');
    } finally {
      setSearching(false);
    }
  };

  // ── Validate the request ──
  const validateRequest = async () => {
    if (!selectedRequest) return;
    try {
      const { data } = await api.patch(`/validation/planner/requests/${selectedRequest.id}/validate`, {
        parcel_exists: parcelExists,
        validated_parcel_id: parcelExists ? selectedParcelId : null,
        planner_notes: plannerNotes,
      });
      showToast('Request validated — ready to certify');
      setSelectedRequest(data);
      loadRequests();
    } catch (err) {
      showToast(err.response?.data?.error || 'Validation failed', 'error');
    }
  };

  // ── Certify + generate PDF ──
  const certifyRequest = async () => {
    if (!selectedRequest) return;
    if (!stampInfo.has_stamp && !stampInfo.has_signature) {
      showToast('Please upload your stamp and signature first', 'error');
      return;
    }
    setCertifying(true);
    try {
      const { data } = await api.post(`/validation/planner/requests/${selectedRequest.id}/certify`);
      showToast('Report certified and generated! Requester can now download it.');
      setSelectedRequest({ ...selectedRequest, status: 'certified', ...data });
      loadRequests();
    } catch (err) {
      showToast(err.response?.data?.error || 'Certification failed', 'error');
    } finally {
      setCertifying(false);
    }
  };

  // ── Upload stamp/signature ──
  const handleStampUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    setStampPreview(prev => ({ ...prev, [type]: URL.createObjectURL(file) }));
  };

  const saveStamp = async () => {
    const stampInput = document.getElementById('stamp-file');
    const sigInput = document.getElementById('signature-file');
    if (!stampInput.files[0] && !sigInput.files[0]) {
      showToast('Select at least one image', 'error');
      return;
    }
    setUploadingStamp(true);
    try {
      const formData = new FormData();
      if (stampInput.files[0]) formData.append('stamp', stampInput.files[0]);
      if (sigInput.files[0]) formData.append('signature', sigInput.files[0]);
      formData.append('title', 'Planning Officer');

      await api.post('/validation/planner/stamp', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('Stamp and signature saved');
      loadStampInfo();
    } catch (err) {
      showToast('Upload failed', 'error');
    } finally {
      setUploadingStamp(false);
    }
  };

  const tabs = [
    { id: 'pending', label: 'Pending', icon: Clock },
    { id: 'validated', label: 'Validated', icon: FileCheck },
    { id: 'certified', label: 'Certified', icon: Award },
  ];

  return (
    <Page>
      <TopBar>
        <Logo>
          <LogoIcon><Landmark size={22} /></LogoIcon>
          EarthGlobal <span style={{ color: '#5ce1ff' }}>Validation</span>
        </Logo>
        <TopNav>
          <NavBtn onClick={() => navigate('/assembly/planning')}><MapIcon size={16} /> Planning Map</NavBtn>
          <NavBtn onClick={() => navigate('/assembly')}><Landmark size={16} /> Dashboard</NavBtn>
          <NavBtn onClick={handleLogout}><LogOut size={16} /> Logout</NavBtn>
        </TopNav>
      </TopBar>

      <Content>
        <TitleRow>
          <PageTitle><FileCheck size={28} /> Search Validation</PageTitle>
          <NavBtn onClick={loadRequests}><RefreshCw size={16} /> Refresh</NavBtn>
        </TitleRow>

        {/* ── Stamp & Signature Setup ── */}
        <Card>
          <SectionTitle><Stamp size={18} /> Official Stamp & Signature</SectionTitle>
          <div style={{ fontSize: '0.85rem', color: '#aab7d4', marginBottom: 12 }}>
            Upload your official stamp and signature. These will be embedded in certified PDF reports.
          </div>
          <StampPreview>
            <div>
              <Label>Stamp</Label>
              <StampBox>
                {stampPreview.stamp ? (
                  <img src={stampPreview.stamp} alt="Stamp" />
                ) : stampInfo.has_stamp ? (
                  <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/validation/planner/stamp/image/stamp`} alt="Stamp" />
                ) : (
                  <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>No stamp</span>
                )}
              </StampBox>
              <UploadLabel>
                <Upload size={14} /> Upload Stamp
                <input id="stamp-file" type="file" accept="image/*" onChange={(e) => handleStampUpload(e, 'stamp')} />
              </UploadLabel>
            </div>
            <div>
              <Label>Signature</Label>
              <StampBox>
                {stampPreview.signature ? (
                  <img src={stampPreview.signature} alt="Signature" />
                ) : stampInfo.has_signature ? (
                  <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/validation/planner/stamp/image/signature`} alt="Signature" />
                ) : (
                  <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>No signature</span>
                )}
              </StampBox>
              <UploadLabel>
                <Upload size={14} /> Upload Signature
                <input id="signature-file" type="file" accept="image/*" onChange={(e) => handleStampUpload(e, 'signature')} />
              </UploadLabel>
            </div>
          </StampPreview>
          <BtnRow>
            <PrimaryBtn onClick={saveStamp} disabled={uploadingStamp}>
              {uploadingStamp ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
              {uploadingStamp ? 'Uploading...' : 'Save Stamp & Signature'}
            </PrimaryBtn>
          </BtnRow>
        </Card>

        {/* ── Tabs ── */}
        <Tabs>
          {tabs.map(tab => (
            <Tab key={tab.id} $active={activeTab === tab.id} onClick={() => { setActiveTab(tab.id); setSelectedRequest(null); }}>
              <tab.icon size={14} /> {tab.label} ({requests.length})
            </Tab>
          ))}
        </Tabs>

        {/* ── Request List ── */}
        {!selectedRequest && (
          <>
            {loading ? (
              <EmptyState><Loader size={32} className="animate-spin" /></EmptyState>
            ) : requests.length === 0 ? (
              <EmptyState>
                <FileText size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                <div>No {activeTab} validation requests</div>
              </EmptyState>
            ) : (
              requests.map(req => {
                const sc = statusColors[req.status] || statusColors.pending;
                return (
                  <RequestCard key={req.id} onClick={() => openRequest(req)}>
                    <Row>
                      <div>
                        <RequestName>
                          <User size={16} /> {req.requester_name}
                          <StatusPill $bg={sc.bg} $color={sc.color}>{req.status}</StatusPill>
                        </RequestName>
                        <RequestMeta>
                          {req.search_parcel_name && <span><MapPin size={11} /> {req.search_parcel_name}</span>}
                          {req.search_region && <span>{req.search_region}</span>}
                          {req.requester_email && <span><Mail size={11} /> {req.requester_email}</span>}
                          {req.requester_phone && <span><Phone size={11} /> {req.requester_phone}</span>}
                          <span><Clock size={11} /> {new Date(req.created_at).toLocaleDateString()}</span>
                        </RequestMeta>
                      </div>
                      <ChevronRight size={20} color="#6b7280" />
                    </Row>
                  </RequestCard>
                );
              })
            )}
          </>
        )}

        {/* ── Request Detail + Validation ── */}
        {selectedRequest && (
          <div>
            <BtnRow style={{ marginTop: 0, marginBottom: 16 }}>
              <SecondaryBtn onClick={() => { setSelectedRequest(null); setSearchResults(null); }}>
                <X size={14} /> Back to list
              </SecondaryBtn>
            </BtnRow>

            <Card>
              <SectionTitle><User size={18} /> Requester Information</SectionTitle>
              <DetailGrid>
                <DetailItem>
                  <DetailLabel>Name</DetailLabel>
                  <DetailValue>{selectedRequest.requester_name}</DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>Email</DetailLabel>
                  <DetailValue>{selectedRequest.requester_email || '—'}</DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>Phone</DetailLabel>
                  <DetailValue>{selectedRequest.requester_phone || '—'}</DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>Request Date</DetailLabel>
                  <DetailValue>{new Date(selectedRequest.created_at).toLocaleString()}</DetailValue>
                </DetailItem>
              </DetailGrid>
            </Card>

            <Card>
              <SectionTitle><Search size={18} /> Search Parameters</SectionTitle>
              <DetailGrid>
                {selectedRequest.search_parcel_name && (
                  <DetailItem>
                    <DetailLabel>Parcel Name</DetailLabel>
                    <DetailValue>{selectedRequest.search_parcel_name}</DetailValue>
                  </DetailItem>
                )}
                {selectedRequest.search_region && (
                  <DetailItem>
                    <DetailLabel>Region</DetailLabel>
                    <DetailValue>{selectedRequest.search_region}</DetailValue>
                  </DetailItem>
                )}
                {selectedRequest.search_document_ref && (
                  <DetailItem>
                    <DetailLabel>Document Reference</DetailLabel>
                    <DetailValue>{selectedRequest.search_document_ref}</DetailValue>
                  </DetailItem>
                )}
                {selectedRequest.search_description && (
                  <DetailItem style={{ gridColumn: '1 / -1' }}>
                    <DetailLabel>Description</DetailLabel>
                    <DetailValue>{selectedRequest.search_description}</DetailValue>
                  </DetailItem>
                )}
              </DetailGrid>
            </Card>

            {/* ── Database Search Results ── */}
            {selectedRequest.status === 'pending' && (
              <Card>
                <SectionTitle><Search size={18} /> Database Search Results</SectionTitle>
                <div style={{ fontSize: '0.85rem', color: '#aab7d4', marginBottom: 12 }}>
                  The system automatically searched the parcel database. Review the matches below.
                </div>

                {searching ? (
                  <EmptyState><Loader size={24} className="animate-spin" /> Searching database...</EmptyState>
                ) : searchResults?.matches?.length > 0 ? (
                  <>
                    <div style={{ fontSize: '0.85rem', color: '#4ade80', marginBottom: 8 }}>
                      <CheckCircle2 size={14} /> Found {searchResults.matches.length} matching parcel(s)
                    </div>
                    <SearchResults>
                      {searchResults.matches.map((parcel) => (
                        <SearchResult key={parcel.id} $selected={selectedParcelId === parcel.id}
                          onClick={() => { setSelectedParcelId(parcel.id); setParcelExists(true); }}>
                          <Row>
                            <div>
                              <div style={{ fontWeight: 600 }}>{parcel.name}</div>
                              <RequestMeta>
                                <span>Owner: {parcel.owner_name || 'Unknown'}</span>
                                <span>{parcel.region}</span>
                                <span>{Math.round(parcel.area_sqm).toLocaleString()} m²</span>
                                {parcel.centroid_lat && <span>{parcel.centroid_lat.toFixed(4)}, {parcel.centroid_lng.toFixed(4)}</span>}
                              </RequestMeta>
                            </div>
                            {selectedParcelId === parcel.id && <CheckCircle2 size={20} color="#4ade80" />}
                          </Row>
                        </SearchResult>
                      ))}
                    </SearchResults>
                  </>
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: '#f87171' }}>
                    <XCircle size={32} style={{ margin: '0 auto 8px' }} />
                    <div>No matching parcels found in the database.</div>
                    <div style={{ fontSize: '0.8rem', color: '#aab7d4', marginTop: 4 }}>
                      You can confirm this parcel does not exist in the records.
                    </div>
                  </div>
                )}

                {/* Validation controls */}
                <FormGroup style={{ marginTop: 16 }}>
                  <Label>Does the parcel exist?</Label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input type="radio" checked={parcelExists} onChange={() => setParcelExists(true)} />
                      <CheckCircle2 size={16} color="#4ade80" /> Yes, parcel exists
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input type="radio" checked={!parcelExists} onChange={() => setParcelExists(false)} />
                      <XCircle size={16} color="#f87171" /> No, parcel does not exist
                    </label>
                  </div>
                </FormGroup>

                <FormGroup>
                  <Label>Planner Notes</Label>
                  <TextArea value={plannerNotes} onChange={(e) => setPlannerNotes(e.target.value)}
                    placeholder="Add any notes about this validation..." />
                </FormGroup>

                <BtnRow>
                  <PrimaryBtn onClick={validateRequest} disabled={!parcelExists || (!selectedParcelId && parcelExists)}>
                    <FileCheck size={14} /> Validate Request
                  </PrimaryBtn>
                  <DangerBtn onClick={validateRequest}>
                    <XCircle size={14} /> Confirm: Parcel Does Not Exist
                  </DangerBtn>
                </BtnRow>
              </Card>
            )}

            {/* ── Validated: Show result + certify ── */}
            {(selectedRequest.status === 'validated' || selectedRequest.status === 'certified') && (
              <Card>
                <SectionTitle>
                  <Award size={18} /> Validation Result
                  <StatusPill $bg={statusColors[selectedRequest.status].bg} $color={statusColors[selectedRequest.status].color}>
                    {selectedRequest.status}
                  </StatusPill>
                </SectionTitle>

                {selectedRequest.parcel_exists ? (
                  <>
                    <div style={{ padding: 16, background: 'rgba(34,197,94,0.1)', borderRadius: 8, marginBottom: 16 }}>
                      <CheckCircle2 size={20} color="#4ade80" />
                      <span style={{ marginLeft: 8, fontWeight: 600, color: '#4ade80' }}>Parcel Confirmed</span>
                    </div>
                    <DetailGrid>
                      <DetailItem><DetailLabel>Parcel Name</DetailLabel><DetailValue>{selectedRequest.parcel_found_name}</DetailValue></DetailItem>
                      <DetailItem><DetailLabel>Registered Owner</DetailLabel><DetailValue>{selectedRequest.parcel_found_owner}</DetailValue></DetailItem>
                      <DetailItem><DetailLabel>Region</DetailLabel><DetailValue>{selectedRequest.parcel_found_region}</DetailValue></DetailItem>
                      <DetailItem><DetailLabel>Area</DetailLabel><DetailValue>{Math.round(selectedRequest.parcel_found_area_sqm).toLocaleString()} m²</DetailValue></DetailItem>
                      {selectedRequest.parcel_found_centroid_lat && (
                        <DetailItem><DetailLabel>Coordinates</DetailLabel><DetailValue>{selectedRequest.parcel_found_centroid_lat.toFixed(6)}°, {selectedRequest.parcel_found_centroid_lng.toFixed(6)}°</DetailValue></DetailItem>
                      )}
                    </DetailGrid>
                  </>
                ) : (
                  <div style={{ padding: 16, background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>
                    <XCircle size={20} color="#f87171" />
                    <span style={{ marginLeft: 8, fontWeight: 600, color: '#f87171' }}>Parcel Not Found in Records</span>
                  </div>
                )}

                {selectedRequest.planner_notes && (
                  <div style={{ marginTop: 12 }}>
                    <Label>Planner Notes</Label>
                    <div style={{ fontSize: '0.9rem', padding: 12, background: 'rgba(8,15,36,0.4)', borderRadius: 8 }}>
                      {selectedRequest.planner_notes}
                    </div>
                  </div>
                )}

                {selectedRequest.status === 'validated' && (
                  <BtnRow>
                    <SuccessBtn onClick={certifyRequest} disabled={certifying}>
                      {certifying ? <Loader size={14} className="animate-spin" /> : <Award size={14} />}
                      {certifying ? 'Generating Report...' : 'Certify & Generate PDF Report'}
                    </SuccessBtn>
                  </BtnRow>
                )}

                {selectedRequest.status === 'certified' && (
                  <div style={{ marginTop: 16, padding: 16, background: 'rgba(34,197,94,0.1)', borderRadius: 8 }}>
                    <CheckCircle2 size={20} color="#4ade80" />
                    <span style={{ marginLeft: 8, fontWeight: 600, color: '#4ade80' }}>Report Certified</span>
                    <div style={{ fontSize: '0.85rem', color: '#aab7d4', marginTop: 8 }}>
                      The PDF report, KML file, and Google Maps link have been delivered to the requester's dashboard.
                    </div>
                    {selectedRequest.google_maps_link && (
                      <a href={selectedRequest.google_maps_link} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, color: '#5ce1ff', fontSize: '0.85rem' }}>
                        <Navigation size={14} /> View on Google Maps
                      </a>
                    )}
                  </div>
                )}
              </Card>
            )}
          </div>
        )}
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
