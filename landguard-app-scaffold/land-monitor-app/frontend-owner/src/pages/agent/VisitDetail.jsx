import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Upload, CheckCircle2, Camera, Video, Radio, MapPin, Phone,
  Calendar, User, ArrowLeft, Film, Clock, Loader2, Navigation,
  Crosshair, Square, Save, MessageSquare, FileText, Satellite,
  AlertCircle, ExternalLink,
} from 'lucide-react';
import { Card, Badge, Button, Select, Skeleton, ParcelMap } from '@earthglobal/design-system';
import api from '../../services/api';
import AgentLayout from '../../components/AgentLayout';

// ── Styled components ──
const BackBtn = styled.button`
  display: flex; align-items: center; gap: 6px;
  background: none; border: none;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer; font-size: 0.875rem;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  transition: color 0.2s;
  &:hover { color: ${({ theme }) => theme.colors.text}; }
`;

const Header = styled.div`
  display: flex; align-items: center; gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]}; flex-wrap: wrap;
`;

const TypeIcon = styled.div`
  display: flex; align-items: center; justify-content: center;
  width: 56px; height: 56px; border-radius: 14px; flex-shrink: 0;
`;

const HeaderInfo = styled.div`display: flex; flex-direction: column; gap: 4px;`;
const Title = styled.h1`font-size: ${({ theme }) => theme.fontSizes['2xl']}; color: ${({ theme }) => theme.colors.text}; margin: 0;`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg}; color: ${({ theme }) => theme.colors.text};
  margin: ${({ theme }) => theme.spacing[6]} 0 ${({ theme }) => theme.spacing[3]} 0;
  display: flex; align-items: center; gap: 8px;
`;

const InfoGrid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]}; margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const InfoCard = styled(Card)`
  display: flex; align-items: center; gap: 12px;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
