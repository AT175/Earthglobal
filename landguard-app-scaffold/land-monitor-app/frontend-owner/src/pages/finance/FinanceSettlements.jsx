import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import {
  Split, PiggyBank, Building2, DollarSign, ArrowRight, Check, X,
  Wallet, Banknote, Smartphone, CreditCard, Filter, RefreshCw,
} from 'lucide-react';
import FinanceLayout from '../../components/FinanceLayout';
import api from '../../services/api';

const Page = styled.div`color: ${({ theme }) => theme.colors.text};`;
const Header = styled.div`margin-bottom: ${({ theme }) => theme.spacing[6]};`;
const PageTitle = styled.h1`font-size: ${({ theme }) => theme.fontSizes['3xl']}; font-weight: bold; margin-bottom: 4px;`;
const PageSubtitle = styled.p`color: ${({ theme }) => theme.colors.textMuted}; font-size: ${({ theme }) => theme.fontSizes.md};`;

const Tabs = styled.div`display: flex; gap: 4px; margin-bottom: ${({ theme }) => theme.spacing[4]}; border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark}; overflow-x: auto; -webkit-overflow-scrolling: touch;`;
const Tab = styled.button`
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  background: none; border: none; border-bottom: 2px solid ${({ $active, theme }) => $active ? theme.colors.primary : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.primaryBright : theme.colors.textMuted};
  cursor: pointer; font-size: ${({ theme }) => theme.fontSizes.sm}; font-weight: 600;
  display: flex; align-items: center; gap: 6px;
  &:hover { color: ${({ theme }) => theme.colors.text}; }
`;

const StatsGrid = styled.div`display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: ${({ theme }) => theme.spacing[4]}; margin-bottom: ${({ theme }) => theme.spacing[5]};`;
const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.gradientSurface}; border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.xl}; padding: ${({ theme }) => theme.spacing[4]};
`;
const StatIcon = styled.div`display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 10px; background: ${({ $bg }) => $bg}; color: ${({ $color }) => $color}; margin-bottom: 8px;`;
const StatValue = styled.div`font-size: 1.5rem; font-weight: bold;`;
const StatLabel = styled.div`color: ${({ theme }) => theme.colors.textMuted}; font-size: 0.75rem; margin-top: 2px;`;

const Panel = styled.div`background: ${({ theme }) => theme.colors.gradientSurface}; border: 1px solid ${({ theme }) => theme.colors.borderDark}; border-radius: ${({ theme }) => theme.radii.xl}; overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: ${({ theme }) => theme.spacing[4]};`;
const PanelHeader = styled.div`display: flex; align-items: center; justify-content: space-between; padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[5]}`}; border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};`;
const PanelTitle = styled.h3`font-size: ${({ theme }) => theme.fontSizes.lg}; font-weight: 600; display: flex; align-items: center; gap: 8px;`;

const Table = styled.table`width: 100%; border-collapse: collapse; min-width: 700px;`;
const Th = styled.th`text-align: left; padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`}; font-size: 0.75rem; color: ${({ theme }) => theme.colors.textMuted}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};`;
const Td = styled.td`padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`}; font-size: ${({ theme }) => theme.fontSizes.sm}; border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark}40;`;
const Tr = styled.tr`&:hover { background: ${({ theme }) => theme.colors.surfaceLight}; }`;

const Badge = styled.span`display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font-size: 0.7rem; font-weight: 600; background: ${({ $bg }) => $bg}; color: ${({ $color }) => $color}; text-transform: capitalize;`;

const DestBadge = styled(Badge)``;

const FilterRow = styled.div`display: flex; gap: ${({ theme }) => theme.spacing[2]}; margin-bottom: ${({ theme }) => theme.spacing[4]}; flex-wrap: wrap;`;
const Select = styled.select`padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`}; background: ${({ theme }) => theme.colors.surfaceLight}; border: 1px solid ${({ theme }) => theme.colors.borderDark}; border-radius: ${({ theme }) => theme.radii.md}; color: ${({ theme }) => theme.colors.text}; font-size: ${({ theme }) => theme.fontSizes.sm};`;
const Btn = styled.button`display: flex; align-items: center; gap: 6px; padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`}; background: ${({ theme }) => theme.colors.surfaceLight}; border: 1px solid ${({ theme }) => theme.colors.borderDark}; border-radius: ${({ theme }) => theme.radii.md}; color: ${({ theme }) => theme.colors.textMuted}; cursor: pointer; font-size: ${({ theme }) => theme.fontSizes.sm};&:hover { color: ${({ theme }) => theme.colors.text}; }`;

