import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  MapPin, Search, Ruler, LogOut, Landmark, User, ChevronRight,
  CheckCircle2, X, AlertTriangle, Loader, ArrowLeft, Navigation,
  Home, LogIn, UserPlus,
} from 'lucide-react';
import api from '../services/api';

// ═══════════════════════════════════════════════════════════
const Page = styled.div`
  min-height: 100vh; background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text}; font-family: ${({ theme }) => theme.fonts.body};
`;

const TopBar = styled.header`
  position: sticky; top: 0; z-index: 1000;
  background: ${({ theme }) => theme.colors.background}f0; backdrop-filter: blur(12px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  padding: 12px 24px; display: flex; align-items: center; justify-content: space-between;
`;

const Logo = styled.div`
  display: flex; align-items: center; gap: 10px;
  font-size: 1.25rem; font-weight: 700; cursor: pointer;
`;

const LogoIcon = styled.div`
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 8px;
  background: linear-gradient(135deg, #1677ff, #5ce1ff);
`;

const TopNav = styled.nav`display: flex; gap: 8px;`;

const NavBtn = styled.button`
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px; border: 1px solid ${({ theme }) => theme.colors.borderDark};
  background: none; color: ${({ theme }) => theme.colors.textMuted};
  border-radius: 8px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s;
  &:hover { color: ${({ theme }) => theme.colors.text}; border-color: ${({ theme }) => theme.colors.primary}40; }
`;

const Content = styled.div`max-width: 1200px; margin: 0 auto; padding: 24px;`;

const Title = styled.h1`
  font-size: 2rem; font-weight: 700;
  display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
`;

const Subtitle = styled.p`color: #aab7d4; margin-bottom: 24px;`;

const SearchBar = styled.div`
  display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap;
`;

const SearchInput = styled.input`
  flex: 1; min-width: 200px; padding: 10px 14px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: 8px; color: ${({ theme }) => theme.colors.text};
  font-size: 0.9rem; outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const FilterSelect = styled.select`
  padding: 10px 14px; background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: 8px; color: ${({ theme }) => theme.colors.text};
  font-size: 0.9rem; outline: none; cursor: pointer;
`;

const Grid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
`;

const ListingCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: 12px; overflow: hidden; cursor: pointer;
  transition: all 0.2s;
  &:hover { border-color: ${({ theme }) => theme.colors.primary}60; transform: translateY(-2px); }
