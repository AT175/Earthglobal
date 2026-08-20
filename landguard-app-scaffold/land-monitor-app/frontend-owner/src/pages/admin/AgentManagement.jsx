import { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  Users, Plus, Search, Trash2, Power, PowerOff, X, Save, Loader,
  Phone, Mail, MapPin, CheckCircle2, AlertCircle,
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

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
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

const Table = styled.div`
  background: ${({ theme }) => theme.colors.gradientSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.xl};
  overflow: hidden;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.5fr 1.5fr 1fr 1fr 0.5fr;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[5]}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;

  @media (max-width: 768px) { display: none; }
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.5fr 1.5fr 1fr 1fr 0.5fr;
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[5]}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  align-items: center;
  transition: background 0.2s;

  &:last-child { border-bottom: none; }
  &:hover { background: ${({ theme }) => theme.colors.surfaceLight}; }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.spacing[2]};
    padding: ${({ theme }) => theme.spacing[4]};
  }
`;

const Cell = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    gap: 8px;

    &::before {
      content: attr(data-label);
      font-weight: 600;
      color: ${({ theme }) => theme.colors.textMuted};
      font-size: 0.75rem;
      min-width: 80px;
    }
  }
`;

const AgentName = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Avatar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.gradientPrimary};
  color: white;
  font-weight: 600;
  font-size: 0.85rem;
  flex-shrink: 0;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  background: ${({ $active }) => $active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'};
  color: ${({ $active }) => $active ? '#4ade80' : '#f87171'};
`;

const ActionBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  transition: all 0.2s;

  &:hover { color: ${({ $danger, theme }) => $danger ? theme.colors.error : theme.colors.text}; border-color: ${({ $danger, theme }) => $danger ? theme.colors.error + '40' : theme.colors.borderLight}; }
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

// ── Modal ──
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(8, 15, 36, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing[4]};
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.colors.gradientSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[6]};
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[5]};
`;

const ModalTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
`;

const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const Label = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
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

  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[5]};
`;

const PrimaryBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[5]}`};
  background: ${({ theme }) => theme.colors.gradientPrimary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  font-weight: 600;
  font-size: ${({ theme }) => theme.fontSizes.sm};

  &:disabled { opacity: 0.5; }
`;

const SecondaryBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[5]}`};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  color: ${({ theme }) => theme.colors.textMuted};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const Toast = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  background: ${({ $type }) => $type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'};
  border: 1px solid ${({ $type }) => $type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ $type }) => $type === 'error' ? '#f87171' : '#4ade80'};
  z-index: 2000;
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const initials = (name) => name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '??';

