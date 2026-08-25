import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  MapPin, Plus, FileText, DollarSign, CheckCircle2, XCircle, Loader,
  LogOut, Landmark, User, AlertTriangle, Download, ArrowLeft, X,
  TrendingUp, Package, Receipt as ReceiptIcon, ChevronRight,
} from 'lucide-react';
import api from '../services/api';
import { useRoleLayout } from '../hooks/useRoleLayout';

const Header = styled.div`margin-bottom: 24px;`;
const Title = styled.h1`font-size: 1.75rem; display: flex; align-items: center; gap: 8px;`;
const Subtitle = styled.p`color: #aab7d4; margin-top: 4px;`;

const StatsGrid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px; margin-bottom: 24px;
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: 12px; padding: 16px;
`;

const StatValue = styled.div`font-size: 1.5rem; font-weight: 700; color: ${p => p.$color || '#fff'};`;
const StatLabel = styled.div`font-size: 0.75rem; color: #aab7d4; margin-top: 4px; text-transform: uppercase;`;

const Tabs = styled.div`display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1);`;
const Tab = styled.button`
  padding: 10px 16px; border: none; background: none;
  color: ${p => p.$active ? '#5ce1ff' : '#aab7d4'};
  font-size: 0.85rem; font-weight: 600; cursor: pointer;
  border-bottom: 2px solid ${p => p.$active ? '#5ce1ff' : 'transparent'};
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: 12px; padding: 16px; margin-bottom: 12px;
`;

const CardTitle = styled.div`font-weight: 600; font-size: 1rem; display: flex; align-items: center; gap: 6px;`;
const MetaRow = styled.div`display: flex; gap: 12px; flex-wrap: wrap; font-size: 0.8rem; color: #aab7d4; margin-top: 8px;`;

const StatusPill = styled.span`
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 10px; border-radius: 999px;
  font-size: 0.7rem; font-weight: 600;
  background: ${p => p.$bg}; color: ${p => p.$color};
`;

