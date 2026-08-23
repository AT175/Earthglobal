import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  Landmark, LogOut, CheckCircle2, XCircle, Loader, MapPin, DollarSign,
  AlertTriangle, FileText, ArrowLeft, X, Search,
} from 'lucide-react';
import api from '../../services/api';

const Page = styled.div`
  min-height: 100vh; background: #0a1535; color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;

const TopBar = styled.header`
  position: sticky; top: 0; z-index: 100;
  background: rgba(10,21,53,0.95); backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding: 12px 24px; display: flex; align-items: center; justify-content: space-between;
  gap: 8px; flex-wrap: wrap;
  @media (max-width: 768px) { padding: 12px 16px; }
`;

const Logo = styled.div`display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1.1rem;`;

const Container = styled.div`max-width: 1000px; margin: 0 auto; padding: 24px; @media (max-width: 768px) { padding: 16px; }`;

const Title = styled.h1`font-size: 1.5rem; display: flex; align-items: center; gap: 8px; margin-bottom: 8px;`;
const Subtitle = styled.p`color: #aab7d4; margin-bottom: 24px;`;

const FilterRow = styled.div`display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;`;
const FilterBtn = styled.button`
  padding: 6px 14px; border: 1px solid rgba(255,255,255,0.1);
  background: ${p => p.$active ? 'rgba(92,225,255,0.15)' : 'transparent'};
  color: ${p => p.$active ? '#5ce1ff' : '#aab7d4'};
  border-radius: 8px; cursor: pointer; font-size: 0.85rem;
`;

const Card = styled.div`
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px; padding: 16px; margin-bottom: 12px;
`;

const CardHeader = styled.div`display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;`;
const CardTitle = styled.h3`font-size: 1rem; font-weight: 600;`;

const StatusPill = styled.span`
  padding: 3px 10px; border-radius: 999px; font-size: 0.7rem; font-weight: 600;
  background: ${p => p.$bg}; color: ${p => p.$color};
`;

const MetaRow = styled.div`display: flex; gap: 12px; flex-wrap: wrap; font-size: 0.8rem; color: #aab7d4; margin-top: 8px;`;

const ValidationInfo = styled.div`
  margin-top: 12px; padding: 12px; background: rgba(92,225,255,0.05);
  border: 1px solid rgba(92,225,255,0.15); border-radius: 8px;
  font-size: 0.85rem;
`;

const HazardBox = styled.div`
  margin-top: 8px; padding: 10px; background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2); border-radius: 8px;
  font-size: 0.8rem; color: '#f87171';
`;

const Btn = styled.button`
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px; border: none; border-radius: 8px;
  cursor: pointer; font-size: 0.85rem; font-weight: 600;
`;
const SuccessBtn = styled(Btn)`background: linear-gradient(135deg, #16a34a, #4ade80); color: white;`;
const DangerBtn = styled(Btn)`background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #f87171;`;
const SecondaryBtn = styled(Btn)`background: none; border: 1px solid rgba(255,255,255,0.1); color: #aab7d4;`;

const BtnRow = styled.div`display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;`;

const FormGroup = styled.div`margin-bottom: 12px;`;
const Label = styled.label`display: block; font-size: 0.8rem; color: #aab7d4; margin-bottom: 4px;`;
const Input = styled.input`
  width: 100%; padding: 8px 12px; background: rgba(8,15,36,0.5);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
  color: #fff; font-size: 0.9rem; outline: none;
`;
const TextArea = styled.textarea`
  width: 100%; padding: 8px 12px; background: rgba(8,15,36,0.5);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
  color: #fff; font-size: 0.9rem; outline: none; min-height: 60px; resize: vertical;
`;

const Modal = styled.div`
  position: fixed; inset: 0; z-index: 2000;
  background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center;
  padding: 20px; overflow-y: auto;
`;
const ModalContent = styled.div`
  background: #0a1535; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;
`;
const ModalHeader = styled.div`
  padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1);
  display: flex; align-items: center; justify-content: space-between;
`;
const ModalBody = styled.div`padding: 20px;`;

const EmptyState = styled.div`text-align: center; padding: 60px 20px; color: #aab7d4;`;

const Toast = styled.div`
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 3000;
  display: flex; align-items: center; gap: 8px; padding: 12px 20px;
  background: ${p => p.$type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'};
  border: 1px solid ${p => p.$type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'};
  border-radius: 12px; color: ${p => p.$type === 'error' ? '#f87171' : '#4ade80'};
  font-size: 0.9rem;
`;

