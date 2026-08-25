import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Camera, Video, Radio, ChevronRight, MapPin, Calendar, User,
  ClipboardList, CheckCircle2, Clock, Loader2, Film, Inbox,
} from 'lucide-react';
import { Card, Badge, Skeleton } from '@earthglobal/design-system';
import api from '../../services/api';
import { useRoleLayout } from '../../hooks/useRoleLayout';

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

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const StatCard = styled(Card)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
`;

const StatIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  flex-shrink: 0;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.2;
`;

const StatLabel = styled.div`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 ${({ theme }) => theme.spacing[3]} 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const VisitRow = styled(Card)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[4]};
  text-decoration: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadows.cardHover};
  }
`;

const VisitLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  min-width: 0;
`;

const VisitTypeIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  flex-shrink: 0;
`;

const VisitInfo = styled.div`
  min-width: 0;
`;

const VisitTitle = styled.strong`
  display: block;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const VisitMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 2px;
  flex-wrap: wrap;
`;

const VisitMetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
`;

const VisitRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

const EmptyState = styled(Card)`
  text-align: center;
  padding: 3rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const TYPE_ICON = { photo: Camera, video: Video, live: Radio };
const TYPE_COLORS = {
  photo: { bg: 'rgba(22,119,255,0.12)', color: '#3ba7ff' },
  video: { bg: 'rgba(168,85,247,0.12)', color: '#c084fc' },
  live: { bg: 'rgba(239,68,68,0.12)', color: '#f87171' },
};
const STATUS_TONE = {
  pending: 'warning',
  assigned: 'primary',
  in_progress: 'primary',
  completed: 'success',
  cancelled: 'neutral',
};

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  : '—';

export default function MyVisits() {
  const { t } = useTranslation();
  const { t: tCommon } = useTranslation('common');
  const { Layout, routePrefix } = useRoleLayout();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    api.get('/visit-requests')
      .then((res) => setVisits(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const stats = {
    total: visits.length,
    pending: visits.filter((v) => v.status === 'pending' || v.status === 'assigned').length,
    inProgress: visits.filter((v) => v.status === 'in_progress').length,
    completed: visits.filter((v) => v.status === 'completed').length,
    media: visits.reduce((sum, v) => sum + (parseInt(v.media_count, 10) || 0), 0),
  };

  const statCards = [
    { label: 'Total', value: stats.total, icon: ClipboardList, bg: 'rgba(22,119,255,0.12)', color: '#3ba7ff' },
    { label: 'Pending', value: stats.pending, icon: Clock, bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
    { label: 'In Progress', value: stats.inProgress, icon: Loader2, bg: 'rgba(92,225,255,0.12)', color: '#5ce1ff' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle2, bg: 'rgba(34,197,94,0.12)', color: '#4ade80' },
    { label: 'Media', value: stats.media, icon: Film, bg: 'rgba(168,85,247,0.12)', color: '#c084fc' },
  ];

  return (
    <Layout>
      <Title>My Visits</Title>
      <Subtitle>Track your field visit requests and view agent reports.</Subtitle>

      {loading ? (
        <StatsGrid>
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}><Skeleton $height="40px" /></Card>
          ))}
        </StatsGrid>
      ) : (
        <StatsGrid>
          {statCards.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <StatCard>
                  <StatIcon style={{ background: s.bg, color: s.color }}>
                    <Icon size={20} />
                  </StatIcon>
                  <div>
                    <StatValue>{s.value}</StatValue>
                    <StatLabel>{s.label}</StatLabel>
                  </div>
                </StatCard>
              </motion.div>
            );
          })}
        </StatsGrid>
      )}

      <SectionTitle><ClipboardList size={20} /> Visit History</SectionTitle>

      {loading && (
        <List>
          {[1, 2, 3].map((i) => <Card key={i}><Skeleton $height="60px" /></Card>)}
        </List>
      )}

      {!loading && visits.length === 0 && (
        <EmptyState>
          <Inbox size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p>You haven't requested any visits yet.</p>
        </EmptyState>
      )}

      {!loading && visits.length > 0 && (
        <List>
          {visits.map((v, i) => {
            const Icon = TYPE_ICON[v.type] || Camera;
            const colors = TYPE_COLORS[v.type] || TYPE_COLORS.photo;
            return (
              <motion.div key={v.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <VisitRow as={Link} to={`${routePrefix}/visits/${v.id}`} interactive>
                  <VisitLeft>
                    <VisitTypeIcon style={{ background: colors.bg, color: colors.color }}>
                      <Icon size={20} />
                    </VisitTypeIcon>
                    <VisitInfo>
                      <VisitTitle>{tCommon(`visitType.${v.type}`)} — {v.parcel_name || 'Parcel'}</VisitTitle>
                      <VisitMeta>
                        <VisitMetaItem><Calendar size={12} /> {fmtDate(v.requested_at)}</VisitMetaItem>
                        {v.region && <VisitMetaItem><MapPin size={12} /> {v.region}</VisitMetaItem>}
                        {v.agent_name && <VisitMetaItem><User size={12} /> {v.agent_name}</VisitMetaItem>}
                        {parseInt(v.media_count, 10) > 0 && (
                          <VisitMetaItem><Film size={12} /> {v.media_count} {v.media_count === 1 ? 'file' : 'files'}</VisitMetaItem>
                        )}
                      </VisitMeta>
                    </VisitInfo>
                  </VisitLeft>
                  <VisitRight>
                    <Badge tone={STATUS_TONE[v.status] || 'neutral'}>
                      {tCommon(`status.${v.status}`)}
                    </Badge>
                    <ChevronRight size={18} style={{ opacity: 0.4 }} />
                  </VisitRight>
                </VisitRow>
              </motion.div>
            );
          })}
        </List>
      )}
    </Layout>
  );
}
