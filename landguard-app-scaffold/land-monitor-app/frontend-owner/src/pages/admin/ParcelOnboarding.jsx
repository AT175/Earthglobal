import { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, FileUp, Navigation, Save, X, CheckCircle2, Loader,
  AlertTriangle, Satellite, Clock, Plus, Check,
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import {
  ACCURACY_THRESHOLD_M, MIN_READINGS, MAX_READINGS,
  STATION_INTERVAL_MS, READING_INTERVAL_MS,
  getFixQuality, processStationReadings, crossCheckArea,
  formatCountdown, haversine,
} from '../../utils/gpsUtils';

const Page = styled.div`
  color: ${({ theme }) => theme.colors.text};
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const PageSubtitle = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.md};
`;

const Tabs = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: ${({ theme }) => theme.spacing[5]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
`;

const Tab = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  background: none;
  border: none;
  border-bottom: 2px solid ${({ $active, theme }) => ($active ? theme.colors.primary : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.textMuted)};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  transition: all 0.2s;

  &:hover { color: ${({ theme }) => theme.colors.text}; }
`;

const Form = styled.div`
  background: ${({ theme }) => theme.colors.gradientSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[6]};
  max-width: 600px;
`;

const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const Label = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.text};
`;

const Input = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  outline: none;
  transition: border 0.2s;

  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const Select = styled.select`
  width: 100%;
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  outline: none;

  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  outline: none;
  min-height: 80px;
  resize: vertical;

  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[5]};
`;

const Btn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[5]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  border: none;
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  transition: all 0.2s;

  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const PrimaryBtn = styled(Btn)`
  background: ${({ theme }) => theme.colors.gradientPrimary};
  color: white;

  &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: ${({ theme }) => theme.shadows.glowPrimarySoft}; }
`;

const SecondaryBtn = styled(Btn)`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  color: ${({ theme }) => theme.colors.textMuted};

  &:hover { color: ${({ theme }) => theme.colors.text}; border-color: ${({ theme }) => theme.colors.borderLight}; }
`;

const DropZone = styled.div`
  border: 2px dashed ${({ $dragging, theme }) => ($dragging ? theme.colors.primary : theme.colors.borderDark)};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[10]};
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  transition: all 0.2s;

  &:hover { border-color: ${({ theme }) => theme.colors.borderLight}; background: ${({ theme }) => theme.colors.surfaceLight}; }
`;

const GPSStatus = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const SuccessMsg = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: ${({ theme }) => theme.spacing[4]};
  background: rgba(34,197,94,0.1);
  border: 1px solid rgba(34,197,94,0.3);
  border-radius: ${({ theme }) => theme.radii.md};
  color: #4ade80;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const ErrorMsg = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: ${({ theme }) => theme.spacing[4]};
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.3);
  border-radius: ${({ theme }) => theme.radii.md};
  color: #f87171;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const CoordsList = styled.div`
  max-height: 200px;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  font-family: monospace;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const FixIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ $color }) => $color}20;
  border: 1px solid ${({ $color }) => $color}40;
  color: ${({ $color }) => $color};
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
`;

const FixDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 8px ${({ $color }) => $color};
  animation: pulse 2s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
`;

const StationCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ $complete, theme }) =>
    $complete ? theme.colors.success + '40' : theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const StationHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const StationTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.85rem;
`;

const StationReadings = styled.div`
  font-family: monospace;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textMuted};
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const CountdownBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.primary}10;
  border: 1px solid ${({ theme }) => theme.colors.primary}30;
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  font-size: 0.85rem;
`;

const WarningBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: ${({ theme }) => theme.spacing[3]};
  background: rgba(251,191,36,0.1);
  border: 1px solid rgba(251,191,36,0.3);
  border-radius: ${({ theme }) => theme.radii.md};
  color: #fbbf24;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  font-size: 0.85rem;
`;

const DimRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const DimInput = styled.div`
  flex: 1;
`;

const DimToggle = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const DimToggleBtn = styled.button`
  padding: 4px 12px;
  border: 1px solid ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.borderDark};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.primary + '20' : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text : theme.colors.textMuted};
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
`;