`;

const InfoIcon = styled.div`
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255,255,255,0.05); flex-shrink: 0;
`;

const InfoLabel = styled.div`font-size: 0.7rem; color: ${({ theme }) => theme.colors.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;`;
const InfoValue = styled.div`font-size: 0.9rem; color: ${({ theme }) => theme.colors.text}; font-weight: 500;`;

const ContactRow = styled.div`
  display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const ContactBtn = styled.a`
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  background: ${({ $primary, theme }) => $primary ? 'rgba(22,119,255,0.1)' : 'transparent'};
  color: ${({ $primary }) => $primary ? '#3ba7ff' : ({ theme }) => theme.colors.textMuted};
  text-decoration: none; font-size: 0.85rem; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
  &:hover { border-color: ${({ theme }) => theme.colors.primary}; transform: translateY(-1px); }
`;

const StatusCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const StatusLabel = styled.label`display: block; margin-bottom: 8px; font-size: 0.875rem; color: ${({ theme }) => theme.colors.textMuted};`;

const UploadZone = styled.div`
  border: 2px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[8]}; text-align: center;
  color: ${({ theme }) => theme.colors.textMuted}; cursor: pointer;
  transition: all 0.2s ease;
  &:hover { border-color: ${({ theme }) => theme.colors.primary}; background: rgba(22,119,255,0.03); }
`;

const UploadedList = styled.div`margin-top: ${({ theme }) => theme.spacing[4]}; display: flex; flex-direction: column; gap: 8px;`;
const UploadedItem = styled.div`
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; background: rgba(34,197,94,0.08);
  border: 1px solid rgba(34,197,94,0.2); border-radius: 10px;
  color: #4ade80; font-size: 0.875rem;
`;

const ActionRow = styled.div`display: flex; gap: 12px; margin-top: ${({ theme }) => theme.spacing[6]}; flex-wrap: wrap;`;

// GPS Survey styles
const SurveyCard = styled(Card)`padding: ${({ theme }) => theme.spacing[4]}; margin-bottom: ${({ theme }) => theme.spacing[4]};`;

const GPSStatus = styled.div`
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-radius: 10px;
  background: ${({ $active }) => $active ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)'};
  border: 1px solid ${({ $active }) => $active ? 'rgba(34,197,94,0.3)' : ({ theme }) => theme.colors.borderDark};
  margin-bottom: 12px; font-size: 0.85rem;
`;

const GPSDot = styled.div`
  width: 10px; height: 10px; border-radius: 50%;
  background: ${({ $active }) => $active ? '#4ade80' : '#666'};
  animation: ${({ $active }) => $active ? 'pulse 1.5s infinite' : 'none'};
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
`;

const CoordsList = styled.div`
  max-height: 150px; overflow-y: auto;
  padding: 12px; background: rgba(255,255,255,0.03);
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: 10px; margin-bottom: 12px;
  font-family: monospace; font-size: 0.75rem; color: ${({ theme }) => theme.colors.textMuted};
`;

const NotesTextarea = styled.textarea`
  width: 100%; min-height: 120px;
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.875rem; font-family: inherit;
  outline: none; resize: vertical;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const SaveBar = styled.div`
  display: flex; align-items: center; gap: 8px; margin-top: 8px;
  font-size: 0.8rem; color: ${({ theme }) => theme.colors.textMuted};
`;

const MapWrapper = styled.div`margin-bottom: ${({ theme }) => theme.spacing[6]};`;

// ── Constants ──
const TYPE_ICON = { photo: Camera, video: Video, live: Radio };
const TYPE_COLORS = {
  photo: { bg: 'rgba(22,119,255,0.12)', color: '#3ba7ff' },
  video: { bg: 'rgba(168,85,247,0.12)', color: '#c084fc' },
  live: { bg: 'rgba(239,68,68,0.12)', color: '#f87171' },
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function VisitDetail() {
  const { t } = useTranslation();
  const { t: tCommon } = useTranslation('common');
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [existingMedia, setExistingMedia] = useState([]);
  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const fileInputRef = useRef(null);

  // GPS survey state
  const [surveyMode, setSurveyMode] = useState(false);
  const [gpsPoints, setGpsPoints] = useState([]);
  const [gpsWatching, setGpsWatching] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [surveySaving, setSurveySaving] = useState(false);
  const [surveyError, setSurveyError] = useState('');
  const gpsWatchRef = useRef(null);

  useEffect(() => {
    api.get(`/visit-requests/${id}/detail`)
      .then((res) => {
        setRequest(res.data);
        setExistingMedia(res.data.media || []);
        setNotes(res.data.agent_notes || '');
      })
      .catch((err) => console.error('Failed to load visit request', err))
      .finally(() => setLoading(false));
  }, [id]);

  // Cleanup GPS watch on unmount
  useEffect(() => {
    return () => {
      if (gpsWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
      }
    };
  }, []);

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
      setExistingMedia((prev) => [...prev, ...files.map((f) => ({ name: f.name, type: f.type.startsWith('video') ? 'video' : 'photo', uploaded_at: new Date().toISOString() }))]);
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

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await api.patch(`/visit-requests/${id}`, { agent_notes: notes });
      setNotesDirty(false);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save notes', err);
    } finally {
      setSavingNotes(false);
    }
  };

  // ── GPS Survey ──
  const startGPS = () => {
    if (!navigator.geolocation) { setSurveyError('Geolocation not supported by this browser'); return; }
    setSurveyMode(true);
    setGpsWatching(true);
    setGpsPoints([]);
    setSurveyError('');
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsAccuracy(pos.coords.accuracy);
        setGpsPoints((prev) => [...prev, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          captured_at: new Date().toISOString(),
        }]);
      },
      (err) => { setSurveyError(`GPS error: ${err.message}`); setGpsWatching(false); },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
  };

  const stopGPS = () => {
    if (gpsWatchRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
    }
    setGpsWatching(false);
  };

  const saveSurvey = async () => {
    if (gpsPoints.length < 3) { setSurveyError('Need at least 3 GPS points to form a boundary'); return; }
    setSurveySaving(true);
    setSurveyError('');
    try {
      // Start a survey session
      const sessionRes = await api.post('/survey-sessions', { method: 'live_gps' });
      const sessionId = sessionRes.data.id;
      // Sync points
      await api.post(`/survey-sessions/${sessionId}/sync`, { points: gpsPoints });
      // Link survey session to the visit request
      await api.patch(`/visit-requests/${id}`, { survey_session_id: sessionId });
      setRequest((prev) => ({ ...prev, survey_session_id: sessionId }));
      stopGPS();
      setSurveyMode(false);
    } catch (err) {
      setSurveyError(err.response?.data?.error || 'Failed to save survey');
    } finally {
      setSurveySaving(false);
    }
  };

  // ── Helpers ──
  const getParcelPath = () => {
    if (!request?.boundary?.coordinates?.[0]) return [];
    return request.boundary.coordinates[0].map(([lng, lat]) => ({ lat, lng }));
  };

  const getDirectionsUrl = () => {
    const path = getParcelPath();
    if (path.length === 0) return null;
    const center = path[0];
    return `https://www.google.com/maps/dir/?api=1&destination=${center.lat},${center.lng}`;
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
  const parcelPath = getParcelPath();
  const directionsUrl = getDirectionsUrl();
  const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

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
          <div><InfoLabel>Requested</InfoLabel><InfoValue>{fmtDate(request.requested_at)}</InfoValue></div>
        </InfoCard>
        {request.scheduled_at && (
          <InfoCard>
            <InfoIcon><Clock size={18} /></InfoIcon>
            <div><InfoLabel>Scheduled</InfoLabel><InfoValue>{fmtDate(request.scheduled_at)}</InfoValue></div>
          </InfoCard>
        )}
        {request.completed_at && (
          <InfoCard>
            <InfoIcon><CheckCircle2 size={18} /></InfoIcon>
            <div><InfoLabel>Completed</InfoLabel><InfoValue>{fmtDate(request.completed_at)}</InfoValue></div>
          </InfoCard>
        )}
        {request.parcel_name && (
          <InfoCard>
            <InfoIcon><MapPin size={18} /></InfoIcon>
            <div><InfoLabel>Parcel</InfoLabel><InfoValue>{request.parcel_name}</InfoValue></div>
          </InfoCard>
        )}
        {request.region && (
          <InfoCard>
            <InfoIcon><MapPin size={18} /></InfoIcon>
            <div><InfoLabel>Region</InfoLabel><InfoValue>{request.region}</InfoValue></div>
          </InfoCard>
        )}
        {request.area_sqm && (
          <InfoCard>
            <InfoIcon><Satellite size={18} /></InfoIcon>
            <div><InfoLabel>Area</InfoLabel><InfoValue>{(request.area_sqm / 10000).toFixed(2)} ha</InfoValue></div>
          </InfoCard>
        )}
      </InfoGrid>

      {/* Owner contact + directions */}
      <SectionTitle><User size={20} /> Owner Contact</SectionTitle>
      <ContactRow>
        {request.owner_phone && (
          <ContactBtn href={`tel:${request.owner_phone}`} $primary>
            <Phone size={16} /> Call {request.owner_name || 'Owner'}
          </ContactBtn>
        )}
        {request.owner_phone && (
          <ContactBtn href={`sms:${request.owner_phone}`}>
            <MessageSquare size={16} /> SMS
          </ContactBtn>
        )}
        {directionsUrl && (
          <ContactBtn href={directionsUrl} target="_blank" rel="noopener noreferrer">
            <Navigation size={16} /> Directions to Parcel
          </ContactBtn>
        )}
      </ContactRow>

      {/* Parcel boundary map */}
      {parcelPath.length > 0 && (
        <>
          <SectionTitle><MapPin size={20} /> Parcel Boundary</SectionTitle>
          <MapWrapper>
            <ParcelMap
              path={parcelPath}
              status={request.status === 'completed' ? 'active' : 'alert'}
              googleMapsApiKey={googleMapsKey}
              height="400px"
            />
          </MapWrapper>
        </>
      )}

      {/* GPS Survey tool */}
      <SectionTitle><Crosshair size={20} /> GPS Boundary Survey</SectionTitle>
      <SurveyCard>
        {request.survey_session_id && !surveyMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4ade80', fontSize: '0.85rem', marginBottom: 12 }}>
            <CheckCircle2 size={16} /> Survey completed and linked to this visit
          </div>
        )}

        {!surveyMode ? (
          <div>
            <p style={{ color: ({ theme }) => theme.colors.textMuted, fontSize: '0.85rem', margin: '0 0 12px 0' }}>
              Walk the parcel perimeter and capture GPS points to verify or update the boundary.
              {request.survey_session_id ? ' You can re-survey if needed.' : ''}
            </p>
            <Button variant="primary" onClick={startGPS}>
              <Crosshair size={16} /> Start GPS Survey
            </Button>
          </div>
        ) : (
          <div>
            <GPSStatus $active={gpsWatching}>
              <GPSDot $active={gpsWatching} />
              {gpsWatching ? (
                <>Capturing GPS points… {gpsAccuracy && `(±${gpsAccuracy.toFixed(0)}m accuracy)`}</>
              ) : (
                <>GPS stopped — {gpsPoints.length} points captured</>
              )}
            </GPSStatus>

            {surveyError && (
              <div style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} /> {surveyError}
              </div>
            )}

            {gpsPoints.length > 0 && (
              <CoordsList>
                {gpsPoints.map((p, i) => (
                  <div key={i}>#{i + 1}: {p.lat.toFixed(6)}, {p.lng.toFixed(6)} {p.accuracy && `(±${p.accuracy.toFixed(0)}m)`}</div>
                ))}
              </CoordsList>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {gpsWatching ? (
                <Button variant="secondary" onClick={stopGPS}>
                  <Square size={16} /> Stop Capturing
                </Button>
              ) : (
                <Button variant="secondary" onClick={startGPS}>
                  <Crosshair size={16} /> Resume
                </Button>
              )}
              <Button
                variant="primary"
                onClick={saveSurvey}
                disabled={gpsPoints.length < 3 || surveySaving}
              >
                {surveySaving ? (
                  <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                ) : (
                  <><Save size={16} /> Save Survey ({gpsPoints.length} pts)</>
                )}
              </Button>
              <Button variant="ghost" onClick={() => { stopGPS(); setSurveyMode(false); setGpsPoints([]); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </SurveyCard>

      {/* Status update */}
      <SectionTitle><CheckCircle2 size={20} /> Visit Status</SectionTitle>
      <StatusCard>
        <StatusLabel>{t('visitDetail.updateStatus')}</StatusLabel>
        <Select
          value={request.status}
          onValueChange={handleStatusChange}
          options={[
            { value: 'in_progress', label: tCommon('status.in_progress') },
            { value: 'completed', label: tCommon('status.completed') },
          ]}
          placeholder={t('visitDetail.updateStatus')}
          id="visit-status"
        />
      </StatusCard>

      {/* Field notes */}
      <SectionTitle><FileText size={20} /> Field Notes</SectionTitle>
      <SurveyCard>
        <NotesTextarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setNotesDirty(true); setNotesSaved(false); }}
          placeholder="Record observations: boundary condition, encroachment, vegetation, access routes, owner concerns…"
        />
        <SaveBar>
          <Button
            variant="secondary"
            onClick={handleSaveNotes}
            disabled={!notesDirty || savingNotes}
            style={{ padding: '6px 16px' }}
          >
            {savingNotes ? (
              <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
            ) : notesSaved ? (
              <><CheckCircle2 size={14} /> Saved!</>
            ) : (
              <><Save size={14} /> Save Notes</>
            )}
          </Button>
          {!notesDirty && notes && <span>Last saved</span>}
        </SaveBar>
      </SurveyCard>

      {/* Media upload */}
      <SectionTitle><Film size={20} /> Photos & Videos</SectionTitle>
      <UploadZone
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
        role="button" tabIndex={0}
        aria-label={uploading ? t('visitDetail.uploading') : t('visitDetail.uploadPrompt')}
      >
        <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple hidden onChange={handleFileSelect} />
        {uploading ? (
          <><Loader2 size={32} style={{ margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} /><p>{t('visitDetail.uploading')}</p></>
        ) : (
          <><Upload size={32} style={{ margin: '0 auto 12px' }} /><p>{t('visitDetail.uploadPrompt')}</p></>
        )}
      </UploadZone>

      {existingMedia.length > 0 && (
        <UploadedList>
          {existingMedia.map((m, i) => (
            <motion.div key={m.id || i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
              <UploadedItem>
                {m.type === 'video' ? <Video size={16} /> : <Camera size={16} />}
                {m.name || `${m.type} #${i + 1}`}
                <CheckCircle2 size={14} style={{ marginLeft: 'auto' }} />
              </UploadedItem>
            </motion.div>
          ))}
        </UploadedList>
      )}

      {/* Action buttons */}
      <ActionRow>
        <Button variant="primary" onClick={() => handleStatusChange('completed')} disabled={request.status === 'completed'}>
          <CheckCircle2 size={16} /> {t('visitDetail.markCompleted')}
        </Button>
        {request.status !== 'completed' && (
          <Button variant="ghost" onClick={() => handleStatusChange('in_progress')} disabled={request.status === 'in_progress'}>
            <Loader2 size={16} /> Mark In Progress
          </Button>
        )}
      </ActionRow>
    </AgentLayout>
  );
}