`;

const ListingImage = styled.div`
  width: 100%; height: 180px; background: linear-gradient(135deg, #0a1535, #102a5c);
  display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
  img { width: 100%; height: 100%; object-fit: cover; }
`;

const PriceTag = styled.div`
  position: absolute; bottom: 8px; left: 8px;
  background: rgba(8,15,36,0.85); padding: 4px 12px; border-radius: 6px;
  font-size: 1rem; font-weight: 700; color: #5ce1ff;
`;

const ListingBody = styled.div`padding: 14px;`;

const ListingTitle = styled.h3`
  font-size: 1rem; font-weight: 600; margin-bottom: 6px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;

const MetaRow = styled.div`
  display: flex; align-items: center; gap: 4px;
  color: #aab7d4; font-size: 0.8rem; margin-top: 4px;
`;

const EmptyState = styled.div`
  text-align: center; padding: 60px 20px; color: #aab7d4;
`;

// ── Detail Modal ──
const Modal = styled.div`
  position: fixed; inset: 0; z-index: 2000;
  background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center;
  padding: 20px; overflow-y: auto;
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: 16px; max-width: 600px; width: 100%;
  max-height: 90vh; overflow-y: auto; position: relative;
`;

const ModalHeader = styled.div`
  padding: 20px; border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  display: flex; align-items: center; justify-content: space-between;
`;

const ModalBody = styled.div`padding: 20px;`;

const DetailRow = styled.div`
  display: flex; justify-content: space-between; padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
`;

const DetailLabel = styled.span`color: #aab7d4; font-size: 0.85rem;`;
const DetailValue = styled.span`font-weight: 600; font-size: 0.9rem;`;

const HazardWarning = styled.div`
  padding: 12px; background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.3); border-radius: 8px;
  margin: 12px 0;
`;

const Btn = styled.button`
  display: flex; align-items: center; gap: 6px;
  padding: 12px 24px; border: none; border-radius: 8px;
  cursor: pointer; font-size: 0.9rem; font-weight: 600;
  width: 100%; justify-content: center; transition: opacity 0.2s;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const PrimaryBtn = styled(Btn)`background: linear-gradient(135deg, #1677ff, #5ce1ff); color: white;`;
const SuccessBtn = styled(Btn)`background: linear-gradient(135deg, #16a34a, #4ade80); color: white;`;

const FormGroup = styled.div`margin-bottom: 12px;`;
const Label = styled.label`display: block; font-size: 0.8rem; color: #aab7d4; margin-bottom: 4px;`;
const Input = styled.input`
  width: 100%; padding: 8px 12px; background: rgba(8,15,36,0.5);
  border: 1px solid ${({ theme }) => theme.colors.borderDark}; border-radius: 8px;
  color: ${({ theme }) => theme.colors.text}; font-size: 0.9rem; outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;
const TextArea = styled.textarea`
  width: 100%; padding: 8px 12px; background: rgba(8,15,36,0.5);
  border: 1px solid ${({ theme }) => theme.colors.borderDark}; border-radius: 8px;
  color: ${({ theme }) => theme.colors.text}; font-size: 0.9rem; outline: none;
  min-height: 60px; resize: vertical;
`;

const Toast = styled.div`
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 3000;
  display: flex; align-items: center; gap: 8px; padding: 12px 20px;
  background: ${({ $type }) => $type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'};
  border: 1px solid ${({ $type }) => $type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'};
  border-radius: 12px; color: ${({ $type }) => $type === 'error' ? '#f87171' : '#4ade80'};
  font-size: 0.9rem; backdrop-filter: blur(12px);
`;

export default function BuyLand() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [selectedListing, setSelectedListing] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    buyer_name: '', buyer_email: '', buyer_phone: '', buyer_address: '',
    full_name: '', id_type: '', id_number: '', occupation: '', purpose: '', financing_method: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const isLoggedIn = !!localStorage.getItem('token');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { loadListings(); }, []);

  const loadListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterRegion) params.append('region', filterRegion);
      if (filterMaxPrice) params.append('max_price', filterMaxPrice);
      const { data } = await api.get(`/marketplace/listings${params.toString() ? '?' + params.toString() : ''}`);
      setListings(data.listings || []);
    } catch (err) {
      showToast('Failed to load listings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openListing = async (listing) => {
    setSelectedListing({ id: listing.id, title: listing.title, approx_lat: listing.approx_lat, approx_lng: listing.approx_lng });
    setDetailLoading(true);
    try {
      const headers = {};
      const token = localStorage.getItem('token');
      if (token) headers.Authorization = `Bearer ${token}`;
      const { data } = await api.get(`/marketplace/listings/${listing.id}`, { headers });
      setSelectedListing(data);

      // Pre-fill buyer info if logged in
      if (isLoggedIn) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setPurchaseForm(prev => ({
            ...prev,
            buyer_name: user.name || '',
            buyer_email: user.email || '',
            buyer_phone: user.phone || '',
            full_name: user.name || '',
          }));
        }
      }
    } catch (err) {
      showToast('Failed to load listing details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleInquire = async () => {
    if (!isLoggedIn) { navigate('/login'); return; }
    try {
      await api.post(`/marketplace/listings/${selectedListing.id}/inquire`, {
        message: 'I am interested in this land. Please share more details.',
      });
      showToast('Inquiry sent to seller!');
    } catch (err) {
      showToast('Failed to send inquiry', 'error');
    }
  };

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) { navigate('/login'); return; }
    setSubmitting(true);
    try {
      await api.post(`/marketplace/listings/${selectedListing.id}/purchase`, {
        buyer_name: purchaseForm.buyer_name,
        buyer_email: purchaseForm.buyer_email,
        buyer_phone: purchaseForm.buyer_phone,
        buyer_address: purchaseForm.buyer_address,
        purchase_form: {
          full_name: purchaseForm.full_name,
          id_type: purchaseForm.id_type,
          id_number: purchaseForm.id_number,
          occupation: purchaseForm.occupation,
          purpose: purchaseForm.purpose,
          financing_method: purchaseForm.financing_method,
        },
      });
      showToast('Purchase initiated! Seller has been notified.');
      setShowPurchaseForm(false);
      setSelectedListing(null);
      navigate('/dashboard');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to initiate purchase', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = listings.filter(l => {
    if (search && !l.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <Page>
      <TopBar>
        <Logo onClick={() => navigate('/')}>
          <LogoIcon><Landmark size={20} /></LogoIcon>
          Earth<span style={{ color: '#5ce1ff' }}>Global</span>
        </Logo>
        <TopNav>
          <NavBtn onClick={() => navigate('/')}><Home size={16} /> Home</NavBtn>
          {isLoggedIn ? (
            <NavBtn onClick={() => navigate('/dashboard')}><User size={16} /> Dashboard</NavBtn>
          ) : (
            <>
              <NavBtn onClick={() => navigate('/login')}><LogIn size={16} /> Sign In</NavBtn>
              <NavBtn onClick={() => navigate('/signup')} style={{ borderColor: 'rgba(92,225,255,0.3)', color: '#5ce1ff' }}>
                <UserPlus size={16} /> Sign Up
              </NavBtn>
            </>
          )}
        </TopNav>
      </TopBar>

      <Content>
        <Title><MapPin size={28} color="#5ce1ff" /> Buy a Land</Title>
        <Subtitle>Browse available land for sale. Register to see exact locations, contact sellers, and initiate purchases.</Subtitle>

        <SearchBar>
          <SearchInput placeholder="Search by title..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <FilterSelect value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}>
            <option value="">All Regions</option>
          </FilterSelect>
          <FilterSelect value={filterMaxPrice} onChange={(e) => setFilterMaxPrice(e.target.value)}>
            <option value="">Any Price</option>
            <option value="50000">Under 50K</option>
            <option value="100000">Under 100K</option>
            <option value="500000">Under 500K</option>
            <option value="1000000">Under 1M</option>
          </FilterSelect>
          <NavBtn onClick={loadListings}><Search size={16} /> Search</NavBtn>
        </SearchBar>

        {loading ? (
          <EmptyState><Loader size={32} className="animate-spin" /></EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState>
            <MapPin size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div>No land listings available yet.</div>
            <div style={{ fontSize: '0.85rem', marginTop: 8 }}>
              Are you a land owner? <Link to="/signup" style={{ color: '#5ce1ff' }}>Register</Link> to list your land for sale.
            </div>
          </EmptyState>
        ) : (
          <Grid>
            {filtered.map(listing => (
              <ListingCard key={listing.id} onClick={() => openListing(listing)}>
                <ListingImage>
                  {listing.images && listing.images.length > 0 ? (
                    <img src={listing.images[0]} alt={listing.title} />
                  ) : (
                    <MapPin size={40} color="#5ce1ff" opacity={0.5} />
                  )}
                  <PriceTag>{listing.currency} {parseFloat(listing.price).toLocaleString()}</PriceTag>
                </ListingImage>
                <ListingBody>
                  <ListingTitle>{listing.title}</ListingTitle>
                  {listing.region && <MetaRow><MapPin size={12} /> {listing.region}</MetaRow>}
                  {listing.area_sqm && (
                    <MetaRow><Ruler size={12} /> {(listing.area_sqm / 10000).toFixed(2)} hectares</MetaRow>
                  )}
                  <MetaRow><MapPin size={12} /> Approx. location shown</MetaRow>
                </ListingBody>
              </ListingCard>
            ))}
          </Grid>
        )}
      </Content>

      {/* ── Listing Detail Modal ── */}
      {selectedListing && (
        <Modal onClick={(e) => { if (e.target === e.currentTarget) setSelectedListing(null); }}>
          <ModalContent>
            <ModalHeader>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedListing.title}</h2>
              <button onClick={() => { setSelectedListing(null); setShowPurchaseForm(false); }}
                style={{ background: 'none', border: 'none', color: '#aab7d4', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </ModalHeader>
            <ModalBody>
              {detailLoading ? (
                <EmptyState><Loader size={24} className="animate-spin" /></EmptyState>
              ) : selectedListing.requires_registration ? (
                <div>
                  <p>{selectedListing.description || 'No description provided.'}</p>
                  <DetailRow><DetailLabel>Region</DetailLabel><DetailValue>{selectedListing.region || '—'}</DetailValue></DetailRow>
                  <DetailRow><DetailLabel>Area</DetailLabel><DetailValue>{selectedListing.area_sqm ? Math.round(selectedListing.area_sqm).toLocaleString() + ' m²' : '—'}</DetailValue></DetailRow>
                  <DetailRow><DetailLabel>Price</DetailLabel><DetailValue style={{ color: '#5ce1ff' }}>{selectedListing.currency} {parseFloat(selectedListing.price).toLocaleString()}</DetailValue></DetailRow>
                  <div style={{ padding: 16, background: 'rgba(92,225,255,0.1)', borderRadius: 8, marginTop: 16, textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', marginBottom: 12 }}>
                      Register or log in to see the exact location, seller details, and initiate a purchase.
                    </p>
                    <PrimaryBtn onClick={() => navigate('/login')}><LogIn size={16} /> Sign In to See More</PrimaryBtn>
                  </div>
                </div>
              ) : showPurchaseForm ? (
                <form onSubmit={handlePurchase}>
                  <h3 style={{ marginBottom: 16 }}>Purchase Form</h3>
                  <FormGroup>
                    <Label>Full Name *</Label>
                    <Input value={purchaseForm.buyer_name} onChange={(e) => setPurchaseForm({ ...purchaseForm, buyer_name: e.target.value, full_name: e.target.value })} required />
                  </FormGroup>
                  <FormGroup>
                    <Label>Email</Label>
                    <Input type="email" value={purchaseForm.buyer_email} onChange={(e) => setPurchaseForm({ ...purchaseForm, buyer_email: e.target.value })} />
                  </FormGroup>
                  <FormGroup>
                    <Label>Phone *</Label>
                    <Input value={purchaseForm.buyer_phone} onChange={(e) => setPurchaseForm({ ...purchaseForm, buyer_phone: e.target.value })} required />
                  </FormGroup>
                  <FormGroup>
                    <Label>Address</Label>
                    <Input value={purchaseForm.buyer_address} onChange={(e) => setPurchaseForm({ ...purchaseForm, buyer_address: e.target.value })} />
                  </FormGroup>
                  <FormGroup>
                    <Label>ID Type</Label>
                    <Input value={purchaseForm.id_type} onChange={(e) => setPurchaseForm({ ...purchaseForm, id_type: e.target.value })}
                      placeholder="e.g., Ghana Card, Passport, Driver's License" />
                  </FormGroup>
                  <FormGroup>
                    <Label>ID Number</Label>
                    <Input value={purchaseForm.id_number} onChange={(e) => setPurchaseForm({ ...purchaseForm, id_number: e.target.value })} />
                  </FormGroup>
                  <FormGroup>
                    <Label>Occupation</Label>
                    <Input value={purchaseForm.occupation} onChange={(e) => setPurchaseForm({ ...purchaseForm, occupation: e.target.value })} />
                  </FormGroup>
                  <FormGroup>
                    <Label>Purpose of Land</Label>
                    <Input value={purchaseForm.purpose} onChange={(e) => setPurchaseForm({ ...purchaseForm, purpose: e.target.value })}
                      placeholder="e.g., Residential, Commercial, Farming" />
                  </FormGroup>
                  <FormGroup>
                    <Label>Financing Method</Label>
                    <Input value={purchaseForm.financing_method} onChange={(e) => setPurchaseForm({ ...purchaseForm, financing_method: e.target.value })}
                      placeholder="e.g., Cash, Mortgage, Bank Loan" />
                  </FormGroup>
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <PrimaryBtn type="submit" disabled={submitting}>
                      {submitting ? <Loader size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                      {submitting ? 'Submitting...' : 'Initiate Purchase'}
                    </PrimaryBtn>
                    <NavBtn onClick={() => setShowPurchaseForm(false)} style={{ width: 'auto' }}>
                      <ArrowLeft size={16} /> Back
                    </NavBtn>
                  </div>
                </form>
              ) : (
                <div>
                  {selectedListing.description && (
                    <p style={{ marginBottom: 16 }}>{selectedListing.description}</p>
                  )}

                  <DetailRow><DetailLabel>Region</DetailLabel><DetailValue>{selectedListing.region || '—'}</DetailValue></DetailRow>
                  <DetailRow><DetailLabel>Area</DetailLabel><DetailValue>{selectedListing.area_sqm ? Math.round(selectedListing.area_sqm).toLocaleString() + ' m² (' + (selectedListing.area_sqm / 10000).toFixed(2) + ' ha)' : '—'}</DetailValue></DetailRow>
                  <DetailRow><DetailLabel>Price</DetailLabel><DetailValue style={{ color: '#5ce1ff', fontSize: '1.1rem' }}>{selectedListing.currency} {parseFloat(selectedListing.price).toLocaleString()}</DetailValue></DetailRow>
                  <DetailRow><DetailLabel>Location</DetailLabel><DetailValue>{selectedListing.centroid_lat?.toFixed(4)}, {selectedListing.centroid_lng?.toFixed(4)}</DetailValue></DetailRow>
                  {selectedListing.seller_name && (
                    <DetailRow><DetailLabel>Seller</DetailLabel><DetailValue>{selectedListing.seller_name}</DetailValue></DetailRow>
                  )}
                  {selectedListing.seller_phone && (
                    <DetailRow><DetailLabel>Seller Phone</DetailLabel><DetailValue>{selectedListing.seller_phone}</DetailValue></DetailRow>
                  )}
                  {selectedListing.seller_email && (
                    <DetailRow><DetailLabel>Seller Email</DetailLabel><DetailValue>{selectedListing.seller_email}</DetailValue></DetailRow>
                  )}

                  {selectedListing.centroid_lat && (
                    <a href={`https://www.google.com/maps?q=${selectedListing.centroid_lat},${selectedListing.centroid_lng}&z=16`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, color: '#5ce1ff', fontSize: '0.85rem' }}>
                      <Navigation size={14} /> View on Google Maps
                    </a>
                  )}

                  {/* Nearby hazards */}
                  {selectedListing.nearby_hazards && selectedListing.nearby_hazards.length > 0 && (
                    <HazardWarning>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f87171', fontWeight: 600, fontSize: '0.85rem' }}>
                        <AlertTriangle size={16} /> {selectedListing.nearby_hazards.length} Environmental Hazard(s) Nearby
                      </div>
                      {selectedListing.nearby_hazards.slice(0, 5).map((h, i) => {
                        const labels = { water_pollution: 'Water Pollution', flood_prone: 'Flood-Prone', illegal_mining: 'Illegal Mining', open_dump: 'Open Dump' };
                        return (
                          <div key={i} style={{ fontSize: '0.75rem', marginTop: 4, color: '#aab7d4' }}>
                            {labels[h.hazard_type] || h.hazard_type} ({h.severity}) — {(h.distance_m / 1000).toFixed(2)} km away
                          </div>
                        );
                      })}
                    </HazardWarning>
                  )}

                  <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <SuccessBtn onClick={() => setShowPurchaseForm(true)}>
                      <CheckCircle2 size={16} /> Initiate Purchase
                    </SuccessBtn>
                    <NavBtn onClick={handleInquire} style={{ width: '100%', justifyContent: 'center' }}>
                      <User size={16} /> Request More Details
                    </NavBtn>
                  </div>
                </div>
              )}
            </ModalBody>
          </ModalContent>
        </Modal>
      )}

      {toast && (
        <Toast $type={toast.type}>
          {toast.type === 'error' ? <X size={16} /> : <CheckCircle2 size={16} />}
          {toast.msg}
        </Toast>
      )}
    </Page>
  );
}
