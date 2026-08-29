import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  Camera, Video, Radio, MapPin, Phone, Calendar, User, ArrowLeft,
  CheckCircle2, Clock, Film, AlertCircle, ExternalLink, FileText, Crosshair,
} from 'lucide-react';
import { Card, Badge, Button, Skeleton, ParcelMap } from '@earthglobal/design-system';
import api from '../../services/api';
import { useRoleLayout } from '../../hooks/useRoleLayout';
import { STATUS_LABELS, VISIT_TYPE_LABELS } from '../../lib/labels';

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

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.text};
  margin: ${({ theme }) => theme.spacing[6]} 0 ${({ theme }) => theme.spacing[3]} 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const MediaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
`;

const MediaItem = styled(Card)`
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s ease;
  &:hover { transform: translateY(-2px); }
`;

const MediaThumb = styled.div`
  width: 100%;
  aspect-ratio: 4/3;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.03);
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
`;

const MediaInfo = styled.div`
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const MediaName = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MediaDate = styled.div`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.textMuted};
  flex-shrink: 0;
`;

const EmptyMedia = styled(Card)`
  text-align: center;
  padding: 2rem;
  color: ${({ theme }) => theme.colors.textMuted};
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

const fmtDateTime = (d) => d
  ? new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

export default function VisitDetailOwner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { Layout, routePrefix } = useRoleLayout();
  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/visit-requests/${id}/detail`)
      .then((res) => setVisit(res.data))
      .catch((err) => {
        setError(err.response?.data?.error || 'Failed to load visit');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <Skeleton $height="2rem" $width="50%" style={{ marginBottom: 24 }} />
        <Skeleton $height="200px" />
      </Layout>
    );
  }

  if (error || !visit) {
    return (
      <Layout>
        <BackBtn onClick={() => navigate(`${routePrefix}/visits`)}>
          <ArrowLeft size={16} /> Back to visits
        </BackBtn>
        <Card style={{ textAlign: 'center', padding: '2rem', color: '#f87171' }}>
          <AlertCircle size={32} style={{ marginBottom: 8 }} />
          {error || 'Visit not found'}
        </Card>
      </Layout>
    );
  }

  const Icon = TYPE_ICON[visit.type] || Camera;
  const colors = TYPE_COLORS[visit.type] || TYPE_COLORS.photo;
  const media = visit.media || [];

  return (
    <Layout>
      <BackBtn onClick={() => navigate(`${routePrefix}/visits`)}>
        <ArrowLeft size={16} /> Back to visits
      </BackBtn>

      <Header>
        <TypeIcon style={{ background: colors.bg, color: colors.color }}>
          <Icon size={28} />
        </TypeIcon>
        <HeaderInfo>
          <Title>{VISIT_TYPE_LABELS[visit.type]} Visit — {visit.parcel_name}</Title>
          <Badge tone={
            visit.status === 'completed' ? 'success' :
            visit.status === 'in_progress' ? 'primary' :
            visit.status === 'cancelled' ? 'neutral' : 'warning'
          }>
            {STATUS_LABELS[visit.status]}
          </Badge>
        </HeaderInfo>
      </Header>

      {/* Visit info grid */}
      <InfoGrid>
        <InfoCard>
          <InfoIcon><Calendar size={18} /></InfoIcon>
          <div>
            <InfoLabel>Requested</InfoLabel>
            <InfoValue>{fmtDate(visit.requested_at)}</InfoValue>
          </div>
        </InfoCard>
        {visit.scheduled_at && (
          <InfoCard>
            <InfoIcon><Clock size={18} /></InfoIcon>
            <div>
              <InfoLabel>Scheduled</InfoLabel>
              <InfoValue>{fmtDate(visit.scheduled_at)}</InfoValue>
            </div>
          </InfoCard>
        )}
        {visit.completed_at && (
          <InfoCard>
            <InfoIcon><CheckCircle2 size={18} /></InfoIcon>
            <div>
              <InfoLabel>Completed</InfoLabel>
              <InfoValue>{fmtDate(visit.completed_at)}</InfoValue>
            </div>
          </InfoCard>
        )}
        {visit.region && (
          <InfoCard>
            <InfoIcon><MapPin size={18} /></InfoIcon>
            <div>
              <InfoLabel>Region</InfoLabel>
              <InfoValue>{visit.region}</InfoValue>
            </div>
          </InfoCard>
        )}
        {visit.agent_name && (
          <InfoCard>
            <InfoIcon><User size={18} /></InfoIcon>
            <div>
              <InfoLabel>Assigned Agent</InfoLabel>
              <InfoValue>{visit.agent_name}</InfoValue>
            </div>
          </InfoCard>
        )}
        {visit.agent_phone && (
          <InfoCard>
            <InfoIcon><Phone size={18} /></InfoIcon>
            <div>
              <InfoLabel>Agent Phone</InfoLabel>
              <InfoValue>{visit.agent_phone}</InfoValue>
            </div>
          </InfoCard>
        )}
      </InfoGrid>

      {/* Parcel boundary map */}
      {visit.boundary?.coordinates?.[0] && (
        <>
          <SectionTitle><MapPin size={20} /> Parcel Boundary</SectionTitle>
          <div style={{ marginBottom: 24 }}>
            <ParcelMap
              path={visit.boundary.coordinates[0].map(([lng, lat]) => ({ lat, lng }))}
              status={visit.status === 'completed' ? 'active' : 'alert'}
              googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
              height="350px"
            />
          </div>
        </>
      )}

      {/* Agent field notes */}
      {visit.agent_notes && (
        <>
          <SectionTitle><FileText size={20} /> Agent Field Notes</SectionTitle>
          <Card style={{ padding: 16, marginBottom: 24, whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: 1.6 }}>
            {visit.agent_notes}
          </Card>
        </>
      )}

      {/* Survey status */}
      {visit.survey_session_id && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, color: '#4ade80', fontSize: '0.85rem', marginBottom: 24 }}>
          <Crosshair size={16} /> Agent completed a GPS boundary survey during this visit
        </div>
      )}

      {/* Media gallery */}
      <SectionTitle>
        <Film size={20} /> Field Report ({media.length} {media.length === 1 ? 'file' : 'files'})
      </SectionTitle>

      {media.length === 0 ? (
        <EmptyMedia>
          {visit.status === 'completed'
            ? 'No media was uploaded for this visit.'
            : 'The agent has not uploaded any photos or videos yet. Check back once the visit is completed.'}
        </EmptyMedia>
      ) : (
        <MediaGrid>
          {media.map((m, i) => {
            const MIcon = m.type === 'video' ? Video : Camera;
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <MediaItem as="a" href={m.url} target="_blank" rel="noopener noreferrer">
                  <MediaThumb>
                    {m.type === 'video' ? (
                      <Video size={40} style={{ color: '#c084fc', opacity: 0.5 }} />
                    ) : (
                      <Camera size={40} style={{ color: '#3ba7ff', opacity: 0.5 }} />
                    )}
                  </MediaThumb>
                  <MediaInfo>
                    <MediaName>{m.type === 'video' ? 'Video' : 'Photo'} #{i + 1}</MediaName>
                    <MediaDate>{fmtDateTime(m.uploaded_at)}</MediaDate>
                  </MediaInfo>
                </MediaItem>
              </motion.div>
            );
          })}
        </MediaGrid>
      )}

      {/* Actions */}
      <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Button variant="secondary" onClick={() => navigate(`${routePrefix}/parcels/${visit.parcel_id}`)}>
          <MapPin size={16} /> View Parcel
        </Button>
        {visit.status === 'completed' && (
          <Button variant="ghost" onClick={() => navigate(`${routePrefix}/visits`)}>
            <ArrowLeft size={16} /> Back to All Visits
          </Button>
        )}
      </div>
    </Layout>
  );
}
