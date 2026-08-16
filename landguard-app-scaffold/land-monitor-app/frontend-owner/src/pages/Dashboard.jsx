import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MapPin, ArrowRight, Ruler, AlertTriangle, X } from 'lucide-react';
import { Card, Badge, Skeleton, AreaBarChart, AlertTrendChart, useRealTime, ConnectionStatus } from '@earthglobal/design-system';
import api from '../services/api';
import OwnerLayout from '../components/OwnerLayout';

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  color: ${({ theme }) => theme.colors.text};
`;

const Subtitle = styled.p`
  margin-top: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing[4]};

  ${({ theme }) => theme.media.sm`
    grid-template-columns: repeat(2, 1fr);
  `}

  ${({ theme }) => theme.media.lg`
    grid-template-columns: repeat(3, 1fr);
  `}
`;

const ParcelName = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

const ViewLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-top: ${({ theme }) => theme.spacing[4]};
  color: ${({ theme }) => theme.colors.primaryBright};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const EmptyState = styled(Card)`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ChartCard = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`;

const ChartTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const LiveAlertBanner = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid ${({ theme }) => theme.colors.warning};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: 0 0 16px rgba(245, 158, 11, 0.2);
`;

const LiveAlertText = styled.div`
  flex: 1;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const LiveAlertClose = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  padding: 4px;
  border-radius: ${({ theme }) => theme.radii.sm};
  display: flex;
  align-items: center;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
    background: rgba(255, 255, 255, 0.1);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primaryBright};
    outline-offset: 2px;
  }
`;

export default function Dashboard() {
  const { t } = useTranslation();
  const [parcels, setParcels] = useState([]);
  const [alertTrends, setAlertTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveAlert, setLiveAlert] = useState(null);

  const token = localStorage.getItem('token');
  const { connected, on } = useRealTime({ token });

  useEffect(() => {
    const loadParcels = api.get('/parcels').then((res) => setParcels(res.data));
    const loadTrends = api.get('/alerts/trends').then((res) => setAlertTrends(res.data));

    Promise.all([loadParcels, loadTrends])
      .catch((err) => {
        console.error('Failed to load dashboard data', err);
        setError(t('dashboard.error'));
      })
      .finally(() => setLoading(false));
  }, [t]);

  // Subscribe to real-time alert events
  useEffect(() => {
    if (!on) return;
    const unsubscribe = on('alert:new', ({ alert, parcelId }) => {
      const parcel = parcels.find((p) => p.id === parcelId);
      setLiveAlert({
        alertType: alert.alert_type,
        parcelName: parcel?.name || t('dashboard.unknownParcel'),
        parcelId,
      });
    });
    return unsubscribe;
  }, [on, parcels, t]);

  return (
    <OwnerLayout>
      <Header>
        <HeaderRow>
          <div>
            <Title>{t('dashboard.title')}</Title>
            <Subtitle>{t('tagline', { ns: 'common' })}</Subtitle>
          </div>
          <ConnectionStatus
            connected={connected}
            connectedLabel={t('realtime.live', { ns: 'common' })}
            disconnectedLabel={t('realtime.reconnecting', { ns: 'common' })}
          />
        </HeaderRow>
      </Header>

      <AnimatePresence>
        {liveAlert && (
          <LiveAlertBanner
            role="alert"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <AlertTriangle size={20} color="#f59e0b" aria-hidden="true" />
            <LiveAlertText>
              {t('dashboard.newAlert', {
                type: liveAlert.alertType,
                parcel: liveAlert.parcelName,
              })}
            </LiveAlertText>
            <Link to={`/parcels/${liveAlert.parcelId}`}>
              <Badge tone="warning">{t('dashboard.viewParcel')}</Badge>
            </Link>
            <LiveAlertClose
              onClick={() => setLiveAlert(null)}
              aria-label={t('dashboard.dismissAlert', { ns: 'common' })}
            >
              <X size={16} aria-hidden="true" />
            </LiveAlertClose>
          </LiveAlertBanner>
        )}
      </AnimatePresence>

      {loading && (
        <Grid>
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <Skeleton $height="1.5rem" $width="70%" />
              <Skeleton $height="1rem" $width="40%" style={{ marginTop: 12 }} />
            </Card>
          ))}
        </Grid>
      )}

      {!loading && error && (
        <EmptyState role="alert">{error}</EmptyState>
      )}

      {!loading && !error && parcels.length === 0 && (
        <EmptyState>{t('dashboard.empty')}</EmptyState>
      )}

      {!loading && !error && parcels.length > 0 && (
        <ChartCard>
          <ChartTitle>{t('dashboard.areaByParcel')}</ChartTitle>
          <AreaBarChart
            data={parcels.map((p) => ({ name: p.name, value: p.area_sqm / 10000 }))}
            unit="ha"
          />
        </ChartCard>
      )}

      {!loading && !error && parcels.length > 0 && alertTrends.length > 0 && (
        <ChartCard>
          <ChartTitle>{t('dashboard.alertTrend')}</ChartTitle>
          <AlertTrendChart data={alertTrends} />
        </ChartCard>
      )}

      {!loading && !error && parcels.length > 0 && (
        <Grid>
          {parcels.map((parcel, i) => (
            <motion.div
              key={parcel.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card interactive>
                <ParcelName>{parcel.name}</ParcelName>
                <Badge tone="primary">{parcel.region || 'Unregioned'}</Badge>
                <MetaRow>
                  <Ruler size={14} aria-hidden="true" />
                  {(parcel.area_sqm / 10000).toFixed(2)} ha
                </MetaRow>
                <MetaRow>
                  <MapPin size={14} aria-hidden="true" />
                  {parcel.survey_date
                    ? t('dashboard.surveyed', { date: new Date(parcel.survey_date).toLocaleDateString() })
                    : t('dashboard.surveyedUnknown')}
                </MetaRow>
                <ViewLink to={`/parcels/${parcel.id}`}>
                  {t('dashboard.viewParcel')} <ArrowRight size={14} aria-hidden="true" />
                </ViewLink>
              </Card>
            </motion.div>
          ))}
        </Grid>
      )}
    </OwnerLayout>
  );
}
