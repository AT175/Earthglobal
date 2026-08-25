import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import {
  FileCheck, Search, Download, MapPin, Clock, CheckCircle2, XCircle,
  Award, Loader, AlertTriangle, FileText, Navigation, X, Send,
} from 'lucide-react';
import { Card, Badge } from '@earthglobal/design-system';
import api from '../services/api';
import { useRoleLayout } from '../hooks/useRoleLayout';

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  color: ${({ theme }) => theme.colors.text};
  display: flex; align-items: center; gap: 10px;
`;

const Subtitle = styled.p`
  margin-top: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  color: ${({ theme }) => theme.colors.text};
  margin: ${({ theme }) => `${theme.spacing[8]} 0 ${theme.spacing[4]}`};
  display: flex; align-items: center; gap: 8px;
`;

const FormCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[6]};
`;

const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const Label = styled.label`
  display: block; font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted}; margin-bottom: 6px;
  font-weight: 600;
`;

const Input = styled.input`
  width: 100%; padding: 10px 14px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.md}; outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const TextArea = styled.textarea`
  width: 100%; padding: 10px 14px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.md}; outline: none;
  min-height: 80px; resize: vertical;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const FormGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
  @media (max-width: 640px) { grid-template-columns: 1fr; }
`;

const SubmitBtn = styled.button`
  display: flex; align-items: center; gap: 8px;
  padding: 12px 24px; border: none; border-radius: ${({ theme }) => theme.radii.md};
  background: linear-gradient(135deg, #1677ff, #5ce1ff);
  color: white; font-size: ${({ theme }) => theme.fontSizes.md}; font-weight: 600;
  cursor: pointer; transition: opacity 0.2s;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const RequestCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[5]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const RequestHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const RequestTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg}; font-weight: 600;
  display: flex; align-items: center; gap: 8px;
`;

const MetaRow = styled.div`
  display: flex; align-items: center; gap: 6px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-top: 4px;
