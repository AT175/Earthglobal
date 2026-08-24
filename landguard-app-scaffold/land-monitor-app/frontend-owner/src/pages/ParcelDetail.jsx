import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Ruler, ArrowLeftRight, Camera, Video, Radio, ChevronRight, Film, ClipboardList } from 'lucide-react';
import { Card, Badge, Button, Skeleton, ParcelMap } from '@earthglobal/design-system';
import api from '../services/api';
import OwnerLayout from '../components/OwnerLayout';

const Header = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  color: ${({ theme }) => theme.colors.text};
`;

const StatsRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-bottom: ${({ theme }) => theme.spacing[6]};

  span {
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing[1]};
  }
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.text};
  margin: ${({ theme }) => theme.spacing[8]} 0 ${({ theme }) => theme.spacing[4]};
`;

const AlertList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const AlertRow = styled(Card)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[4]};
`;

const AlertMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text};
`;

export default function ParcelDetail() {
  const { t } = useTranslation();
  const { t: tCommon } = useTranslation('common');
  const { id } = useParams();
  const navigate = useNavigate();
  const [parcel, setParcel] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get(`/parcels/${id}`), api.get(`/parcels/${id}/alerts`), api.get('/visit-requests')])
      .then(([parcelRes, alertsRes, visitsRes]) => {
        setParcel(parcelRes.data);
        setAlerts(alertsRes.data);
        setVisits((visitsRes.data || []).filter((v) => v.parcel_id === id));
      })
      .catch((err) => console.error('Failed to load parcel', err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <OwnerLayout>
        <Skeleton $height="2rem" $width="40%" style={{ marginBottom: 24 }} />
        <Skeleton $height="500px" />
      </OwnerLayout>
    );
  }

  if (!parcel) {
    return (
      <OwnerLayout>
        <Card>{t('parcelDetail.notFound')}</Card>
      </OwnerLayout>
    );
  }

  const path = parcel.boundary.coordinates[0].map(([lng, lat]) => ({ lat, lng }));
  const hasUnverifiedAlert = alerts.some((a) => !a.verified);

  return (
    <OwnerLayout>
      <Header>
        <Title>{parcel.name}</Title>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => navigate(`/parcels/${id}/request-visit`)}>
            {t('parcelDetail.requestVisit')}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/sell')}>
            List for Sale
          </Button>
        </div>
      </Header>

      <StatsRow>
        <span>
          <Ruler size={16} aria-hidden="true" />
          {(Number(parcel.area_sqm) / 10000).toFixed(2)} ha
        </span>
        <span>
          <ArrowLeftRight size={16} aria-hidden="true" />
          {t('parcelDetail.perimeter', { value: Number(parcel.perimeter_m)?.toFixed(0) })}
        </span>
      </StatsRow>

      <ParcelMap
        path={path}
        status={hasUnverifiedAlert ? 'alert' : 'active'}
        googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
      />

      <SectionTitle>{t('parcelDetail.alerts')}</SectionTitle>
      {alerts.length === 0 ? (
        <Card>{t('parcelDetail.noAlerts')}</Card>
      ) : (
        <AlertList>
          {alerts.map((alert) => (
            <AlertRow key={alert.id}>
              <AlertMeta>
                {alert.verified ? (
                  <CheckCircle2 size={20} color="#22c55e" aria-hidden="true" />
                ) : (
                  <AlertTriangle size={20} color="#f59e0b" aria-hidden="true" />
                )}
                <div>
                  <strong>{alert.alert_type}</strong>
                  <div style={{ fontSize: '0.85em', opacity: 0.7 }}>
                    {t('parcelDetail.detected', { date: new Date(alert.detected_at).toLocaleDateString() })}
                  </div>
                </div>
              </AlertMeta>
              <Badge tone={alert.verified ? 'success' : 'warning'}>
                {alert.verified ? tCommon('status.verified') : tCommon('status.unverified')}
              </Badge>
            </AlertRow>
          ))}
        </AlertList>
      )}

      {/* Visit history */}
      <SectionTitle>
        <ClipboardList size={20} style={{ display: 'inline' }} /> Visit History
      </SectionTitle>
      {visits.length === 0 ? (
        <Card>No visits requested for this parcel yet.</Card>
      ) : (
        <AlertList>
          {visits.map((v) => {
            const VIcon = v.type === 'video' ? Video : v.type === 'live' ? Radio : Camera;
            const tone = v.status === 'completed' ? 'success' : v.status === 'in_progress' ? 'primary' : v.status === 'cancelled' ? 'neutral' : 'warning';
            return (
              <AlertRow key={v.id} as={Link} to={`/visits/${v.id}`} style={{ textDecoration: 'none', cursor: 'pointer' }}>
                <AlertMeta>
                  <VIcon size={20} color="#3ba7ff" aria-hidden="true" />
                  <div>
                    <strong>{tCommon(`visitType.${v.type}`)}</strong>
                    <div style={{ fontSize: '0.85em', opacity: 0.7, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {new Date(v.requested_at).toLocaleDateString()}
                      {v.agent_name && <span>• {v.agent_name}</span>}
                      {parseInt(v.media_count, 10) > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Film size={11} /> {v.media_count}</span>}
                    </div>
                  </div>
                </AlertMeta>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge tone={tone}>{tCommon(`status.${v.status}`)}</Badge>
                  <ChevronRight size={16} style={{ opacity: 0.4 }} />
                </div>
              </AlertRow>
            );
          })}
        </AlertList>
      )}
    </OwnerLayout>
  );
}
