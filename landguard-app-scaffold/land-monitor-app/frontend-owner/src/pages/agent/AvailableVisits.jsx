import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  Camera, Video, Radio, MapPin, Phone, Calendar, User,
  Inbox, Loader2, Check, AlertCircle, Hand,
} from 'lucide-react';
import { Card, Badge, Button, Skeleton } from '@earthglobal/design-system';
import { VISIT_TYPE_LABELS } from '../../lib/labels';
import api from '../../services/api';
import AgentLayout from '../../components/AgentLayout';

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 8px 0;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.875rem;
  margin: 0 0 ${({ theme }) => theme.spacing[6]} 0;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const VisitCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[4]};
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
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

export default function AvailableVisits() {
  const navigate = useNavigate();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(() => {
    api.get('/visit-requests/available')
      .then((res) => setVisits(res.data || []))
      .catch(() => setError('Failed to load available visits'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleClaim = async (visitId) => {
    setClaiming(visitId);
    setError('');
    setSuccess('');
    try {
      await api.post(`/visit-requests/${visitId}/claim`);
      setSuccess('Visit claimed! Redirecting...');
      setVisits((prev) => prev.filter((v) => v.id !== visitId));
      setTimeout(() => navigate(`/agent/visits/${visitId}`), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to claim visit');
      loadData(); // Refresh in case it was already claimed
    } finally {
      setClaiming(null);
    }
  };

  return (
    <AgentLayout>
      <Title>Available Visits</Title>
      <Subtitle>Unassigned visit requests in your region. Claim one to add it to your workload.</Subtitle>

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

      {loading && (
        <List>
          {[1, 2].map((i) => <Card key={i}><Skeleton $height="120px" /></Card>)}
        </List>
      )}

      {!loading && visits.length === 0 && (
        <EmptyState>
          <Inbox size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p>No unassigned visits in your region right now. Check back later.</p>
        </EmptyState>
      )}

      {!loading && visits.length > 0 && (
        <List>
          {visits.map((visit, i) => {
            const Icon = TYPE_ICON[visit.type] || Camera;
            const color = TYPE_COLORS[visit.type] || '#3ba7ff';
            return (
              <motion.div
                key={visit.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <VisitCard>
                  <CardHeader>
                    <VisitType>
                      <Icon size={20} style={{ color }} />
                      {VISIT_TYPE_LABELS[visit.type]} — {visit.parcel_name}
                    </VisitType>
                    <Badge tone="warning">Available</Badge>
                  </CardHeader>

                  <VisitInfo>
                    <InfoItem><Calendar size={14} /> {fmtDate(visit.requested_at)}</InfoItem>
                    {visit.region && <InfoItem><MapPin size={14} /> {visit.region}</InfoItem>}
                    <InfoItem><User size={14} /> {visit.owner_name}</InfoItem>
                    {visit.owner_phone && <InfoItem><Phone size={14} /> {visit.owner_phone}</InfoItem>}
                  </VisitInfo>

                  <Button
                    variant="primary"
                    onClick={() => handleClaim(visit.id)}
                    disabled={claiming === visit.id}
                  >
                    {claiming === visit.id ? (
                      <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Claiming...</>
                    ) : (
                      <><Hand size={16} /> Claim This Visit</>
                    )}
                  </Button>
                </VisitCard>
              </motion.div>
            );
          })}
        </List>
      )}
    </AgentLayout>
  );
}
