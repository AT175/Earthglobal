import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MapPin, ArrowRight, Ruler } from 'lucide-react';
import { Card, Badge, Skeleton, AreaBarChart } from '@earthglobal/design-system';
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

export default function Dashboard() {
  const { t } = useTranslation();
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/parcels')
      .then((res) => setParcels(res.data))
      .catch((err) => {
        console.error('Failed to load parcels', err);
        setError(t('dashboard.error'));
      })
      .finally(() => setLoading(false));
  }, [t]);

  return (
    <OwnerLayout>
      <Header>
        <Title>{t('dashboard.title')}</Title>
        <Subtitle>{t('tagline', { ns: 'common' })}</Subtitle>
      </Header>

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
