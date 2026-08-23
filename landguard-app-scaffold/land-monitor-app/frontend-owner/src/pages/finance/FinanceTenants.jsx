import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  Building2, Edit2, X, Save, Plus, Receipt, AlertCircle, CheckCircle2,
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
  min-width: 800px;

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

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  display: flex;
  align-items: center;
  gap: 8px;
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
  max-width: 540px;
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
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: 500px) { grid-template-columns: 1fr; }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Input = styled.input`
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  background: ${({ theme }) => theme.colors.surfaceLight};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};

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

const TextArea = styled.textarea`
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  background: ${({ theme }) => theme.colors.surfaceLight};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-family: inherit;
  resize: vertical;
  min-height: 60px;

  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; }
`;

const ModalActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

const PrimaryBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${({ theme }) => theme.colors.gradientPrimary};
  color: white;
  border: none;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;

  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const SecondaryBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
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

const fmtMoney = (v, currency = 'GHS') => v != null ? `${currency} ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const statusColors = {
  active: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  trial: { bg: 'rgba(92,225,255,0.15)', color: '#5ce1ff' },
  suspended: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  cancelled: { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af' },
  pending: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  paid: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  overdue: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
};

const emptyBilling = {
  billing_plan: 'standard', monthly_fee: 0, currency: 'GHS', commission_override_percent: '',
  billing_cycle: 'monthly', status: 'active', trial_ends_at: '', next_invoice_date: '', notes: '',
};

const emptyInvoice = { amount: '', currency: 'GHS', period_start: '', period_end: '', due_date: '', notes: '' };

export default function FinanceTenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [billingModal, setBillingModal] = useState(null);
  const [billingForm, setBillingForm] = useState(emptyBilling);
  const [saving, setSaving] = useState(false);
  const [invoiceTenant, setInvoiceTenant] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [invForm, setInvForm] = useState(emptyInvoice);
  const [invoiceAction, setInvoiceAction] = useState(null);
  const [invActionForm, setInvActionForm] = useState({ status: '', payment_method: '', payment_reference: '' });

  const loadTenants = useCallback(() => {
    setLoading(true);
    api.get('/finance/tenants')
      .then((res) => setTenants(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load tenants'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadTenants(); }, [loadTenants]);

  const openBilling = (t) => {
    setBillingModal(t);
    setBillingForm({
      billing_plan: t.billing_plan || 'standard',
      monthly_fee: t.monthly_fee || 0,
      currency: t.currency || 'GHS',
      commission_override_percent: t.commission_override_percent ?? '',
      billing_cycle: t.billing_cycle || 'monthly',
      status: t.billing_status || 'active',
      trial_ends_at: t.trial_ends_at ? t.trial_ends_at.split('T')[0] : '',
      next_invoice_date: t.next_invoice_date || '',
      notes: t.notes || '',
    });
  };

  const saveBilling = async () => {
    setSaving(true);
    try {
      await api.put(`/finance/tenants/${billingModal.id}/billing`, {
        ...billingForm,
        commission_override_percent: billingForm.commission_override_percent === '' ? null : parseFloat(billingForm.commission_override_percent),
        monthly_fee: parseFloat(billingForm.monthly_fee) || 0,
        trial_ends_at: billingForm.trial_ends_at || null,
        next_invoice_date: billingForm.next_invoice_date || null,
      });
      setBillingModal(null);
      loadTenants();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save billing config');
    } finally {
      setSaving(false);
    }
  };

  const openInvoices = async (t) => {
    setInvoiceTenant(t);
    try {
      const res = await api.get(`/finance/tenants/${t.id}/invoices`);
      setInvoices(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load invoices');
    }
  };

  const openCreateInvoice = () => { setInvoiceModal(true); setInvForm(emptyInvoice); };

  const createInvoice = async () => {
    setSaving(true);
    try {
      await api.post(`/finance/tenants/${invoiceTenant.id}/invoices`, {
        ...invForm,
        amount: parseFloat(invForm.amount) || 0,
        period_start: invForm.period_start || null,
        period_end: invForm.period_end || null,
        due_date: invForm.due_date || null,
      });
      setInvoiceModal(false);
      const res = await api.get(`/finance/tenants/${invoiceTenant.id}/invoices`);
      setInvoices(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  const openInvoiceAction = (inv) => {
    setInvoiceAction(inv);
    setInvActionForm({ status: inv.status, payment_method: inv.payment_method || '', payment_reference: inv.payment_reference || '' });
  };

  const saveInvoiceAction = async () => {
    setSaving(true);
    try {
      await api.patch(`/finance/invoices/${invoiceAction.id}`, {
        status: invActionForm.status || undefined,
        payment_method: invActionForm.payment_method || undefined,
        payment_reference: invActionForm.payment_reference || undefined,
      });
      setInvoiceAction(null);
      const res = await api.get(`/finance/tenants/${invoiceTenant.id}/invoices`);
      setInvoices(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <FinanceLayout><Loading>Loading tenants...</Loading></FinanceLayout>;

  return (
    <FinanceLayout>
      <Page>
        <Header>
          <PageTitle>Tenant Billing</PageTitle>
          <PageSubtitle>Configure billing for assembly organizations and manage invoices.</PageSubtitle>
        </Header>

        {error && <ErrorBox>{error}</ErrorBox>}

        <SectionTitle><Building2 size={20} /> Assembly Organizations</SectionTitle>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Organization</th>
                <th>Type</th>
                <th>Region</th>
                <th>Plan</th>
                <th>Monthly Fee</th>
                <th>Commission Override</th>
                <th>Cycle</th>
                <th>Status</th>
                <th>Invoices</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <EmptyRow><td colSpan={10}>No organizations found.</td></EmptyRow>
              ) : tenants.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500 }}>{t.name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{t.type}</td>
                  <td>{t.region || '—'}</td>
                  <td>{t.billing_plan || '—'}</td>
                  <td>{fmtMoney(t.monthly_fee, t.currency)}</td>
                  <td>{t.commission_override_percent != null ? `${t.commission_override_percent}%` : 'Platform default'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{t.billing_cycle || '—'}</td>
                  <td>
                    {t.billing_status ? (
                      <StatusBadge $bg={statusColors[t.billing_status]?.bg} $color={statusColors[t.billing_status]?.color}>
                        {t.billing_status}
                      </StatusBadge>
                    ) : <span style={{ color: '#9ca3af' }}>Not configured</span>}
                  </td>
                  <td>
                    {t.overdue_invoices > 0 && (
                      <StatusBadge $bg="rgba(239,68,68,0.15)" $color="#f87171">{t.overdue_invoices} overdue</StatusBadge>
                    )}
                    {t.pending_invoices > 0 && (
                      <StatusBadge $bg="rgba(251,191,36,0.15)" $color="#fbbf24" style={{ marginLeft: 4 }}>{t.pending_invoices} pending</StatusBadge>
                    )}
                    {t.overdue_invoices === 0 && t.pending_invoices === 0 && <span style={{ color: '#9ca3af' }}>—</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <ActionBtn $color="#3ba7ff" onClick={() => openBilling(t)}><Edit2 size={12} /> Billing</ActionBtn>
                      <ActionBtn $color="#fbbf24" onClick={() => openInvoices(t)}><Receipt size={12} /> Invoices</ActionBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      </Page>

      {billingModal && (
        <Modal onClick={() => setBillingModal(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Billing Config — {billingModal.name}</ModalTitle>
              <IconBtn onClick={() => setBillingModal(null)}><X size={16} /></IconBtn>
            </ModalHeader>
            <Form>
              <FormRow>
                <FormGroup>
                  <Label>Billing Plan</Label>
                  <Select value={billingForm.billing_plan} onChange={(e) => setBillingForm({ ...billingForm, billing_plan: e.target.value })}>
                    <option value="standard">Standard</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="community">Community</option>
                    <option value="custom">Custom</option>
                  </Select>
                </FormGroup>
                <FormGroup>
                  <Label>Billing Cycle</Label>
                  <Select value={billingForm.billing_cycle} onChange={(e) => setBillingForm({ ...billingForm, billing_cycle: e.target.value })}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </Select>
                </FormGroup>
              </FormRow>
              <FormRow>
                <FormGroup>
                  <Label>Monthly Fee</Label>
                  <Input type="number" step="0.01" value={billingForm.monthly_fee} onChange={(e) => setBillingForm({ ...billingForm, monthly_fee: e.target.value })} />
                </FormGroup>
                <FormGroup>
                  <Label>Currency</Label>
                  <Select value={billingForm.currency} onChange={(e) => setBillingForm({ ...billingForm, currency: e.target.value })}>
                    <option value="GHS">GHS</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </Select>
                </FormGroup>
              </FormRow>
              <FormRow>
                <FormGroup>
                  <Label>Commission Override % (blank = platform default)</Label>
                  <Input type="number" step="0.01" placeholder="e.g. 5.00" value={billingForm.commission_override_percent} onChange={(e) => setBillingForm({ ...billingForm, commission_override_percent: e.target.value })} />
                </FormGroup>
                <FormGroup>
                  <Label>Status</Label>
                  <Select value={billingForm.status} onChange={(e) => setBillingForm({ ...billingForm, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="suspended">Suspended</option>
                    <option value="cancelled">Cancelled</option>
                  </Select>
                </FormGroup>
              </FormRow>
              <FormRow>
                <FormGroup>
                  <Label>Trial Ends At</Label>
                  <Input type="date" value={billingForm.trial_ends_at} onChange={(e) => setBillingForm({ ...billingForm, trial_ends_at: e.target.value })} />
                </FormGroup>
                <FormGroup>
                  <Label>Next Invoice Date</Label>
                  <Input type="date" value={billingForm.next_invoice_date} onChange={(e) => setBillingForm({ ...billingForm, next_invoice_date: e.target.value })} />
                </FormGroup>
              </FormRow>
              <FormGroup>
                <Label>Notes</Label>
                <TextArea value={billingForm.notes} onChange={(e) => setBillingForm({ ...billingForm, notes: e.target.value })} placeholder="Internal notes about this tenant's billing..." />
              </FormGroup>
            </Form>
            <ModalActions>
              <PrimaryBtn onClick={saveBilling} disabled={saving}><Save size={16} /> {saving ? 'Saving...' : 'Save'}</PrimaryBtn>
              <SecondaryBtn onClick={() => setBillingModal(null)}>Cancel</SecondaryBtn>
            </ModalActions>
          </ModalContent>
        </Modal>
      )}

      {invoiceTenant && (
        <Modal onClick={() => setInvoiceTenant(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Invoices — {invoiceTenant.name}</ModalTitle>
              <IconBtn onClick={() => setInvoiceTenant(null)}><X size={16} /></IconBtn>
            </ModalHeader>
            <div style={{ marginBottom: '1rem' }}>
              <PrimaryBtn onClick={openCreateInvoice}><Plus size={16} /> New Invoice</PrimaryBtn>
            </div>
            <TableWrap style={{ marginBottom: 0 }}>
              <Table style={{ minWidth: 600 }}>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Amount</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <EmptyRow><td colSpan={6}>No invoices yet.</td></EmptyRow>
                  ) : invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{inv.invoice_number}</td>
                      <td>{fmtMoney(inv.amount, inv.currency)}</td>
                      <td>{fmtDate(inv.due_date)}</td>
                      <td>
                        <StatusBadge $bg={statusColors[inv.status]?.bg} $color={statusColors[inv.status]?.color}>
                          {inv.status}
                        </StatusBadge>
                      </td>
                      <td>{fmtDate(inv.created_at)}</td>
                      <td>
                        <ActionBtn $color="#3ba7ff" onClick={() => openInvoiceAction(inv)}><Edit2 size={12} /> Update</ActionBtn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          </ModalContent>
        </Modal>
      )}

      {invoiceModal && (
        <Modal onClick={() => setInvoiceModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>New Invoice — {invoiceTenant.name}</ModalTitle>
              <IconBtn onClick={() => setInvoiceModal(false)}><X size={16} /></IconBtn>
            </ModalHeader>
            <Form>
              <FormRow>
                <FormGroup>
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" value={invForm.amount} onChange={(e) => setInvForm({ ...invForm, amount: e.target.value })} />
                </FormGroup>
                <FormGroup>
                  <Label>Currency</Label>
                  <Select value={invForm.currency} onChange={(e) => setInvForm({ ...invForm, currency: e.target.value })}>
                    <option value="GHS">GHS</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </Select>
                </FormGroup>
              </FormRow>
              <FormRow>
                <FormGroup>
                  <Label>Period Start</Label>
                  <Input type="date" value={invForm.period_start} onChange={(e) => setInvForm({ ...invForm, period_start: e.target.value })} />
                </FormGroup>
                <FormGroup>
                  <Label>Period End</Label>
                  <Input type="date" value={invForm.period_end} onChange={(e) => setInvForm({ ...invForm, period_end: e.target.value })} />
                </FormGroup>
              </FormRow>
              <FormGroup>
                <Label>Due Date</Label>
                <Input type="date" value={invForm.due_date} onChange={(e) => setInvForm({ ...invForm, due_date: e.target.value })} />
              </FormGroup>
              <FormGroup>
                <Label>Notes</Label>
                <TextArea value={invForm.notes} onChange={(e) => setInvForm({ ...invForm, notes: e.target.value })} placeholder="Optional notes..." />
              </FormGroup>
            </Form>
            <ModalActions>
              <PrimaryBtn onClick={createInvoice} disabled={saving || !invForm.amount}><Save size={16} /> {saving ? 'Creating...' : 'Create Invoice'}</PrimaryBtn>
              <SecondaryBtn onClick={() => setInvoiceModal(false)}>Cancel</SecondaryBtn>
            </ModalActions>
          </ModalContent>
        </Modal>
      )}

      {invoiceAction && (
        <Modal onClick={() => setInvoiceAction(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Update Invoice — {invoiceAction.invoice_number}</ModalTitle>
              <IconBtn onClick={() => setInvoiceAction(null)}><X size={16} /></IconBtn>
            </ModalHeader>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1rem' }}>
              {fmtMoney(invoiceAction.amount, invoiceAction.currency)} — Due {fmtDate(invoiceAction.due_date)}
            </p>
            <Form>
              <FormGroup>
                <Label>Status</Label>
                <Select value={invActionForm.status} onChange={(e) => setInvActionForm({ ...invActionForm, status: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </FormGroup>
              <FormGroup>
                <Label>Payment Method</Label>
                <Input value={invActionForm.payment_method} onChange={(e) => setInvActionForm({ ...invActionForm, payment_method: e.target.value })} placeholder="e.g. bank_transfer, cash" />
              </FormGroup>
              <FormGroup>
                <Label>Payment Reference</Label>
                <Input value={invActionForm.payment_reference} onChange={(e) => setInvActionForm({ ...invActionForm, payment_reference: e.target.value })} placeholder="Transaction reference" />
              </FormGroup>
            </Form>
            <ModalActions>
              <PrimaryBtn onClick={saveInvoiceAction} disabled={saving}><Save size={16} /> {saving ? 'Saving...' : 'Save'}</PrimaryBtn>
              <SecondaryBtn onClick={() => setInvoiceAction(null)}>Cancel</SecondaryBtn>
            </ModalActions>
          </ModalContent>
        </Modal>
      )}
    </FinanceLayout>
  );
}
