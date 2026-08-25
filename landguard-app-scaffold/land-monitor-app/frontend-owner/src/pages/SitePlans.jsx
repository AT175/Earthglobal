import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, CheckCircle2, XCircle, Clock, Loader, MapPin,
  Ruler, Building2, Compass, Download, X, AlertCircle,
} from 'lucide-react';
import { Card, Badge, Button, Skeleton } from '@earthglobal/design-system';
import api from '../services/api';
import OwnerLayout from '../components/OwnerLayout';

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  color: ${({ theme }) => theme.colors.text};
`;

const Subtitle = styled.p`
  margin-top: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const TabRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
`;

const Tab = styled.button`
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  background: none;
  border: none;
  border-bottom: 2px solid ${({ $active, theme }) => ($active ? theme.colors.primary : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.textMuted)};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  &:hover { color: ${({ theme }) => theme.colors.text}; }
`;

const PlanGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing[4]};
  ${({ theme }) => theme.media.lg`
    grid-template-columns: repeat(2, 1fr);
  `}
`;

const PlanCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const PlanTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`;

const PlanMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const PlanPreview = styled.div`
  background: ${({ theme }) => theme.colors.surfaceLight};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[4]};
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const BoundarySvg = styled.svg`
  max-width: 100%;
  height: auto;
`;

const EmptyState = styled(Card)`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Modal = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[4]};
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.lg};
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing[6]};
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const ModalTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  color: ${({ theme }) => theme.colors.text};
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  padding: 4px;
  border-radius: ${({ theme }) => theme.radii.sm};
  &:hover { color: ${({ theme }) => theme.colors.text}; }
`;

const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const Label = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const Input = styled.input`
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.base};
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.base};
  min-height: 80px;
  resize: vertical;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Select = styled.select`
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.base};
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const RequestRow = styled(Card)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const RequestInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const statusColors = {
  draft: 'neutral',
  certified: 'success',
  rejected: 'error',
  expired: 'warning',
  pending: 'warning',
  in_progress: 'primary',
  completed: 'success',
  cancelled: 'neutral',
};

