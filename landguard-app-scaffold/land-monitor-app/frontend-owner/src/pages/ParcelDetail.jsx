import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import {
  AlertTriangle, CheckCircle2, Ruler, ArrowLeftRight, Camera, Video, Radio,
  ChevronRight, Film, ClipboardList, FileText, Building2, Maximize, TrendingUp,
  Leaf, Satellite, Activity, Droplets, Flame, MapPin, TreePine, Thermometer,
  Beaker, Waves, DollarSign, ShieldCheck, Navigation, Download, Layers, ZapOff, Globe,
} from 'lucide-react';
import { Card, Badge, Button, Skeleton, ParcelMap } from '@earthglobal/design-system';
import api from '../services/api';
import OwnerLayout from '../components/OwnerLayout';
import SalesManagerLayout from '../components/SalesManagerLayout';
import AgentLayout from '../components/AgentLayout';
import { verifyBoundary, createBoundaryTracker } from '../utils/gpsUtils';
import { STATUS_LABELS, VISIT_TYPE_LABELS } from '../lib/labels';

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

const MonitorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
`;

const MonitorCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[4]};
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const MonitorHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.9rem;
`;

const MonitorValue = styled.div`
  font-size: 1.4rem;
  font-weight: 700;
  color: ${({ $color }) => $color || '#e0e7ff'};
`;

const MonitorInterp = styled.div`
  font-size: 0.8rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.textMuted};
  padding: 8px 12px;
  background: ${({ $bg }) => $bg || 'rgba(59,167,255,0.06)'};
  border-radius: ${({ theme }) => theme.radii.sm};
  border-left: 3px solid ${({ $color }) => $color || '#3ba7ff'};
`;

