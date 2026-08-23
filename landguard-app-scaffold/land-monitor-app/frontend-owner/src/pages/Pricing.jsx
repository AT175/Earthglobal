import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import {
  Search, ShieldCheck, MapPin, Crown, Zap, Check, X, Clock,
  CreditCard, TrendingUp, Plus, AlertCircle, ChevronRight, Sparkles,
  Banknote, Smartphone,
} from 'lucide-react';
import OwnerLayout from '../components/OwnerLayout';
import api from '../services/api';

const Page = styled.div`
  color: ${({ theme }) => theme.colors.text};
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  text-align: center;
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['4xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  background: ${({ theme }) => theme.colors.gradientPrimary};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const PageSubtitle = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  max-width: 600px;
  margin: 0 auto;
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  margin: ${({ theme }) => theme.spacing[8]} 0 ${({ theme }) => theme.spacing[4]};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PlansGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing[5]};
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`;

const PlanCard = styled(motion.div)`
  background: ${({ theme }) => theme.colors.gradientSurface};
  border: 2px solid ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.borderDark)};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[5]};
  position: relative;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.2s;

  &:hover { transform: translateY(-2px); }
`;

const PlanBadge = styled.div`
  position: absolute;
  top: -10px;
  right: ${({ theme }) => theme.spacing[4]};
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`;

const PlanName = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PlanDesc = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  min-height: 40px;
`;

const PlanPrice = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const PriceAmount = styled.div`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};

  span { font-size: ${({ theme }) => theme.fontSizes.sm}; color: ${({ theme }) => theme.colors.textMuted}; font-weight: normal; }
`;

const FeatureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const Feature = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: ${({ theme }) => theme.fontSizes.sm};

  svg { flex-shrink: 0; }
`;

const FeatureOn = styled(Check)`
  color: #4ade80;
`;

const FeatureOff = styled(X)`
  color: #6b7280;
`;

const Selector = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const SelectorLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const CycleOptions = styled.div`
  display: flex;
  gap: 8px;
`;

const CycleBtn = styled.button`
  flex: 1;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border: 1px solid ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.borderDark)};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $selected, theme }) => ($selected ? theme.colors.primary + '20' : 'transparent')};
  color: ${({ $selected, theme }) => ($selected ? theme.colors.text : theme.colors.textMuted)};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ $selected }) => ($selected ? 600 : 400)};
  transition: all 0.2s;

  &:hover { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const DaySlider = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const SliderRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const Slider = styled.input`
  flex: 1;
  accent-color: ${({ theme }) => theme.colors.primary};
`;

const DayValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 600;
  min-width: 80px;
  text-align: center;
  padding: 4px 10px;
  background: ${({ theme }) => theme.colors.surfaceLight};
  border-radius: ${({ theme }) => theme.radii.md};
`;

const SubscribeBtn = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: ${({ theme }) => theme.colors.gradientPrimary};
  color: white;
  border: none;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  transition: opacity 0.2s;

  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const CurrentSubCard = styled.div`
  background: ${({ theme }) => theme.colors.gradientSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[5]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const CurrentSubHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const CurrentSubTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const UsageBar = styled.div`
  height: 8px;
  background: ${({ theme }) => theme.colors.surfaceLight};
  border-radius: ${({ theme }) => theme.radii.full};
  overflow: hidden;
  margin-top: 4px;
`;

const UsageFill = styled.div`
  height: 100%;
  background: ${({ $color }) => $color || '#1677ff'};
  border-radius: ${({ theme }) => theme.radii.full};
  transition: width 0.3s;
`;

const UsageRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const UsageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`;

const UsageItem = styled.div`
  display: flex;
  flex-direction: column;
`;

const TopUpSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[5]};
  padding-top: ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.borderDark};
`;

const TopUpGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
`;

const TopUpCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[3]};
  text-align: center;
`;

const TopUpName = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  margin-bottom: 4px;
`;

const TopUpPrice = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 700;
  color: #4ade80;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const TopUpBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.primary};
  background: transparent;
  color: ${({ theme }) => theme.colors.primaryBright};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;

  &:hover { background: ${({ theme }) => theme.colors.primary}20; }