function statusLabel(s) {
  const labels = {
    draft: 'Draft (Uncertified)',
    certified: 'Certified',
    rejected: 'Rejected',
    expired: 'Expired',
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[s] || s;
}

// Render a simple SVG site plan preview from plan_data
function PlanPreviewSvg({ planData }) {
  if (!planData?.parcel?.boundary?.coordinates?.[0]) return <MapPin size={48} />;
  const coords = planData.parcel.boundary.coordinates[0];
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const w = maxLng - minLng || 0.001;
  const h = maxLat - minLat || 0.001;
  const pad = 20;
  const svgW = 300;
  const svgH = 200;
  const sx = (lng) => pad + ((lng - minLng) / w) * (svgW - 2 * pad);
  const sy = (lat) => pad + ((maxLat - lat) / h) * (svgH - 2 * pad);

  const boundaryPoints = coords.map(([lng, lat]) => `${sx(lng)},${sy(lat)}`).join(' ');

  return (
    <BoundarySvg viewBox={`0 0 ${svgW} ${svgH}`} width={svgW} height={svgH}>
      <polygon points={boundaryPoints} fill="rgba(92,225,255,0.1)" stroke="#5ce1ff" strokeWidth="2" />
      {planData.buildings?.map((b, i) => {
        const bCoords = b.footprint?.coordinates?.[0];
        if (!bCoords) return null;
        const bPoints = bCoords.map(([lng, lat]) => `${sx(lng)},${sy(lat)}`).join(' ');
        return <polygon key={i} points={bPoints} fill="rgba(245,158,11,0.3)" stroke="#f59e0b" strokeWidth="1.5" />;
      })}
      <text x={svgW - 40} y={svgH - 10} fill="#888" fontSize="10">N&#8593;</text>
      <text x={10} y={svgH - 10} fill="#888" fontSize="9">{planData.scale || '1:500'}</text>
    </BoundarySvg>
  );
}

export default function SitePlans() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('plans');
  const [plans, setPlans] = useState([]);
  const [requests, setRequests] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [genParcel, setGenParcel] = useState('');
  const [genTitle, setGenTitle] = useState('');
  const [reqParcel, setReqParcel] = useState('');
  const [reqPurpose, setReqPurpose] = useState('building_permit');
  const [reqNotes, setReqNotes] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/site-plans').catch(() => ({ data: [] })),
      api.get('/site-plans/requests/list').catch(() => ({ data: [] })),
      api.get('/parcels').catch(() => ({ data: [] })),
    ]).then(([plansRes, reqRes, parcelsRes]) => {
      setPlans(plansRes.data);
      setRequests(reqRes.data);
      setParcels(parcelsRes.data);
      setLoading(false);
    });
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!genParcel) return;
    setGenerating(true);
    setError(null);
    try {
      const { data } = await api.post('/site-plans/generate', {
        parcel_id: genParcel,
        title: genTitle || undefined,
      });
      setPlans((prev) => [data, ...prev]);
      setShowGenerate(false);
      setGenParcel('');
      setGenTitle('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate site plan');
    } finally {
      setGenerating(false);
    }
  };

  const handleRequest = async (e) => {
    e.preventDefault();
    if (!reqParcel) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post('/site-plans/requests', {
        parcel_id: reqParcel,
        purpose: reqPurpose,
        notes: reqNotes || undefined,
      });
      setRequests((prev) => [data, ...prev]);
      setShowRequest(false);
      setReqParcel('');
      setReqNotes('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OwnerLayout>
      <Header>
        <Title>Site Plans</Title>
        <Subtitle>Generate and request certified site plans for your parcels</Subtitle>
      </Header>

      <TabRow>
        <Tab $active={tab === 'plans'} onClick={() => setTab('plans')}>
          <FileText size={16} /> Site Plans
        </Tab>
        <Tab $active={tab === 'requests'} onClick={() => setTab('requests')}>
          <Clock size={16} /> Requests
        </Tab>
      </TabRow>

      {loading ? (
        <Skeleton $height="400px" />
      ) : tab === 'plans' ? (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <Button onClick={() => setShowGenerate(true)}>
              <Plus size={16} style={{ display: 'inline' }} /> Generate Site Plan
            </Button>
            <Button variant="secondary" onClick={() => setShowRequest(true)}>
              <FileText size={16} style={{ display: 'inline' }} /> Request Certified Plan
            </Button>
          </div>

          {error && (
            <Card style={{ marginBottom: 16, borderColor: '#f87171' }}>
              <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} /> {error}
              </span>
            </Card>
          )}

          {plans.length === 0 ? (
            <EmptyState>
              <FileText size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
              <p>No site plans yet. Generate one for your parcel or request a certified plan from the assembly.</p>
            </EmptyState>
          ) : (
            <PlanGrid>
              {plans.map((plan) => (
                <PlanCard key={plan.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <PlanTitle>{plan.title || 'Untitled Plan'}</PlanTitle>
                    <Badge tone={statusColors[plan.status] || 'neutral'}>
                      {plan.status === 'certified' && <CheckCircle2 size={12} style={{ display: 'inline' }} />}
                      {plan.status === 'rejected' && <XCircle size={12} style={{ display: 'inline' }} />}
                      {plan.status === 'draft' && <Clock size={12} style={{ display: 'inline' }} />}
                      {' '}{statusLabel(plan.status)}
                    </Badge>
                  </div>
                  <PlanMeta>
                    <MetaItem><MapPin size={14} /> {plan.parcel_name || 'Unknown'}</MetaItem>
                    {plan.plan_data?.parcel?.area_sqm > 0 && (
                      <MetaItem><Ruler size={14} /> {(plan.plan_data.parcel.area_sqm / 10000).toFixed(2)} ha</MetaItem>
                    )}
                    {plan.plan_data?.buildings?.length > 0 && (
                      <MetaItem><Building2 size={14} /> {plan.plan_data.buildings.length} building(s)</MetaItem>
                    )}
                    <MetaItem><Compass size={14} /> {plan.plan_data?.scale || '1:500'}</MetaItem>
                  </PlanMeta>
                  {plan.rejection_reason && (
                    <div style={{ fontSize: '0.85em', color: '#f87171' }}>
                      Rejected: {plan.rejection_reason}
                    </div>
                  )}
                  <PlanPreview>
                    <PlanPreviewSvg planData={plan.plan_data} />
                  </PlanPreview>
                  <div style={{ fontSize: '0.8em', color: '#aab7d4', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Created {new Date(plan.created_at).toLocaleDateString()}</span>
                    {plan.certified_at && <span>Certified {new Date(plan.certified_at).toLocaleDateString()}</span>}
                  </div>
                </PlanCard>
              ))}
            </PlanGrid>
          )}
        </>
      ) : (
        <>
          <div style={{ marginBottom: 24 }}>
            <Button onClick={() => setShowRequest(true)}>
              <Plus size={16} style={{ display: 'inline' }} /> New Request
            </Button>
          </div>

          {requests.length === 0 ? (
            <EmptyState>
              <Clock size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
              <p>No site plan requests yet. Request a certified site plan from your district assembly.</p>
            </EmptyState>
          ) : (
            requests.map((req) => (
              <RequestRow key={req.id}>
                <RequestInfo>
                  <strong>{req.parcel_name || 'Unknown parcel'}</strong>
                  <span style={{ fontSize: '0.85em', color: '#888' }}>
                    Purpose: {req.purpose || 'N/A'} &middot; Requested {new Date(req.requested_at).toLocaleDateString()}
                  </span>
                  {req.notes && <span style={{ fontSize: '0.85em', color: '#888' }}>{req.notes}</span>}
                </RequestInfo>
                <Badge tone={statusColors[req.status] || 'neutral'}>{statusLabel(req.status)}</Badge>
              </RequestRow>
            ))
          )}
        </>
      )}

      {/* Generate Modal */}
      <AnimatePresence>
        {showGenerate && (
          <Modal initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ModalContent>
              <ModalHeader>
                <ModalTitle>Generate Site Plan</ModalTitle>
                <CloseBtn onClick={() => setShowGenerate(false)}><X size={20} /></CloseBtn>
              </ModalHeader>
              <form onSubmit={handleGenerate}>
                <FormGroup>
                  <Label>Select Parcel</Label>
                  <Select value={genParcel} onChange={(e) => setGenParcel(e.target.value)} required>
                    <option value="">Choose a parcel...</option>
                    {parcels.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({(Number(p.area_sqm) / 10000).toFixed(2)} ha)</option>
                    ))}
                  </Select>
                </FormGroup>
                <FormGroup>
                  <Label>Title (optional)</Label>
                  <Input value={genTitle} onChange={(e) => setGenTitle(e.target.value)} placeholder="e.g. Site Plan — Farm Plot A" />
                </FormGroup>
                <Button type="submit" fullWidth disabled={generating}>
                  {generating ? <Loader size={16} className="animate-spin" /> : 'Generate'}
                </Button>
              </form>
            </ModalContent>
          </Modal>
        )}
      </AnimatePresence>

      {/* Request Modal */}
      <AnimatePresence>
        {showRequest && (
          <Modal initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ModalContent>
              <ModalHeader>
                <ModalTitle>Request Certified Site Plan</ModalTitle>
                <CloseBtn onClick={() => setShowRequest(false)}><X size={20} /></CloseBtn>
              </ModalHeader>
              <form onSubmit={handleRequest}>
                <FormGroup>
                  <Label>Select Parcel</Label>
                  <Select value={reqParcel} onChange={(e) => setReqParcel(e.target.value)} required>
                    <option value="">Choose a parcel...</option>
                    {parcels.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </FormGroup>
                <FormGroup>
                  <Label>Purpose</Label>
                  <Select value={reqPurpose} onChange={(e) => setReqPurpose(e.target.value)}>
                    <option value="building_permit">Building Permit Application</option>
                    <option value="land_sale">Land Sale</option>
                    <option value="mortgage">Mortgage / Loan</option>
                    <option value="boundary_dispute">Boundary Dispute</option>
                    <option value="other">Other</option>
                  </Select>
                </FormGroup>
                <FormGroup>
                  <Label>Notes (optional)</Label>
                  <TextArea value={reqNotes} onChange={(e) => setReqNotes(e.target.value)} placeholder="Any additional details..." />
                </FormGroup>
                <Button type="submit" fullWidth disabled={submitting}>
                  {submitting ? <Loader size={16} className="animate-spin" /> : 'Submit Request'}
                </Button>
              </form>
            </ModalContent>
          </Modal>
        )}
      </AnimatePresence>
    </OwnerLayout>
  );
}
