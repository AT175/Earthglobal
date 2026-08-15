import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Badge, Table, Thead, Tr, Th, Td, Skeleton } from '@earthglobal/design-system';
import api from '../services/api';
import AdminLayout from '../components/AdminLayout';

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

export default function AgentManagement() {
  const { t } = useTranslation();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/agents')
      .then((res) => setAgents(res.data))
      .catch((err) => console.error('Failed to load agents', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <Title>{t('agents.title')}</Title>

      {loading ? (
        <Skeleton $height="200px" />
      ) : (
        <Table>
          <caption style={{ display: 'none' }}>{t('agents.title')}</caption>
          <Thead>
            <Tr>
              <Th scope="col">{t('agents.name')}</Th>
              <Th scope="col">{t('agents.region')}</Th>
              <Th scope="col">{t('agents.phone')}</Th>
              <Th scope="col">{t('agents.status')}</Th>
            </Tr>
          </Thead>
          <tbody>
            {agents.map((agent) => (
              <Tr key={agent.id}>
                <Td>{agent.name}</Td>
                <Td>{agent.region || '—'}</Td>
                <Td>{agent.phone}</Td>
                <Td>
                  <Badge tone={agent.active ? 'success' : 'neutral'}>
                    {agent.active ? t('agents.active') : t('agents.inactive')}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </AdminLayout>
  );
}
