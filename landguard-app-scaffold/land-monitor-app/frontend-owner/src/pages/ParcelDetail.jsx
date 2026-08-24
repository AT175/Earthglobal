import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Ruler, ArrowLeftRight, Camera, Video, Radio, ChevronRight, Film, ClipboardList, FileText, Building2, Maximize, TrendingUp, Leaf, Satellite, Activity } from 'lucide-react';
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

const NdviGauge = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const NdviValue = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${({ $color }) => $color || '#3ba7ff'};
`;

const NdviLabel = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  margin-top: 4px;
  color: ${({ $color }) => $color || '#3ba7ff'};
`;

const NdviScale = styled.div`
  width: 100%;
  height: 12px;
  border-radius: 6px;
  margin-top: 16px;
  background: linear-gradient(90deg, #8b4513 0%, #d4a017 20%, #fbbf24 40%, #84cc16 60%, #22c55e 80%, #166534 100%);
  position: relative;
`;

const NdviMarker = styled.div`
  position: absolute;
  top: -4px;
  width: 4px;
  height: 20px;
  background: white;
  border-radius: 2px;
  box-shadow: 0 0 4px rgba(0,0,0,0.5);
  left: ${({ $pos }) => $pos}%;
  transform: translateX(-50%);
`;

const NdviInterpretation = styled.div`
  margin-top: 16px;
  padding: 16px;
  background: ${({ $bg }) => $bg || 'rgba(59,167,255,0.08)'};
  border-radius: ${({ theme }) => theme.radii.md};
  border-left: 3px solid ${({ $color }) => $color || '#3ba7ff'};
  font-size: 0.85rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text};
`;

const NdviHistory = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 80px;
  margin-top: 16px;
  padding: 8px 0;
`;

const NdviBar = styled.div`
  flex: 1;
  background: ${({ $color }) => $color || '#3ba7ff'};
  border-radius: 3px 3px 0 0;
  min-height: 4px;
  opacity: 0.85;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