const MonitorStat = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  padding: 2px 0;
  color: ${({ theme }) => theme.colors.textMuted};

  strong {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const MonitorError = styled.div`
  font-size: 0.8rem;
  color: #f87171;
  padding: 8px 12px;
  background: rgba(248,113,113,0.08);
  border-radius: ${({ theme }) => theme.radii.sm};
  border-left: 3px solid #f87171;
`;

const LulcBar = styled.div`
  display: flex;
  height: 24px;
  border-radius: 6px;
  overflow: hidden;
  margin-top: 8px;
`;

const LulcSegment = styled.div`
  background: ${({ $color }) => $color};
  flex: ${({ $flex }) => $flex};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  color: white;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
`;

const GpsStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.85rem;
`;

const RiskBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`;

export default function ParcelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const routePrefix = location.pathname.startsWith('/sales-manager') ? '/sales-manager' : location.pathname.startsWith('/agent') ? '/agent' : '';
  const [parcel, setParcel] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [visits, setVisits] = useState([]);
  const [buildingsData, setBuildingsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [images, setImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [visitMedia, setVisitMedia] = useState([]);
  const [alertTrends, setAlertTrends] = useState([]);

  // Monitoring states
  const [monitorData, setMonitorData] = useState({});
  const [monitorLoading, setMonitorLoading] = useState({});
  const [gpsTracking, setGpsTracking] = useState(false);
  const [gpsTrack, setGpsTrack] = useState([]);
  const [gpsResult, setGpsResult] = useState(null);
  const trackerRef = useRef(null);

  const [monitorErrors, setMonitorErrors] = useState({});

  const fetchMonitor = async (key, endpoint) => {
    setMonitorLoading(prev => ({ ...prev, [key]: true }));
    setMonitorErrors(prev => ({ ...prev, [key]: null }));
    try {
      const res = await api.get(`/parcels/${id}/${endpoint}`);
      setMonitorData(prev => ({ ...prev, [key]: res.data }));
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to fetch';
      console.error(`Failed to fetch ${key}:`, msg);
      setMonitorErrors(prev => ({ ...prev, [key]: msg }));
      setMonitorData(prev => ({ ...prev, [key]: { error: msg } }));
    } finally {
      setMonitorLoading(prev => ({ ...prev, [key]: false }));
    }
  };

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

    // Fetch field visit media
    api.get(`/parcels/${id}/media`)
      .then((res) => setVisitMedia(res.data || []))
      .catch(() => {});

    // Fetch per-parcel alert trends
    api.get(`/parcels/${id}/alert-trends`)
      .then((res) => setAlertTrends(res.data || []))
      .catch(() => {});
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

  const startGpsTracking = () => {
    try {
      trackerRef.current = createBoundaryTracker((track) => {
        setGpsTrack([...track]);
      });
      trackerRef.current.start();
      setGpsTracking(true);
      setGpsResult(null);
    } catch (err) {
      console.error('GPS tracking error:', err.message);
    }
  };

  const stopGpsTracking = () => {
    if (trackerRef.current) {
      const track = trackerRef.current.stop();
      setGpsTracking(false);
      if (track.length >= 3 && parcel?.boundary) {
        const boundary = parcel.boundary.coordinates[0].map(([lng, lat]) => ({ lat, lng }));
        const result = verifyBoundary(track, boundary);
        setGpsResult(result);
      }
    }
  };

  const downloadEvidence = async () => {
    try {
      const res = await api.get(`/parcels/${id}/evidence-package`);
      const data = { ...res.data, visitMedia };
      const report = generateEvidenceReport(data);
      const blob = new Blob([report], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evidence-${parcel.name}-${new Date().toISOString().slice(0, 10)}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate evidence package:', err);
    }
  };

  const generateEvidenceReport = (data) => {
    const dt = new Date(data.generatedAt).toLocaleString();
    return `<!DOCTYPE html><html><head><title>Evidence Report - ${data.parcel.name}</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:20px auto;color:#333}
h1{color:#1a365d}h2{color:#2c5282;border-bottom:2px solid #2c5282;padding-bottom:4px}
table{width:100%;border-collapse:collapse;margin:10px 0}td,th{padding:6px 12px;border:1px solid #ddd;text-align:left}
th{background:#edf2f7}.section{margin:20px 0;padding:16px;background:#f7fafc;border-radius:8px}
.interpretation{padding:12px;background:#ebf8ff;border-left:4px solid #3182ce;border-radius:4px;margin:10px 0}</style>
</head><body>
<h1>Land Monitoring Evidence Report</h1>
<p><strong>Generated:</strong> ${dt}</p>
<div class="section"><h2>Parcel Information</h2>
<table><tr><th>Name</th><td>${data.parcel.name}</td></tr>
<tr><th>Region</th><td>${data.parcel.region || 'N/A'}</td></tr>
<tr><th>Area</th><td>${(data.parcel.area_sqm / 10000).toFixed(2)} hectares</td></tr>
<tr><th>Perimeter</th><td>${data.parcel.perimeter_m?.toFixed(0)} m</td></tr></table></div>
<div class="section"><h2>Owner Information</h2>
<table><tr><th>Name</th><td>${data.owner.name || 'N/A'}</td></tr>
<tr><th>Email</th><td>${data.owner.email || 'N/A'}</td></tr>
<tr><th>Phone</th><td>${data.owner.phone || 'N/A'}</td></tr></table></div>
<div class="section"><h2>Detected Structures (${data.buildings.length})</h2>
${data.buildings.length > 0 ? '<table><tr><th>#</th><th>Area (m²)</th><th>Height (m)</th><th>Status</th><th>Detected</th></tr>' +
      data.buildings.map((b, i) => `<tr><td>${i + 1}</td><td>${Math.round(b.area_sqm)}</td><td>${b.estimated_height_m || 'N/A'}</td><td>${b.status}</td><td>${new Date(b.detected_at).toLocaleDateString()}</td></tr>`).join('') + '</table>'
      : '<p>No structures detected.</p>'}</div>
<div class="section"><h2>Satellite Imagery & NDVI History</h2>
${data.satelliteImages.length > 0 ? '<table><tr><th>Date</th><th>NDVI</th><th>Source</th></tr>' +
      data.satelliteImages.map(img => `<tr><td>${new Date(img.captured_at).toLocaleDateString()}</td><td>${img.ndvi_value?.toFixed(3) || 'N/A'}</td><td>${img.source}</td></tr>`).join('') + '</table>'
      : '<p>No satellite imagery captured.</p>'}</div>
<div class="section"><h2>Alerts (${data.alerts.length})</h2>
${data.alerts.length > 0 ? '<table><tr><th>Type</th><th>Detected</th><th>Verified</th></tr>' +
      data.alerts.map(a => `<tr><td>${a.alert_type}</td><td>${new Date(a.detected_at).toLocaleDateString()}</td><td>${a.verified ? 'Yes' : 'No'}</td></tr>`).join('') + '</table>'
      : '<p>No alerts recorded.</p>'}</div>
<div class="section"><h2>Field Visit Media (${data.visitMedia.length})</h2>
${data.visitMedia.length > 0 ? '<table><tr><th>Type</th><th>Visit</th><th>Agent</th><th>Date</th></tr>' +
      data.visitMedia.map(m => `<tr><td>${m.type}</td><td>${m.visit_type}</td><td>${m.agent_name || 'N/A'}</td><td>${new Date(m.uploaded_at).toLocaleDateString()}</td></tr>`).join('') + '</table>'
      : '<p>No field media uploaded.</p>'}</div>
<div class="section"><h2>Summary</h2>
<table><tr><th>Total Buildings</th><td>${data.summary.totalBuildings}</td></tr>
<tr><th>Total Alerts</th><td>${data.summary.totalAlerts}</td></tr>
<tr><th>Verified Alerts</th><td>${data.summary.verifiedAlerts}</td></tr>
<tr><th>Field Visits</th><td>${data.summary.totalVisits}</td></tr>
<tr><th>Latest NDVI</th><td>${data.summary.latestNdvi?.toFixed(3) || 'N/A'}</td></tr></table></div>
<p style="margin-top:30px;color:#999;font-size:0.8rem">This report was generated by LandGuard monitoring system. It is intended for informational and evidentiary purposes. For legal proceedings, consult a licensed surveyor.</p>
</body></html>`;
  };

  const LoadingLayout = routePrefix === '/sales-manager' ? SalesManagerLayout : routePrefix === '/agent' ? AgentLayout : OwnerLayout;

  if (loading) {
    return (
      <LoadingLayout>
        <Skeleton $height="2rem" $width="40%" style={{ marginBottom: 24 }} />
        <Skeleton $height="500px" />
      </LoadingLayout>
    );
  }

  if (!parcel) {
    return (
      <LoadingLayout>
        <Card>Parcel not found.</Card>
      </LoadingLayout>
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

  const Layout = routePrefix === '/sales-manager' ? SalesManagerLayout : routePrefix === '/agent' ? AgentLayout : OwnerLayout;

  return (
    <Layout>
      <Header>
        <Title>{parcel.name}</Title>
        {routePrefix !== '/agent' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => navigate(`${routePrefix}/parcels/${id}/request-visit`)}>
              Request a visit
            </Button>
            <Button variant="secondary" onClick={() => navigate(`${routePrefix}/sell`)}>
              List for Sale
            </Button>
            <Button variant="secondary" onClick={() => navigate(`${routePrefix}/site-plans`)}>
              <FileText size={16} style={{ display: 'inline' }} /> Site Plans
            </Button>
          </div>
        )}
      </Header>

      <StatsRow>
        <span>
          <Ruler size={16} aria-hidden="true" />
          {(Number(parcel.area_sqm) / 10000).toFixed(2)} ha
        </span>
        <span>
          <ArrowLeftRight size={16} aria-hidden="true" />
          {`${Number(parcel.perimeter_m)?.toFixed(0)}m perimeter`}
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

      {/* ── Satellite Image Gallery ── */}
      {images.length > 0 && (
        <>
          <SectionTitle>
            <Camera size={20} style={{ display: 'inline' }} /> Satellite Image Gallery ({images.length})
          </SectionTitle>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
              {images.map((img) => {
                const c = img.ndvi_value != null ? classifyNdvi(Number(img.ndvi_value)) : null;
                return (
                  <div key={img.id} style={{ minWidth: 200, flexShrink: 0 }}>
                    <div style={{
                      width: 200, height: 200, borderRadius: 8, overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.1)', position: 'relative',
                      background: '#0a0e1a',
                    }}>
                      {img.image_url ? (
                        <img src={img.image_url} alt="Satellite" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                             onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#5ce1ff' }}>
                          <Satellite size={32} />
                        </div>
                      )}
                      {c && (
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                          padding: '16px 8px 6px', fontSize: '0.7rem',
                        }}>
                          <div style={{ color: c.color, fontWeight: 600 }}>NDVI {Number(img.ndvi_value).toFixed(2)}</div>
                          <div style={{ color: '#aab7d4' }}>{c.label}</div>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#aab7d4', marginTop: 4, textAlign: 'center' }}>
                      {new Date(img.captured_at).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '0.6rem', color: '#5ce1ff', textAlign: 'center', textTransform: 'capitalize' }}>
                      {img.source}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
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

      {/* ── Comprehensive Land Monitoring ── */}
      <SectionTitle>
        <Layers size={20} style={{ display: 'inline' }} /> Land Monitoring & Risk Assessment
      </SectionTitle>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: '0.85rem', color: '#aab7d4' }}>
            Run comprehensive monitoring analysis on your parcel using satellite data.
            Each tool provides specific insights about your land's condition and risks.
          </span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => {
              fetchMonitor('encroachment', 'encroachment');
              fetchMonitor('flood', 'flood');
              fetchMonitor('fire', 'fire');
              fetchMonitor('lulc', 'lulc');
              fetchMonitor('soilMoisture', 'soil-moisture');
              fetchMonitor('rainfall', 'rainfall');
              fetchMonitor('treeLoss', 'tree-cover-loss');
              fetchMonitor('lst', 'land-surface-temperature');
              fetchMonitor('multiIndex', 'multi-index');
              fetchMonitor('water', 'water');
              fetchMonitor('carbon', 'carbon-stock');
              fetchMonitor('valuation', 'valuation');
              fetchMonitor('openBuildings', 'open-buildings');
              fetchMonitor('dynamicWorld', 'dynamic-world');
            }}>
              <Activity size={16} style={{ display: 'inline' }} /> Run All Monitoring
            </Button>
            <Button variant="secondary" onClick={downloadEvidence}>
              <Download size={16} style={{ display: 'inline' }} /> Evidence Report
            </Button>
          </div>
        </div>
      </Card>

      <MonitorGrid>
        {/* Encroachment Detection */}
        <MonitorCard>
          <MonitorHeader><ShieldCheck size={18} color="#f87171" /> Boundary Encroachment</MonitorHeader>
          {monitorLoading.encroachment ? <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Checking...</span> :
           monitorData.encroachment?.error ? <><MonitorError>{monitorData.encroachment.error}</MonitorError><Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('encroachment', 'encroachment')}>Retry</Button></> :
           monitorData.encroachment ? (
            <>
              <MonitorValue $color={monitorData.encroachment.hasEncroachment ? '#f87171' : '#22c55e'}>
                {monitorData.encroachment.count} structure(s) near boundary
              </MonitorValue>
              <MonitorInterp $color={monitorData.encroachment.hasEncroachment ? '#f87171' : '#22c55e'}
                $bg={monitorData.encroachment.hasEncroachment ? 'rgba(248,113,113,0.08)' : 'rgba(34,197,94,0.08)'}>
                {monitorData.encroachment.interpretation}
              </MonitorInterp>
              {monitorData.encroachment.encroachments?.slice(0, 3).map((e, i) => (
                <MonitorStat key={i}>
                  <span>Structure {i + 1} — {e.distance_m}m away</span>
                  <strong>{e.area_sqm ? `${Math.round(e.area_sqm)}m²` : 'N/A'}</strong>
                </MonitorStat>
              ))}
              <Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('encroachment', 'encroachment')}>Refresh</Button>
            </>
          ) : (
            <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Click "Run All Monitoring" to check for encroachment.</span>
          )}
        </MonitorCard>

        {/* Flood Monitoring */}
        <MonitorCard>
          <MonitorHeader><Droplets size={18} color="#3b82f6" /> Flood Monitoring</MonitorHeader>
          {monitorLoading.flood ? <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Analyzing radar...</span> :
           monitorData.flood?.error ? <><MonitorError>{monitorData.flood.error}</MonitorError><Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('flood', 'flood')}>Retry</Button></> :
           monitorData.flood ? (
            <>
              <MonitorValue $color={monitorData.flood.floodDetected ? '#3b82f6' : '#22c55e'}>
                {monitorData.flood.floodDetected ? 'Flood Detected' : 'No Flooding'}
              </MonitorValue>
              {monitorData.flood.sarBackscatter != null && (
                <MonitorStat><span>SAR Backscatter</span><strong>{monitorData.flood.sarBackscatter} dB</strong></MonitorStat>
              )}
              {monitorData.flood.mndwi != null && (
                <MonitorStat><span>MNDWI (Water Index)</span><strong>{monitorData.flood.mndwi}</strong></MonitorStat>
              )}
              <MonitorInterp $color={monitorData.flood.floodDetected ? '#3b82f6' : '#22c55e'}
                $bg={monitorData.flood.floodDetected ? 'rgba(59,130,246,0.08)' : 'rgba(34,197,94,0.08)'}>
                {monitorData.flood.interpretation}
              </MonitorInterp>
              <Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('flood', 'flood')}>Refresh</Button>
            </>
          ) : (
            <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Uses Sentinel-1 radar — sees through clouds.</span>
          )}
        </MonitorCard>

        {/* Fire / Burn Detection */}
        <MonitorCard>
          <MonitorHeader><Flame size={18} color="#f97316" /> Fire & Burn Detection</MonitorHeader>
          {monitorLoading.fire ? <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Scanning for burn scars...</span> :
           monitorData.fire?.error ? <><MonitorError>{monitorData.fire.error}</MonitorError><Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('fire', 'fire')}>Retry</Button></> :
           monitorData.fire ? (
            <>
              <MonitorValue $color={monitorData.fire.burnDetected ? '#f97316' : '#22c55e'}>
                {monitorData.fire.burnDetected ? 'Burn Detected' : 'No Burns'}
              </MonitorValue>
              {monitorData.fire.nbr != null && (
                <MonitorStat><span>NBR (Burn Ratio)</span><strong>{monitorData.fire.nbr}</strong></MonitorStat>
              )}
              {monitorData.fire.bai != null && (
                <MonitorStat><span>BAI (Burn Area Index)</span><strong>{monitorData.fire.bai}</strong></MonitorStat>
              )}
              <MonitorInterp $color={monitorData.fire.burnDetected ? '#f97316' : '#22c55e'}
                $bg={monitorData.fire.burnDetected ? 'rgba(249,115,22,0.08)' : 'rgba(34,197,94,0.08)'}>
                {monitorData.fire.interpretation}
              </MonitorInterp>
              <Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('fire', 'fire')}>Refresh</Button>
            </>
          ) : (
            <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Detects wildfires and agricultural burning.</span>
          )}
        </MonitorCard>

        {/* Land Use / Land Cover */}
        <MonitorCard>
          <MonitorHeader><MapPin size={18} color="#84cc16" /> Land Use / Land Cover</MonitorHeader>
          {monitorLoading.lulc ? <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Classifying land use...</span> :
           monitorData.lulc?.error ? <><MonitorError>{monitorData.lulc.error}</MonitorError><Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('lulc', 'lulc')}>Retry</Button></> :
           monitorData.lulc && monitorData.lulc.classes?.length > 0 ? (
            <>
              <LulcBar>
                {monitorData.lulc.classes.map((c, i) => (
                  <LulcSegment key={i} $color={c.color} $flex={parseFloat(c.area_pct)}>
                    {parseFloat(c.area_pct) > 10 ? `${c.area_pct}%` : ''}
                  </LulcSegment>
                ))}
              </LulcBar>
              {monitorData.lulc.classes.map((c, i) => (
                <MonitorStat key={i}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: c.color, display: 'inline-block' }} />
                    {c.name}
                  </span>
                  <strong>{c.area_pct}% ({Math.round(c.area_sqm / 100) / 10}ha)</strong>
                </MonitorStat>
              ))}
              <MonitorInterp>{monitorData.lulc.interpretation}</MonitorInterp>
              <Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('lulc', 'lulc')}>Refresh</Button>
            </>
          ) : monitorData.lulc ? (
            <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>{monitorData.lulc.message || 'No data'}</span>
          ) : (
            <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Classifies your land into forest, cropland, built-up, etc.</span>
          )}
        </MonitorCard>

        {/* Soil Moisture */}
        <MonitorCard>
          <MonitorHeader><Droplets size={18} color="#06b6d4" /> Soil Moisture</MonitorHeader>
          {monitorLoading.soilMoisture ? <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Analyzing soil...</span> :
           monitorData.soilMoisture?.error ? <><MonitorError>{monitorData.soilMoisture.error}</MonitorError><Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('soilMoisture', 'soil-moisture')}>Retry</Button></> :
           monitorData.soilMoisture && monitorData.soilMoisture.vvBackscatter != null ? (
            <>
              <MonitorValue $color={
                monitorData.soilMoisture.moistureLevel === 'dry' ? '#f97316' :
                monitorData.soilMoisture.moistureLevel === 'moderate' ? '#fbbf24' :
                monitorData.soilMoisture.moistureLevel === 'moist' ? '#06b6d4' : '#3b82f6'
              }>
                {monitorData.soilMoisture.moistureLevel}
              </MonitorValue>
              <MonitorStat><span>VV Backscatter</span><strong>{monitorData.soilMoisture.vvBackscatter} dB</strong></MonitorStat>
              <MonitorStat><span>VH Backscatter</span><strong>{monitorData.soilMoisture.vhBackscatter} dB</strong></MonitorStat>
              <MonitorInterp $color="#06b6d4" $bg="rgba(6,182,212,0.08)">
                {monitorData.soilMoisture.interpretation}
              </MonitorInterp>
              <Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('soilMoisture', 'soil-moisture')}>Refresh</Button>
            </>
          ) : monitorData.soilMoisture ? (
            <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>{monitorData.soilMoisture.message || 'No data'}</span>
          ) : (
            <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Uses radar to detect soil water content.</span>
          )}
        </MonitorCard>

        {/* Rainfall Context */}
        <MonitorCard>
          <MonitorHeader><Droplets size={18} color="#60a5fa" /> Rainfall Context</MonitorHeader>
          {monitorLoading.rainfall ? <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Fetching rainfall data...</span> :
           monitorData.rainfall?.error ? <><MonitorError>{monitorData.rainfall.error}</MonitorError><Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('rainfall', 'rainfall')}>Retry</Button></> :
           monitorData.rainfall && monitorData.rainfall.rainfall30mm != null ? (
            <>
              <MonitorValue $color={
                monitorData.rainfall.belowNormal ? '#f97316' :
                monitorData.rainfall.aboveNormal ? '#3b82f6' : '#22c55e'
              }>
                {monitorData.rainfall.rainfall30mm} mm (30 days)
              </MonitorValue>
              <MonitorStat><span>90-day total</span><strong>{monitorData.rainfall.rainfall90mm} mm</strong></MonitorStat>
              <MonitorStat><span>Yearly total</span><strong>{monitorData.rainfall.rainfall365mm} mm</strong></MonitorStat>
              {monitorData.rainfall.historicalAvg30mm != null && (
                <MonitorStat><span>Historical avg</span><strong>{monitorData.rainfall.historicalAvg30mm} mm</strong></MonitorStat>
              )}
              <MonitorInterp $color={monitorData.rainfall.belowNormal ? '#f97316' : monitorData.rainfall.aboveNormal ? '#3b82f6' : '#22c55e'}
                $bg={monitorData.rainfall.belowNormal ? 'rgba(249,115,22,0.08)' : monitorData.rainfall.aboveNormal ? 'rgba(59,130,246,0.08)' : 'rgba(34,197,94,0.08)'}>
                {monitorData.rainfall.interpretation}
              </MonitorInterp>
              <Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('rainfall', 'rainfall')}>Refresh</Button>
            </>
          ) : monitorData.rainfall ? (
            <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>{monitorData.rainfall.message || 'No data'}</span>
          ) : (
            <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>CHIRPS rainfall data for drought context.</span>
          )}
        </MonitorCard>

        {/* Tree Cover Loss */}
        <MonitorCard>
          <MonitorHeader><TreePine size={18} color="#166534" /> Tree Cover Loss</MonitorHeader>
          {monitorLoading.treeLoss ? <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Analyzing forest change...</span> :
           monitorData.treeLoss?.error ? <><MonitorError>{monitorData.treeLoss.error}</MonitorError><Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('treeLoss', 'tree-cover-loss')}>Retry</Button></> :
           monitorData.treeLoss ? (
            <>
              <MonitorValue $color={monitorData.treeLoss.hasRecentLoss ? '#f87171' : '#22c55e'}>
                {monitorData.treeLoss.hasRecentLoss ? 'Recent Loss Detected' : 'No Recent Loss'}
              </MonitorValue>
              <MonitorStat><span>Tree cover (2000)</span><strong>{(monitorData.treeLoss.treeCover2000_sqm / 10000).toFixed(2)} ha</strong></MonitorStat>
              <MonitorStat><span>Total loss</span><strong>{(monitorData.treeLoss.totalLoss_sqm / 10000).toFixed(2)} ha</strong></MonitorStat>
              {monitorData.treeLoss.recentLoss_sqm > 0 && (
                <MonitorStat><span>Recent loss (3yr)</span><strong>{(monitorData.treeLoss.recentLoss_sqm / 10000).toFixed(2)} ha</strong></MonitorStat>
              )}
              <MonitorInterp $color={monitorData.treeLoss.hasRecentLoss ? '#f87171' : '#166534'}
                $bg={monitorData.treeLoss.hasRecentLoss ? 'rgba(248,113,113,0.08)' : 'rgba(22,101,52,0.08)'}>
                {monitorData.treeLoss.interpretation}
              </MonitorInterp>
              <Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('treeLoss', 'tree-cover-loss')}>Refresh</Button>
            </>
          ) : (
            <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Hansen Global Forest Change data (2000-present).</span>
          )}
        </MonitorCard>

        {/* Land Surface Temperature */}
        <MonitorCard>
          <MonitorHeader><Thermometer size={18} color="#ef4444" /> Land Surface Temperature</MonitorHeader>
          {monitorLoading.lst ? <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Measuring temperature...</span> :
           monitorData.lst?.error ? <><MonitorError>{monitorData.lst.error}</MonitorError><Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('lst', 'land-surface-temperature')}>Retry</Button></> :
           monitorData.lst && monitorData.lst.lstCelsius != null ? (
            <>
              <MonitorValue $color={monitorData.lst.lstCelsius > 35 ? '#ef4444' : monitorData.lst.lstCelsius > 25 ? '#f97316' : '#22c55e'}>
                {monitorData.lst.lstCelsius}°C
              </MonitorValue>
              {monitorData.lst.surroundingLstCelsius != null && (
                <MonitorStat><span>Surrounding area</span><strong>{monitorData.lst.surroundingLstCelsius}°C</strong></MonitorStat>
              )}
              {monitorData.lst.heatIslandEffect != null && (
                <MonitorStat><span>Heat island effect</span><strong>{monitorData.lst.heatIslandEffect > 0 ? '+' : ''}{monitorData.lst.heatIslandEffect}°C</strong></MonitorStat>
              )}
              <MonitorInterp $color={monitorData.lst.heatIslandEffect > 2 ? '#ef4444' : '#22c55e'}
                $bg={monitorData.lst.heatIslandEffect > 2 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)'}>
                {monitorData.lst.interpretation}
              </MonitorInterp>
              <Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('lst', 'land-surface-temperature')}>Refresh</Button>
            </>
          ) : monitorData.lst ? (
            <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>{monitorData.lst.message || 'No Landsat imagery available'}</span>
          ) : (
            <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Landsat-8 thermal bands for heat analysis.</span>
          )}
        </MonitorCard>

        {/* Multi-Index Crop Health */}
        <MonitorCard>
          <MonitorHeader><Beaker size={18} color="#a78bfa" /> Multi-Index Crop Health</MonitorHeader>
          {monitorLoading.multiIndex ? <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Computing vegetation indices...</span> :
           monitorData.multiIndex?.error ? <><MonitorError>{monitorData.multiIndex.error}</MonitorError><Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('multiIndex', 'multi-index')}>Retry</Button></> :
           monitorData.multiIndex && monitorData.multiIndex.indices?.length > 0 ? (
            <>
              {monitorData.multiIndex.indices.map((idx, i) => (
                <div key={i}>
                  <MonitorStat>
                    <span><strong>{idx.name}</strong> — {idx.label}</span>
                    <strong>{idx.value}</strong>
                  </MonitorStat>
                  <div style={{ fontSize: '0.75rem', color: '#aab7d4', paddingLeft: 4 }}>{idx.interpretation}</div>
                </div>
              ))}
              <MonitorInterp $color="#a78bfa" $bg="rgba(167,139,250,0.08)">
                {monitorData.multiIndex.interpretation}
              </MonitorInterp>
              <Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('multiIndex', 'multi-index')}>Refresh</Button>
            </>
          ) : monitorData.multiIndex ? (
            <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>{monitorData.multiIndex.message || 'No data'}</span>
          ) : (
            <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>EVI, SAVI, GNDVI, NDRE — deeper crop health analysis.</span>
          )}
        </MonitorCard>

        {/* Water Body Detection */}
        <MonitorCard>
          <MonitorHeader><Waves size={18} color="#0ea5e9" /> Water Body Detection</MonitorHeader>
          {monitorLoading.water ? <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Detecting water bodies...</span> :
           monitorData.water?.error ? <><MonitorError>{monitorData.water.error}</MonitorError><Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('water', 'water')}>Retry</Button></> :
           monitorData.water ? (
            <>
              <MonitorValue $color={monitorData.water.hasWaterOnParcel ? '#0ea5e9' : monitorData.water.hasWaterNearby ? '#06b6d4' : '#fbbf24'}>
                {monitorData.water.hasWaterOnParcel ? 'Water On Parcel' : monitorData.water.hasWaterNearby ? 'Water Nearby' : 'No Water Detected'}
              </MonitorValue>
              <MonitorStat><span>Water on parcel</span><strong>{(monitorData.water.waterInParcel_sqm / 10000).toFixed(3)} ha</strong></MonitorStat>
              <MonitorStat><span>Water within 500m</span><strong>{(monitorData.water.waterWithin500m_sqm / 10000).toFixed(3)} ha</strong></MonitorStat>
              <MonitorInterp $color="#0ea5e9" $bg="rgba(14,165,233,0.08)">
                {monitorData.water.interpretation}
              </MonitorInterp>
              <Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('water', 'water')}>Refresh</Button>
            </>
          ) : (
            <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Detects ponds, streams, and water access.</span>
          )}
        </MonitorCard>

        {/* Carbon Stock */}
        <MonitorCard>
          <MonitorHeader><Leaf size={18} color="#22c55e" /> Carbon Stock Estimation</MonitorHeader>
          {monitorLoading.carbon ? <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Estimating carbon stock...</span> :
           monitorData.carbon?.error ? <><MonitorError>{monitorData.carbon.error}</MonitorError><Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('carbon', 'carbon-stock')}>Retry</Button></> :
           monitorData.carbon ? (
            <>
              <MonitorValue $color="#22c55e">
                {monitorData.carbon.carbonStock_t.toFixed(1)} t C
              </MonitorValue>
              <MonitorStat><span>CO₂ equivalent</span><strong>{monitorData.carbon.co2Equivalent_t.toFixed(1)} t</strong></MonitorStat>
              <MonitorStat><span>Biomass</span><strong>{monitorData.carbon.totalBiomass_t.toFixed(1)} t</strong></MonitorStat>
              <MonitorStat><span>Est. credit value</span><strong>${monitorData.carbon.estimatedCarbonCreditValue_USD}/yr</strong></MonitorStat>
              <MonitorInterp $color="#22c55e" $bg="rgba(34,197,94,0.08)">
                {monitorData.carbon.interpretation}
              </MonitorInterp>
              <Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('carbon', 'carbon-stock')}>Refresh</Button>
            </>
          ) : (
            <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Estimate carbon credits from vegetation biomass.</span>
          )}
        </MonitorCard>

        {/* Parcel Valuation */}
        <MonitorCard>
          <MonitorHeader><DollarSign size={18} color="#fbbf24" /> Parcel Valuation</MonitorHeader>
          {monitorLoading.valuation ? <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Estimating value...</span> :
           monitorData.valuation?.error ? <><MonitorError>{monitorData.valuation.error}</MonitorError><Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('valuation', 'valuation')}>Retry</Button></> :
           monitorData.valuation ? (
            <>
              <MonitorValue $color="#fbbf24">
                GHS {monitorData.valuation.lowEstimate_GHS.toLocaleString()} – {monitorData.valuation.highEstimate_GHS.toLocaleString()}
              </MonitorValue>
              <MonitorStat><span>Estimated value</span><strong>GHS {monitorData.valuation.estimatedValue_GHS.toLocaleString()}</strong></MonitorStat>
              <MonitorStat><span>Confidence</span><strong>{monitorData.valuation.confidence}</strong></MonitorStat>
              <MonitorStat><span>Region</span><strong>{monitorData.valuation.region}</strong></MonitorStat>
              {monitorData.valuation.factors?.map((f, i) => (
                <div key={i} style={{ fontSize: '0.75rem', padding: '2px 0', color: '#aab7d4' }}>
                  <strong style={{ color: '#e0e7ff' }}>{f.factor}:</strong> {f.impact} — {f.detail}
                </div>
              ))}
              <MonitorInterp $color="#fbbf24" $bg="rgba(251,191,36,0.08)">
                {monitorData.valuation.interpretation}
              </MonitorInterp>
              <div style={{ fontSize: '0.7rem', color: '#999', marginTop: 4 }}>{monitorData.valuation.disclaimer}</div>
              <Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('valuation', 'valuation')}>Refresh</Button>
            </>
          ) : (
            <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Rough value estimate based on region, size, and structures.</span>
          )}
        </MonitorCard>

        {/* Google OpenBuildings — AI building footprints */}
        <MonitorCard>
          <MonitorHeader><Building2 size={18} color="#22d3ee" /> AI Building Detection (Google)</MonitorHeader>
          {monitorLoading.openBuildings ? <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Scanning with Google AI...</span> :
           monitorData.openBuildings?.error ? <><MonitorError>{monitorData.openBuildings.error}</MonitorError><Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('openBuildings', 'open-buildings')}>Retry</Button></> :
           monitorData.openBuildings ? (
            <>
              <MonitorValue $color={monitorData.openBuildings.count > 0 ? '#22d3ee' : '#22c55e'}>
                {monitorData.openBuildings.count} AI-detected building(s)
              </MonitorValue>
              <MonitorStat><span>On parcel</span><strong>{monitorData.openBuildings.onParcel}</strong></MonitorStat>
              <MonitorStat><span>Total area</span><strong>{monitorData.openBuildings.totalArea_sqm?.toLocaleString()} m²</strong></MonitorStat>
              <MonitorInterp $color="#22d3ee" $bg="rgba(34,211,238,0.08)">
                {monitorData.openBuildings.interpretation}
              </MonitorInterp>
              <div style={{ fontSize: '0.7rem', color: '#999', marginTop: 4 }}>Source: {monitorData.openBuildings.source}</div>
              <Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('openBuildings', 'open-buildings')}>Refresh</Button>
            </>
          ) : (
            <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Google's AI building footprints — detects structures using machine learning.</span>
          )}
        </MonitorCard>

        {/* Dynamic World — AI land cover */}
        <MonitorCard>
          <MonitorHeader><Globe size={18} color="#84cc16" /> AI Land Cover (Dynamic World)</MonitorHeader>
          {monitorLoading.dynamicWorld ? <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Running Google AI classification...</span> :
           monitorData.dynamicWorld?.error ? <><MonitorError>{monitorData.dynamicWorld.error}</MonitorError><Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('dynamicWorld', 'dynamic-world')}>Retry</Button></> :
           monitorData.dynamicWorld && monitorData.dynamicWorld.classes?.length > 0 ? (
            <>
              <MonitorValue $color="#84cc16">{monitorData.dynamicWorld.dominantClass}</MonitorValue>
              {monitorData.dynamicWorld.classes.slice(0, 5).map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: '0.8rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: c.color }} />
                  <span style={{ flex: 1 }}>{c.name}</span>
                  <strong>{c.area_pct}%</strong>
                </div>
              ))}
              <MonitorInterp>{monitorData.dynamicWorld.interpretation}</MonitorInterp>
              <div style={{ fontSize: '0.7rem', color: '#999', marginTop: 4 }}>{monitorData.dynamicWorld.source}</div>
              <Button variant="secondary" style={{ marginTop: 4 }} onClick={() => fetchMonitor('dynamicWorld', 'dynamic-world')}>Refresh</Button>
            </>
          ) : monitorData.dynamicWorld ? (
            <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>{monitorData.dynamicWorld.message || 'No data'}</span>
          ) : (
            <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>Google's near-real-time AI land cover, updated every 5 days.</span>
          )}
        </MonitorCard>
      </MonitorGrid>

      {/* ── AI Monitoring Report ── */}
      <SectionTitle>
        <Activity size={20} style={{ display: 'inline' }} /> AI Monitoring Report
      </SectionTitle>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: '0.85rem', color: '#aab7d4' }}>
            AI-generated report summarizing all monitoring data for your parcel.
          </span>
          <Button variant="secondary" onClick={() => fetchMonitor('aiReport', 'ai-report')} disabled={monitorLoading.aiReport}>
            {monitorLoading.aiReport ? 'Generating...' : <><Activity size={16} style={{ display: 'inline' }} /> Generate AI Report</>}
          </Button>
        </div>
        {monitorData.aiReport?.error ? (
          <MonitorError>{monitorData.aiReport.error}</MonitorError>
        ) : monitorData.aiReport?.report ? (
          <>
            <div style={{
              background: 'rgba(59,167,255,0.05)', border: '1px solid rgba(59,167,255,0.15)',
              borderRadius: 8, padding: 16, whiteSpace: 'pre-wrap', fontSize: '0.85rem',
              lineHeight: 1.6, color: '#e0e7ff',
            }}>
              {monitorData.aiReport.report}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#999', marginTop: 8 }}>
              Source: {monitorData.aiReport.source} • {monitorData.aiReport.dataPoints || 0} data points • {monitorData.aiReport.ndviReadings || 0} NDVI readings
            </div>
          </>
        ) : (
          <span style={{ color: '#aab7d4', fontSize: '0.85rem' }}>
            Run monitoring tools first, then generate an AI report to get an intelligent summary of your land's condition.
          </span>
        )}
      </Card>

      {/* ── GPS Boundary Verification ── */}
      <SectionTitle>
        <Navigation size={20} style={{ display: 'inline' }} /> GPS Boundary Verification
      </SectionTitle>
      <Card>
        <div style={{ marginBottom: 12, fontSize: '0.85rem', color: '#aab7d4' }}>
          Walk your parcel boundary with your phone's GPS to verify it matches the registered survey.
          The system compares your walked track against the official boundary and highlights any discrepancies.
        </div>
        {!gpsTracking ? (
          <Button onClick={startGpsTracking}>
            <Navigation size={16} style={{ display: 'inline' }} /> Start Boundary Walk
          </Button>
        ) : (
          <div>
            <GpsStatus>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#22c55e' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                GPS Tracking Active
              </span>
              <span>Points recorded: <strong>{gpsTrack.length}</strong></span>
              <Button variant="secondary" onClick={stopGpsTracking}>Stop & Verify</Button>
            </GpsStatus>
            {gpsTrack.length > 0 && (
              <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#aab7d4' }}>
                Latest point: {gpsTrack[gpsTrack.length - 1].lat.toFixed(6)}, {gpsTrack[gpsTrack.length - 1].lng.toFixed(6)}
                {gpsTrack[gpsTrack.length - 1].accuracy && ` (±${Math.round(gpsTrack[gpsTrack.length - 1].accuracy)}m)`}
              </div>
            )}
          </div>
        )}
        {gpsResult && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              padding: '12px 16px', borderRadius: 8, marginBottom: 8,
              background: gpsResult.valid ? 'rgba(34,197,94,0.08)' : 'rgba(248,113,113,0.08)',
              borderLeft: `3px solid ${gpsResult.valid ? '#22c55e' : '#f87171'}`,
              fontSize: '0.85rem',
            }}>
              <strong>{gpsResult.valid ? '✅ Boundary Verified' : '⚠️ Discrepancy Detected'}</strong>
              <div style={{ marginTop: 4 }}>{gpsResult.message}</div>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.8rem', color: '#aab7d4' }}>
              <span>Match: <strong style={{ color: '#22c55e' }}>{gpsResult.matched}</strong></span>
              <span>Minor deviation: <strong style={{ color: '#fbbf24' }}>{gpsResult.minorDev}</strong></span>
              <span>Major deviation: <strong style={{ color: '#f87171' }}>{gpsResult.majorDev}</strong></span>
              <span>Max deviation: <strong>{gpsResult.maxDeviation}m</strong></span>
              <span>Avg deviation: <strong>{gpsResult.avgDeviation}m</strong></span>
            </div>
          </div>
        )}
      </Card>

      <SectionTitle>Alerts</SectionTitle>
      {alerts.length === 0 ? (
        <Card>No change alerts detected.</Card>
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
                    {`Detected ${new Date(alert.detected_at).toLocaleDateString()}`}
                  </div>
                </div>
              </AlertMeta>
              <Badge tone={alert.verified ? 'success' : 'warning'}>
                {alert.verified ? 'Verified' : 'Unverified'}
              </Badge>
            </AlertRow>
          ))}
        </AlertList>
      )}

      {/* Alert Trends */}
      {alertTrends.length > 0 && (
        <>
          <SectionTitle>
            <Activity size={20} style={{ display: 'inline' }} /> Alert Trends (12 months)
          </SectionTitle>
          <Card>
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 120, padding: '8px 0' }}>
              {alertTrends.map((t) => {
                const max = Math.max(...alertTrends.map((x) => parseInt(x.total, 10)), 1);
                const vH = (parseInt(t.verified, 10) / max) * 100;
                const uH = (parseInt(t.unverified, 10) / max) * 100;
                return (
                  <div key={t.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ display: 'flex', flexDirection: 'column-reverse', height: 100, width: '100%', alignItems: 'center' }}>
                      <div style={{ width: '60%', background: '#22c55e', height: `${vH}%`, borderRadius: '3px 3px 0 0', minHeight: vH > 0 ? 2 : 0 }} title={`Verified: ${t.verified}`} />
                      <div style={{ width: '60%', background: '#f59e0b', height: `${uH}%`, borderRadius: '3px 3px 0 0', minHeight: uH > 0 ? 2 : 0 }} title={`Unverified: ${t.unverified}`} />
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#aab7d4', whiteSpace: 'nowrap' }}>{t.month.slice(5)}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: '#aab7d4', marginTop: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#22c55e', borderRadius: 2 }} /> Verified</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#f59e0b', borderRadius: 2 }} /> Unverified</span>
            </div>
          </Card>
        </>
      )}

      {/* Field Visit Media */}
      {visitMedia.length > 0 && (
        <>
          <SectionTitle>
            <Camera size={20} style={{ display: 'inline' }} /> Field Visit Photos & Videos
          </SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {visitMedia.map((m) => (
              <Card key={m.id} style={{ padding: 0, overflow: 'hidden' }}>
                {m.type === 'video' ? (
                  <video src={m.url} controls style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: '8px 8px 0 0' }} />
                ) : (
                  <img src={m.url} alt={`Visit ${m.visit_type}`} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: '8px 8px 0 0' }} />
                )}
                <div style={{ padding: '8px 10px', fontSize: '0.75rem', color: '#aab7d4' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{m.visit_type} visit</span>
                    <Badge tone={m.visit_status === 'completed' ? 'success' : 'warning'}>{m.visit_status}</Badge>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    {new Date(m.uploaded_at).toLocaleDateString()}
                    {m.agent_name && ` • ${m.agent_name}`}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
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
              <AlertRow key={v.id} as={Link} to={`${routePrefix}/visits/${v.id}`} style={{ textDecoration: 'none', cursor: 'pointer' }}>
                <AlertMeta>
                  <VIcon size={20} color="#3ba7ff" aria-hidden="true" />
                  <div>
                    <strong>{VISIT_TYPE_LABELS[v.type]}</strong>
                    <div style={{ fontSize: '0.85em', opacity: 0.7, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {new Date(v.requested_at).toLocaleDateString()}
                      {v.agent_name && <span>• {v.agent_name}</span>}
                      {parseInt(v.media_count, 10) > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Film size={11} /> {v.media_count}</span>}
                    </div>
                  </div>
                </AlertMeta>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge tone={tone}>{STATUS_LABELS[v.status]}</Badge>
                  <ChevronRight size={16} style={{ opacity: 0.4 }} />
                </div>
              </AlertRow>
            );
          })}
        </AlertList>
      )}
    </Layout>
  );
}