`;

const Modal = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: ${({ theme }) => theme.spacing[4]};
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[6]};
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const ModalTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: 600;
`;

const IconBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  background: none;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;

  &:hover { color: ${({ theme }) => theme.colors.text}; }
`;

const PriceSummary = styled.div`
  background: ${({ theme }) => theme.colors.surfaceLight};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[4]};
  margin: ${({ theme }) => theme.spacing[4]} 0;
`;

const PriceRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const PriceTotal = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 700;
  margin-top: ${({ theme }) => theme.spacing[2]};
  padding-top: ${({ theme }) => theme.spacing[2]};
  border-top: 1px solid ${({ theme }) => theme.colors.borderDark};
`;

const Loading = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ErrorBox = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[4]};
  color: ${({ theme }) => theme.colors.error};
  background: ${({ theme }) => theme.colors.error}10;
  border-radius: ${({ theme }) => theme.radii.lg};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const SuccessBox = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[4]};
  color: #4ade80;
  background: rgba(34,197,94,0.1);
  border-radius: ${({ theme }) => theme.radii.lg};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const fmtMoney = (v) => `GHS ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const tierIcons = {
  quick_search: Search,
  validated_search: ShieldCheck,
  taboo_search: MapPin,
  regular: TrendingUp,
  executive_suite: Zap,
  golden_member: Crown,
};

const tierColors = {
  quick_search: { bg: 'rgba(22,119,255,0.15)', color: '#3ba7ff' },
  validated_search: { bg: 'rgba(92,225,255,0.15)', color: '#5ce1ff' },
  taboo_search: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc' },
  regular: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  executive_suite: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  golden_member: { bg: 'rgba(251,191,36,0.2)', color: '#fbbf24' },
};

const tierBadges = {
  quick_search: null,
  validated_search: { label: 'Popular', bg: 'rgba(92,225,255,0.2)', color: '#5ce1ff' },
  taboo_search: { label: 'Complete', bg: 'rgba(168,85,247,0.2)', color: '#c084fc' },
  regular: null,
  executive_suite: { label: 'Best Value', bg: 'rgba(251,191,36,0.2)', color: '#fbbf24' },
  golden_member: { label: 'Premium', bg: 'rgba(251,191,36,0.25)', color: '#fbbf24' },
};

export default function Pricing() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState({ search: [], monitoring: [] });
  const [currentSub, setCurrentSub] = useState(null);
  const [topUps, setTopUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [deliveryDays, setDeliveryDays] = useState(5);
  const [pricePreview, setPricePreview] = useState(null);
  const [subscribing, setSubscribing] = useState(false);
  const [topUpModal, setTopUpModal] = useState(null);
  const [topUpQty, setTopUpQty] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('momo');
  const [momoNumber, setMomoNumber] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [methodRef, setMethodRef] = useState('');

  const loadData = useCallback(() => {
    Promise.all([
      api.get('/subscriptions/plans'),
      api.get('/subscriptions/me'),
      api.get('/subscriptions/top-ups'),
    ]).then(([p, s, t]) => {
      setPlans(p.data);
      setCurrentSub(s.data);
      setTopUps(t.data);
    }).catch((err) => setError(err.response?.data?.error || 'Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Preview price when selection changes
  useEffect(() => {
    if (!selectedPlan) { setPricePreview(null); return; }
    api.get('/subscriptions/price-preview', {
      params: {
        plan_id: selectedPlan.id,
        billing_cycle: selectedPlan.category === 'monitoring' ? billingCycle : undefined,
        delivery_days: selectedPlan.category === 'search' ? deliveryDays : undefined,
      },
    }).then((res) => setPricePreview(res.data))
      .catch(() => setPricePreview(null));
  }, [selectedPlan, billingCycle, deliveryDays]);

  const openSubscribe = (plan) => {
    setSelectedPlan(plan);
    if (plan.category === 'search') {
      setDeliveryDays(plan.max_delivery_days || 5);
    } else {
      setBillingCycle('monthly');
    }
  };

  const doSubscribe = async () => {
    if (paymentMethod === 'momo' && !momoNumber) {
      setError('Please enter your mobile money number');
      return;
    }
    setSubscribing(true);
    setError('');
    try {
      await api.post('/subscriptions', {
        plan_id: selectedPlan.id,
        billing_cycle: selectedPlan.category === 'monitoring' ? billingCycle : undefined,
        delivery_days: selectedPlan.category === 'search' ? deliveryDays : undefined,
        payment_method: paymentMethod,
        momo_number: paymentMethod === 'momo' ? momoNumber : undefined,
        card_last4: paymentMethod === 'card' ? cardLast4 : undefined,
        method_reference: methodRef || undefined,
      });
      setSuccess('Subscription activated successfully!');
      setSelectedPlan(null);
      setMomoNumber(''); setCardLast4(''); setMethodRef('');
      setTimeout(() => setSuccess(''), 4000);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to subscribe');
    } finally {
      setSubscribing(false);
    }
  };

  const doTopUp = async () => {
    if (paymentMethod === 'momo' && !momoNumber) {
      setError('Please enter your mobile money number');
      return;
    }
    setSubscribing(true);
    try {
      await api.post('/subscriptions/top-up', {
        subscription_id: currentSub.id,
        type: topUpModal.type,
        quantity: topUpQty,
        payment_method: paymentMethod,
        momo_number: paymentMethod === 'momo' ? momoNumber : undefined,
        card_last4: paymentMethod === 'card' ? cardLast4 : undefined,
        method_reference: methodRef || undefined,
      });
      setSuccess('Top-up request submitted! The finance team will process it shortly.');
      setTopUpModal(null);
      setTopUpQty(1);
      setMomoNumber(''); setCardLast4(''); setMethodRef('');
      setTimeout(() => setSuccess(''), 4000);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request top-up');
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) return <OwnerLayout><Loading>Loading plans...</Loading></OwnerLayout>;

  const topUpOptions = [
    { type: 'extra_parcel', name: 'Extra Parcel', price: 30, icon: MapPin, desc: 'Monitor one additional parcel' },
    { type: 'extra_search', name: 'Extra Search', price: 20, icon: Search, desc: 'Search one additional parcel' },
    { type: 'field_visit', name: 'Field Visit', price: 100, icon: ShieldCheck, desc: 'On-site verification visit' },
    { type: 'rush_delivery', name: 'Rush Delivery', price: 50, icon: Clock, desc: 'Expedite search results' },
  ];

  return (
    <OwnerLayout>
      <Page>
        <Header>
          <PageTitle>Choose Your Plan</PageTitle>
          <PageSubtitle>
            Search for land information or subscribe to ongoing monitoring. All plans cover up to 5 parcels.
          </PageSubtitle>
        </Header>

        {error && <ErrorBox>{error}</ErrorBox>}
        {success && <SuccessBox>{success}</SuccessBox>}

        {/* Current subscription */}
        {currentSub && (
          <CurrentSubCard>
            <CurrentSubHeader>
              <CurrentSubTitle>
                <Sparkles size={20} color="#fbbf24" />
                Your Active Subscription
              </CurrentSubTitle>
              <span style={{ textTransform: 'capitalize', padding: '2px 10px', borderRadius: 999, background: 'rgba(34,197,94,0.15)', color: '#4ade80', fontSize: '0.75rem', fontWeight: 600 }}>
                {currentSub.status}
              </span>
            </CurrentSubHeader>
            <div style={{ marginBottom: '1rem' }}>
              <strong>{currentSub.plan_name}</strong>
              {currentSub.category === 'monitoring' && currentSub.billing_cycle && (
                <span style={{ marginLeft: 8, textTransform: 'capitalize', color: '#9ca3af', fontSize: '0.875rem' }}>
                  ({currentSub.billing_cycle})
                </span>
              )}
              {currentSub.category === 'search' && currentSub.delivery_days && (
                <span style={{ marginLeft: 8, color: '#9ca3af', fontSize: '0.875rem' }}>
                  ({currentSub.delivery_days}-day delivery)
                </span>
              )}
            </div>
            <UsageGrid>
              {currentSub.category === 'monitoring' && (
                <UsageItem>
                  <UsageRow>
                    <span style={{ color: '#9ca3af' }}>Parcels Monitored</span>
                    <span>{currentSub.parcels_used} / {currentSub.max_parcels}</span>
                  </UsageRow>
                  <UsageBar>
                    <UsageFill $color="#1677ff" style={{ width: `${(currentSub.parcels_used / currentSub.max_parcels) * 100}%` }} />
                  </UsageBar>
                </UsageItem>
              )}
              {currentSub.category === 'search' && (
                <UsageItem>
                  <UsageRow>
                    <span style={{ color: '#9ca3af' }}>Searches Used</span>
                    <span>{currentSub.searches_used} / {currentSub.max_parcels}</span>
                  </UsageRow>
                  <UsageBar>
                    <UsageFill $color="#a855f7" style={{ width: `${(currentSub.searches_used / currentSub.max_parcels) * 100}%` }} />
                  </UsageBar>
                </UsageItem>
              )}
              <UsageItem>
                <UsageRow>
                  <span style={{ color: '#9ca3af' }}>Visit Credits</span>
                  <span>{currentSub.credits_remaining} / {currentSub.included_visits_per_period}</span>
                </UsageRow>
                <UsageBar>
                  <UsageFill $color="#4ade80" style={{ width: `${currentSub.included_visits_per_period > 0 ? (currentSub.credits_remaining / currentSub.included_visits_per_period) * 100 : 0}%` }} />
                </UsageBar>
              </UsageItem>
              <UsageItem>
                <UsageRow>
                  <span style={{ color: '#9ca3af' }}>Renews / Expires</span>
                  <span>{fmtDate(currentSub.renews_at || currentSub.expires_at)}</span>
                </UsageRow>
              </UsageItem>
            </UsageGrid>

            <TopUpSection>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={16} /> Top-Up Additional Services
              </div>
              <TopUpGrid>
                {topUpOptions.map((opt) => (
                  <TopUpCard key={opt.type}>
                    <opt.icon size={20} style={{ margin: '0 auto 4px', color: '#3ba7ff' }} />
                    <TopUpName>{opt.name}</TopUpName>
                    <TopUpPrice>{fmtMoney(opt.price)}</TopUpPrice>
                    <TopUpBtn onClick={() => { setTopUpModal(opt); setTopUpQty(1); }}>
                      <Plus size={12} /> Request
                    </TopUpBtn>
                  </TopUpCard>
                ))}
              </TopUpGrid>

              {topUps.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Recent Top-Ups
                  </div>
                  {topUps.slice(0, 5).map((t) => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #2a2f45', fontSize: '0.875rem' }}>
                      <span>{t.type.replace(/_/g, ' ')} ×{t.quantity}</span>
                      <span style={{ color: '#9ca3af' }}>{fmtMoney(t.amount)}</span>
                      <span style={{ textTransform: 'capitalize', color: t.status === 'fulfilled' ? '#4ade80' : t.status === 'cancelled' ? '#f87171' : '#fbbf24' }}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TopUpSection>
          </CurrentSubCard>
        )}

        {/* Search Plans */}
        <SectionTitle><Search size={24} /> Land Search Plans</SectionTitle>
        <PlansGrid>
          {plans.search.map((plan, i) => {
            const Icon = tierIcons[plan.tier] || Search;
            const colors = tierColors[plan.tier] || tierColors.quick_search;
            const badge = tierBadges[plan.tier];
            return (
              <PlanCard
                key={plan.id}
                $selected={selectedPlan?.id === plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => openSubscribe(plan)}
              >
                {badge && <PlanBadge $bg={badge.bg} $color={badge.color}>{badge.label}</PlanBadge>}
                <PlanName>
                  <Icon size={20} color={colors.color} /> {plan.name}
                </PlanName>
                <PlanDesc>{plan.description}</PlanDesc>
                <PlanPrice>
                  <PriceAmount>{fmtMoney(plan.base_price || plan.price)} <span>per batch (up to {plan.max_parcels} parcels)</span></PriceAmount>
                </PlanPrice>
                <FeatureList>
                  <Feature><FeatureOn size={16} /> Quick search on parcel details</Feature>
                  <Feature>
                    {plan.includes_validated_search ? <FeatureOn size={16} /> : <FeatureOff size={16} />}
                    Validated search from assembly planner
                  </Feature>
                  <Feature>
                    {plan.includes_field_verification ? <FeatureOn size={16} /> : <FeatureOff size={16} />}
                    Field verification
                  </Feature>
                  {plan.max_delivery_days && (
                    <Feature><Clock size={16} color="#fbbf24" /> Delivery: {plan.min_delivery_days}-{plan.max_delivery_days} working days</Feature>
                  )}
                  {plan.rush_fee_per_day > 0 && (
                    <Feature style={{ color: '#fbbf24', fontSize: '0.75rem' }}>
                      <Zap size={14} /> Rush: +{fmtMoney(plan.rush_fee_per_day)}/day faster
                    </Feature>
                  )}
                </FeatureList>
                <SubscribeBtn onClick={(e) => { e.stopPropagation(); openSubscribe(plan); }}>
                  <ChevronRight size={16} /> Select Plan
                </SubscribeBtn>
              </PlanCard>
            );
          })}
        </PlansGrid>

        {/* Monitoring Plans */}
        <SectionTitle><TrendingUp size={24} /> Land Monitoring Plans</SectionTitle>
        <PlansGrid>
          {plans.monitoring.map((plan, i) => {
            const Icon = tierIcons[plan.tier] || TrendingUp;
            const colors = tierColors[plan.tier] || tierColors.regular;
            const badge = tierBadges[plan.tier];
            return (
              <PlanCard
                key={plan.id}
                $selected={selectedPlan?.id === plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => openSubscribe(plan)}
              >
                {badge && <PlanBadge $bg={badge.bg} $color={badge.color}>{badge.label}</PlanBadge>}
                <PlanName>
                  <Icon size={20} color={colors.color} /> {plan.name}
                </PlanName>
                <PlanDesc>{plan.description}</PlanDesc>
                <PlanPrice>
                  <PriceAmount>{fmtMoney(plan.price)} <span>/month</span></PriceAmount>
                  {plan.quarterly_discount > 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#4ade80' }}>
                      Save {Math.round(plan.quarterly_discount * 100)}% quarterly · {Math.round(plan.yearly_discount * 100)}% yearly
                    </div>
                  )}
                </PlanPrice>
                <FeatureList>
                  <Feature><FeatureOn size={16} /> Monitor up to {plan.max_parcels} parcels</Feature>
                  <Feature><FeatureOn size={16} /> Satellite change detection</Feature>
                  <Feature><FeatureOn size={16} /> {plan.included_visits_per_period} field visits per cycle</Feature>
                  <Feature>
                    {plan.includes_validated_search ? <FeatureOn size={16} /> : <FeatureOff size={16} />}
                    Validated search included
                  </Feature>
                  <Feature>
                    {plan.includes_field_verification ? <FeatureOn size={16} /> : <FeatureOff size={16} />}
                    Field verification
                  </Feature>
                  {plan.live_video_included && <Feature><FeatureOn size={16} /> Live video calls</Feature>}
                </FeatureList>
                <SubscribeBtn onClick={(e) => { e.stopPropagation(); openSubscribe(plan); }}>
                  <ChevronRight size={16} /> Select Plan
                </SubscribeBtn>
              </PlanCard>
            );
          })}
        </PlansGrid>
      </Page>

      {/* Subscribe modal */}
      {selectedPlan && (
        <Modal onClick={() => setSelectedPlan(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Subscribe — {selectedPlan.name}</ModalTitle>
              <IconBtn onClick={() => setSelectedPlan(null)}><X size={16} /></IconBtn>
            </ModalHeader>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1rem' }}>{selectedPlan.description}</p>

            {selectedPlan.category === 'monitoring' && (
              <Selector>
                <SelectorLabel>Billing Cycle</SelectorLabel>
                <CycleOptions>
                  <CycleBtn $selected={billingCycle === 'monthly'} onClick={() => setBillingCycle('monthly')}>
                    Monthly<br /><span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{fmtMoney(selectedPlan.price)}/mo</span>
                  </CycleBtn>
                  <CycleBtn $selected={billingCycle === 'quarterly'} onClick={() => setBillingCycle('quarterly')}>
                    Quarterly<br /><span style={{ fontSize: '0.75rem', color: '#4ade80' }}>Save {Math.round(selectedPlan.quarterly_discount * 100)}%</span>
                  </CycleBtn>
                  <CycleBtn $selected={billingCycle === 'yearly'} onClick={() => setBillingCycle('yearly')}>
                    Yearly<br /><span style={{ fontSize: '0.75rem', color: '#4ade80' }}>Save {Math.round(selectedPlan.yearly_discount * 100)}%</span>
                  </CycleBtn>
                </CycleOptions>
              </Selector>
            )}

            {selectedPlan.category === 'search' && selectedPlan.max_delivery_days && (
              <Selector>
                <SelectorLabel>Delivery Speed — pay more for faster results</SelectorLabel>
                <DaySlider>
                  <SliderRow>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{selectedPlan.min_delivery_days} day</span>
                    <Slider
                      type="range"
                      min={selectedPlan.min_delivery_days}
                      max={selectedPlan.max_delivery_days}
                      value={deliveryDays}
                      onChange={(e) => setDeliveryDays(parseInt(e.target.value, 10))}
                    />
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{selectedPlan.max_delivery_days} days</span>
                  </SliderRow>
                  <DayValue>{deliveryDays} working {deliveryDays === 1 ? 'day' : 'days'}</DayValue>
                </DaySlider>
              </Selector>
            )}

            {pricePreview && (
              <PriceSummary>
                {selectedPlan.category === 'search' && selectedPlan.rush_fee_per_day > 0 && (
                  <>
                    <PriceRow>
                      <span>Base price ({selectedPlan.max_delivery_days} days)</span>
                      <span>{fmtMoney(selectedPlan.base_price)}</span>
                    </PriceRow>
                    <PriceRow>
                      <span>Rush fee ({selectedPlan.max_delivery_days - deliveryDays} days faster × {fmtMoney(selectedPlan.rush_fee_per_day)})</span>
                      <span>+{fmtMoney(selectedPlan.rush_fee_per_day * (selectedPlan.max_delivery_days - deliveryDays))}</span>
                    </PriceRow>
                  </>
                )}
                {selectedPlan.category === 'monitoring' && billingCycle === 'quarterly' && (
                  <PriceRow>
                    <span>Quarterly (3 months × {fmtMoney(selectedPlan.price)} less {Math.round(selectedPlan.quarterly_discount * 100)}% discount)</span>
                  </PriceRow>
                )}
                {selectedPlan.category === 'monitoring' && billingCycle === 'yearly' && (
                  <PriceRow>
                    <span>Yearly (12 months × {fmtMoney(selectedPlan.price)} less {Math.round(selectedPlan.yearly_discount * 100)}% discount)</span>
                  </PriceRow>
                )}
                <PriceTotal>
                  <span>Total</span>
                  <span>{fmtMoney(pricePreview.price)}</span>
                </PriceTotal>
              </PriceSummary>
            )}

            {/* Payment method selector */}
            <Selector>
              <SelectorLabel>Payment Method</SelectorLabel>
              <CycleOptions>
                <CycleBtn $selected={paymentMethod === 'momo'} onClick={() => setPaymentMethod('momo')}>
                  <Smartphone size={16} style={{ margin: '0 auto 4px' }} /><br />Mobile Money
                </CycleBtn>
                <CycleBtn $selected={paymentMethod === 'card'} onClick={() => setPaymentMethod('card')}>
                  <CreditCard size={16} style={{ margin: '0 auto 4px' }} /><br />Card
                </CycleBtn>
                <CycleBtn $selected={paymentMethod === 'cash'} onClick={() => setPaymentMethod('cash')}>
                  <Banknote size={16} style={{ margin: '0 auto 4px' }} /><br />Cash
                </CycleBtn>
              </CycleOptions>

              {paymentMethod === 'momo' && (
                <input
                  type="tel"
                  placeholder="MoMo number (e.g. 0241234567)"
                  value={momoNumber}
                  onChange={(e) => setMomoNumber(e.target.value)}
                  style={{
                    width: '100%', marginTop: 8, padding: '8px 12px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, color: 'inherit', fontSize: '0.875rem',
                  }}
                />
              )}
              {paymentMethod === 'card' && (
                <input
                  type="text"
                  maxLength={4}
                  placeholder="Card last 4 digits"
                  value={cardLast4}
                  onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
                  style={{
                    width: '100%', marginTop: 8, padding: '8px 12px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, color: 'inherit', fontSize: '0.875rem',
                  }}
                />
              )}
              {paymentMethod === 'cash' && (
                <input
                  type="text"
                  placeholder="Receipt / reference number (optional)"
                  value={methodRef}
                  onChange={(e) => setMethodRef(e.target.value)}
                  style={{
                    width: '100%', marginTop: 8, padding: '8px 12px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, color: 'inherit', fontSize: '0.875rem',
                  }}
                />
              )}
            </Selector>

            <SubscribeBtn onClick={doSubscribe} disabled={subscribing}>
              <CreditCard size={16} /> {subscribing ? 'Processing...' : `Subscribe for ${pricePreview ? fmtMoney(pricePreview.price) : '...'}`}
            </SubscribeBtn>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'center', marginTop: '0.5rem' }}>
              Payment will be processed securely. You will be notified once confirmed.
            </p>
          </ModalContent>
        </Modal>
      )}

      {/* Top-up modal */}
      {topUpModal && (
        <Modal onClick={() => setTopUpModal(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Top-Up — {topUpModal.name}</ModalTitle>
              <IconBtn onClick={() => setTopUpModal(null)}><X size={16} /></IconBtn>
            </ModalHeader>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1rem' }}>{topUpModal.desc}</p>
            <Selector>
              <SelectorLabel>Quantity</SelectorLabel>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <IconBtn onClick={() => setTopUpQty(Math.max(1, topUpQty - 1))}>−</IconBtn>
                <input
                  type="number"
                  min="1"
                  value={topUpQty}
                  onChange={(e) => setTopUpQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  style={{ flex: 1, padding: '0.5rem', background: '#1a1f3a', border: '1px solid #2a2f45', borderRadius: 8, color: 'white', textAlign: 'center', fontSize: '1rem' }}
                />
                <IconBtn onClick={() => setTopUpQty(topUpQty + 1)}>+</IconBtn>
              </div>
            </Selector>
            <PriceSummary>
              <PriceTotal>
                <span>Total</span>
                <span>{fmtMoney(topUpModal.price * topUpQty)}</span>
              </PriceTotal>
            </PriceSummary>

            {/* Payment method selector for top-up */}
            <Selector>
              <SelectorLabel>Payment Method</SelectorLabel>
              <CycleOptions>
                <CycleBtn $selected={paymentMethod === 'momo'} onClick={() => setPaymentMethod('momo')}>
                  <Smartphone size={16} style={{ margin: '0 auto 4px' }} /><br />Mobile Money
                </CycleBtn>
                <CycleBtn $selected={paymentMethod === 'card'} onClick={() => setPaymentMethod('card')}>
                  <CreditCard size={16} style={{ margin: '0 auto 4px' }} /><br />Card
                </CycleBtn>
                <CycleBtn $selected={paymentMethod === 'cash'} onClick={() => setPaymentMethod('cash')}>
                  <Banknote size={16} style={{ margin: '0 auto 4px' }} /><br />Cash
                </CycleBtn>
              </CycleOptions>
              {paymentMethod === 'momo' && (
                <input
                  type="tel"
                  placeholder="MoMo number (e.g. 0241234567)"
                  value={momoNumber}
                  onChange={(e) => setMomoNumber(e.target.value)}
                  style={{
                    width: '100%', marginTop: 8, padding: '8px 12px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, color: 'inherit', fontSize: '0.875rem',
                  }}
                />
              )}
              {paymentMethod === 'card' && (
                <input
                  type="text"
                  maxLength={4}
                  placeholder="Card last 4 digits"
                  value={cardLast4}
                  onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
                  style={{
                    width: '100%', marginTop: 8, padding: '8px 12px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, color: 'inherit', fontSize: '0.875rem',
                  }}
                />
              )}
            </Selector>

            <SubscribeBtn onClick={doTopUp} disabled={subscribing}>
              <Plus size={16} /> {subscribing ? 'Requesting...' : `Request Top-Up (${fmtMoney(topUpModal.price * topUpQty)})`}
            </SubscribeBtn>
          </ModalContent>
        </Modal>
      )}
    </OwnerLayout>
  );
}