export default function ParcelOnboarding() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('manual');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [watching, setWatching] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [owners, setOwners] = useState([]);

  // GPS Survey state — station-based collection
  const [stations, setStations] = useState([]); // [{ readings: [], center: null, complete: bool }]
  const [currentReadings, setCurrentReadings] = useState([]); // readings for the active station
  const [fixQuality, setFixQuality] = useState(null); // { label, color, locked }
  const [lastReadingAt, setLastReadingAt] = useState(0);
  const [countdown, setCountdown] = useState(0); // ms until next reading allowed
  const [gpsError, setGpsError] = useState('');
  const [dimUnit, setDimUnit] = useState('m'); // 'm' or 'ft'
  const [dimCheck, setDimCheck] = useState({ enabled: false, width: '', height: '', result: null });

  const watchIdRef = useRef(null);
  const countdownTimerRef = useRef(null);

  const [form, setForm] = useState({
    name: '', owner_id: '', region: '', boundary_coords: '', survey_date: '',
  });

  useEffect(() => {
    api.get('/parcels').then(() => {}).catch(() => {});
    api.get('/agents').catch(() => {});
  }, []);

  // Cleanup GPS watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ── GPS Survey: Station-based collection ──
  // The user walks to each corner of the parcel, stands still, and the app
  // collects multiple readings at that spot. Readings are spaced 5s apart.
  // The app shows fix quality, rejects poor readings, averages the station,
  // drops outliers, and produces a corrected center point per station.
  // The user needs at least 4 stations (corners) to finalize.

  const startGPS = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported by this browser'); return; }
    setWatching(true);
    setCurrentReadings([]);
    setStations([]);
    setGpsError('');
    setFixQuality(null);
    setLastReadingAt(0);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const accuracy = pos.coords.accuracy;
        const quality = getFixQuality(accuracy);
        setFixQuality(quality);

        const now = Date.now();
        const elapsed = now - lastReadingAt;

        // Enforce reading interval (5s between readings at a station)
        if (lastReadingAt > 0 && elapsed < READING_INTERVAL_MS) {
          return;
        }

        // Reject readings above accuracy threshold
        if (accuracy > ACCURACY_THRESHOLD_M * 2) {
          setGpsError(`Reading rejected: accuracy ±${Math.round(accuracy)}m is too poor. Move to an open area.`);
          return;
        }

        setGpsError('');
        setLastReadingAt(now);

        const reading = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy,
          timestamp: now,
        };

        setCurrentReadings((prev) => {
          const updated = [...prev, reading];
          // Auto-complete station when we have enough readings
          if (updated.length >= MIN_READINGS) {
            completeStation(updated);
          }
          return updated;
        });
      },
      (err) => { setGpsError(`GPS error: ${err.message}`); setWatching(false); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );

    // Countdown timer for next reading
    countdownTimerRef.current = setInterval(() => {
      if (lastReadingAt > 0) {
        const remaining = READING_INTERVAL_MS - (Date.now() - lastReadingAt);
        setCountdown(remaining > 0 ? remaining : 0);
      }
    }, 500);
  };

  const stopGPS = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setWatching(false);
    setFixQuality(null);
    setCountdown(0);
  };

  // Process readings: remove outliers, compute weighted average center
  const completeStation = (readings) => {
    const { filtered, center } = processStationReadings(readings);
    if (!center) return;

    setStations((prev) => [...prev, { readings: filtered, center, complete: true }]);
    setCurrentReadings([]);

    // Stop GPS after completing a station — user walks to next corner
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setWatching(false);
    setFixQuality(null);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(0);

    // Cross-check area if dimensions provided
    if (dimCheck.enabled && dimCheck.width && dimCheck.height) {
      const allStations = [...stations, { center }];
      if (allStations.length >= 3) {
        const dims = dimUnit === 'ft'
          ? { widthFt: parseFloat(dimCheck.width), heightFt: parseFloat(dimCheck.height) }
          : { widthM: parseFloat(dimCheck.width), heightM: parseFloat(dimCheck.height) };
        const result = crossCheckArea(allStations, dims);
        setDimCheck((prev) => ({ ...prev, result }));
      }
    }
  };

  // Manually finish current station (if user wants to stop early with fewer readings)
  const finishStationManually = () => {
    if (currentReadings.length < 2) {
      setGpsError('Need at least 2 readings before finishing this station');
      return;
    }
    completeStation(currentReadings);
  };

  // Remove a station
  const removeStation = (idx) => {
    setStations((prev) => prev.filter((_, i) => i !== idx));
    setDimCheck((prev) => ({ ...prev, result: null }));
  };

  // Start collecting at the next station
  const startNextStation = () => {
    setCurrentReadings([]);
    setGpsError('');
    startGPS();
  };

  // Get the final polygon coordinates from station centers
  const getStationCoords = () => {
    return stations.map((s) => ({ lat: s.center.lat, lng: s.center.lng }));
  };

  // Check if survey is ready to finalize
  const surveyReady = stations.length >= 4;
  const poorAccuracyStations = stations.filter(
    (s) => s.center.accuracy > ACCURACY_THRESHOLD_M
  );

  // ── File Import ──
  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        let coords = '';

        if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
          const geojson = JSON.parse(text);
          const ring = geojson.features?.[0]?.geometry?.coordinates?.[0] || geojson.geometry?.coordinates?.[0];
          if (ring) coords = ring.map(([lng, lat]) => `${lat},${lng}`).join('\n');
        } else if (file.name.endsWith('.csv')) {
          coords = text.trim();
        } else {
          setError('Unsupported file format. Use GeoJSON or CSV (lat,lng per line).');
          return;
        }

        setForm({ ...form, boundary_coords: coords });
        setTab('manual');
        setSuccess(`Imported ${coords.split('\n').length} coordinates from ${file.name}`);
      } catch {
        setError('Failed to parse file. Ensure it is valid GeoJSON or CSV.');
      }
    };
    reader.readAsText(file);
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!form.name) { setError('Parcel name is required'); return; }

    let coords;
    if (tab === 'gps') {
      if (!surveyReady) {
        setError(`Need at least 4 station corners to create a parcel. You have ${stations.length}.`);
        return;
      }
      if (poorAccuracyStations.length > 0) {
        setError(`${poorAccuracyStations.length} station(s) have accuracy worse than ±${ACCURACY_THRESHOLD_M}m. Consider retaking those stations on a clearer day.`);
        return;
      }
      coords = stations.map((s) => [s.center.lng, s.center.lat]); // GeoJSON is [lng, lat]
    } else {
      if (!form.boundary_coords) { setError('Boundary coordinates are required'); return; }
      coords = form.boundary_coords.trim().split('\n').map(line => {
        const [lat, lng] = line.trim().split(',').map(parseFloat);
        return [lng, lat]; // GeoJSON is [lng, lat]
      });
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Close the polygon
      if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
        coords.push(coords[0]);
      }

      const boundary = { type: 'Polygon', coordinates: [coords] };

      await api.post('/parcels', {
        name: form.name,
        owner_id: form.owner_id || undefined,
        region: form.region,
        boundary,
        survey_date: form.survey_date || undefined,
      });

      setSuccess('Parcel created successfully!');
      setForm({ name: '', owner_id: '', region: '', boundary_coords: '', survey_date: '' });
      setStations([]);
      setTimeout(() => navigate('/admin/parcels'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create parcel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <Page>
        <Header>
          <PageTitle>Onboard New Parcel</PageTitle>
          <PageSubtitle>Register a new land parcel using GPS survey, file import, or manual coordinates.</PageSubtitle>
        </Header>

        {success && <SuccessMsg><CheckCircle2 size={18} /> {success}</SuccessMsg>}
        {error && <ErrorMsg><X size={18} /> {error}</ErrorMsg>}

        <Tabs>
          <Tab $active={tab === 'manual'} onClick={() => setTab('manual')}><MapPin size={16} /> Manual Entry</Tab>
          <Tab $active={tab === 'gps'} onClick={() => setTab('gps')}><Navigation size={16} /> GPS Survey</Tab>
          <Tab $active={tab === 'import'} onClick={() => setTab('import')}><FileUp size={16} /> File Import</Tab>
        </Tabs>

        <Form>
          <FormGroup>
            <Label>Parcel Name *</Label>
            <Input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Farm at Manso Nkwanta" />
          </FormGroup>

          <FormGroup>
            <Label>Region</Label>
            <Input name="region" value={form.region} onChange={handleChange} placeholder="e.g. Ashanti Region" />
          </FormGroup>

          <FormGroup>
            <Label>Survey Date</Label>
            <Input type="date" name="survey_date" value={form.survey_date} onChange={handleChange} />
          </FormGroup>

          {tab === 'manual' && (
            <FormGroup>
              <Label>Boundary Coordinates (lat,lng per line)</Label>
              <TextArea
                name="boundary_coords"
                value={form.boundary_coords}
                onChange={handleChange}
                placeholder="6.2000,-1.8500&#10;6.2050,-1.8500&#10;6.2050,-1.8450&#10;6.2000,-1.8450&#10;6.2000,-1.8500"
              />
            </FormGroup>
          )}

          {tab === 'gps' && (
            <>
              {/* GPS Fix Quality Indicator */}
              <GPSStatus>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {watching ? (
                    fixQuality ? (
                      <FixIndicator $color={fixQuality.color}>
                        <FixDot $color={fixQuality.color} />
                        {fixQuality.label}
                      </FixIndicator>
                    ) : (
                      <>
                        <Loader size={20} className="animate-spin" />
                        <span style={{ fontSize: '0.85rem', color: '#aab7d4' }}>Acquiring satellite signal...</span>
                      </>
                    )
                  ) : (
                    <>
                      <Navigation size={20} />
                      <div>
                        <div style={{ fontWeight: 500 }}>{stations.length > 0 ? 'GPS paused' : 'GPS not active'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#aab7d4' }}>
                          {stations.length} station{stations.length !== 1 ? 's' : ''} recorded
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {!watching && stations.length === 0 && (
                    <SecondaryBtn onClick={startGPS}>
                      <Navigation size={16} /> Start Survey
                    </SecondaryBtn>
                  )}
                  {!watching && stations.length > 0 && !surveyReady && (
                    <SecondaryBtn onClick={startNextStation}>
                      <Plus size={16} /> Next Corner
                    </SecondaryBtn>
                  )}
                  {watching && (
                    <>
                      <SecondaryBtn onClick={stopGPS}>Stop</SecondaryBtn>
                      {currentReadings.length >= 2 && currentReadings.length < MIN_READINGS && (
                        <SecondaryBtn onClick={finishStationManually}>
                          <Check size={16} /> Finish Station ({currentReadings.length} readings)
                        </SecondaryBtn>
                      )}
                    </>
                  )}
                </div>
              </GPSStatus>

              {/* Accuracy warning */}
              {fixQuality && !fixQuality.locked && watching && (
                <WarningBox>
                  <AlertTriangle size={16} />
                  GPS lock not solid. Wait for a "3D Fix" before recording. Current accuracy: {fixQuality.label}
                </WarningBox>
              )}

              {/* GPS error */}
              {gpsError && (
                <ErrorMsg><AlertTriangle size={16} /> {gpsError}</ErrorMsg>
              )}

              {/* Countdown to next reading */}
              {watching && countdown > 0 && (
                <CountdownBar>
                  <Clock size={16} />
                  Next reading in {formatCountdown(countdown)} — hold still and let satellites settle
                </CountdownBar>
              )}

              {/* Current station readings (live) */}
              {watching && currentReadings.length > 0 && (
                <StationCard>
                  <StationHeader>
                    <StationTitle>
                      <Satellite size={14} />
                      Current Corner — {currentReadings.length}/{MIN_READINGS} readings
                    </StationTitle>
                  </StationHeader>
                  <StationReadings>
                    {currentReadings.map((r, i) => (
                      <div key={i}>
                        #{i + 1}: {r.lat.toFixed(6)}, {r.lng.toFixed(6)} (±{r.accuracy?.toFixed(1)}m)
                      </div>
                    ))}
                  </StationReadings>
                </StationCard>
              )}

              {/* Completed stations */}
              {stations.map((station, idx) => (
                <StationCard key={idx} $complete={station.complete}>
                  <StationHeader>
                    <StationTitle>
                      <CheckCircle2 size={14} style={{ color: '#22c55e' }} />
                      Corner {idx + 1} — {station.readings.length} readings averaged
                      {station.center.accuracy <= ACCURACY_THRESHOLD_M ? (
                        <span style={{ color: '#22c55e', fontSize: '0.75rem', marginLeft: '8px' }}>
                          ±{station.center.accuracy?.toFixed(1)}m ✓
                        </span>
                      ) : (
                        <span style={{ color: '#fbbf24', fontSize: '0.75rem', marginLeft: '8px' }}>
                          ±{station.center.accuracy?.toFixed(1)}m ⚠
                        </span>
                      )}
                    </StationTitle>
                    <SecondaryBtn onClick={() => removeStation(idx)} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                      <X size={12} /> Remove
                    </SecondaryBtn>
                  </StationHeader>
                  <StationReadings>
                    <div style={{ color: '#5ce1ff', marginBottom: '4px' }}>
                      Center: {station.center.lat.toFixed(6)}, {station.center.lng.toFixed(6)}
                      {station.center.readingsDropped > 0 && (
                        <span style={{ color: '#fbbf24', marginLeft: '8px' }}>
                          ({station.center.readingsDropped} outlier{station.center.readingsDropped !== 1 ? 's' : ''} removed)
                        </span>
                      )}
                    </div>
                    {station.readings.map((r, i) => (
                      <div key={i}>
                        #{i + 1}: {r.lat.toFixed(6)}, {r.lng.toFixed(6)} (±{r.accuracy?.toFixed(1)}m)
                      </div>
                    ))}
                  </StationReadings>
                </StationCard>
              ))}

              {/* Survey progress & instructions */}
              {stations.length > 0 && !surveyReady && (
                <WarningBox>
                  <AlertTriangle size={16} />
                  {4 - stations.length} more corner{4 - stations.length !== 1 ? 's' : ''} needed. Walk to the next corner and tap "Next Corner".
                </WarningBox>
              )}

              {surveyReady && (
                <SuccessMsg>
                  <CheckCircle2 size={18} />
                  Survey complete! {stations.length} corners recorded with averaged GPS. Ready to create parcel.
                </SuccessMsg>
              )}

              {/* Dimension cross-check */}
              <FormGroup style={{ marginTop: '16px' }}>
                <Label>Approximate Plot Size (optional cross-check)</Label>
                <DimToggle>
                  <DimToggleBtn $active={dimUnit === 'm'} onClick={() => setDimUnit('m')}>Meters</DimToggleBtn>
                  <DimToggleBtn $active={dimUnit === 'ft'} onClick={() => setDimUnit('ft')}>Feet</DimToggleBtn>
                </DimToggle>
                <DimRow>
                  <DimInput>
                    <Input
                      type="number"
                      placeholder={`Width (${dimUnit})`}
                      value={dimCheck.width}
                      onChange={(e) => setDimCheck({ ...dimCheck, enabled: true, width: e.target.value, result: null })}
                    />
                  </DimInput>
                  <DimInput>
                    <Input
                      type="number"
                      placeholder={`Height (${dimUnit})`}
                      value={dimCheck.height}
                      onChange={(e) => setDimCheck({ ...dimCheck, enabled: true, height: e.target.value, result: null })}
                    />
                  </DimInput>
                </DimRow>
                {dimCheck.result && !dimCheck.result.skip && (
                  dimCheck.result.valid ? (
                    <SuccessMsg style={{ marginTop: '8px', padding: '8px 12px', fontSize: '0.8rem' }}>
                      <CheckCircle2 size={14} /> {dimCheck.result.message}
                    </SuccessMsg>
                  ) : (
                    <WarningBox style={{ marginTop: '8px', padding: '8px 12px', fontSize: '0.8rem' }}>
                      <AlertTriangle size={14} /> {dimCheck.result.message}
                    </WarningBox>
                  )
                )}
              </FormGroup>

              {/* Instructions */}
              {stations.length === 0 && !watching && (
                <div style={{ padding: '16px', background: 'rgba(22,119,255,0.05)', borderRadius: '8px', fontSize: '0.85rem', color: '#aab7d4', lineHeight: 1.6 }}>
                  <strong style={{ color: '#5ce1ff' }}>How to survey your parcel:</strong><br />
                  1. Walk to the first corner of your parcel<br />
                  2. Tap "Start Survey" and stand still<br />
                  3. The app collects {MIN_READINGS}+ readings, spaced {READING_INTERVAL_MS / 1000}s apart<br />
                  4. Wait for a "3D Fix" — accuracy should be ±{ACCURACY_THRESHOLD_M}m or better<br />
                  5. The app auto-averages readings and removes outliers<br />
                  6. Walk to the next corner and tap "Next Corner"<br />
                  7. Repeat for all 4+ corners<br />
                  8. The app cross-checks the area if you entered dimensions
                </div>
              )}
            </>
          )}

          {tab === 'import' && (
            <FormGroup>
              <Label>Import Boundary File</Label>
              <DropZone
                $dragging={dragging}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <FileUp size={32} style={{ margin: '0 auto 12px' }} />
                <p>Drop a GeoJSON or CSV file here, or click to browse</p>
                <p style={{ fontSize: '0.8rem', marginTop: 8 }}>Supported: .geojson, .json, .csv (lat,lng per line)</p>
              </DropZone>
              <input
                id="file-input"
                type="file"
                accept=".geojson,.json,.csv"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
              />
            </FormGroup>
          )}

          <ButtonRow>
            <PrimaryBtn onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              {loading ? 'Creating...' : 'Create Parcel'}
            </PrimaryBtn>
            <SecondaryBtn onClick={() => navigate('/admin/parcels')}>
              <X size={16} /> Cancel
            </SecondaryBtn>
          </ButtonRow>
        </Form>
      </Page>
    </AdminLayout>
  );
}
