import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Ruler, ArrowLeftRight } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get(`/parcels/${id}`), api.get(`/parcels/${id}/alerts`)])
      .then(([parcelRes, alertsRes]) => {
        setParcel(parcelRes.data);
        setAlerts(alertsRes.data);
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
        <Button onClick={() => navigate(`/parcels/${id}/request-visit`)}>
          {t('parcelDetail.requestVisit')}
        </Button>
      </Header>

      <StatsRow>
        <span>
          <Ruler size={16} aria-hidden="true" />
          {(parcel.area_sqm / 10000).toFixed(2)} ha
        </span>
        <span>
          <ArrowLeftRight size={16} aria-hidden="true" />
          {t('parcelDetail.perimeter', { value: parcel.perimeter_m?.toFixed(0) })}
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
    </OwnerLayout>
  );
}
