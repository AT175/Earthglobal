import { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Navigation, FileUp } from 'lucide-react';
import { Card, Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@earthglobal/design-system';
import AdminLayout from '../../components/AdminLayout';

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const DropZone = styled.div`
  border: 2px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[10]};
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
`;

// Admin tool to onboard a new parcel. Two flows per the architecture doc's
// Surveying Module (3.6): live GPS survey, or file import (GeoJSON/KML/Shapefile/GPX).
export default function ParcelOnboarding() {
  const { t } = useTranslation();
  const [watching, setWatching] = useState(false);

  return (
    <AdminLayout>
      <Title>{t('onboarding.title')}</Title>

      <Tabs defaultValue="live">
        <TabsList>
          <TabsTrigger value="live">{t('onboarding.liveTab')}</TabsTrigger>
          <TabsTrigger value="import">{t('onboarding.importTab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="live">
          <Card style={{ maxWidth: 480 }}>
            <p style={{ marginBottom: 16 }}>{t('onboarding.liveDescription')}</p>
            <Button
              variant={watching ? 'danger' : 'primary'}
              onClick={() => setWatching((w) => !w)}
            >
              <Navigation size={16} aria-hidden="true" />
              {watching ? t('onboarding.stopSurvey') : t('onboarding.startSurvey')}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="import">
          <Card style={{ maxWidth: 480 }}>
            <DropZone>
              <FileUp size={32} style={{ margin: '0 auto 12px' }} aria-hidden="true" />
              <p>{t('onboarding.dropPrompt')}</p>
              <p style={{ fontSize: '0.8em', marginTop: 8 }}>{t('onboarding.dropNote')}</p>
            </DropZone>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