`;

const ResultBox = styled.div`
  padding: 16px; border-radius: ${({ theme }) => theme.radii.md};
  margin-top: ${({ theme }) => theme.spacing[3]};
  background: ${({ $found, theme }) => $found ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'};
  border: 1px solid ${({ $found }) => $found ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'};
`;

const ResultGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  margin-top: 12px;
  @media (max-width: 640px) { grid-template-columns: 1fr; }
`;

const ResultItem = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const ResultLabel = styled.div`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;
`;

const ResultValue = styled.div`
  font-weight: 600; color: ${({ theme }) => theme.colors.text};
`;

const DownloadRow = styled.div`
  display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px;
`;

const DownloadBtn = styled.a`
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  color: ${({ theme }) => theme.colors.primaryBright};
  font-size: ${({ theme }) => theme.fontSizes.sm}; font-weight: 600;
  text-decoration: none; cursor: pointer; transition: all 0.2s;
  &:hover { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const EmptyState = styled(Card)`
  text-align: center; padding: ${({ theme }) => theme.spacing[12]};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Toast = styled.div`
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 3000;
  display: flex; align-items: center; gap: 8px; padding: 12px 20px;
  background: ${({ $type }) => $type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'};
  border: 1px solid ${({ $type }) => $type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'};
  border-radius: 12px; color: ${({ $type }) => $type === 'error' ? '#f87171' : '#4ade80'};
  font-size: 0.9rem; backdrop-filter: blur(12px);
`;

const statusColors = {
  pending: 'warning',
  validated: 'info',
  certified: 'success',
  rejected: 'danger',
};

export default function ValidationRequests() {
  const { t } = useTranslation();
  const { Layout } = useRoleLayout();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Form state
  const [form, setForm] = useState({
    search_parcel_name: '',
    search_region: '',
    search_description: '',
    search_document_ref: '',
    requester_name: '',
    requester_email: '',
    requester_phone: '',
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadRequests();
    // Pre-fill requester info from logged-in user
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setForm(prev => ({
        ...prev,
        requester_name: user.name || user.email || '',
        requester_email: user.email || '',
        requester_phone: user.phone || '',
      }));
    }
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/validation/my-requests');
      setRequests(data);
    } catch (err) {
      showToast('Failed to load requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.requester_name) {
      showToast('Your name is required', 'error');
      return;
    }
    if (!form.search_parcel_name && !form.search_region && !form.search_description) {
      showToast('Provide at least one search parameter', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/validation/request', form);
      showToast('Validation request submitted! A planning officer will review it.');
      setForm(prev => ({
        ...prev,
        search_parcel_name: '', search_region: '', search_description: '', search_document_ref: '',
      }));
      loadRequests();
    } catch (err) {
      showToast(err.response?.data?.error || 'Submission failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <Layout>
      <Header>
        <Title><FileCheck size={28} /> Search Validation</Title>
        <Subtitle>
          Submit a request to verify whether a parcel of land exists in the district assembly's records.
          A planning officer will search the database and provide a certified report.
        </Subtitle>
      </Header>

      {/* ── Submit New Request ── */}
      <SectionTitle><Search size={20} /> Request a Validation</SectionTitle>
      <FormCard as="form" onSubmit={handleSubmit}>
        <FormGroup>
          <Label>Your Name *</Label>
          <Input name="requester_name" value={form.requester_name} onChange={handleChange} required />
        </FormGroup>
        <FormGrid>
          <FormGroup>
            <Label>Email</Label>
            <Input name="requester_email" type="email" value={form.requester_email} onChange={handleChange} />
          </FormGroup>
          <FormGroup>
            <Label>Phone</Label>
            <Input name="requester_phone" value={form.requester_phone} onChange={handleChange} />
          </FormGroup>
        </FormGrid>

        <div style={{ marginTop: 24, marginBottom: 8, fontWeight: 600, color: '#5ce1ff' }}>
          Search Parameters
        </div>
        <FormGrid>
          <FormGroup>
            <Label>Parcel Name (if known)</Label>
            <Input name="search_parcel_name" value={form.search_parcel_name} onChange={handleChange}
              placeholder="e.g., Plot 23, Adenta" />
          </FormGroup>
          <FormGroup>
            <Label>Region / District</Label>
            <Input name="search_region" value={form.search_region} onChange={handleChange}
              placeholder="e.g., Greater Accra" />
          </FormGroup>
        </FormGrid>
        <FormGroup>
          <Label>Document Reference (optional)</Label>
          <Input name="search_document_ref" value={form.search_document_ref} onChange={handleChange}
            placeholder="e.g., Title deed number, indenture ref" />
        </FormGroup>
        <FormGroup>
          <Label>Description / Landmarks</Label>
          <TextArea name="search_description" value={form.search_description} onChange={handleChange}
            placeholder="Describe the land — boundaries, landmarks, nearby features..." />
        </FormGroup>

        <SubmitBtn type="submit" disabled={submitting}>
          {submitting ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
          {submitting ? 'Submitting...' : 'Submit Validation Request'}
        </SubmitBtn>
      </FormCard>

      {/* ── My Requests ── */}
      <SectionTitle><FileText size={20} /> My Validation Requests</SectionTitle>

      {loading ? (
        <EmptyState><Loader size={32} className="animate-spin" /></EmptyState>
      ) : requests.length === 0 ? (
        <EmptyState>
          <FileText size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div>You haven't submitted any validation requests yet.</div>
        </EmptyState>
      ) : (
        requests.map(req => (
          <RequestCard key={req.id}>
            <RequestHeader>
              <div>
                <RequestTitle>
                  {req.search_parcel_name || req.search_region || 'Validation Request'}
                  <Badge tone={statusColors[req.status] || 'neutral'}>{req.status}</Badge>
                </RequestTitle>
                <MetaRow>
                  <Clock size={12} /> {new Date(req.created_at).toLocaleDateString()}
                  {req.search_region && <><MapPin size={12} /> {req.search_region}</>}
                </MetaRow>
              </div>
            </RequestHeader>

            {req.search_description && (
              <div style={{ fontSize: '0.85rem', color: '#aab7d4', marginTop: 8 }}>
                {req.search_description}
              </div>
            )}

            {/* Validated result */}
            {(req.status === 'validated' || req.status === 'certified') && (
              <ResultBox $found={req.parcel_exists}>
                {req.parcel_exists ? (
                  <>
                    <CheckCircle2 size={18} color="#4ade80" />
                    <span style={{ marginLeft: 8, fontWeight: 600, color: '#4ade80' }}>Parcel Confirmed</span>
                    <ResultGrid>
                      <ResultItem>
                        <ResultLabel>Parcel Name</ResultLabel>
                        <ResultValue>{req.parcel_found_name || '—'}</ResultValue>
                      </ResultItem>
                      <ResultItem>
                        <ResultLabel>Registered Owner</ResultLabel>
                        <ResultValue>{req.parcel_found_owner || '—'}</ResultValue>
                      </ResultItem>
                      <ResultItem>
                        <ResultLabel>Region</ResultLabel>
                        <ResultValue>{req.parcel_found_region || '—'}</ResultValue>
                      </ResultItem>
                      <ResultItem>
                        <ResultLabel>Area</ResultLabel>
                        <ResultValue>{req.parcel_found_area_sqm ? Math.round(req.parcel_found_area_sqm).toLocaleString() + ' m²' : '—'}</ResultValue>
                      </ResultItem>
                    </ResultGrid>
                  </>
                ) : (
                  <>
                    <XCircle size={18} color="#f87171" />
                    <span style={{ marginLeft: 8, fontWeight: 600, color: '#f87171' }}>
                      Parcel Not Found in Assembly Records
                    </span>
                  </>
                )}
              </ResultBox>
            )}

            {/* Environmental hazard warning for certified requests */}
            {req.status === 'certified' && req.nearby_hazards && req.nearby_hazards.length > 0 && (
              <div style={{ marginTop: 12, padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f87171', fontWeight: 600, fontSize: '0.85rem' }}>
                  <AlertTriangle size={16} /> {req.nearby_hazards.length} Environmental Hazard(s) Nearby
                </div>
                <div style={{ fontSize: '0.75rem', color: '#aab7d4', marginTop: 6 }}>
                  The PDF report includes a full hazard assessment. Hazards detected within 5km of this parcel:
                </div>
                <div style={{ marginTop: 6 }}>
                  {req.nearby_hazards.slice(0, 5).map((h, i) => {
                    const labels = { water_pollution: 'Water Pollution', flood_prone: 'Flood-Prone', illegal_mining: 'Illegal Mining', open_dump: 'Open Dump' };
                    const sevColors = { low: '#fbbf24', moderate: '#f97316', high: '#ef4444', critical: '#991b1b' };
                    return (
                      <div key={i} style={{ fontSize: '0.75rem', marginTop: 3, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: sevColors[h.severity] || '#fbbf24' }}>
                          {labels[h.hazard_type] || h.hazard_type} ({h.severity})
                        </span>
                        <span style={{ color: '#6b7280' }}>{(h.distance_m / 1000).toFixed(2)} km away</span>
                      </div>
                    );
                  })}
                  {req.nearby_hazards.length > 5 && (
                    <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: 4 }}>
                      +{req.nearby_hazards.length - 5} more — see full report
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Downloads for certified requests */}
            {req.status === 'certified' && (
              <DownloadRow>
                <DownloadBtn href={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/validation/my-requests/${req.id}/report`}
                  target="_blank" rel="noopener noreferrer">
                  <Download size={14} /> Download PDF Report
                </DownloadBtn>
                <DownloadBtn href={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/validation/my-requests/${req.id}/kml`}
                  target="_blank" rel="noopener noreferrer">
                  <Download size={14} /> Download KML
                </DownloadBtn>
                {req.google_maps_link && (
                  <DownloadBtn href={req.google_maps_link} target="_blank" rel="noopener noreferrer">
                    <Navigation size={14} /> Open in Google Maps
                  </DownloadBtn>
                )}
              </DownloadRow>
            )}

            {/* Pending status */}
            {req.status === 'pending' && (
              <div style={{ marginTop: 12, padding: 12, background: 'rgba(251,191,36,0.1)', borderRadius: 8, fontSize: '0.85rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} /> Awaiting planning officer review...
              </div>
            )}
          </RequestCard>
        ))
      )}

      {toast && (
        <Toast $type={toast.type}>
          {toast.type === 'error' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.msg}
        </Toast>
      )}
    </Layout>
  );
}