const ActionBtn = styled.button`display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: 600; border: 1px solid; background: none;`;
const ApproveBtn = styled(ActionBtn)`border-color: rgba(34,197,94,0.3); color: #4ade80;&:hover { background: rgba(34,197,94,0.1); }`;
const RejectBtn = styled(ActionBtn)`border-color: rgba(239,68,68,0.3); color: #f87171;&:hover { background: rgba(239,68,68,0.1); }`;
const PayBtn = styled(ActionBtn)`border-color: rgba(22,119,255,0.3); color: #3ba7ff;&:hover { background: rgba(22,119,255,0.1); }`;

const Modal = styled.div`position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem;`;
const ModalContent = styled.div`background: ${({ theme }) => theme.colors.surface}; border: 1px solid ${({ theme }) => theme.colors.borderDark}; border-radius: ${({ theme }) => theme.radii.xl}; padding: ${({ theme }) => theme.spacing[6]}; width: 100%; max-width: 480px;`;
const ModalTitle = styled.h3`font-size: ${({ theme }) => theme.fontSizes.xl}; font-weight: 600; margin-bottom: ${({ theme }) => theme.spacing[4]};`;
const FormGroup = styled.div`margin-bottom: ${({ theme }) => theme.spacing[3]};`;
const Label = styled.label`display: block; font-size: ${({ theme }) => theme.fontSizes.sm}; color: ${({ theme }) => theme.colors.textMuted}; margin-bottom: 4px;`;
const Input = styled.input`width: 100%; padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`}; background: ${({ theme }) => theme.colors.surfaceLight}; border: 1px solid ${({ theme }) => theme.colors.borderDark}; border-radius: ${({ theme }) => theme.radii.md}; color: ${({ theme }) => theme.colors.text}; font-size: ${({ theme }) => theme.fontSizes.sm};&:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; }`;
const PrimaryBtn = styled.button`display: flex; align-items: center; gap: 6px; background: ${({ theme }) => theme.colors.gradientPrimary}; color: white; border: none; padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`}; border-radius: ${({ theme }) => theme.radii.md}; cursor: pointer; font-weight: 600; font-size: ${({ theme }) => theme.fontSizes.sm};&:disabled { opacity: 0.5; }`;
const SecondaryBtn = styled.button`display: flex; align-items: center; gap: 6px; background: none; border: 1px solid ${({ theme }) => theme.colors.borderDark}; color: ${({ theme }) => theme.colors.textMuted}; padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`}; border-radius: ${({ theme }) => theme.radii.md}; cursor: pointer; font-size: ${({ theme }) => theme.fontSizes.sm};`;

const Loading = styled.div`text-align: center; padding: 3rem; color: ${({ theme }) => theme.colors.textMuted};`;
const ErrorBox = styled.div`text-align: center; padding: 1rem; color: ${({ theme }) => theme.colors.error}; background: ${({ theme }) => theme.colors.error}10; border-radius: ${({ theme }) => theme.radii.lg}; margin-bottom: 1rem;`;
const EmptyRow = styled.tr`td { text-align: center; padding: 2rem; color: ${({ theme }) => theme.colors.textMuted}; }`;

const fmtMoney = (v, c = 'GHS') => `${c} ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const statusColors = {
  pending: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  approved: { bg: 'rgba(92,225,255,0.15)', color: '#5ce1ff' },
  paid: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  rejected: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  failed: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  settled: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
};

const destColors = {
  system: { bg: 'rgba(22,119,255,0.15)', color: '#3ba7ff' },
  tenant: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc' },
};

const methodIcons = { cash: Banknote, momo: Smartphone, card: CreditCard, bank: Building2 };

