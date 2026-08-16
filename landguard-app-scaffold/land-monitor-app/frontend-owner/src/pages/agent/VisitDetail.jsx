import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Upload, CheckCircle2 } from 'lucide-react';
import { Card, Badge, Button, Select, Skeleton } from '@earthglobal/design-system';
import api from '../../services/api';
import AgentLayout from '../../components/AgentLayout';

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const UploadZone = styled.div`
  margin-top: ${({ theme }) => theme.spacing[6]};
  border: 2px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[10]};
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  transition: border-color ${({ theme }) => theme.durations.fast} ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

export default function VisitDetail() {
  const { t } = useTranslation();
  const { t: tCommon } = useTranslation('common');
  const { id } = useParams();
  const [request, setRequest] = useState(null);

  const statusOptions = [
    { value: 'in_progress', label: tCommon('status.in_progress') },
    { value: 'completed', label: tCommon('status.completed') },
  ];
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api
      .get(`/visit-requests/${id}`)
      .then((res) => setRequest(res.data))
      .catch((err) => console.error('Failed to load visit request', err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      // TODO: real implementation should POST multipart/form-data to
      // /visit-requests/:id/media (S3/R2 upload is stubbed server-side, see README).
      for (const file of files) {
        await api.post(`/visit-requests/${id}/media`, { filename: file.name });
      }
      setUploaded((prev) => [...prev, ...files.map((f) => f.name)]);
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  const handleStatusChange = async (status) => {
    try {
      await api.patch(`/visit-requests/${id}`, { status });
      setRequest((prev) => ({ ...prev, status }));
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  if (loading) {
    return (
      <AgentLayout>
        <Skeleton $height="2rem" $width="50%" style={{ marginBottom: 24 }} />
        <Skeleton $height="200px" />
      </AgentLayout>
    );
  }

  if (!request) {
    return (
      <AgentLayout>
        <Card>{t('visitDetail.notFound')}</Card>
      </AgentLayout>
    );
  }

  return (
    <AgentLayout>
      <Title>{t('visitDetail.visitLabel', { type: tCommon(`visitType.${request.type}`) })}</Title>
      <Badge tone="primary">{tCommon(`status.${request.status}`)}</Badge>

      <Card style={{ marginTop: 24, maxWidth: 360 }}>
        <label htmlFor="visit-status" style={{ display: 'block', marginBottom: 8, fontSize: '0.875rem' }}>
          {t('visitDetail.updateStatus')}
        </label>
        <Select
          value={request.status}
          onValueChange={handleStatusChange}
          options={statusOptions}
          placeholder={t('visitDetail.updateStatus')}
          id="visit-status"
        />
      </Card>

      <UploadZone
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          // role="button" divs don't get native Enter/Space activation for free —
          // without this, keyboard-only users can't open the file picker.
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={uploading ? t('visitDetail.uploading') : t('visitDetail.uploadPrompt')}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={handleFileSelect}
        />
        <Upload size={32} style={{ margin: '0 auto 12px' }} aria-hidden="true" />
        <p>{uploading ? t('visitDetail.uploading') : t('visitDetail.uploadPrompt')}</p>
      </UploadZone>

      {uploaded.length > 0 && (
        <ul style={{ marginTop: 16 }}>
          {uploaded.map((name) => (
            <li key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4ade80' }}>
              <CheckCircle2 size={16} aria-hidden="true" /> {name}
            </li>
          ))}
        </ul>
      )}

      <Button
        variant="primary"
        style={{ marginTop: 24 }}
        onClick={() => handleStatusChange('completed')}
        disabled={request.status === 'completed'}
      >
        {t('visitDetail.markCompleted')}
      </Button>
    </AgentLayout>
  );
}
