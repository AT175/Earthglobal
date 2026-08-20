import { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, FileUp, Navigation, Save, X, CheckCircle2, Loader,
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';

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

export default function ParcelOnboarding() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('manual');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [watching, setWatching] = useState(false);
  const [gpsPoints, setGpsPoints] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [owners, setOwners] = useState([]);

  const [form, setForm] = useState({
    name: '', owner_id: '', region: '', boundary_coords: '', survey_date: '',
  });

  // Load owners for the dropdown
  useState(() => {
    api.get('/parcels').then(() => {}).catch(() => {});
    // Fetch owners — there's no direct owners endpoint, so we derive from parcels
    api.get('/agents').catch(() => {});
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ── GPS Survey ──
  const startGPS = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported by this browser'); return; }
    setWatching(true);
    setGpsPoints([]);
    setError('');

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsPoints((prev) => [...prev, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }]);
      },
      (err) => { setError(`GPS error: ${err.message}`); setWatching(false); },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
    window._gpsWatchId = watchId;
  };

  const stopGPS = () => {
    if (window._gpsWatchId !== undefined) navigator.geolocation.clearWatch(window._gpsWatchId);
    setWatching(false);
  };

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
    if (!form.boundary_coords && gpsPoints.length === 0) { setError('Boundary coordinates are required'); return; }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const coordsStr = gpsPoints.length > 0
        ? gpsPoints.map(p => `${p.lat},${p.lng}`).join('\n')
        : form.boundary_coords;

      const coords = coordsStr.trim().split('\n').map(line => {
        const [lat, lng] = line.trim().split(',').map(parseFloat);
        return [lng, lat]; // GeoJSON is [lng, lat]
      });

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
      setGpsPoints([]);
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
              <GPSStatus>
                {watching ? <Loader size={20} className="animate-spin" /> : <Navigation size={20} />}
                <div>
                  <div style={{ fontWeight: 500 }}>{watching ? 'Recording GPS points...' : 'GPS not active'}</div>
                  <div style={{ fontSize: '0.8rem', color: '#aab7d4' }}>{gpsPoints.length} points captured</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  <SecondaryBtn onClick={watching ? stopGPS : startGPS}>
                    {watching ? 'Stop' : 'Start'} Survey
                  </SecondaryBtn>
                  {gpsPoints.length > 0 && (
                    <SecondaryBtn onClick={() => setGpsPoints([])}>Clear</SecondaryBtn>
                  )}
                </div>
              </GPSStatus>

              {gpsPoints.length > 0 && (
                <CoordsList>
                  {gpsPoints.map((p, i) => (
                    <div key={i}>#{i + 1}: {p.lat.toFixed(6)}, {p.lng.toFixed(6)} (±{p.accuracy?.toFixed(0)}m)</div>
                  ))}
                </CoordsList>
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
