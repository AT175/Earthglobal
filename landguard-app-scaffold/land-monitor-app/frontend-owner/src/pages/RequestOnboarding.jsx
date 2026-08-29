import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { CheckCircle2, FileUp, Clock, XCircle, MapPin } from 'lucide-react';
import { Card, Button, Badge } from '@earthglobal/design-system';
import api from '../services/api';
import { useRoleLayout } from '../hooks/useRoleLayout';

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const Layout2Col = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing[6]};

  ${({ theme }) => theme.media.lg`
    grid-template-columns: 420px 1fr;
  `}
`;

const FormCard = styled(Card)``;

const FieldLabel = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: 6px;
`;

const FieldGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceLight};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.875rem;
`;

const StyledTextArea = styled.textarea`
  width: 100%;
  min-height: 90px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceLight};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.875rem;
  resize: vertical;
`;

const DropZone = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  border: 2px dashed ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  text-align: center;
  font-size: 0.85rem;

  &:hover { border-color: ${({ theme }) => theme.colors.primary}; }

  input { display: none; }
`;

const RequestRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: ${({ theme }) => theme.spacing[3]} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child { border-bottom: none; }
`;

const RequestName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const RequestMeta = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textMuted};
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
`;

const STATUS_TONE = {
  pending: 'warning',
  in_review: 'primary',
  onboarded: 'success',
  rejected: 'error',
};

export default function RequestOnboarding() {
  const { Layout } = useRoleLayout();
  const [form, setForm] = useState({ name: '', region: '', notes: '' });
  const [file, setFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const loadRequests = () => {
    setLoading(true);
    api.get('/parcel-onboarding-requests')
      .then((res) => setRequests(res.data))
      .catch((err) => console.error('Failed to load onboarding requests', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRequests(); }, []);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setFileData(e.target.result);
    reader.readAsDataURL(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Parcel name is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/parcel-onboarding-requests', {
        name: form.name,
        region: form.region,
        notes: form.notes,
        site_plan_doc_url: fileData || undefined,
        site_plan_doc_name: file?.name || undefined,
      });
      setSuccess(true);
      setForm({ name: '', region: '', notes: '' });
      setFile(null);
      setFileData(null);
      loadRequests();
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to submit onboarding request', err);
      setError(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <Title>Request Parcel Onboarding</Title>
      <Subtitle>
        Ask our team to survey and register a new parcel on your behalf. Upload your site plan, deed, or sketch to speed up review.
      </Subtitle>

      <Layout2Col>
        <FormCard as="form" onSubmit={handleSubmit}>
          <FieldGroup>
            <FieldLabel htmlFor="name">Parcel Name *</FieldLabel>
            <StyledInput
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Farm at Manso Nkwanta"
            />
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="region">Region</FieldLabel>
            <StyledInput
              id="region"
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              placeholder="e.g. Ashanti Region"
            />
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="notes">Notes for the survey team</FieldLabel>
            <StyledTextArea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Nearby landmarks, access directions, boundary markers..."
            />
          </FieldGroup>

          <FieldGroup>
            <FieldLabel>Site plan / deed / sketch (optional)</FieldLabel>
            <DropZone>
              <FileUp size={22} />
              {file ? file.name : 'Click to upload a document or image'}
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.geojson,.json"
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </DropZone>
          </FieldGroup>

          {error && (
            <p role="alert" style={{ color: '#f87171', marginBottom: 16 }}>{error}</p>
          )}
          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4ade80', marginBottom: 16, fontSize: '0.9rem' }}>
              <CheckCircle2 size={18} /> Request submitted! Our team will review it shortly.
            </div>
          )}

          <Button type="submit" disabled={submitting} fullWidth>
            {submitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </FormCard>

        <Card>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 16 }}>My Onboarding Requests</h2>
          {loading && <p style={{ color: '#9ca3af' }}>Loading...</p>}
          {!loading && requests.length === 0 && (
            <p style={{ color: '#9ca3af' }}>You have not requested any parcel onboarding yet.</p>
          )}
          {!loading && requests.map((r) => (
            <RequestRow key={r.id}>
              <div>
                <RequestName>{r.name}</RequestName>
                <RequestMeta>
                  <MapPin size={12} /> {r.region || 'No region set'}
                  <Clock size={12} style={{ marginLeft: 8 }} />
                  {new Date(r.requested_at).toLocaleDateString()}
                </RequestMeta>
                {r.status === 'rejected' && r.rejection_reason && (
                  <RequestMeta style={{ color: '#f87171' }}>
                    <XCircle size={12} /> {r.rejection_reason}
                  </RequestMeta>
                )}
              </div>
              <Badge tone={STATUS_TONE[r.status] || 'neutral'}>
                {r.status}
              </Badge>
            </RequestRow>
          ))}
        </Card>
      </Layout2Col>
    </Layout>
  );
}
