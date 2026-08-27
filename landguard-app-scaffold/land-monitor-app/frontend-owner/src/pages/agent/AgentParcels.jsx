import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
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

const ParcelCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  transition: border-color 0.2s;

  &:hover { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const ParcelInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ParcelName = styled.h3`
  font-size: 1rem;
  margin: 0;
`;

const ParcelMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.8rem;
`;

const ViewBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${({ theme }) => theme.colors.gradientPrimary};
  color: white;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.textMuted};
`;

export default function AgentParcels() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/parcels')
      .then((res) => setParcels(res.data))
      .catch((err) => {
        console.error('Failed to load parcels', err);
        setError('Failed to load parcels');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AgentLayout>
      <Header>
        <PageTitle>{t('agent.myParcels', 'My Parcels')}</PageTitle>
        <PageSubtitle>{t('agent.myParcelsSubtitle', 'Parcels assigned to you for survey and monitoring.')}</PageSubtitle>
      </Header>

      {loading && (
        <EmptyState>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /> Loading parcels...
        </EmptyState>
      )}
      {!loading && error && <EmptyState>{error}</EmptyState>}
      {!loading && !error && parcels.length === 0 && (
        <EmptyState>No parcels assigned to you yet.</EmptyState>
      )}

      {!loading && parcels.map((p) => (
        <ParcelCard key={p.id} onClick={() => navigate(`/agent/parcels/${p.id}`)}>
          <ParcelInfo>
            <ParcelName>{p.name}</ParcelName>
            <ParcelMeta><MapPin size={13} /> {p.region || 'No region'}</ParcelMeta>
            {p.area_sqm != null && (
              <ParcelMeta>Area: {(p.area_sqm / 10000).toFixed(2)} ha</ParcelMeta>
            )}
          </ParcelInfo>
          <ViewBtn>
            <Navigation size={14} /> View
          </ViewBtn>
        </ParcelCard>
      ))}
    </AgentLayout>
  );
}
