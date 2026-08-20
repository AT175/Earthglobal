import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Search, Plus, Building2, Calendar, Ruler, Eye, Loader,
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';

const Page = styled.div`
  color: ${({ theme }) => theme.colors.text};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
`;

const AddBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  background: ${({ theme }) => theme.colors.gradientPrimary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  transition: all 0.2s;

  &:hover { transform: translateY(-1px); box-shadow: ${({ theme }) => theme.shadows.glowPrimarySoft}; }
`;

const Toolbar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  flex: 1;
  max-width: 400px;
`;

const SearchInput = styled.input`
  flex: 1;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  outline: none;

  &::placeholder { color: ${({ theme }) => theme.colors.textMuted}; }
`;

const FilterSelect = styled.select`
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  outline: none;
  cursor: pointer;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`;

const ParcelCard = styled.div`
  background: ${({ theme }) => theme.colors.gradientSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[5]};
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.borderLight};
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.glowPrimarySoft};
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const ParcelIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: rgba(22,119,255,0.15);
  color: #3ba7ff;
`;

const ParcelName = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  margin-bottom: 4px;
`;

const ParcelRegion = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const MetaRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  padding-top: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.borderDark};
  margin-top: ${({ theme }) => theme.spacing[3]};
`;

const MetaItem = styled.div`
  flex: 1;
`;

const MetaLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 2px;
`;

const MetaValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const Loading = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};

  @media (max-width: 640px) { grid-template-columns: 1fr; }
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.gradientSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[5]};
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
`;

const StatLabel = styled.div`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-top: 4px;
`;

const fmtArea = (sqm) => {
  if (!sqm) return '—';
  if (sqm >= 10000) return `${(sqm / 10000).toFixed(2)} ha`;
  return `${Math.round(sqm)} m²`;
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function ParcelsList() {
  const navigate = useNavigate();
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('');

  useEffect(() => {
    api.get('/parcels')
      .then((res) => setParcels(res.data))
      .catch((err) => console.error('Failed to load parcels', err))
      .finally(() => setLoading(false));
  }, []);

  const regions = [...new Set(parcels.map(p => p.region).filter(Boolean))];

  const filtered = parcels.filter(p => {
    const matchSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.region?.toLowerCase().includes(search.toLowerCase());
    const matchRegion = !regionFilter || p.region === regionFilter;
    return matchSearch && matchRegion;
  });

  const totalArea = parcels.reduce((sum, p) => sum + (parseFloat(p.area_sqm) || 0), 0);

  return (
    <AdminLayout>
      <Page>
        <Header>
          <PageTitle>Parcels</PageTitle>
          <AddBtn onClick={() => navigate('/admin')}><Plus size={18} /> Add Parcel</AddBtn>
        </Header>

        <StatsRow>
          <StatCard>
            <StatValue>{parcels.length}</StatValue>
            <StatLabel>Total Parcels</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{fmtArea(totalArea)}</StatValue>
            <StatLabel>Total Area</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{regions.length}</StatValue>
            <StatLabel>Regions Covered</StatLabel>
          </StatCard>
        </StatsRow>

        <Toolbar>
          <SearchBar>
            <Search size={18} color="#aab7d4" />
            <SearchInput
              placeholder="Search parcels by name or region..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </SearchBar>
          {regions.length > 0 && (
            <FilterSelect value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
              <option value="">All Regions</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </FilterSelect>
          )}
        </Toolbar>

        {loading ? (
          <Loading><Loader size={24} className="animate-spin" style={{ display: 'inline-block' }} /> Loading parcels...</Loading>
        ) : filtered.length === 0 ? (
          <EmptyState>
            {search || regionFilter ? 'No parcels match your filters.' : 'No parcels registered yet. Click "Add Parcel" to onboard one.'}
          </EmptyState>
        ) : (
          <Grid>
            {filtered.map((parcel) => (
              <ParcelCard key={parcel.id} onClick={() => navigate(`/parcels/${parcel.id}`)}>
                <CardHeader>
                  <ParcelIcon><MapPin size={22} /></ParcelIcon>
                  <Eye size={18} color="#aab7d4" />
                </CardHeader>
                <ParcelName>{parcel.name}</ParcelName>
                <ParcelRegion><MapPin size={13} /> {parcel.region || 'No region assigned'}</ParcelRegion>

                <MetaRow>
                  <MetaItem>
                    <MetaLabel>Area</MetaLabel>
                    <MetaValue><Ruler size={13} color="#aab7d4" /> {fmtArea(parseFloat(parcel.area_sqm))}</MetaValue>
                  </MetaItem>
                  <MetaItem>
                    <MetaLabel>Surveyed</MetaLabel>
                    <MetaValue><Calendar size={13} color="#aab7d4" /> {fmtDate(parcel.survey_date)}</MetaValue>
                  </MetaItem>
                </MetaRow>
              </ParcelCard>
            ))}
          </Grid>
        )}
      </Page>
    </AdminLayout>
  );
}
