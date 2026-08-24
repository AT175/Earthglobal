import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Ruler, ArrowLeftRight, Camera, Video, Radio, ChevronRight, Film, ClipboardList, FileText, Building2, Maximize, TrendingUp } from 'lucide-react';
import { Card, Badge, Button, Skeleton, ParcelMap } from '@earthglobal/design-system';
import api from '../services/api';
import OwnerLayout from '../components/OwnerLayout';

const Header = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  color: ${({ theme }) => theme.colors.text};
`;

const StatsRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-bottom: ${({ theme }) => theme.spacing[6]};

  span {
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing[1]};
  }
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.text};
  margin: ${({ theme }) => theme.spacing[8]} 0 ${({ theme }) => theme.spacing[4]};
`;

const AlertList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const AlertRow = styled(Card)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[4]};
`;

const AlertMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text};
`;

const BuildingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
`;

const BuildingCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[4]};
`;

const BuildingTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  margin-bottom: 12px;
  color: ${({ theme }) => theme.colors.text};
`;

const BuildingStat = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  padding: 4px 0;
  color: ${({ theme }) => theme.colors.textMuted};

  strong {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const CoverageBar = styled.div`
  margin-top: 12px;
  height: 8px;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 4px;
  overflow: hidden;
`;

const CoverageFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #3ba7ff, #5ce1ff);
  border-radius: 4px;
  transition: width 0.5s ease;
`;

const SummaryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const SummaryStat = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};

  strong {
    font-size: 1.1rem;
    color: ${({ theme }) => theme.colors.text};
  }

  span {
    font-size: 0.8rem;
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

export default function ParcelDetail() {
  const { t } = useTranslation();
  const { t: tCommon } = useTranslation('common');
  const { id } = useParams();
  const navigate = useNavigate();
  const [parcel, setParcel] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [visits, setVisits] = useState([]);
  const [buildingsData, setBuildingsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingBuildings, setLoadingBuildings] = useState(false);

  useEffect(() => {
    Promise.all([api.get(`/parcels/${id}`), api.get(`/parcels/${id}/alerts`), api.get('/visit-requests')])
      .then(([parcelRes, alertsRes, visitsRes]) => {
        setParcel(parcelRes.data);
        setAlerts(alertsRes.data);
        setVisits((visitsRes.data || []).filter((v) => v.parcel_id === id));
      })
      .catch((err) => console.error('Failed to load parcel', err))
      .finally(() => setLoading(false));

    // Fetch building detection data
    setLoadingBuildings(true);
    api.get(`/parcels/${id}/buildings`)
      .then((res) => setBuildingsData(res.data))
      .catch(() => {})
      .finally(() => setLoadingBuildings(false));
  }, [id]);

  if (loading) {
    return (
      <OwnerLayout>
        <Skeleton $height="2rem" $width="40%" style={{ marginBottom: 24 }} />
        <Skeleton $height="500px" />
      </OwnerLayout>
    );
  }

  if (!parcel) {
    return (
      <OwnerLayout>
        <Card>{t('parcelDetail.notFound')}</Card>
      </OwnerLayout>
    );
  }

  const path = parcel.boundary.coordinates[0].map(([lng, lat]) => ({ lat, lng }));
  const hasUnverifiedAlert = alerts.some((a) => !a.verified);

  return (
    <OwnerLayout>
      <Header>
        <Title>{parcel.name}</Title>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => navigate(`/parcels/${id}/request-visit`)}>
            {t('parcelDetail.requestVisit')}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/sell')}>
            List for Sale
          </Button>
          <Button variant="secondary" onClick={() => navigate('/site-plans')}>
            <FileText size={16} style={{ display: 'inline' }} /> Site Plans
          </Button>
        </div>
      </Header>

      <StatsRow>
        <span>
          <Ruler size={16} aria-hidden="true" />
          {(Number(parcel.area_sqm) / 10000).toFixed(2)} ha
        </span>
        <span>
          <ArrowLeftRight size={16} aria-hidden="true" />
          {t('parcelDetail.perimeter', { value: Number(parcel.perimeter_m)?.toFixed(0) })}
        </span>
      </StatsRow>

      <ParcelMap
        path={path}
        status={hasUnverifiedAlert ? 'alert' : 'active'}
        googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
      />

      {/* ── Detected Structures ── */}
      <SectionTitle>
        <Building2 size={20} style={{ display: 'inline' }} /> Detected Structures
      </SectionTitle>
      {loadingBuildings ? (
        <Card>Loading building data...</Card>
      ) : !buildingsData || buildingsData.buildings.length === 0 ? (
        <Card>No structures detected on this parcel yet. Building detection is run periodically by the assembly.</Card>
      ) : (
        <>
          <SummaryRow>
            <SummaryStat>
              <Building2 size={20} color="#3ba7ff" />
              <strong>{buildingsData.summary.count}</strong>
              <span>structure{buildingsData.summary.count !== 1 ? 's' : ''}</span>
            </SummaryStat>
            <SummaryStat>
              <Maximize size={20} color="#5ce1ff" />
              <strong>{buildingsData.summary.totalBuildingArea.toLocaleString()} m²</strong>
              <span>total building area</span>
            </SummaryStat>
            <SummaryStat>
              <TrendingUp size={20} color="#fbbf24" />
              <strong>{buildingsData.summary.coveragePct}%</strong>
              <span>of parcel covered</span>
            </SummaryStat>
            {buildingsData.summary.tallestBuilding > 0 && (
              <SummaryStat>
                <Building2 size={20} color="#c084fc" />
                <strong>{buildingsData.summary.tallestBuilding}m</strong>
                <span>tallest (~{Math.round(buildingsData.summary.tallestBuilding / 3)} floors)</span>
              </SummaryStat>
            )}
            {buildingsData.summary.permitted > 0 && (
              <SummaryStat>
                <CheckCircle2 size={20} color="#22c55e" />
                <strong>{buildingsData.summary.permitted}</strong>
                <span>permitted</span>
              </SummaryStat>
            )}
            {buildingsData.summary.unpermitted > 0 && (
              <SummaryStat>
                <AlertTriangle size={20} color="#f87171" />
                <strong>{buildingsData.summary.unpermitted}</strong>
                <span>unpermitted</span>
              </SummaryStat>
            )}
          </SummaryRow>

          <CoverageBar>
            <CoverageFill style={{ width: `${Math.min(buildingsData.summary.coveragePct, 100)}%` }} />
          </CoverageBar>
          <div style={{ fontSize: '0.8rem', color: '#aab7d4', marginTop: 4, marginBottom: 16 }}>
            {buildingsData.summary.totalBuildingArea.toLocaleString()} m² built / {buildingsData.summary.parcelArea.toLocaleString()} m² total
          </div>

          <BuildingGrid>
            {buildingsData.buildings.map((b, i) => (
              <BuildingCard key={b.id}>
                <BuildingTitle>
                  <Building2 size={16} color="#3ba7ff" />
                  Structure #{i + 1}
                  {b.status === 'verified_permitted' && <Badge tone="success">Permitted</Badge>}
                  {b.status === 'verified_unpermitted' && <Badge tone="danger">Unpermitted</Badge>}
                  {b.status === 'unverified' && <Badge tone="warning">Unverified</Badge>}
                  {b.status === 'under_investigation' && <Badge tone="primary">Investigating</Badge>}
                </BuildingTitle>
                <BuildingStat>
                  <span>Area</span>
                  <strong>{Math.round(b.area_sqm).toLocaleString()} m²</strong>
                </BuildingStat>
                {b.estimated_height_m != null && (
                  <BuildingStat>
                    <span>Est. height</span>
                    <strong>{b.estimated_height_m}m {b.estimated_floors ? `(~${b.estimated_floors} floors)` : ''}</strong>
                  </BuildingStat>
                )}
                {b.height_confidence != null && (
                  <BuildingStat>
                    <span>Height confidence</span>
                    <strong>{(b.height_confidence * 100).toFixed(0)}%</strong>
                  </BuildingStat>
                )}
                <BuildingStat>
                  <span>Detected</span>
                  <strong>{new Date(b.detected_at).toLocaleDateString()}</strong>
                </BuildingStat>
                {b.first_seen_in_image && (
                  <BuildingStat>
                    <span>First seen</span>
                    <strong>{b.first_seen_in_image}</strong>
                  </BuildingStat>
                )}
                {b.in_protected_area && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, color: '#f87171', fontSize: '0.8rem' }}>
                    <AlertTriangle size={12} /> In protected area
                  </div>
                )}
                {b.notes && (
                  <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#aab7d4' }}>{b.notes}</div>
                )}
              </BuildingCard>
            ))}
          </BuildingGrid>
        </>
      )}

      <SectionTitle>{t('parcelDetail.alerts')}</SectionTitle>
      {alerts.length === 0 ? (
        <Card>{t('parcelDetail.noAlerts')}</Card>
      ) : (
        <AlertList>
          {alerts.map((alert) => (
            <AlertRow key={alert.id}>
              <AlertMeta>
                {alert.verified ? (
                  <CheckCircle2 size={20} color="#22c55e" aria-hidden="true" />
                ) : (
                  <AlertTriangle size={20} color="#f59e0b" aria-hidden="true" />
                )}
                <div>
                  <strong>{alert.alert_type}</strong>
                  <div style={{ fontSize: '0.85em', opacity: 0.7 }}>
                    {t('parcelDetail.detected', { date: new Date(alert.detected_at).toLocaleDateString() })}
                  </div>
                </div>
              </AlertMeta>
              <Badge tone={alert.verified ? 'success' : 'warning'}>
                {alert.verified ? tCommon('status.verified') : tCommon('status.unverified')}
              </Badge>
            </AlertRow>
          ))}
        </AlertList>
      )}

      {/* Visit history */}
      <SectionTitle>
        <ClipboardList size={20} style={{ display: 'inline' }} /> Visit History
      </SectionTitle>
      {visits.length === 0 ? (
        <Card>No visits requested for this parcel yet.</Card>
      ) : (
        <AlertList>
          {visits.map((v) => {
            const VIcon = v.type === 'video' ? Video : v.type === 'live' ? Radio : Camera;
            const tone = v.status === 'completed' ? 'success' : v.status === 'in_progress' ? 'primary' : v.status === 'cancelled' ? 'neutral' : 'warning';
            return (
              <AlertRow key={v.id} as={Link} to={`/visits/${v.id}`} style={{ textDecoration: 'none', cursor: 'pointer' }}>
                <AlertMeta>
                  <VIcon size={20} color="#3ba7ff" aria-hidden="true" />
                  <div>
                    <strong>{tCommon(`visitType.${v.type}`)}</strong>
                    <div style={{ fontSize: '0.85em', opacity: 0.7, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {new Date(v.requested_at).toLocaleDateString()}
                      {v.agent_name && <span>• {v.agent_name}</span>}
                      {parseInt(v.media_count, 10) > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Film size={11} /> {v.media_count}</span>}
                    </div>
                  </div>
                </AlertMeta>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge tone={tone}>{tCommon(`status.${v.status}`)}</Badge>
                  <ChevronRight size={16} style={{ opacity: 0.4 }} />
                </div>
              </AlertRow>
            );
          })}
        </AlertList>
      )}
    </OwnerLayout>
  );
}
