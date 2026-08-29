import { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  ClipboardList, Camera, Video, Radio, MapPin, Phone, Calendar,
  User, ChevronDown, Check, AlertCircle, Loader2, UserCheck,
} from 'lucide-react';
import { Card, Badge, Button, Skeleton } from '@earthglobal/design-system';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import { VISIT_TYPE_LABELS } from '../../lib/labels';

const Title = styled.h1`
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 8px 0;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.875rem;
  margin: 0 0 ${({ theme }) => theme.spacing[6]} 0;
`;

const StatsRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  flex-wrap: wrap;
`;

const StatPill = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  font-size: 0.875rem;
  font-weight: 600;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const VisitCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[4]};
`;

const VisitHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
`;

const VisitType = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const VisitInfo = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
  margin-bottom: 16px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const AssignSection = styled.div`
  border-top: 1px solid ${({ theme }) => theme.colors.borderDark};
  padding-top: 16px;
`;

const AssignLabel = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const AgentOptions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const AgentChip = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid ${({ $selected, theme }) =>
    $selected ? theme.colors.primary : theme.colors.borderDark};
  background: ${({ $selected, theme }) =>
    $selected ? 'rgba(22,119,255,0.1)' : 'transparent'};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;

  &:hover { border-color: ${({ theme }) => theme.colors.primary}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const AgentVisits = styled.span`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.textMuted};
  background: rgba(255,255,255,0.05);
  padding: 2px 6px;
  border-radius: 4px;
`;

const EmptyState = styled(Card)`
  text-align: center;
  padding: 3rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const TYPE_ICON = { photo: Camera, video: Video, live: Radio };
const TYPE_COLORS = {
  photo: '#3ba7ff',
  video: '#c084fc',
  live: '#f87171',
};

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

export default function VisitAssignments() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(() => {
    api.get('/visit-requests/unassigned')
      .then((res) => setVisits(res.data || []))
      .catch((err) => setError('Failed to load unassigned visits'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAssign = async (visitId, agentId) => {
    setAssigning(visitId);
    setError('');
    setSuccess('');
    try {
      await api.patch(`/visit-requests/${visitId}`, {
        agent_id: agentId,
        status: 'assigned',
      });
      setSuccess('Visit assigned successfully');
      setVisits((prev) => prev.filter((v) => v.id !== visitId));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to assign visit');
    } finally {
      setAssigning(null);
    }
  };

  return (
    <AdminLayout>
      <Title>Visit Assignments</Title>
      <Subtitle>Unassigned visit requests awaiting an agent. Auto-assignment runs on creation, but you can manually assign or reassign here.</Subtitle>

      {success && (
        <div style={{ padding: '10px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, color: '#4ade80', fontSize: '0.875rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Check size={16} /> {success}
        </div>
      )}
      {error && (
        <div style={{ padding: '10px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#f87171', fontSize: '0.875rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <StatsRow>
        <StatPill $bg="rgba(251,191,36,0.12)" $color="#fbbf24">
          <ClipboardList size={16} /> {visits.length} Unassigned
        </StatPill>
      </StatsRow>

      {loading && (
        <List>
          {[1, 2].map((i) => (
            <Card key={i}><Skeleton $height="120px" /></Card>
          ))}
        </List>
      )}

      {!loading && visits.length === 0 && (
        <EmptyState>
          <Check size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p>All visit requests have been assigned. Auto-assignment is working.</p>
        </EmptyState>
      )}

      {!loading && visits.length > 0 && (
        <List>
          {visits.map((visit, i) => {
            const Icon = TYPE_ICON[visit.type] || Camera;
            const color = TYPE_COLORS[visit.type] || '#3ba7ff';
            const candidates = visit.candidate_agents || [];
            const selected = selectedAgent[visit.id];

            return (
              <motion.div
                key={visit.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <VisitCard>
                  <VisitHeader>
                    <VisitType>
                      <Icon size={20} style={{ color }} />
                      {VISIT_TYPE_LABELS[visit.type]} — {visit.parcel_name}
                    </VisitType>
                    <Badge tone="warning">Pending</Badge>
                  </VisitHeader>

                  <VisitInfo>
                    <InfoItem><Calendar size={14} /> {fmtDate(visit.requested_at)}</InfoItem>
                    {visit.region && <InfoItem><MapPin size={14} /> {visit.region}</InfoItem>}
                    <InfoItem><User size={14} /> {visit.owner_name}</InfoItem>
                    {visit.owner_phone && <InfoItem><Phone size={14} /> {visit.owner_phone}</InfoItem>}
                  </VisitInfo>

                  <AssignSection>
                    <AssignLabel>Assign to agent</AssignLabel>
                    {candidates.length === 0 ? (
                      <div style={{ color: '#f87171', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertCircle size={14} /> No active agents available
                      </div>
                    ) : (
                      <>
                        <AgentOptions>
                          {candidates.map((agent) => (
                            <AgentChip
                              key={agent.id}
                              $selected={selected === agent.id}
                              onClick={() => setSelectedAgent((prev) => ({ ...prev, [visit.id]: agent.id }))}
                              disabled={assigning === visit.id}
                            >
                              <UserCheck size={14} />
                              {agent.name}
                              {agent.region && ` (${agent.region})`}
                              <AgentVisits>{agent.active_visits} active</AgentVisits>
                            </AgentChip>
                          ))}
                        </AgentOptions>
                        {selected && (
                          <Button
                            variant="primary"
                            style={{ marginTop: 12 }}
                            onClick={() => handleAssign(visit.id, selected)}
                            disabled={assigning === visit.id}
                          >
                            {assigning === visit.id ? (
                              <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Assigning...</>
                            ) : (
                              <><Check size={16} /> Confirm Assignment</>
                            )}
                          </Button>
                        )}
                      </>
                    )}
                  </AssignSection>
                </VisitCard>
              </motion.div>
            );
          })}
        </List>
      )}
    </AdminLayout>
  );
}