const statusColors = {
  pending_review: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  published: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  rejected: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  pending_sale: { bg: 'rgba(92,225,255,0.15)', color: '#5ce1ff' },
  sold: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc' },
  withdrawn: { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af' },
};

export default function MarketplaceApprovals() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending_review');
  const [toast, setToast] = useState(null);
  const [reviewListing, setReviewListing] = useState(null);
  const [reviewForm, setReviewForm] = useState({ validation_status: 'confirmed', planner_notes: '', confirmed_parcel_id: '' });
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => { loadListings(); }, [filter]);

  const loadListings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/marketplace/planner/listings${filter ? '?status=' + filter : ''}`);
      setListings(data);
    } catch (err) {
      showToast('Failed to load listings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!reviewListing) return;
    setSubmitting(true);
    try {
      await api.patch(`/marketplace/planner/listings/${reviewListing.id}/confirm`, reviewForm);
      showToast(reviewForm.validation_status === 'confirmed' ? 'Listing confirmed and published!' : reviewForm.validation_status === 'rejected' ? 'Listing rejected' : 'Listing validated');
      setReviewListing(null);
      loadListings();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to review listing', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const filters = [
    { id: 'pending_review', label: 'Pending Review' },
    { id: 'published', label: 'Published' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'pending_sale', label: 'Pending Sale' },
    { id: 'sold', label: 'Sold' },
  ];

  return (
    <Page>
      <TopBar>
        <Logo>
          <Landmark size={20} /> Earth<span style={{ color: '#5ce1ff' }}>Global</span>
        </Logo>
        <div style={{ display: 'flex', gap: 8 }}>
          <SecondaryBtn onClick={() => navigate('/assembly')}><ArrowLeft size={16} /> Back to Dashboard</SecondaryBtn>
          <SecondaryBtn onClick={handleLogout}><LogOut size={16} /> Logout</SecondaryBtn>
        </div>
      </TopBar>

      <Container>
        <Title><Landmark size={22} /> Land Sale Approvals</Title>
        <Subtitle>Review and confirm land listings before they are published on the marketplace.</Subtitle>

        <FilterRow>
          {filters.map(f => (
            <FilterBtn key={f.id} $active={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </FilterBtn>
          ))}
        </FilterRow>

        {loading ? (
          <EmptyState><Loader size={28} className="animate-spin" /></EmptyState>
        ) : listings.length === 0 ? (
          <EmptyState>
            <FileText size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div>No listings in this category.</div>
          </EmptyState>
        ) : (
          listings.map(listing => {
            const sc = statusColors[listing.status] || statusColors.pending_review;
            return (
              <Card key={listing.id}>
                <CardHeader>
                  <div>
                    <CardTitle>{listing.title}</CardTitle>
                    <MetaRow>
                      <span>Seller: {listing.seller_name}</span>
                      {listing.seller_phone && <span>{listing.seller_phone}</span>}
                      {listing.region && <span><MapPin size={11} /> {listing.region}</span>}
                      <span><DollarSign size={11} /> {listing.currency} {parseFloat(listing.price).toLocaleString()}</span>
                      <span>Commission: {listing.currency} {parseFloat(listing.platform_fee_amount).toLocaleString()}</span>
                    </MetaRow>
                  </div>
                  <StatusPill $bg={sc.bg} $color={sc.color}>{listing.status.replace(/_/g, ' ')}</StatusPill>
                </CardHeader>

                {listing.description && (
                  <div style={{ fontSize: '0.85rem', color: '#aab7d4', marginTop: 8 }}>{listing.description}</div>
                )}

                {/* Validation result */}
                {listing.validation_result && listing.validation_result.searched && (
                  <ValidationInfo>
                    <div style={{ fontWeight: 600, marginBottom: 6, color: '#5ce1ff' }}>
                      <Search size={14} /> Auto-Validation Result
                    </div>
                    {listing.validation_result.matches.length > 0 ? (
                      <div>
                        <div style={{ marginBottom: 4 }}>{listing.validation_result.matches.length} matching parcel(s) found:</div>
                        {listing.validation_result.matches.map((m, i) => (
                          <div key={i} style={{ fontSize: '0.75rem', marginLeft: 12 }}>
                            • {m.name} ({m.region || 'N/A'}) — {m.distance_m.toFixed(0)}m away
                            {m.owner_name && ` — Owner: ${m.owner_name}`}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem' }}>No matching parcels found in the database.</div>
                    )}
                  </ValidationInfo>
                )}

                {/* Nearby hazards */}
                {listing.nearby_hazards && listing.nearby_hazards.length > 0 && (
                  <HazardBox>
                    <div style={{ fontWeight: 600, color: '#f87171', marginBottom: 4 }}>
                      <AlertTriangle size={14} /> {listing.nearby_hazards.length} Environmental Hazard(s) Nearby
                    </div>
                    {listing.nearby_hazards.slice(0, 5).map((h, i) => {
                      const labels = { water_pollution: 'Water Pollution', flood_prone: 'Flood-Prone', illegal_mining: 'Illegal Mining', open_dump: 'Open Dump' };
                      return (
                        <div key={i} style={{ fontSize: '0.75rem', marginLeft: 12 }}>
                          • {labels[h.hazard_type] || h.hazard_type} ({h.severity}) — {(h.distance_m / 1000).toFixed(2)} km
                        </div>
                      );
                    })}
                  </HazardBox>
                )}

                {listing.planner_notes && (
                  <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#aab7d4' }}>
                    Previous notes: {listing.planner_notes}
                  </div>
                )}

                {listing.status === 'pending_review' && (
                  <BtnRow>
                    <SuccessBtn onClick={() => {
                      setReviewListing(listing);
                      setReviewForm({ validation_status: 'confirmed', planner_notes: '', confirmed_parcel_id: listing.validation_result?.matches?.[0]?.id || '' });
                    }}>
                      <CheckCircle2 size={14} /> Review & Confirm
                    </SuccessBtn>
                  </BtnRow>
                )}
              </Card>
            );
          })
        )}
      </Container>

      {/* Review Modal */}
      {reviewListing && (
        <Modal onClick={(e) => { if (e.target === e.currentTarget) setReviewListing(null); }}>
          <ModalContent>
            <ModalHeader>
              <h2 style={{ fontSize: '1.25rem' }}>Review Listing</h2>
              <button onClick={() => setReviewListing(null)} style={{ background: 'none', border: 'none', color: '#aab7d4', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </ModalHeader>
            <ModalBody>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600 }}>{reviewListing.title}</div>
                <div style={{ fontSize: '0.85rem', color: '#aab7d4', marginTop: 4 }}>
                  Seller: {reviewListing.seller_name} | Price: {reviewListing.currency} {parseFloat(reviewListing.price).toLocaleString()}
                </div>
              </div>

              <FormGroup>
                <Label>Decision</Label>
                <select value={reviewForm.validation_status}
                  onChange={(e) => setReviewForm({ ...reviewForm, validation_status: e.target.value })}
                  style={{ width: '100%', padding: 8, background: 'rgba(8,15,36,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}>
                  <option value="confirmed">Confirm & Publish</option>
                  <option value="validated">Validate (needs more info)</option>
                  <option value="rejected">Reject</option>
                </select>
              </FormGroup>

              {reviewForm.validation_status === 'confirmed' && reviewListing.validation_result?.matches?.length > 0 && (
                <FormGroup>
                  <Label>Link to Parcel (optional)</Label>
                  <select value={reviewForm.confirmed_parcel_id}
                    onChange={(e) => setReviewForm({ ...reviewForm, confirmed_parcel_id: e.target.value })}
                    style={{ width: '100%', padding: 8, background: 'rgba(8,15,36,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}>
                    <option value="">— None —</option>
                    {reviewListing.validation_result.matches.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.distance_m.toFixed(0)}m away)</option>
                    ))}
                  </select>
                </FormGroup>
              )}

              <FormGroup>
                <Label>Notes for Seller</Label>
                <TextArea value={reviewForm.planner_notes}
                  onChange={(e) => setReviewForm({ ...reviewForm, planner_notes: e.target.value })}
                  placeholder="Add any notes or conditions for the seller..." />
              </FormGroup>

              <BtnRow>
                <SuccessBtn onClick={handleReview} disabled={submitting}>
                  {submitting ? <Loader size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </SuccessBtn>
                <SecondaryBtn onClick={() => setReviewListing(null)}>Cancel</SecondaryBtn>
              </BtnRow>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}

      {toast && (
        <Toast $type={toast.type}>
          {toast.type === 'error' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.msg}
        </Toast>
      )}
    </Page>
  );
}