const statusColors = {
  draft: { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af' },
  pending_review: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  published: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  pending_sale: { bg: 'rgba(92,225,255,0.15)', color: '#5ce1ff' },
  sold: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc' },
  withdrawn: { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af' },
  rejected: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  initiated: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  seller_accepted: { bg: 'rgba(92,225,255,0.15)', color: '#5ce1ff' },
  payment_confirmed: { bg: 'rgba(92,225,255,0.15)', color: '#5ce1ff' },
  receipt_generated: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc' },
  completed: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  ownership_transferred: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
};

const Btn = styled.button`
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px; border: none; border-radius: 8px;
  cursor: pointer; font-size: 0.85rem; font-weight: 600;
  transition: opacity 0.2s; &:disabled { opacity: 0.5; }
`;
const PrimaryBtn = styled(Btn)`background: linear-gradient(135deg, #1677ff, #5ce1ff); color: white;`;
const SuccessBtn = styled(Btn)`background: linear-gradient(135deg, #16a34a, #4ade80); color: white;`;
const DangerBtn = styled(Btn)`background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #f87171;`;
const SecondaryBtn = styled(Btn)`background: none; border: 1px solid rgba(255,255,255,0.1); color: #aab7d4;`;

const BtnRow = styled.div`display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;`;

const FormGroup = styled.div`margin-bottom: 12px;`;
const Label = styled.label`display: block; font-size: 0.8rem; color: #aab7d4; margin-bottom: 4px;`;
const Input = styled.input`
  width: 100%; padding: 8px 12px; background: rgba(8,15,36,0.5);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
  color: #fff; font-size: 0.9rem; outline: none;
  &:focus { border-color: #1677ff; }
`;
const TextArea = styled.textarea`
  width: 100%; padding: 8px 12px; background: rgba(8,15,36,0.5);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
  color: #fff; font-size: 0.9rem; outline: none; min-height: 60px; resize: vertical;
`;

const EmptyState = styled.div`text-align: center; padding: 40px 20px; color: #aab7d4;`;

const Modal = styled.div`
  position: fixed; inset: 0; z-index: 2000;
  background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center;
  padding: 20px; overflow-y: auto;
`;
const ModalContent = styled.div`
  background: #0a1535; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px; max-width: 600px; width: 100%;
  max-height: 90vh; overflow-y: auto;
`;
const ModalHeader = styled.div`
  padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1);
  display: flex; align-items: center; justify-content: space-between;
`;
const ModalBody = styled.div`padding: 20px;`;

const Toast = styled.div`
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 3000;
  display: flex; align-items: center; gap: 8px; padding: 12px 20px;
  background: ${p => p.$type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'};
  border: 1px solid ${p => p.$type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'};
  border-radius: 12px; color: ${p => p.$type === 'error' ? '#f87171' : '#4ade80'};
  font-size: 0.9rem;
`;

export default function SellerDashboard() {
  const navigate = useNavigate();
  const { Layout } = useRoleLayout();
  const [activeTab, setActiveTab] = useState('listings');
  const [listings, setListings] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Create listing form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '', description: '', region: '', area_sqm: '', price: '',
    centroid_lat: '', centroid_lng: '', parcel_id: '',
  });
  const [creating, setCreating] = useState(false);

  // Receipt generation
  const [receiptPurchase, setReceiptPurchase] = useState(null);
  const [receiptForm, setReceiptForm] = useState({ payment_method: 'bank_transfer', payment_reference: '' });
  const [generating, setGenerating] = useState(false);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [listingsRes, salesRes, purchasesRes, receiptsRes, statsRes] = await Promise.all([
        api.get('/marketplace/my-listings').catch(() => ({ data: [] })),
        api.get('/marketplace/my-sales').catch(() => ({ data: [] })),
        api.get('/marketplace/my-purchases').catch(() => ({ data: [] })),
        api.get('/marketplace/my-receipts').catch(() => ({ data: [] })),
        api.get('/marketplace/seller/stats').catch(() => ({ data: null })),
      ]);
      setListings(listingsRes.data);
      setSales(salesRes.data);
      setPurchases(purchasesRes.data);
      setReceipts(receiptsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    if (!createForm.title || !createForm.price || !createForm.centroid_lat || !createForm.centroid_lng) {
      showToast('Title, price, and location are required', 'error');
      return;
    }
    setCreating(true);
    try {
      await api.post('/marketplace/listings', {
        ...createForm,
        area_sqm: createForm.area_sqm ? parseFloat(createForm.area_sqm) : null,
        price: parseFloat(createForm.price),
        centroid_lat: parseFloat(createForm.centroid_lat),
        centroid_lng: parseFloat(createForm.centroid_lng),
      });
      showToast('Listing created! A planner will review it before publishing.');
      setShowCreateForm(false);
      setCreateForm({ title: '', description: '', region: '', area_sqm: '', price: '', centroid_lat: '', centroid_lng: '', parcel_id: '' });
      loadAll();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create listing', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleAccept = async (purchaseId) => {
    try {
      await api.patch(`/marketplace/purchases/${purchaseId}/accept`);
      showToast('Purchase accepted');
      loadAll();
    } catch (err) { showToast('Failed to accept', 'error'); }
  };

  const handleReject = async (purchaseId) => {
    try {
      await api.patch(`/marketplace/purchases/${purchaseId}/reject`, { reason: 'Rejected by seller' });
      showToast('Purchase rejected');
      loadAll();
    } catch (err) { showToast('Failed to reject', 'error'); }
  };

  const handleConfirmPayment = async (purchaseId) => {
    try {
      await api.patch(`/marketplace/purchases/${purchaseId}/confirm-payment`, { payment_method: 'bank_transfer' });
      showToast('Payment confirmed');
      loadAll();
    } catch (err) { showToast('Failed to confirm payment', 'error'); }
  };

  const handleGenerateReceipt = async () => {
    if (!receiptPurchase) return;
    setGenerating(true);
    try {
      await api.post(`/marketplace/purchases/${receiptPurchase.id}/generate-receipt`, receiptForm);
      showToast('Receipt generated and sent to buyer!');
      setReceiptPurchase(null);
      loadAll();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to generate receipt', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handlePayCommission = async (purchaseId) => {
    try {
      await api.post(`/marketplace/purchases/${purchaseId}/pay-commission`, { payment_reference: 'manual-' + Date.now() });
      showToast('Commission paid! Ownership can now be transferred.');
      loadAll();
    } catch (err) { showToast(err.response?.data?.error || 'Failed to pay commission', 'error'); }
  };

  const handleTransfer = async (purchaseId) => {
    try {
      await api.post(`/marketplace/purchases/${purchaseId}/transfer-ownership`);
      showToast('Ownership transferred successfully!');
      loadAll();
    } catch (err) { showToast(err.response?.data?.error || 'Transfer failed', 'error'); }
  };

  const handleWithdraw = async (listingId) => {
    if (!confirm('Withdraw this listing from the market?')) return;
    try {
      await api.delete(`/marketplace/listings/${listingId}`);
      showToast('Listing withdrawn');
      loadAll();
    } catch (err) { showToast('Failed to withdraw', 'error'); }
  };

  const tabs = [
    { id: 'listings', label: 'My Listings', icon: Package },
    { id: 'sales', label: 'Purchase Requests', icon: DollarSign },
    { id: 'purchases', label: 'My Purchases', icon: TrendingUp },
    { id: 'receipts', label: 'Receipts', icon: ReceiptIcon },
  ];

  return (
    <Layout>
      <Header>
        <Title><Landmark size={24} /> Land Sale Dashboard</Title>
        <Subtitle>List your land for sale, manage purchase requests, and track your sales.</Subtitle>
      </Header>

      {/* Stats */}
      {stats && (
        <StatsGrid>
          <StatCard>
            <StatValue $color="#5ce1ff">{listings.length}</StatValue>
            <StatLabel>Total Listings</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue $color="#4ade80">{stats.listings_by_status?.find(s => s.status === 'published')?.count || 0}</StatValue>
            <StatLabel>Published</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue $color="#fbbf24">{sales.filter(s => s.status === 'initiated').length}</StatValue>
            <StatLabel>Pending Requests</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue $color="#c084fc">{stats.commission?.total_sales || 0}</StatValue>
            <StatLabel>Total Sales</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue $color="#f87171">GHS {parseFloat(stats.commission?.outstanding_commission || 0).toLocaleString()}</StatValue>
            <StatLabel>Outstanding Commission</StatLabel>
          </StatCard>
        </StatsGrid>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Tabs>
          {tabs.map(tab => (
            <Tab key={tab.id} $active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>
              <tab.icon size={14} /> {tab.label}
            </Tab>
          ))}
        </Tabs>
        <PrimaryBtn onClick={() => setShowCreateForm(true)}>
          <Plus size={16} /> List New Land
        </PrimaryBtn>
      </div>

      {loading ? (
        <EmptyState><Loader size={28} className="animate-spin" /></EmptyState>
      ) : (
        <>
          {/* ── Listings Tab ── */}
          {activeTab === 'listings' && (
            listings.length === 0 ? (
              <EmptyState>
                <Package size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                <div>You haven't listed any land yet.</div>
                <PrimaryBtn onClick={() => setShowCreateForm(true)} style={{ marginTop: 16, width: 'auto', margin: '16px auto 0' }}>
                  <Plus size={16} /> List Your First Land
                </PrimaryBtn>
              </EmptyState>
            ) : (
              listings.map(listing => {
                const sc = statusColors[listing.status] || statusColors.draft;
                const vc = statusColors[listing.validation_status] || statusColors.draft;
                return (
                  <Card key={listing.id}>
                    <CardTitle>
                      {listing.title}
                      <StatusPill $bg={sc.bg} $color={sc.color}>{listing.status.replace(/_/g, ' ')}</StatusPill>
                      {listing.validation_status !== 'confirmed' && listing.status !== 'published' && (
                        <StatusPill $bg={vc.bg} $color={vc.color}>Validation: {listing.validation_status}</StatusPill>
                      )}
                    </CardTitle>
                    <MetaRow>
                      {listing.region && <span><MapPin size={11} /> {listing.region}</span>}
                      {listing.area_sqm && <span>{Math.round(listing.area_sqm).toLocaleString()} m²</span>}
                      <span style={{ color: '#5ce1ff', fontWeight: 600 }}>GHS {parseFloat(listing.price).toLocaleString()}</span>
                      <span>Commission: GHS {parseFloat(listing.platform_fee_amount).toLocaleString()}</span>
                      <span>Views: {listing.view_count}</span>
                      <span>Inquiries: {listing.inquiry_count}</span>
                    </MetaRow>
                    {listing.nearby_hazards && listing.nearby_hazards.length > 0 && (
                      <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#f87171' }}>
                        <AlertTriangle size={12} /> {listing.nearby_hazards.length} hazard(s) detected nearby
                      </div>
                    )}
                    {listing.planner_notes && (
                      <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#aab7d4' }}>
                        Planner: {listing.planner_notes}
                      </div>
                    )}
                    {listing.status === 'published' && (
                      <BtnRow>
                        <SecondaryBtn onClick={() => handleWithdraw(listing.id)}>Withdraw</SecondaryBtn>
                      </BtnRow>
                    )}
                  </Card>
                );
              })
            )
          )}

          {/* ── Sales Tab (purchase requests) ── */}
          {activeTab === 'sales' && (
            sales.length === 0 ? (
              <EmptyState><DollarSign size={48} style={{ opacity: 0.3, marginBottom: 12 }} />No purchase requests yet.</EmptyState>
            ) : (
              sales.map(sale => {
                const sc = statusColors[sale.status] || statusColors.initiated;
                return (
                  <Card key={sale.id}>
                    <CardTitle>
                      {sale.listing_title}
                      <StatusPill $bg={sc.bg} $color={sc.color}>{sale.status.replace(/_/g, ' ')}</StatusPill>
                    </CardTitle>
                    <MetaRow>
                      <span>Buyer: {sale.buyer_name}</span>
                      {sale.buyer_phone && <span>{sale.buyer_phone}</span>}
                      <span>Price: GHS {parseFloat(sale.purchase_price).toLocaleString()}</span>
                      <span>Commission: GHS {parseFloat(sale.platform_fee_amount).toLocaleString()}</span>
                      <span>{sale.platform_fee_paid ? 'Commission Paid' : 'Commission Due'}</span>
                    </MetaRow>
                    <BtnRow>
                      {sale.status === 'initiated' && (
                        <>
                          <SuccessBtn onClick={() => handleAccept(sale.id)}><CheckCircle2 size={14} /> Accept</SuccessBtn>
                          <DangerBtn onClick={() => handleReject(sale.id)}><XCircle size={14} /> Reject</DangerBtn>
                        </>
                      )}
                      {sale.status === 'seller_accepted' && (
                        <SuccessBtn onClick={() => handleConfirmPayment(sale.id)}><DollarSign size={14} /> Confirm Payment Received</SuccessBtn>
                      )}
                      {sale.status === 'payment_confirmed' && (
                        <PrimaryBtn onClick={() => { setReceiptPurchase(sale); setReceiptForm({ payment_method: 'bank_transfer', payment_reference: '' }); }}>
                          <ReceiptIcon size={14} /> Generate Receipt
                        </PrimaryBtn>
                      )}
                      {sale.status === 'receipt_generated' && !sale.platform_fee_paid && (
                        <SuccessBtn onClick={() => handlePayCommission(sale.id)}>
                          <DollarSign size={14} /> Pay 10% Commission (GHS {parseFloat(sale.platform_fee_amount).toLocaleString()})
                        </SuccessBtn>
                      )}
                      {sale.status === 'receipt_generated' && sale.platform_fee_paid && (
                        <SuccessBtn onClick={() => handleTransfer(sale.id)}><CheckCircle2 size={14} /> Transfer Ownership</SuccessBtn>
                      )}
                    </BtnRow>
                  </Card>
                );
              })
            )
          )}

          {/* ── Purchases Tab (as buyer) ── */}
          {activeTab === 'purchases' && (
            purchases.length === 0 ? (
              <EmptyState><TrendingUp size={48} style={{ opacity: 0.3, marginBottom: 12 }} />You haven't purchased any land yet.</EmptyState>
            ) : (
              purchases.map(purchase => {
                const sc = statusColors[purchase.status] || statusColors.initiated;
                return (
                  <Card key={purchase.id}>
                    <CardTitle>
                      {purchase.listing_title}
                      <StatusPill $bg={sc.bg} $color={sc.color}>{purchase.status.replace(/_/g, ' ')}</StatusPill>
                    </CardTitle>
                    <MetaRow>
                      <span>Seller: {purchase.seller_name}</span>
                      <span>Price: GHS {parseFloat(purchase.purchase_price).toLocaleString()}</span>
                      {purchase.free_monitoring_granted && <span style={{ color: '#4ade80' }}>Free monitoring active</span>}
                    </MetaRow>
                  </Card>
                );
              })
            )
          )}

          {/* ── Receipts Tab ── */}
          {activeTab === 'receipts' && (
            receipts.length === 0 ? (
              <EmptyState><ReceiptIcon size={48} style={{ opacity: 0.3, marginBottom: 12 }} />No receipts yet.</EmptyState>
            ) : (
              receipts.map(receipt => (
                <Card key={receipt.id}>
                  <CardTitle>{receipt.receipt_number}</CardTitle>
                  <MetaRow>
                    <span>Land: {receipt.land_title}</span>
                    <span>Buyer: {receipt.buyer_name}</span>
                    <span>Price: GHS {parseFloat(receipt.purchase_price).toLocaleString()}</span>
                    <span>{new Date(receipt.generated_at).toLocaleDateString()}</span>
                  </MetaRow>
                  <BtnRow>
                    <SecondaryBtn onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/marketplace/receipts/${receipt.id}`, '_blank')}>
                      <Download size={14} /> Download PDF
                    </SecondaryBtn>
                  </BtnRow>
                </Card>
              ))
            )
          )}
        </>
      )}

      {/* ── Create Listing Modal ── */}
      {showCreateForm && (
        <Modal onClick={(e) => { if (e.target === e.currentTarget) setShowCreateForm(false); }}>
          <ModalContent>
            <ModalHeader>
              <h2 style={{ fontSize: '1.25rem' }}>List Your Land for Sale</h2>
              <button onClick={() => setShowCreateForm(false)} style={{ background: 'none', border: 'none', color: '#aab7d4', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </ModalHeader>
            <ModalBody>
              <form onSubmit={handleCreateListing}>
                <FormGroup>
                  <Label>Title *</Label>
                  <Input value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    placeholder="e.g., 2-acre plot at Adenta" required />
                </FormGroup>
                <FormGroup>
                  <Label>Description</Label>
                  <TextArea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="Describe the land — features, access, utilities, etc." />
                </FormGroup>
                <FormGroup>
                  <Label>Region / District</Label>
                  <Input value={createForm.region} onChange={(e) => setCreateForm({ ...createForm, region: e.target.value })}
                    placeholder="e.g., Greater Accra" />
                </FormGroup>
                <div style={{ display: 'flex', gap: 8 }}>
                  <FormGroup style={{ flex: 1 }}>
                    <Label>Area (m²)</Label>
                    <Input type="number" value={createForm.area_sqm} onChange={(e) => setCreateForm({ ...createForm, area_sqm: e.target.value })}
                      placeholder="e.g., 8000" />
                  </FormGroup>
                  <FormGroup style={{ flex: 1 }}>
                    <Label>Price (GHS) *</Label>
                    <Input type="number" value={createForm.price} onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })}
                      placeholder="e.g., 150000" required />
                  </FormGroup>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <FormGroup style={{ flex: 1 }}>
                    <Label>Latitude *</Label>
                    <Input type="number" step="any" value={createForm.centroid_lat} onChange={(e) => setCreateForm({ ...createForm, centroid_lat: e.target.value })}
                      placeholder="e.g., 5.7149" required />
                  </FormGroup>
                  <FormGroup style={{ flex: 1 }}>
                    <Label>Longitude *</Label>
                    <Input type="number" step="any" value={createForm.centroid_lng} onChange={(e) => setCreateForm({ ...createForm, centroid_lng: e.target.value })}
                      placeholder="e.g., -0.1869" required />
                  </FormGroup>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#aab7d4', marginBottom: 12 }}>
                  Tip: You can find coordinates from Google Maps (right-click on a location).
                  The system will automatically check the parcel database and nearby environmental hazards.
                </div>
                <BtnRow>
                  <PrimaryBtn type="submit" disabled={creating}>
                    {creating ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
                    {creating ? 'Creating...' : 'Create Listing'}
                  </PrimaryBtn>
                  <SecondaryBtn type="button" onClick={() => setShowCreateForm(false)}>Cancel</SecondaryBtn>
                </BtnRow>
              </form>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}

      {/* ── Receipt Generation Modal ── */}
      {receiptPurchase && (
        <Modal onClick={(e) => { if (e.target === e.currentTarget) setReceiptPurchase(null); }}>
          <ModalContent>
            <ModalHeader>
              <h2 style={{ fontSize: '1.25rem' }}>Generate Receipt</h2>
              <button onClick={() => setReceiptPurchase(null)} style={{ background: 'none', border: 'none', color: '#aab7d4', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </ModalHeader>
            <ModalBody>
              <div style={{ marginBottom: 16 }}>
                <div><strong>Land:</strong> {receiptPurchase.listing_title}</div>
                <div><strong>Buyer:</strong> {receiptPurchase.buyer_name}</div>
                <div><strong>Price:</strong> GHS {parseFloat(receiptPurchase.purchase_price).toLocaleString()}</div>
                <div><strong>Commission (10%):</strong> GHS {parseFloat(receiptPurchase.platform_fee_amount).toLocaleString()}</div>
              </div>
              <FormGroup>
                <Label>Payment Method</Label>
                <Input value={receiptForm.payment_method} onChange={(e) => setReceiptForm({ ...receiptForm, payment_method: e.target.value })}
                  placeholder="e.g., bank_transfer, cash, mobile_money" />
              </FormGroup>
              <FormGroup>
                <Label>Payment Reference</Label>
                <Input value={receiptForm.payment_reference} onChange={(e) => setReceiptForm({ ...receiptForm, payment_reference: e.target.value })}
                  placeholder="e.g., transaction ID, cheque number" />
              </FormGroup>
              <div style={{ fontSize: '0.8rem', color: '#aab7d4', marginBottom: 12 }}>
                The receipt will be sent to the buyer. After generating, you must pay the 10% commission before you can transfer ownership.
              </div>
              <BtnRow>
                <PrimaryBtn onClick={handleGenerateReceipt} disabled={generating}>
                  {generating ? <Loader size={16} className="animate-spin" /> : <ReceiptIcon size={16} />}
                  {generating ? 'Generating...' : 'Generate & Send Receipt'}
                </PrimaryBtn>
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
    </Layout>
  );
}