`;

const NdviHistoryLabel = styled.div`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: center;
  margin-top: 2px;
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
  const [images, setImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [capturing, setCapturing] = useState(false);

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

    // Fetch satellite images + NDVI history
    setLoadingImages(true);
    api.get(`/parcels/${id}/images`)
      .then((res) => setImages(res.data || []))
      .catch(() => {})
      .finally(() => setLoadingImages(false));
  }, [id]);

  const captureSatellite = async () => {
    setCapturing(true);
    try {
      await api.get(`/parcels/${id}/satellite`);
      const res = await api.get(`/parcels/${id}/images`);
      setImages(res.data || []);
    } catch (err) {
      console.error('Failed to capture satellite image', err);
    } finally {
      setCapturing(false);
    }
  };

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

  // NDVI classification — interprets raw NDVI values for the owner
  const classifyNdvi = (ndvi) => {
    if (ndvi == null) return null;
    if (ndvi < -0.1) return {
      label: 'Water / Cloud',
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.08)',
      pos: 0,
      interpretation: 'This value indicates water bodies, flooded areas, or cloud cover. No vegetation is present in this area. If your parcel should contain land, this may indicate seasonal flooding or recent heavy rainfall.',
    };
    if (ndvi < 0.1) return {
      label: 'Bare Soil / Built-up',
      color: '#8b4513',
      bg: 'rgba(139,69,19,0.08)',
      pos: 15,
      interpretation: 'Very low vegetation cover. The parcel is mostly bare soil, rock, or built-up surfaces. This is common for undeveloped land, construction sites, or areas with active earthworks. Consider soil conservation measures if erosion is a concern.',
    };
    if (ndvi < 0.3) return {
      label: 'Sparse Vegetation',
      color: '#d4a017',
      bg: 'rgba(212,160,23,0.08)',
      pos: 30,
      interpretation: 'Low vegetation density. The parcel has minimal plant cover — likely grassland, sparse shrubs, or recently cleared land. Vegetation is stressed or young. If agricultural use is planned, consider soil improvement and planting.',
    };
    if (ndvi < 0.5) return {
      label: 'Moderate Vegetation',
      color: '#fbbf24',
      bg: 'rgba(251,191,36,0.08)',
      pos: 45,
      interpretation: 'Moderate vegetation health. The parcel has reasonable plant cover — typical of healthy grassland, young crops, or mixed shrubland. Vegetation is growing but not at peak density. Suitable for grazing or light agriculture.',
    };
    if (ndvi < 0.7) return {
      label: 'Healthy Vegetation',
      color: '#84cc16',
      bg: 'rgba(132,204,22,0.08)',
      pos: 65,
      interpretation: 'Good vegetation health. The parcel has dense, actively growing vegetation — typical of mature crops, healthy pasture, or dense shrubland. Photosynthetic activity is strong. The land is productive and well-suited for agriculture.',
    };
    return {
      label: 'Very Dense Vegetation',
      color: '#166534',
      bg: 'rgba(22,101,52,0.08)',
      pos: 85,
      interpretation: 'Excellent vegetation density. The parcel has very dense, vigorous plant cover — typical of forest, mature tree crops, or dense tropical vegetation. This indicates peak photosynthetic activity and a healthy ecosystem. High biodiversity value.',
    };
  };

  const latestImage = images.length > 0 ? images[0] : null;
  const ndviClass = latestImage?.ndvi_value != null ? classifyNdvi(Number(latestImage.ndvi_value)) : null;
  const ndviHistory = images
    .filter(img => img.ndvi_value != null)
    .slice(0, 12)
    .reverse();

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

      {/* ── Vegetation Health (NDVI) ── */}
      <SectionTitle>
        <Leaf size={20} style={{ display: 'inline' }} /> Vegetation Health (NDVI)
      </SectionTitle>
      {loadingImages ? (
        <Card>Loading vegetation data...</Card>
      ) : !latestImage || ndviClass == null ? (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span>No satellite imagery captured yet. Click below to capture a fresh Sentinel-2 image and compute NDVI for your parcel.</span>
            <Button onClick={captureSatellite} disabled={capturing}>
              {capturing ? 'Capturing...' : <><Satellite size={16} style={{ display: 'inline' }} /> Capture Satellite Image</>}
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, alignItems: 'start' }}>
            {/* NDVI Gauge */}
            <NdviGauge>
              <Leaf size={24} color={ndviClass.color} />
              <NdviValue $color={ndviClass.color}>{Number(latestImage.ndvi_value).toFixed(2)}</NdviValue>
              <NdviLabel $color={ndviClass.color}>{ndviClass.label}</NdviLabel>
              <NdviScale>
                <NdviMarker $pos={ndviClass.pos} />
              </NdviScale>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.65rem', color: '#aab7d4', marginTop: 4 }}>
                <span>-1.0</span>
                <span>0</span>
                <span>+1.0</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#aab7d4', marginTop: 8, textAlign: 'center' }}>
                Captured {new Date(latestImage.captured_at).toLocaleDateString()} via {latestImage.source}
              </div>
            </NdviGauge>

            {/* Interpretation + History */}
            <div>
              <NdviInterpretation $color={ndviClass.color} $bg={ndviClass.bg}>
                <strong style={{ display: 'block', marginBottom: 4 }}>{ndviClass.label}</strong>
                {ndviClass.interpretation}
              </NdviInterpretation>

              {ndviHistory.length > 1 && (
                <>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 16, marginBottom: 4, color: '#e0e7ff' }}>
                    <Activity size={14} style={{ display: 'inline' }} /> NDVI Trend ({ndviHistory.length} readings)
                  </div>
                  <NdviHistory>
                    {ndviHistory.map((img) => {
                      const c = classifyNdvi(Number(img.ndvi_value));
                      const heightPct = ((Number(img.ndvi_value) + 1) / 2) * 100;
                      return (
                        <div key={img.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div title={`NDVI: ${Number(img.ndvi_value).toFixed(2)} (${c?.label})\n${new Date(img.captured_at).toLocaleDateString()}`} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
                            <NdviBar $color={c?.color || '#3ba7ff'} style={{ height: `${Math.max(heightPct, 5)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </NdviHistory>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#aab7d4' }}>
                    <span>{new Date(ndviHistory[0].captured_at).toLocaleDateString()}</span>
                    <span>{new Date(ndviHistory[ndviHistory.length - 1].captured_at).toLocaleDateString()}</span>
                  </div>
                  {(() => {
                    const first = Number(ndviHistory[0].ndvi_value);
                    const last = Number(ndviHistory[ndviHistory.length - 1].ndvi_value);
                    const change = last - first;
                    const pctChange = first !== 0 ? ((change / Math.abs(first)) * 100).toFixed(1) : 'N/A';
                    const isDecline = change < -0.05;
                    const isImprovement = change > 0.05;
                    return (
                      <div style={{
                        marginTop: 12, padding: '8px 12px', borderRadius: 8, fontSize: '0.8rem',
                        background: isDecline ? 'rgba(248,113,113,0.08)' : isImprovement ? 'rgba(34,197,94,0.08)' : 'rgba(59,167,255,0.08)',
                        borderLeft: `3px solid ${isDecline ? '#f87171' : isImprovement ? '#22c55e' : '#3ba7ff'}`,
                      }}>
                        {isDecline ? '⚠️' : isImprovement ? '✅' : 'ℹ️'}{' '}
                        {isDecline ? 'Vegetation declining' : isImprovement ? 'Vegetation improving' : 'Vegetation stable'}{' '}
                        — change of {change > 0 ? '+' : ''}{change.toFixed(2)} ({pctChange}%) over {ndviHistory.length} readings.
                        {isDecline && ' This may indicate deforestation, drought, land clearing, or crop stress. Consider requesting a field visit to investigate.'}
                        {isImprovement && ' This suggests healthy regrowth, recent rainfall, or successful planting. The land is becoming more productive.'}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <Button variant="secondary" onClick={captureSatellite} disabled={capturing}>
              {capturing ? 'Capturing...' : <><Satellite size={16} style={{ display: 'inline' }} /> Capture New Image</>}
            </Button>
          </div>
        </>
      )}

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
