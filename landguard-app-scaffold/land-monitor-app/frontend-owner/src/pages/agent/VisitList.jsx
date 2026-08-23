import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Camera, Video, Radio, ChevronRight, CheckCircle2, Clock,
  Loader2, ClipboardList, Film, MapPin, Phone, Calendar,
} from 'lucide-react';
import { Card, Badge, Skeleton, useRealTime, ConnectionStatus } from '@earthglobal/design-system';
import api from '../../services/api';
import AgentLayout from '../../components/AgentLayout';

// ── Styled components ──
const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  @media (max-width: 640px) { flex-direction: column; align-items: flex-start; }
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const StatCard = styled(Card)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
`;

const StatIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  flex-shrink: 0;
`;

const StatValue = styled.div`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.2;
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
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
  padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const EmptyIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  opacity: 0.4;
`;

// ── Constants ──
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

// ── Component ──
export default function VisitList() {
  const { t } = useTranslation();
  const { t: tCommon } = useTranslation('common');
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const { connected, on } = useRealTime({ token });

  const loadData = useCallback(() => {
    Promise.all([
      api.get('/visit-requests/my-stats').catch(() => ({ data: null })),
      api.get('/visit-requests').catch(() => ({ data: [] })),
    ]).then(([statsRes, visitsRes]) => {
      setStats(statsRes.data);
      setRequests(visitsRes.data || []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Real-time visit status updates
  useEffect(() => {
    if (!on) return;
    const unsubscribe = on('visit:status', ({ visit }) => {
      setRequests((prev) =>
        prev.map((r) => (r.id === visit.id ? { ...r, ...visit } : r))
      );
      // Refresh stats when a visit status changes
      loadData();
    });
    return unsubscribe;
  }, [on, loadData]);

  const statCards = [
    { label: 'Total Visits', value: stats?.total ?? 0, icon: ClipboardList, bg: 'rgba(22,119,255,0.12)', color: '#3ba7ff' },
    { label: 'Pending', value: stats?.pending ?? 0, icon: Clock, bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
    { label: 'In Progress', value: stats?.in_progress ?? 0, icon: Loader2, bg: 'rgba(92,225,255,0.12)', color: '#5ce1ff' },
    { label: 'Completed', value: stats?.completed ?? 0, icon: CheckCircle2, bg: 'rgba(34,197,94,0.12)', color: '#4ade80' },
    { label: 'Media Uploaded', value: stats?.media_count ?? 0, icon: Film, bg: 'rgba(168,85,247,0.12)', color: '#c084fc' },
  ];

  return (
    <AgentLayout>
      <Header>
        <Title>{t('visitList.title')}</Title>
        <ConnectionStatus
          connected={connected}
          connectedLabel={tCommon('realtime.live')}
          disconnectedLabel={tCommon('realtime.reconnecting')}
        />
      </Header>

      {/* Stats cards */}
      {loading ? (
        <StatsGrid>
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} style={{ padding: 16 }}>
              <Skeleton $height="48px" $width="100%" />
            </Card>
          ))}
        </StatsGrid>
      ) : (
        <StatsGrid>
          {statCards.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <StatCard>
                  <StatIcon style={{ background: s.bg, color: s.color }}>
                    <Icon size={22} />
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

      {/* Recent visits */}
      <SectionTitle>
        <ClipboardList size={20} /> Recent Visits
      </SectionTitle>

      {loading && (
        <List>
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <Skeleton $height="1.25rem" $width="60%" />
            </Card>
          ))}
        </List>
      )}

      {!loading && requests.length === 0 && (
        <EmptyState>
          <EmptyIcon><ClipboardList size={48} /></EmptyIcon>
          <p>{t('visitList.empty')}</p>
        </EmptyState>
      )}

      {!loading && requests.length > 0 && (
        <List>
          {requests.slice(0, 10).map((r, i) => {
            const Icon = TYPE_ICON[r.type] || Camera;
            const colors = TYPE_COLORS[r.type] || TYPE_COLORS.photo;
            // Enrich with stats data if available
            const enriched = stats?.recent_visits?.find((rv) => rv.id === r.id);
            const parcelName = enriched?.parcel_name || r.parcel_name || 'Parcel';
            const region = enriched?.region || r.region;
            const ownerName = enriched?.owner_name || r.owner_name;
            const ownerPhone = enriched?.owner_phone || r.owner_phone;
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <VisitRow as={Link} to={`/agent/visits/${r.id}`} interactive>
                  <VisitLeft>
                    <VisitTypeIcon style={{ background: colors.bg, color: colors.color }}>
                      <Icon size={20} />
                    </VisitTypeIcon>
                    <VisitInfo>
                      <VisitTitle>{tCommon(`visitType.${r.type}`)} — {parcelName}</VisitTitle>
                      <VisitMeta>
                        <VisitMetaItem>
                          <Calendar size={12} /> {fmtDate(r.requested_at)}
                        </VisitMetaItem>
                        {region && (
                          <VisitMetaItem>
                            <MapPin size={12} /> {region}
                          </VisitMetaItem>
                        )}
                        {ownerName && (
                          <VisitMetaItem>
                            {ownerName}
                          </VisitMetaItem>
                        )}
                        {ownerPhone && (
                          <VisitMetaItem>
                            <Phone size={12} /> {ownerPhone}
                          </VisitMetaItem>
                        )}
                      </VisitMeta>
                    </VisitInfo>
                  </VisitLeft>
                  <VisitRight>
                    <Badge tone={STATUS_TONE[r.status] || 'neutral'}>
                      {tCommon(`status.${r.status}`)}
                    </Badge>
                    <ChevronRight size={18} style={{ color: 'var(--textMuted)', opacity: 0.5 }} />
                  </VisitRight>
                </VisitRow>
              </motion.div>
            );
          })}
        </List>
      )}
    </AgentLayout>
  );
}
