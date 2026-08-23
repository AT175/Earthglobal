import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  Wallet, Search, DollarSign, AlertCircle, CheckCircle2, X,
} from 'lucide-react';
import FinanceLayout from '../../components/FinanceLayout';
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
`;

const PageSubtitle = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.md};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Tabs = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  overflow-x: auto; -webkit-overflow-scrolling: touch;
`;

const Tab = styled.button`
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
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

const TableWrap = styled.div`
  background: ${({ theme }) => theme.colors.gradientSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.xl};
  overflow-x: auto;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 700px;

  th, td {
    padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
    text-align: left;
    font-size: ${({ theme }) => theme.fontSizes.sm};
  }

  th {
    background: ${({ theme }) => theme.colors.surfaceLight};
    color: ${({ theme }) => theme.colors.textMuted};
    font-weight: 600;
    font-size: ${({ theme }) => theme.fontSizes.xs};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }

  tr { border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark}; }
  tr:last-child { border-bottom: none; }
`;

const Toolbar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 200px;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  background: ${({ theme }) => theme.colors.surfaceLight};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  &::placeholder { color: ${({ theme }) => theme.colors.textMuted}; }
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; }
`;

const Select = styled.select`
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  background: ${({ theme }) => theme.colors.surfaceLight};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  cursor: pointer;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`;

const ActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  background: none;
  color: ${({ $color }) => $color || theme.colors.textMuted};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 500;
  transition: all 0.2s;

  &:hover { border-color: ${({ $color }) => $color}40; }
`;

const Modal = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
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
  max-width: 420px;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const ModalTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const ModalActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

const PrimaryBtn = styled.button`
  background: ${({ theme }) => theme.colors.gradientPrimary};
  color: white;
  border: none;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;

  &:hover { opacity: 0.9; }
`;

const SecondaryBtn = styled.button`
  background: none;
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  color: ${({ theme }) => theme.colors.textMuted};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};

  &:hover { color: ${({ theme }) => theme.colors.text}; }
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

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textMuted};
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

const EmptyRow = styled.tr`
  td { text-align: center; padding: 2rem; color: ${({ theme }) => theme.colors.textMuted}; }
`;

