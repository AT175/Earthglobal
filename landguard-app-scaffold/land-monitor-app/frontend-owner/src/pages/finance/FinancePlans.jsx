import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  CreditCard, Plus, Edit2, Trash2, X, Save, Search, Users,
} from 'lucide-react';
import FinanceLayout from '../../components/FinanceLayout';
import api from '../../services/api';

const Page = styled.div`
  color: ${({ theme }) => theme.colors.text};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
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

const AddBtn = styled.button`
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
  transition: opacity 0.2s;

  &:hover { opacity: 0.9; }
`;

const TableWrap = styled.div`
  background: ${({ theme }) => theme.colors.gradientSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.xl};
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;

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
  }

  tr { border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark}; }
  tr:last-child { border-bottom: none; }

  td { color: ${({ theme }) => theme.colors.text}; }
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
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
  transition: all 0.2s;

  &:hover { color: ${({ $hover }) => $hover || theme.colors.primaryBright}; border-color: ${({ $hover }) => $hover || theme.colors.primaryBright}40; }
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
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
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
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

const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
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
  active: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  trial: { bg: 'rgba(92,225,255,0.15)', color: '#5ce1ff' },
  past_due: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  cancelled: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  expired: { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af' },
};

const emptyPlan = { name: '', included_visits_per_period: 0, period: 'monthly', price: 0, live_video_included: false };