export default function FinanceSettlements() {
  const [tab, setTab] = useState('settlements');
  const [settlements, setSettlements] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ destination: '', status: '', org_id: '' });
  const [payoutModal, setPayoutModal] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ organization_id: '', amount: '', method: 'momo', destination_account: '', destination_name: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    const promises = [];
    if (tab === 'settlements') {
      const params = new URLSearchParams();
      if (filter.destination) params.set('destination', filter.destination);
      if (filter.status) params.set('status', filter.status);
      if (filter.org_id) params.set('org_id', filter.org_id);
      promises.push(api.get(`/finance/settlements?${params}`));
    } else if (tab === 'wallets') {
      promises.push(api.get('/finance/wallets'));
    } else if (tab === 'payouts') {
      const params = new URLSearchParams();
      if (filter.status) params.set('status', filter.status);
      promises.push(api.get(`/finance/payouts?${params}`));
    }
    Promise.all(promises).then((results) => {
      if (tab === 'settlements') setSettlements(results[0].data);
      else if (tab === 'wallets') setWallets(results[0].data);
      else if (tab === 'payouts') setPayouts(results[0].data);
    }).catch((err) => setError(err.response?.data?.error || 'Failed to load data'))
      .finally(() => setLoading(false));
  }, [tab, filter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePayoutAction = async (id, action) => {
    try {
      await api.patch(`/finance/payouts/${id}`, { status: action });
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Action failed');
    }
  };

  const submitPayout = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post('/finance/payouts', payoutForm);
      setPayoutModal(false);
      setPayoutForm({ organization_id: '', amount: '', method: 'momo', destination_account: '', destination_name: '', notes: '' });
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create payout');
    } finally {
      setSaving(false);
    }
  };

  const systemTotal = settlements?.summary?.find((s) => s.destination === 'system')?.total || 0;
  const tenantTotal = settlements?.summary?.find((s) => s.destination === 'tenant')?.total || 0;
  const totalWalletBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const pendingPayouts = payouts.filter((p) => p.status === 'pending').length;

  return (
    <FinanceLayout>
      <Page>
        <Header>
          <PageTitle>Settlements & Wallets</PageTitle>
          <PageSubtitle>Hierarchical payment system — system revenue vs tenant wallet balances and payouts.</PageSubtitle>
        </Header>

        {error && <ErrorBox>{error}</ErrorBox>}

        <Tabs>
          <Tab $active={tab === 'settlements'} onClick={() => { setTab('settlements'); setFilter({ destination: '', status: '', org_id: '' }); }}>
            <Split size={16} /> Settlements
          </Tab>
          <Tab $active={tab === 'wallets'} onClick={() => { setTab('wallets'); setFilter({ destination: '', status: '', org_id: '' }); }}>
            <PiggyBank size={16} /> Tenant Wallets
          </Tab>
          <Tab $active={tab === 'payouts'} onClick={() => { setTab('payouts'); setFilter({ destination: '', status: '', org_id: '' }); }}>
            <Wallet size={16} /> Payouts {pendingPayouts > 0 && <Badge $bg="rgba(251,191,36,0.15)" $color="#fbbf24">{pendingPayouts}</Badge>}
          </Tab>
        </Tabs>

        {/* Summary stats */}
        <StatsGrid>
          <StatCard>
            <StatIcon $bg="rgba(22,119,255,0.15)" $color="#3ba7ff"><DollarSign size={18} /></StatIcon>
            <StatValue>{fmtMoney(systemTotal)}</StatValue>
            <StatLabel>System Revenue (settled)</StatLabel>
          </StatCard>
          <StatCard>
            <StatIcon $bg="rgba(168,85,247,0.15)" $color="#c084fc"><PiggyBank size={18} /></StatIcon>
            <StatValue>{fmtMoney(tenantTotal)}</StatValue>
            <StatLabel>Tenant Earnings (settled)</StatLabel>
          </StatCard>
          <StatCard>
            <StatIcon $bg="rgba(34,197,94,0.15)" $color="#4ade80"><Wallet size={18} /></StatIcon>
            <StatValue>{fmtMoney(totalWalletBalance)}</StatValue>
            <StatLabel>Total Wallet Balance</StatLabel>
          </StatCard>
          <StatCard>
            <StatIcon $bg="rgba(251,191,36,0.15)" $color="#fbbf24"><ArrowRight size={18} /></StatIcon>
            <StatValue>{pendingPayouts}</StatValue>
            <StatLabel>Pending Payouts</StatLabel>
          </StatCard>
        </StatsGrid>

        {/* Filter row */}
        {tab !== 'wallets' && (
          <FilterRow>
            {tab === 'settlements' && (
              <Select value={filter.destination} onChange={(e) => setFilter({ ...filter, destination: e.target.value })}>
                <option value="">All destinations</option>
                <option value="system">System</option>
                <option value="tenant">Tenant</option>
              </Select>
            )}
            <Select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="settled">Settled</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </Select>
            <Btn onClick={loadData}><RefreshCw size={14} /> Refresh</Btn>
          </FilterRow>
        )}

        {tab === 'payouts' && (
          <FilterRow>
            <PrimaryBtn onClick={() => setPayoutModal(true)}><Wallet size={14} /> New Payout</PrimaryBtn>
            <Btn onClick={loadData}><RefreshCw size={14} /> Refresh</Btn>
          </FilterRow>
        )}

        {loading ? (
          <Loading>Loading...</Loading>
        ) : tab === 'settlements' ? (
          <Panel>
            <PanelHeader><PanelTitle><Split size={18} /> Payment Settlements</PanelTitle></PanelHeader>
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th><Th>Destination</Th><Th>Amount</Th><Th>Description</Th>
                  <Th>Payment Purpose</Th><Th>Method</Th><Th>Owner</Th><Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {settlements?.settlements?.length === 0 ? (
                  <EmptyRow><td colSpan={8}>No settlements found</td></EmptyRow>
                ) : settlements?.settlements?.map((s) => {
                  const MIcon = methodIcons[s.payment_method] || DollarSign;
                  return (
                    <Tr key={s.id}>
                      <Td>{fmtDate(s.created_at)}</Td>
                      <Td><DestBadge $bg={destColors[s.destination]?.bg} $color={destColors[s.destination]?.color}>{s.destination}</DestBadge></Td>
                      <Td style={{ fontWeight: 600 }}>{fmtMoney(s.amount, s.currency)}</Td>
                      <Td>{s.description}</Td>
                      <Td style={{ textTransform: 'capitalize' }}>{s.payment_purpose?.replace(/_/g, ' ') || '—'}</Td>
                      <Td><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MIcon size={14} /> {s.payment_method || '—'}</span></Td>
                      <Td>{s.owner_name || s.organization_name || '—'}</Td>
                      <Td><Badge $bg={statusColors[s.status]?.bg} $color={statusColors[s.status]?.color}>{s.status}</Badge></Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </Panel>
        ) : tab === 'wallets' ? (
          <Panel>
            <PanelHeader><PanelTitle><PiggyBank size={18} /> Tenant Wallets</PanelTitle></PanelHeader>
            <Table>
              <thead>
                <tr>
                  <Th>Organization</Th><Th>Balance</Th><Th>Total Earned</Th><Th>Paid Out</Th>
                  <Th>Payout Method</Th><Th>Account</Th><Th>Updated</Th>
                </tr>
              </thead>
              <tbody>
                {wallets.length === 0 ? (
                  <EmptyRow><td colSpan={7}>No wallets yet</td></EmptyRow>
                ) : wallets.map((w) => (
                  <Tr key={w.id}>
                    <Td><strong>{w.organization_name}</strong><div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{w.organization_type?.replace(/_/g, ' ')}</div></Td>
                    <Td style={{ fontWeight: 600, color: '#c084fc' }}>{fmtMoney(w.balance, w.currency)}</Td>
                    <Td>{fmtMoney(w.total_earned, w.currency)}</Td>
                    <Td>{fmtMoney(w.total_paid_out, w.currency)}</Td>
                    <Td>
                      {w.payout_momo_number ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Smartphone size={14} /> MoMo</span> :
                       w.payout_bank_account ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Building2 size={14} /> Bank</span> :
                       '—'}
                    </Td>
                    <Td style={{ fontSize: '0.75rem' }}>{w.payout_momo_number || w.payout_bank_account || 'Not set'}</Td>
                    <Td>{fmtDate(w.updated_at)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Panel>
        ) : (
          <Panel>
            <PanelHeader><PanelTitle><Wallet size={18} /> Tenant Payouts</PanelTitle></PanelHeader>
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th><Th>Organization</Th><Th>Amount</Th><Th>Method</Th>
                  <Th>Destination</Th><Th>Reference</Th><Th>Status</Th><Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {payouts.length === 0 ? (
                  <EmptyRow><td colSpan={8}>No payouts yet</td></EmptyRow>
                ) : payouts.map((p) => {
                  const MIcon = methodIcons[p.method] || Wallet;
                  return (
                    <Tr key={p.id}>
                      <Td>{fmtDate(p.created_at)}</Td>
                      <Td><strong>{p.organization_name}</strong></Td>
                      <Td style={{ fontWeight: 600 }}>{fmtMoney(p.amount, p.currency)}</Td>
                      <Td><span style={{ display: 'flex', alignItems: 'center', gap: 4, textTransform: 'capitalize' }}><MIcon size={14} /> {p.method}</span></Td>
                      <Td style={{ fontSize: '0.75rem' }}>{p.destination_account || p.destination_name || '—'}</Td>
                      <Td style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{p.reference}</Td>
                      <Td><Badge $bg={statusColors[p.status]?.bg} $color={statusColors[p.status]?.color}>{p.status}</Badge></Td>
                      <Td>
                        {p.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <ApproveBtn onClick={() => handlePayoutAction(p.id, 'approved')}><Check size={12} /> Approve</ApproveBtn>
                            <RejectBtn onClick={() => handlePayoutAction(p.id, 'rejected')}><X size={12} /> Reject</RejectBtn>
                          </div>
                        )}
                        {p.status === 'approved' && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <PayBtn onClick={() => handlePayoutAction(p.id, 'paid')}><Check size={12} /> Mark Paid</PayBtn>
                            <RejectBtn onClick={() => handlePayoutAction(p.id, 'failed')}><X size={12} /> Failed</RejectBtn>
                          </div>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </Panel>
        )}
      </Page>

      {payoutModal && (
        <Modal onClick={() => setPayoutModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>New Tenant Payout</ModalTitle>
            <FormGroup>
              <Label>Organization</Label>
              <Select value={payoutForm.organization_id} onChange={(e) => setPayoutForm({ ...payoutForm, organization_id: e.target.value })} style={{ width: '100%' }}>
                <option value="">Select organization...</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.organization_id}>
                    {w.organization_name} (Balance: {fmtMoney(w.balance, w.currency)})
                  </option>
                ))}
              </Select>
            </FormGroup>
            <FormGroup>
              <Label>Amount (GHS)</Label>
              <Input type="number" value={payoutForm.amount} onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })} placeholder="e.g. 500" />
            </FormGroup>
            <FormGroup>
              <Label>Payout Method</Label>
              <Select value={payoutForm.method} onChange={(e) => setPayoutForm({ ...payoutForm, method: e.target.value })} style={{ width: '100%' }}>
                <option value="momo">Mobile Money</option>
                <option value="bank">Bank Transfer</option>
                <option value="cash">Cash</option>
              </Select>
            </FormGroup>
            <FormGroup>
              <Label>Destination Account (momo number / bank account)</Label>
              <Input value={payoutForm.destination_account} onChange={(e) => setPayoutForm({ ...payoutForm, destination_account: e.target.value })} placeholder="e.g. 0241234567 or 0012345678901" />
            </FormGroup>
            <FormGroup>
              <Label>Account Name</Label>
              <Input value={payoutForm.destination_name} onChange={(e) => setPayoutForm({ ...payoutForm, destination_name: e.target.value })} placeholder="e.g. Accra Metropolitan Assembly" />
            </FormGroup>
            <FormGroup>
              <Label>Notes (optional)</Label>
              <Input value={payoutForm.notes} onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })} />
            </FormGroup>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <PrimaryBtn onClick={submitPayout} disabled={saving || !payoutForm.organization_id || !payoutForm.amount}>
                {saving ? 'Creating...' : 'Create Payout'}
              </PrimaryBtn>
              <SecondaryBtn onClick={() => setPayoutModal(false)}>Cancel</SecondaryBtn>
            </div>
          </ModalContent>
        </Modal>
      )}
    </FinanceLayout>
  );
}