export default function AgentManagement() {
  const [agents, setAgents] = useState([]);
  const [agentStats, setAgentStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', region: '', password: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [a, s] = await Promise.all([api.get('/agents'), api.get('/agents/stats')]);
      setAgents(a.data);
      setAgentStats(s.data);
    } catch (err) {
      showToast('Failed to load agents', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = agents.filter(a =>
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.phone?.includes(search) ||
    a.region?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', region: '', password: '' });
    setShowModal(true);
  };

  const openEdit = (agent) => {
    setEditing(agent);
    setForm({ name: agent.name, email: agent.email || '', phone: agent.phone, region: agent.region || '', password: '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.phone) { showToast('Name and phone are required', 'error'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/agents/${editing.id}`, {
          name: form.name, email: form.email, phone: form.phone, region: form.region,
        });
        showToast('Agent updated');
      } else {
        await api.post('/agents', form);
        showToast('Agent created');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save agent', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (agent) => {
    try {
      await api.patch(`/agents/${agent.id}`, { active: !agent.active });
      showToast(`Agent ${agent.active ? 'deactivated' : 'activated'}`);
      loadData();
    } catch {
      showToast('Failed to update agent', 'error');
    }
  };

  const handleDelete = async (agent) => {
    if (!confirm(`Delete agent "${agent.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/agents/${agent.id}`);
      showToast('Agent deleted');
      loadData();
    } catch {
      showToast('Failed to delete agent', 'error');
    }
  };

  const getVisits = (id) => agentStats.find(s => s.id === id)?.visits || 0;

  return (
    <AdminLayout>
      <Page>
        <Header>
          <PageTitle>Agent Management</PageTitle>
          <AddBtn onClick={openAdd}><Plus size={18} /> Add Agent</AddBtn>
        </Header>

        <StatsRow>
          <StatCard>
            <StatValue>{agents.length}</StatValue>
            <StatLabel>Total Agents</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{agents.filter(a => a.active).length}</StatValue>
            <StatLabel>Active</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{agents.filter(a => !a.active).length}</StatValue>
            <StatLabel>Inactive</StatLabel>
          </StatCard>
        </StatsRow>

        <SearchBar>
          <Search size={18} color="#aab7d4" />
          <SearchInput
            placeholder="Search by name, phone, or region..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </SearchBar>

        {loading ? (
          <Loading>Loading agents...</Loading>
        ) : filtered.length === 0 ? (
          <Table>
            <EmptyState>
              {search ? 'No agents match your search.' : 'No agents yet. Click "Add Agent" to create one.'}
            </EmptyState>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <div>Agent</div>
              <div>Phone</div>
              <div>Region</div>
              <div>Visits</div>
              <div>Status</div>
              <div>Actions</div>
            </TableHeader>
            {filtered.map((agent) => (
              <TableRow key={agent.id}>
                <Cell data-label="Agent">
                  <AgentName>
                    <Avatar>{initials(agent.name)}</Avatar>
                    <div>
                      <div style={{ fontWeight: 500 }}>{agent.name}</div>
                      {agent.email && <div style={{ fontSize: '0.75rem', color: '#aab7d4', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Mail size={11} /> {agent.email}
                      </div>}
                    </div>
                  </AgentName>
                </Cell>
                <Cell data-label="Phone">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone size={14} color="#aab7d4" /> {agent.phone}
                  </span>
                </Cell>
                <Cell data-label="Region">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={14} color="#aab7d4" /> {agent.region || '—'}
                  </span>
                </Cell>
                <Cell data-label="Visits">{getVisits(agent.id)}</Cell>
                <Cell data-label="Status">
                  <StatusBadge $active={agent.active}>
                    {agent.active ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    {agent.active ? 'Active' : 'Inactive'}
                  </StatusBadge>
                </Cell>
                <Cell data-label="Actions" style={{ display: 'flex', gap: 6 }}>
                  <ActionBtn title={agent.active ? 'Deactivate' : 'Activate'} onClick={() => toggleActive(agent)}>
                    {agent.active ? <PowerOff size={15} /> : <Power size={15} />}
                  </ActionBtn>
                  <ActionBtn title="Edit" onClick={() => openEdit(agent)}>
                    <Users size={15} />
                  </ActionBtn>
                  <ActionBtn $danger title="Delete" onClick={() => handleDelete(agent)}>
                    <Trash2 size={15} />
                  </ActionBtn>
                </Cell>
              </TableRow>
            ))}
          </Table>
        )}

        {showModal && (
          <ModalOverlay onClick={() => setShowModal(false)}>
            <Modal onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>{editing ? 'Edit Agent' : 'Add New Agent'}</ModalTitle>
                <ActionBtn onClick={() => setShowModal(false)}><X size={16} /></ActionBtn>
              </ModalHeader>

              <FormGroup>
                <Label>Full Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kwame Mensah" />
              </FormGroup>
              <FormGroup>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="agent@example.com" />
              </FormGroup>
              <FormGroup>
                <Label>Phone *</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+233240000000" />
              </FormGroup>
              <FormGroup>
                <Label>Region</Label>
                <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="e.g. Ashanti Region" />
              </FormGroup>
              {!editing && (
                <FormGroup>
                  <Label>Password (for login)</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Set a login password" />
                </FormGroup>
              )}

              <ButtonRow>
                <PrimaryBtn onClick={handleSave} disabled={saving}>
                  {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Saving...' : 'Save'}
                </PrimaryBtn>
                <SecondaryBtn onClick={() => setShowModal(false)}>Cancel</SecondaryBtn>
              </ButtonRow>
            </Modal>
          </ModalOverlay>
        )}

        {toast && (
          <Toast $type={toast.type}>
            {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            {toast.msg}
          </Toast>
        )}
      </Page>
    </AdminLayout>
  );
}
