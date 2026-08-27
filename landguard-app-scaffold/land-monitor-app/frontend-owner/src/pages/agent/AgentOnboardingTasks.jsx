import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, MapPin, Clock, CheckCircle2, XCircle, Navigation, User, Phone } from 'lucide-react';
import { Card } from '@earthglobal/design-system';
import AgentLayout from '../../components/AgentLayout';
import api from '../../services/api';

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
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
  flex-wrap: wrap;
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

const TaskCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[5]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`;

const TaskName = styled.h3`
  font-size: 1.05rem;
  margin-bottom: 4px;
`;

const TaskMeta = styled.div`
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

const STATUS_COLOR = {
  pending: '#fbbf24',
  in_review: '#3ba7ff',
  onboarded: '#4ade80',
  rejected: '#f87171',
};

const FILTERS = ['all', 'pending', 'in_review', 'onboarded', 'rejected'];

export default function AgentOnboardingTasks() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/parcel-onboarding-requests')
      .then((res) => setRequests(res.data))
      .catch((err) => {
        console.error('Failed to load onboarding tasks', err);
        setError('Failed to load onboarding tasks');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  return (
    <AgentLayout>
      <Header>
        <PageTitle>{t('agent.onboardingTasks', 'Onboarding Tasks')}</PageTitle>
        <PageSubtitle>{t('agent.onboardingTasksSubtitle', 'Parcels assigned to you for survey and onboarding.')}</PageSubtitle>
      </Header>

      <FilterRow>
        {FILTERS.map((f) => (
          <FilterBtn key={f} $active={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f.replace('_', ' ')}
            {' '}({f === 'all' ? requests.length : requests.filter((r) => r.status === f).length})
          </FilterBtn>
        ))}
      </FilterRow>

      {loading && <EmptyState>Loading tasks...</EmptyState>}
      {!loading && error && <EmptyState>{error}</EmptyState>}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState>No {filter !== 'all' ? filter.replace('_', ' ') : ''} onboarding tasks assigned to you.</EmptyState>
      )}

      {!loading && filtered.map((r) => (
        <TaskCard key={r.id}>
          <div>
            <TaskName>{r.name}</TaskName>
            <TaskMeta><MapPin size={13} /> {r.region || 'No region set'}</TaskMeta>
            <TaskMeta><Clock size={13} /> Requested {new Date(r.requested_at).toLocaleDateString()}</TaskMeta>
            {r.owner_name && (
              <TaskMeta><User size={13} /> Owner: {r.owner_name}{r.owner_phone ? ` ` : ''}{r.owner_phone && <><Phone size={11} /> {r.owner_phone}</>}</TaskMeta>
            )}
            {r.notes && <TaskMeta style={{ maxWidth: 480 }}>Notes: {r.notes}</TaskMeta>}
            {r.rejection_reason && (
              <TaskMeta style={{ color: '#f87171' }}><XCircle size={13} /> {r.rejection_reason}</TaskMeta>
            )}
            {r.site_plan_doc_url && (
              <DocLink href={r.site_plan_doc_url} target="_blank" rel="noreferrer" download={r.site_plan_doc_name || 'site-plan'}>
                <FileText size={14} /> {r.site_plan_doc_name || 'View uploaded document'}
              </DocLink>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
            <StatusPill $color={STATUS_COLOR[r.status]}>{r.status.replace('_', ' ')}</StatusPill>
            <ActionRow>
              {r.status === 'onboarded' && r.resulting_parcel_id && (
                <SecondaryBtn onClick={() => navigate(`/agent/parcels/${r.resulting_parcel_id}`)}>
                  <Navigation size={14} /> View Parcel
                </SecondaryBtn>
              )}
            </ActionRow>
          </div>
        </TaskCard>
      ))}
    </AgentLayout>
  );
}