export default function FinancePlans() {
  const [plans, setPlans] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState(emptyPlan);
  const [saving, setSaving] = useState(false);
  const [subFilter, setSubFilter] = useState('');
  const [subSearch, setSubSearch] = useState('');
  const [editingSub, setEditingSub] = useState(null);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subForm, setSubForm] = useState({ status: '', renews_at: '', plan_id: '', credits_remaining: '' });

  const loadData = useCallback(() => {
    Promise.all([
      api.get('/finance/plans'),
      api.get('/finance/subscriptions', { params: { status: subFilter || undefined, search: subSearch || undefined } }),
    ]).then(([p, s]) => {
      setPlans(p.data);
      setSubs(s.data);
    }).catch((err) => setError(err.response?.data?.error || 'Failed to load data'))
      .finally(() => setLoading(false));
  }, [subFilter, subSearch]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAddPlan = () => { setEditingPlan(null); setFormData(emptyPlan); setModalOpen(true); };
  const openEditPlan = (plan) => { setEditingPlan(plan); setFormData({ ...plan }); setModalOpen(true); };

  const savePlan = async () => {
    setSaving(true);
    try {
      if (editingPlan) {
        await api.patch(`/finance/plans/${editingPlan.id}`, formData);
      } else {
        await api.post('/finance/plans', formData);
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (id) => {
    if (!confirm('Delete this plan? This cannot be undone.')) return;
    try {
      await api.delete(`/finance/plans/${id}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete plan');
    }
  };

  const openEditSub = (sub) => {
    setEditingSub(sub);
    setSubForm({
      status: sub.status,
      renews_at: sub.renews_at ? sub.renews_at.split('T')[0] : '',
      plan_id: sub.plan_id,
      credits_remaining: sub.credits_remaining,
    });
    setSubModalOpen(true);
  };

  const saveSub = async () => {
    setSaving(true);
    try {
      await api.patch(`/finance/subscriptions/${editingSub.id}`, {
        status: subForm.status || undefined,
        renews_at: subForm.renews_at || undefined,
        plan_id: subForm.plan_id || undefined,
        credits_remaining: subForm.credits_remaining !== '' ? Number(subForm.credits_remaining) : undefined,
      });
      setSubModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update subscription');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <FinanceLayout><Loading>Loading...</Loading></FinanceLayout>;

  return (
    <FinanceLayout>
      <Page>
        <Header>
          <div>
            <PageTitle>Plans & Subscriptions</PageTitle>
            <PageSubtitle>Manage owner monitoring plans and active subscriptions.</PageSubtitle>
          </div>
        </Header>

        {error && <ErrorBox>{error}</ErrorBox>}

        <SectionTitle><CreditCard size={20} /> Subscription Plans</SectionTitle>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Period</th>
                <th>Price</th>
                <th>Visits/Period</th>
                <th>Live Video</th>
                <th>Active Subs</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <EmptyRow><td colSpan={7}>No plans configured. Click "Add Plan" to create one.</td></EmptyRow>
              ) : plans.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{p.period}</td>
                  <td>{fmtMoney(p.price)}</td>
                  <td>{p.included_visits_per_period}</td>
                  <td>{p.live_video_included ? 'Yes' : 'No'}</td>
                  <td>{p.active_subscribers}</td>
                  <td>
                    <Actions>
                      <IconBtn $hover="#3ba7ff" onClick={() => openEditPlan(p)}><Edit2 size={14} /></IconBtn>
                      <IconBtn $hover="#f87171" onClick={() => deletePlan(p.id)}><Trash2 size={14} /></IconBtn>
                    </Actions>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
          <AddBtn onClick={openAddPlan}><Plus size={16} /> Add Plan</AddBtn>
        </div>

        <SectionTitle><Users size={20} /> Owner Subscriptions</SectionTitle>
        <Toolbar>
          <Select value={subFilter} onChange={(e) => setSubFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="past_due">Past Due</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </Select>
          <SearchInput
            placeholder="Search by owner name or email..."
            value={subSearch}
            onChange={(e) => setSubSearch(e.target.value)}
          />
        </Toolbar>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Owner</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Price</th>
                <th>Credits</th>
                <th>Status</th>
                <th>Renews</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subs.length === 0 ? (
                <EmptyRow><td colSpan={8}>No subscriptions found.</td></EmptyRow>
              ) : subs.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.owner_name}</td>
                  <td>{s.owner_email}</td>
                  <td>{s.plan_name}</td>
                  <td>{fmtMoney(s.price)}</td>
                  <td>{s.credits_remaining}</td>
                  <td>
                    <StatusBadge $bg={statusColors[s.status]?.bg} $color={statusColors[s.status]?.color}>
                      {s.status}
                    </StatusBadge>
                  </td>
                  <td>{fmtDate(s.renews_at)}</td>
                  <td>
                    <IconBtn $hover="#3ba7ff" onClick={() => openEditSub(s)}><Edit2 size={14} /></IconBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      </Page>

      {modalOpen && (
        <Modal onClick={() => setModalOpen(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{editingPlan ? 'Edit Plan' : 'Add Plan'}</ModalTitle>
              <IconBtn onClick={() => setModalOpen(false)}><X size={16} /></IconBtn>
            </ModalHeader>
            <Form>
              <FormGroup>
                <Label>Plan Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Basic Monitoring" />
              </FormGroup>
              <FormGroup>
                <Label>Billing Period</Label>
                <Select value={formData.period} onChange={(e) => setFormData({ ...formData, period: e.target.value })}>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </Select>
              </FormGroup>
              <FormGroup>
                <Label>Price (GHS)</Label>
                <Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} />
              </FormGroup>
              <FormGroup>
                <Label>Included Visits per Period</Label>
                <Input type="number" value={formData.included_visits_per_period} onChange={(e) => setFormData({ ...formData, included_visits_per_period: parseInt(e.target.value) || 0 })} />
              </FormGroup>
              <CheckboxRow>
                <input type="checkbox" checked={!!formData.live_video_included} onChange={(e) => setFormData({ ...formData, live_video_included: e.target.checked })} />
                Includes live video calls
              </CheckboxRow>
            </Form>
            <ModalActions>
              <PrimaryBtn onClick={savePlan} disabled={saving || !formData.name}>
                <Save size={16} /> {saving ? 'Saving...' : 'Save'}
              </PrimaryBtn>
              <SecondaryBtn onClick={() => setModalOpen(false)}>Cancel</SecondaryBtn>
            </ModalActions>
          </ModalContent>
        </Modal>
      )}

      {subModalOpen && editingSub && (
        <Modal onClick={() => setSubModalOpen(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Edit Subscription — {editingSub.owner_name}</ModalTitle>
              <IconBtn onClick={() => setSubModalOpen(false)}><X size={16} /></IconBtn>
            </ModalHeader>
            <Form>
              <FormGroup>
                <Label>Plan</Label>
                <Select value={subForm.plan_id} onChange={(e) => setSubForm({ ...subForm, plan_id: e.target.value })}>
                  <option value="">— Keep current —</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name} ({fmtMoney(p.price)})</option>)}
                </Select>
              </FormGroup>
              <FormGroup>
                <Label>Status</Label>
                <Select value={subForm.status} onChange={(e) => setSubForm({ ...subForm, status: e.target.value })}>
                  <option value="">— Keep current —</option>
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="past_due">Past Due</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                </Select>
              </FormGroup>
              <FormGroup>
                <Label>Renewal Date</Label>
                <Input type="date" value={subForm.renews_at} onChange={(e) => setSubForm({ ...subForm, renews_at: e.target.value })} />
              </FormGroup>
              <FormGroup>
                <Label>Credits Remaining</Label>
                <Input type="number" value={subForm.credits_remaining} onChange={(e) => setSubForm({ ...subForm, credits_remaining: e.target.value })} />
              </FormGroup>
            </Form>
            <ModalActions>
              <PrimaryBtn onClick={saveSub} disabled={saving}><Save size={16} /> {saving ? 'Saving...' : 'Save'}</PrimaryBtn>
              <SecondaryBtn onClick={() => setSubModalOpen(false)}>Cancel</SecondaryBtn>
            </ModalActions>
          </ModalContent>
        </Modal>
      )}
    </FinanceLayout>
  );
}
