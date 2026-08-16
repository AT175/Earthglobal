import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Camera, Video, Radio, ChevronRight } from 'lucide-react';
import { Card, Badge, Skeleton, useRealTime, ConnectionStatus } from '@earthglobal/design-system';
import api from '../../services/api';
import AgentLayout from '../../components/AgentLayout';

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  color: ${({ theme }) => theme.colors.text};
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const Row = styled(Card)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[4]};
`;

const RowMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text};
`;

const TYPE_ICON = { photo: Camera, video: Video, live: Radio };

const STATUS_TONE = {
  pending: 'warning',
  assigned: 'primary',
  in_progress: 'primary',
  completed: 'success',
  cancelled: 'neutral',
};

export default function VisitList() {
  const { t } = useTranslation();
  const { t: tCommon } = useTranslation('common');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const { connected, on } = useRealTime({ token });

  useEffect(() => {
    api
      .get('/visit-requests')
      .then((res) => setRequests(res.data))
      .catch((err) => console.error('Failed to load visit requests', err))
      .finally(() => setLoading(false));
  }, []);

  // Subscribe to real-time visit status updates — update the list in place
  useEffect(() => {
    if (!on) return;
    const unsubscribe = on('visit:status', ({ visit }) => {
      setRequests((prev) =>
        prev.map((r) => (r.id === visit.id ? { ...r, ...visit } : r))
      );
    });
    return unsubscribe;
  }, [on]);

  return (
    <AgentLayout>
      <TitleRow>
        <Title>{t('visitList.title')}</Title>
        <ConnectionStatus
          connected={connected}
          connectedLabel={tCommon('realtime.live')}
          disconnectedLabel={tCommon('realtime.reconnecting')}
        />
      </TitleRow>

      {loading && (
        <List>
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <Skeleton $height="1.25rem" $width="60%" />
            </Card>
          ))}
        </List>
      )}

      {!loading && requests.length === 0 && <Card>{t('visitList.empty')}</Card>}

      {!loading && requests.length > 0 && (
        <List>
          {requests.map((r) => {
            const Icon = TYPE_ICON[r.type] || Camera;
            return (
              <Row key={r.id} as={Link} to={`/agent/visits/${r.id}`} interactive>
                <RowMeta>
                  <Icon size={20} aria-hidden="true" />
                  <div>
                    <strong>{tCommon(`visitType.${r.type}`)}</strong>
                    <div style={{ fontSize: '0.85em', opacity: 0.7 }}>
                      {t('visitList.requested', { date: new Date(r.requested_at).toLocaleDateString() })}
                    </div>
                  </div>
                </RowMeta>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge tone={STATUS_TONE[r.status] || 'neutral'}>{tCommon(`status.${r.status}`)}</Badge>
                  <ChevronRight size={18} aria-hidden="true" />
                </div>
              </Row>
            );
          })}
        </List>
      )}
    </AgentLayout>
  );
}
