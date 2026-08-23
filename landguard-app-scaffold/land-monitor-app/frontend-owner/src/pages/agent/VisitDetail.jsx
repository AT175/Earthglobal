import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Upload, CheckCircle2, Camera, Video, Radio, MapPin, Phone,
  Calendar, User, ArrowLeft, Film, Clock, Loader2,
} from 'lucide-react';
import { Card, Badge, Button, Select, Skeleton } from '@earthglobal/design-system';
import api from '../../services/api';
import AgentLayout from '../../components/AgentLayout';

const BackBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  font-size: 0.875rem;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  transition: color 0.2s;

  &:hover { color: ${({ theme }) => theme.colors.text}; }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  flex-wrap: wrap;
`;

const TypeIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  flex-shrink: 0;
`;

const HeaderInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const InfoCard = styled(Card)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
`;

const InfoIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255,255,255,0.05);
  flex-shrink: 0;
`;

const InfoLabel = styled.div`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const InfoValue = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 500;
`;

const StatusCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const StatusLabel = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const UploadZone = styled.div`
  border: 2px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[8]};
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: rgba(22,119,255,0.03);
  }
`;

const UploadedList = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const UploadedItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(34,197,94,0.08);
  border: 1px solid rgba(34,197,94,0.2);
  border-radius: 10px;
  color: #4ade80;
  font-size: 0.875rem;
`;

const ActionRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: ${({ theme }) => theme.spacing[6]};
  flex-wrap: wrap;
`;

const TYPE_ICON = { photo: Camera, video: Video, live: Radio };
const TYPE_COLORS = {
  photo: { bg: 'rgba(22,119,255,0.12)', color: '#3ba7ff' },
  video: { bg: 'rgba(168,85,247,0.12)', color: '#c084fc' },
  live: { bg: 'rgba(239,68,68,0.12)', color: '#f87171' },
};

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  : '—';

export default function VisitDetail() {
  const { t } = useTranslation();
  const { t: tCommon } = useTranslation('common');
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [parcelInfo, setParcelInfo] = useState(null);
  const [ownerInfo, setOwnerInfo] = useState(null);
  const [media, setMedia] = useState([]);

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
      .then((res) => {
        setRequest(res.data);
        // Fetch parcel + owner info if available
        if (res.data.parcel_id) {
          api.get(`/parcels/${res.data.parcel_id}`).then((r) => setParcelInfo(r.data)).catch(() => {});
        }
        if (res.data.owner_id) {
          // Owner info might not have a dedicated endpoint — try to get from parcel
          // or skip gracefully
        }
      })
      .catch((err) => console.error('Failed to load visit request', err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        await api.post(`/visit-requests/${id}/media`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setUploaded((prev) => [...prev, ...files.map((f) => f.name)]);
      setMedia((prev) => [...prev, ...files.map((f) => ({ name: f.name, type: f.type.startsWith('video') ? 'video' : 'photo' }))]);
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

  const Icon = TYPE_ICON[request.type] || Camera;
  const colors = TYPE_COLORS[request.type] || TYPE_COLORS.photo;

  return (
    <AgentLayout>
      <BackBtn onClick={() => navigate('/agent')}>
        <ArrowLeft size={16} /> Back to visits
      </BackBtn>

      <Header>
        <TypeIcon style={{ background: colors.bg, color: colors.color }}>
          <Icon size={28} />
        </TypeIcon>
        <HeaderInfo>
          <Title>{t('visitDetail.visitLabel', { type: tCommon(`visitType.${request.type}`) })}</Title>
          <Badge tone="primary">{tCommon(`status.${request.status}`)}</Badge>
        </HeaderInfo>
      </Header>

      {/* Visit info grid */}
      <InfoGrid>
        <InfoCard>
          <InfoIcon><Calendar size={18} /></InfoIcon>
          <div>
            <InfoLabel>Requested</InfoLabel>
            <InfoValue>{fmtDate(request.requested_at)}</InfoValue>
          </div>
        </InfoCard>
        {request.scheduled_at && (
          <InfoCard>
            <InfoIcon><Clock size={18} /></InfoIcon>
            <div>
              <InfoLabel>Scheduled</InfoLabel>
              <InfoValue>{fmtDate(request.scheduled_at)}</InfoValue>
            </div>
          </InfoCard>
        )}
        {request.completed_at && (
          <InfoCard>
            <InfoIcon><CheckCircle2 size={18} /></InfoIcon>
            <div>
              <InfoLabel>Completed</InfoLabel>
              <InfoValue>{fmtDate(request.completed_at)}</InfoValue>
            </div>
          </InfoCard>
        )}
        {parcelInfo && (
          <>
            <InfoCard>
              <InfoIcon><MapPin size={18} /></InfoIcon>
              <div>
                <InfoLabel>Parcel</InfoLabel>
                <InfoValue>{parcelInfo.name || '—'}</InfoValue>
              </div>
            </InfoCard>
            {parcelInfo.region && (
              <InfoCard>
                <InfoIcon><MapPin size={18} /></InfoIcon>
                <div>
                  <InfoLabel>Region</InfoLabel>
                  <InfoValue>{parcelInfo.region}</InfoValue>
                </div>
              </InfoCard>
            )}
          </>
        )}
      </InfoGrid>

      {/* Status update */}
      <StatusCard>
        <StatusLabel>{t('visitDetail.updateStatus')}</StatusLabel>
        <Select
          value={request.status}
          onValueChange={handleStatusChange}
          options={statusOptions}
          placeholder={t('visitDetail.updateStatus')}
          id="visit-status"
        />
      </StatusCard>

      {/* Upload zone */}
      <UploadZone
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
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
        {uploading ? (
          <>
            <Loader2 size={32} style={{ margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <p>{t('visitDetail.uploading')}</p>
          </>
        ) : (
          <>
            <Upload size={32} style={{ margin: '0 auto 12px' }} aria-hidden="true" />
            <p>{t('visitDetail.uploadPrompt')}</p>
          </>
        )}
      </UploadZone>

      {/* Uploaded files */}
      {(uploaded.length > 0 || media.length > 0) && (
        <UploadedList>
          {media.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <UploadedItem>
                {m.type === 'video' ? <Video size={16} /> : <Camera size={16} />}
                {m.name}
                <CheckCircle2 size={14} style={{ marginLeft: 'auto' }} />
              </UploadedItem>
            </motion.div>
          ))}
        </UploadedList>
      )}

      {/* Action buttons */}
      <ActionRow>
        <Button
          variant="primary"
          onClick={() => handleStatusChange('completed')}
          disabled={request.status === 'completed'}
        >
          <CheckCircle2 size={16} /> {t('visitDetail.markCompleted')}
        </Button>
        {request.status !== 'completed' && (
          <Button
            variant="ghost"
            onClick={() => handleStatusChange('in_progress')}
            disabled={request.status === 'in_progress'}
          >
            <Loader2 size={16} /> Mark In Progress
          </Button>
        )}
      </ActionRow>
    </AgentLayout>
  );
}
