import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { FileText, MapPin, Clock, CheckCircle2, XCircle, Navigation, UserCog } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';

const Page = styled.div`
  color: ${({ theme }) => theme.colors.text};
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const PageSubtitle = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.md};
`;

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: ${({ theme }) => theme.spacing[5]};
`;

const FilterBtn = styled.button`
  padding: 6px 14px;
  border-radius: ${({ theme }) => theme.radii.full};
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.borderDark)};
  background: ${({ $active, theme }) => ($active ? theme.colors.primary + '20' : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.textMuted)};
  font-size: 0.8rem;
  cursor: pointer;
`;

const RequestCard = styled.div`
  background: ${({ theme }) => theme.colors.gradientSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[5]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`;

const ReqName = styled.h3`
  font-size: 1.05rem;
  margin-bottom: 4px;
`;

const ReqMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.82rem;
  margin-top: 4px;
`;

const StatusPill = styled.span`
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${({ $color }) => $color}1f;
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $color }) => $color}40;
`;

const ActionRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Btn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
`;

const PrimaryBtn = styled(Btn)`
  background: ${({ theme }) => theme.colors.gradientPrimary};
  color: white;
`;

const SecondaryBtn = styled(Btn)`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const DangerBtn = styled(Btn)`
  background: rgba(239,68,68,0.12);
  color: #f87171;
`;

const DocLink = styled.a`
  color: ${({ theme }) => theme.colors.primaryBright};
  font-size: 0.82rem;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const AgentAssignRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
`;

const AgentSelect = styled.select`
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.8rem;
  cursor: pointer;
  outline: none;

  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const AgentBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: 0.72rem;
  font-weight: 600;
  background: rgba(168,85,247,0.12);
  color: #c084fc;
  border: 1px solid rgba(168,85,247,0.3);
`;

const STATUS_COLOR = {
  pending: '#fbbf24',
  in_review: '#3ba7ff',
  onboarded: '#4ade80',
  rejected: '#f87171',
};

const FILTERS = ['all', 'pending', 'in_review', 'onboarded', 'rejected'];

export default function OnboardingRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [error, setError] = useState('');
  const [assigning, setAssigning] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/parcel-onboarding-requests')
      .then((res) => setRequests(res.data))
      .catch((err) => {
        console.error('Failed to load onboarding requests', err);
        setError('Failed to load onboarding requests');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get('/agents').then((res) => setAgents(res.data)).catch(() => {});
  }, []);

  const handleReject = async (id) => {
    const reason = window.prompt('Reason for rejecting this request (optional):', '');
    if (reason === null) return;
    try {
      await api.patch(`/parcel-onboarding-requests/${id}`, { status: 'rejected', rejection_reason: reason || null });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject request');
    }
  };

  const handleMarkInReview = async (id) => {
    try {
      await api.patch(`/parcel-onboarding-requests/${id}`, { status: 'in_review' });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update request');
    }
  };

  const handleAssignAgent = async (id, agentId) => {
    setAssigning(id);
    try {
      await api.patch(`/parcel-onboarding-requests/${id}`, { assigned_agent_id: agentId || null });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign agent');
    } finally {
      setAssigning(null);
    }
  };

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  return (
    <AdminLayout>
      <Page>
        <Header>
          <PageTitle>Parcel Onboarding Requests</PageTitle>
          <PageSubtitle>Landowners requesting a new parcel be surveyed and added to the platform.</PageSubtitle>
        </Header>

        <FilterRow>
          {FILTERS.map((f) => (
            <FilterBtn key={f} $active={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f.replace('_', ' ')}
              {' '}({f === 'all' ? requests.length : requests.filter((r) => r.status === f).length})
            </FilterBtn>
          ))}
        </FilterRow>

        {loading && <EmptyState>Loading requests...</EmptyState>}
        {!loading && error && <EmptyState>{error}</EmptyState>}
        {!loading && !error && filtered.length === 0 && (
          <EmptyState>No {filter !== 'all' ? filter.replace('_', ' ') : ''} onboarding requests.</EmptyState>
        )}

        {!loading && filtered.map((r) => (
          <RequestCard key={r.id}>
            <div>
              <ReqName>{r.name}</ReqName>
              <ReqMeta><MapPin size={13} /> {r.region || 'No region set'}</ReqMeta>
              <ReqMeta><Clock size={13} /> Requested {new Date(r.requested_at).toLocaleDateString()}</ReqMeta>
              {r.owner_name && <ReqMeta>Owner: {r.owner_name} {r.owner_phone ? `(${r.owner_phone})` : ''}</ReqMeta>}
              {r.notes && <ReqMeta style={{ maxWidth: 480 }}>Notes: {r.notes}</ReqMeta>}
              {r.rejection_reason && (
                <ReqMeta style={{ color: '#f87171' }}><XCircle size={13} /> {r.rejection_reason}</ReqMeta>
              )}
              {r.site_plan_doc_url && (
                <DocLink href={r.site_plan_doc_url} target="_blank" rel="noreferrer" download={r.site_plan_doc_name || 'site-plan'}>
                  <FileText size={14} /> {r.site_plan_doc_name || 'View uploaded document'}
                </DocLink>
              )}

              {/* Assigned agent display + assign control */}
              {r.assigned_agent_name ? (
                <AgentBadge><UserCog size={12} /> Agent: {r.assigned_agent_name}</AgentBadge>
              ) : (
                <ReqMeta style={{ color: '#aab7d4' }}><UserCog size={13} /> No agent assigned</ReqMeta>
              )}
              {r.status !== 'onboarded' && r.status !== 'rejected' && (
                <AgentAssignRow>
                  <AgentSelect
                    value={r.assigned_agent_id || ''}
                    disabled={assigning === r.id}
                    onChange={(e) => handleAssignAgent(r.id, e.target.value)}
                  >
                    <option value="">-- Assign agent --</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}{a.region ? ` (${a.region})` : ''}</option>
                    ))}
                  </AgentSelect>
                </AgentAssignRow>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
              <StatusPill $color={STATUS_COLOR[r.status]}>{r.status.replace('_', ' ')}</StatusPill>
              <ActionRow>
                {r.status === 'pending' && (
                  <SecondaryBtn onClick={() => handleMarkInReview(r.id)}>
                    <CheckCircle2 size={14} /> Mark In Review
                  </SecondaryBtn>
                )}
                {(r.status === 'pending' || r.status === 'in_review') && (
                  <>
                    <PrimaryBtn onClick={() => navigate(`/admin/onboard?requestId=${r.id}`)}>
                      <Navigation size={14} /> Onboard Parcel
                    </PrimaryBtn>
                    <DangerBtn onClick={() => handleReject(r.id)}>
                      <XCircle size={14} /> Reject
                    </DangerBtn>
                  </>
                )}
                {r.status === 'onboarded' && r.resulting_parcel_id && (
                  <SecondaryBtn onClick={() => navigate(`/parcels/${r.resulting_parcel_id}`)}>
                    View Parcel
                  </SecondaryBtn>
                )}
              </ActionRow>
            </div>
          </RequestCard>
        ))}
      </Page>
    </AdminLayout>
  );
}