const fmtMoney = (v, currency = 'GHS') => `${currency} ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const statusColors = {
  pending: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  succeeded: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  failed: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  refunded: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc' },
};

export default function FinancePayments() {
  const [tab, setTab] = useState('payments');
  const [payments, setPayments] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [outstandingSellers, setOutstandingSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ status: '', purpose: '', provider: '', search: '', commStatus: '' });
  const [reconcilePayment, setReconcilePayment] = useState(null);
  const [newStatus, setNewStatus] = useState('');

  const loadPayments = useCallback(() => {
    setLoading(true);
    api.get('/finance/payments', {
      params: {
        status: filters.status || undefined,
        purpose: filters.purpose || undefined,
        provider: filters.provider || undefined,
        search: filters.search || undefined,
      },
    }).then((res) => setPayments(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load payments'))
      .finally(() => setLoading(false));
  }, [filters.status, filters.purpose, filters.provider, filters.search]);

  const loadCommissions = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/finance/commissions', { params: { status: filters.commStatus || undefined } }),
      api.get('/finance/commissions/outstanding-sellers'),
    ]).then(([c, s]) => {
      setCommissions(c.data);
      setOutstandingSellers(s.data);
    }).catch((err) => setError(err.response?.data?.error || 'Failed to load commissions'))
      .finally(() => setLoading(false));
  }, [filters.commStatus]);

  useEffect(() => {
    if (tab === 'payments') loadPayments();
    else loadCommissions();
  }, [tab, loadPayments, loadCommissions]);

  const doReconcile = async () => {
    try {
      await api.patch(`/finance/payments/${reconcilePayment.id}`, { status: newStatus });
      setReconcilePayment(null);
      setNewStatus('');
      loadPayments();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update payment');
    }
  };

  return (
    <FinanceLayout>
      <Page>
        <Header>
          <PageTitle>Payments & Commissions</PageTitle>
          <PageSubtitle>Reconcile payments and track land-sale commissions across all sellers.</PageSubtitle>
        </Header>

        {error && <ErrorBox>{error}</ErrorBox>}

        <Tabs>
          <Tab $active={tab === 'payments'} onClick={() => { setTab('payments'); setError(''); }}>
            <Wallet size={16} style={{ display: 'inline', marginRight: 6 }} /> Payments Ledger
          </Tab>
          <Tab $active={tab === 'commissions'} onClick={() => { setTab('commissions'); setError(''); }}>
            <DollarSign size={16} style={{ display: 'inline', marginRight: 6 }} /> Land-Sale Commissions
          </Tab>
        </Tabs>

        {tab === 'payments' && (
          <>
            <Toolbar>
              <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="succeeded">Succeeded</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </Select>
              <Select value={filters.purpose} onChange={(e) => setFilters({ ...filters, purpose: e.target.value })}>
                <option value="">All purposes</option>
                <option value="subscription">Subscription</option>
                <option value="one_off_visit">One-off Visit</option>
                <option value="land_sale">Land Sale</option>
                <option value="tenant_billing">Tenant Billing</option>
              </Select>
              <Select value={filters.provider} onChange={(e) => setFilters({ ...filters, provider: e.target.value })}>
                <option value="">All providers</option>
                <option value="manual">Manual</option>
                <option value="stripe">Stripe</option>
                <option value="paystack">Paystack</option>
                <option value="hubtel">Hubtel</option>
              </Select>
              <SearchInput
                placeholder="Search owner, email, or reference..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </Toolbar>

            {loading ? <Loading>Loading payments...</Loading> : (
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <th>Owner</th>
                      <th>Amount</th>
                      <th>Purpose</th>
                      <th>Provider</th>
                      <th>Reference</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <EmptyRow><td colSpan={8}>No payments found.</td></EmptyRow>
                    ) : payments.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 500 }}>{p.owner_name}<div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{p.owner_email}</div></td>
                        <td>{fmtMoney(p.amount, p.currency)}</td>
                        <td style={{ textTransform: 'capitalize' }}>{p.purpose?.replace(/_/g, ' ')}</td>
                        <td>{p.provider || '—'}</td>
                        <td style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{p.provider_ref || '—'}</td>
                        <td>
                          <StatusBadge $bg={statusColors[p.status]?.bg} $color={statusColors[p.status]?.color}>
                            {p.status}
                          </StatusBadge>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(p.created_at)}</td>
                        <td>
                          {p.status === 'pending' && (
                            <ActionBtn $color="#4ade80" onClick={() => { setReconcilePayment(p); setNewStatus('succeeded'); }}>
                              <CheckCircle2 size={12} /> Reconcile
                            </ActionBtn>
                          )}
                          {p.status === 'succeeded' && (
                            <ActionBtn $color="#c084fc" onClick={() => { setReconcilePayment(p); setNewStatus('refunded'); }}>
                              Mark Refunded
                            </ActionBtn>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            )}
          </>
        )}

        {tab === 'commissions' && (
          <>
            <Toolbar>
              <Select value={filters.commStatus} onChange={(e) => setFilters({ ...filters, commStatus: e.target.value })}>
                <option value="">All commissions</option>
                <option value="outstanding">Outstanding</option>
                <option value="paid">Paid</option>
              </Select>
            </Toolbar>

            {outstandingSellers.length > 0 && (
              <>
                <SectionTitle><AlertCircle size={18} color="#fbbf24" /> Sellers with Outstanding Commission</SectionTitle>
                <TableWrap>
                  <Table>
                    <thead>
                      <tr>
                        <th>Seller</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Total Sales</th>
                        <th>Paid Commission</th>
                        <th>Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outstandingSellers.map((s) => (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 500 }}>{s.name}</td>
                          <td>{s.email}</td>
                          <td>{s.phone || '—'}</td>
                          <td>{s.total_sales}</td>
                          <td>{fmtMoney(s.total_commission_paid)}</td>
                          <td style={{ color: '#fbbf24', fontWeight: 600 }}>{fmtMoney(s.outstanding_commission)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              </>
            )}

            <SectionTitle><DollarSign size={18} /> Commission Ledger</SectionTitle>
            {loading ? <Loading>Loading commissions...</Loading> : (
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <th>Listing</th>
                      <th>Region</th>
                      <th>Seller</th>
                      <th>Organization</th>
                      <th>Purchase Price</th>
                      <th>Commission</th>
                      <th>Paid?</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.length === 0 ? (
                      <EmptyRow><td colSpan={9}>No land-sale commissions found.</td></EmptyRow>
                    ) : commissions.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 500 }}>{c.listing_title}</td>
                        <td>{c.region || '—'}</td>
                        <td>{c.seller_name}<div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{c.seller_email}</div></td>
                        <td>{c.org_name || '—'}</td>
                        <td>{fmtMoney(c.purchase_price)}</td>
                        <td style={{ fontWeight: 600 }}>{fmtMoney(c.platform_fee_amount)}</td>
                        <td>
                          {c.platform_fee_paid ? (
                            <StatusBadge $bg="rgba(34,197,94,0.15)" $color="#4ade80"><CheckCircle2 size={10} /> Paid</StatusBadge>
                          ) : (
                            <StatusBadge $bg="rgba(251,191,36,0.15)" $color="#fbbf24"><AlertCircle size={10} /> Outstanding</StatusBadge>
                          )}
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>{c.status?.replace(/_/g, ' ')}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(c.completed_at || c.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            )}
          </>
        )}
      </Page>

      {reconcilePayment && (
        <Modal onClick={() => setReconcilePayment(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Reconcile Payment</ModalTitle>
              <IconBtn onClick={() => setReconcilePayment(null)}><X size={16} /></IconBtn>
            </ModalHeader>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1rem' }}>
              {reconcilePayment.owner_name} — {fmtMoney(reconcilePayment.amount, reconcilePayment.currency)} ({reconcilePayment.purpose?.replace(/_/g, ' ')})
            </p>
            <FormGroup>
              <Label>New Status</Label>
              <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                <option value="pending">Pending</option>
                <option value="succeeded">Succeeded</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </Select>
            </FormGroup>
            <ModalActions>
              <PrimaryBtn onClick={doReconcile}>Confirm</PrimaryBtn>
              <SecondaryBtn onClick={() => setReconcilePayment(null)}>Cancel</SecondaryBtn>
            </ModalActions>
          </ModalContent>
        </Modal>
      )}
    </FinanceLayout>
  );
}
