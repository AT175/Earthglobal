import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Table, Thead, Tr, Th, Td, Skeleton } from '@earthglobal/design-system';
import api from '../../services/api';
import AdminLayout from '../../components/AdminLayout';

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

export default function ParcelsList() {
  const { t } = useTranslation();
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/parcels')
      .then((res) => setParcels(res.data))
      .catch((err) => console.error('Failed to load parcels', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <Title>{t('parcels.title')}</Title>

      {loading ? (
        <Skeleton $height="200px" />
      ) : (
        <Table>
          <caption style={{ display: 'none' }}>{t('parcels.title')}</caption>
          <Thead>
            <Tr>
              <Th scope="col">{t('parcels.name')}</Th>
              <Th scope="col">{t('parcels.region')}</Th>
              <Th scope="col">{t('parcels.area')}</Th>
              <Th scope="col">{t('parcels.surveyed')}</Th>
            </Tr>
          </Thead>
          <tbody>
            {parcels.map((parcel) => (
              <Tr key={parcel.id}>
                <Td>{parcel.name}</Td>
                <Td>{parcel.region || '—'}</Td>
                <Td>{(parcel.area_sqm / 10000).toFixed(2)}</Td>
                <Td>{parcel.survey_date ? new Date(parcel.survey_date).toLocaleDateString() : '—'}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </AdminLayout>
  );
}
