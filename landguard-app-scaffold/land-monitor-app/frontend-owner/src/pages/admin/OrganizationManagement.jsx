import { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  Building2, Plus, Search, Trash2, X, Save, Loader, MapPin,
  Mail, Phone, Home, Users, CheckCircle2, XCircle, ChevronRight,
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';

const Page = styled.div`color: ${({ theme }) => theme.colors.text};`;

const Header = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
`;

const PageSubtitle = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.md};
  margin-top: 4px;
`;

const AddBtn = styled.button`
  display: flex; align-items: center; gap: 8px;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  background: ${({ theme }) => theme.colors.gradientPrimary};
  color: white; border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer; font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600; transition: all 0.2s;
  &:hover { transform: translateY(-1px); box-shadow: ${({ theme }) => theme.shadows.glowPrimarySoft}; }
`;

const SearchBar = styled.div`
  display: flex; align-items: center; gap: 8px;
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  max-width: 400px;
`;

const SearchInput = styled.input`
  flex: 1; background: none; border: none;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm}; outline: none;
  &::placeholder { color: ${({ theme }) => theme.colors.textMuted}; }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
  @media (max-width: 480px) { grid-template-columns: 1fr; }
`;

const OrgCard = styled.div`
  background: ${({ theme }) => theme.colors.gradientSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[5]};
  transition: all 0.2s; cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.colors.borderLight};
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.glowPrimarySoft};
  }
`;

const OrgHeader = styled.div`
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const OrgIcon = styled.div`
  display: flex; align-items: center; justify-content: center;
  width: 48px; height: 48px; border-radius: ${({ theme }) => theme.radii.lg};
  background: rgba(168,85,247,0.15); color: #c084fc;
`;

const OrgName = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  margin-bottom: 4px;
`;

const OrgType = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  text-transform: capitalize;
`;

const OrgMeta = styled.div`
  display: flex; flex-direction: column; gap: 6px;
  padding-top: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.borderDark};
  margin-top: ${({ theme }) => theme.spacing[3]};
`;

const MetaRow = styled.div`
  display: flex; align-items: center; gap: 8px;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const OrgStats = styled.div`
  display: flex; gap: ${({ theme }) => theme.spacing[4]};
  padding-top: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.borderDark};
  margin-top: ${({ theme }) => theme.spacing[3]};
`;

const OrgStat = styled.div`flex: 1;`;

const OrgStatValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
`;

const OrgStatLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Badge = styled.span`
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 10px; border-radius: ${({ theme }) => theme.radii.full};
  font-size: ${({ theme }) => theme.fontSizes.xs}; font-weight: 600;
  background: ${({ $bg }) => $bg}; color: ${({ $color }) => $color};
`;

const Loading = styled.div`
  text-align: center; padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const EmptyState = styled.div`
  text-align: center; padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ModalOverlay = styled.div`
  position: fixed; inset: 0;
  background: rgba(8, 15, 36, 0.8);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: ${({ theme }) => theme.spacing[4]};
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.colors.gradientSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[6]};
  max-width: 560px; width: 100%; max-height: 90vh; overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[5]};
`;

const ModalTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
`;

const FormGroup = styled.div`margin-bottom: ${({ theme }) => theme.spacing[4]};`;

const Label = styled.label`
  display: block; font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500; margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const Input = styled.input`
  width: 100%; padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm}; outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const Select = styled.select`
  width: 100%; padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm}; outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const ButtonRow = styled.div`
  display: flex; gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[5]};
`;

const PrimaryBtn = styled.button`
  display: flex; align-items: center; gap: 8px;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[5]}`};
  background: ${({ theme }) => theme.colors.gradientPrimary};
  color: white; border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer; font-weight: 600; font-size: ${({ theme }) => theme.fontSizes.sm};
  &:disabled { opacity: 0.5; }
`;

const SecondaryBtn = styled.button`
  display: flex; align-items: center; gap: 8px;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[5]}`};
  background: transparent; border: 1px solid ${({ theme }) => theme.colors.borderDark};
  color: ${({ theme }) => theme.colors.textMuted};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer; font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const ActionBtn = styled.button`
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  background: transparent; color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer; transition: all 0.2s;
  &:hover {
    color: ${({ $danger, theme }) => $danger ? theme.colors.error : theme.colors.text};
    border-color: ${({ $danger, theme }) => $danger ? theme.colors.error + '40' : theme.colors.borderLight};
  }
`;

const Toast = styled.div`
  position: fixed; bottom: 24px; right: 24px;
  display: flex; align-items: center; gap: 8px;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  background: ${({ $type }) => $type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'};
  border: 1px solid ${({ $type }) => $type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ $type }) => $type === 'error' ? '#f87171' : '#4ade80'};
  z-index: 2000; font-size: ${({ theme }) => theme.fontSizes.sm};
`;

// ── Assembly Users sub-modal ──
const UserList = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.borderDark};
  padding-top: ${({ theme }) => theme.spacing[4]};
`;

const UserItem = styled.div`
  display: flex; align-items: center; gap: 10px;
  padding: ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  margin-bottom: 8px;
`;

const UserAvatar = styled.div`
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 50%;
  background: rgba(168,85,247,0.15); color: #c084fc;
  font-weight: 600; font-size: 0.75rem; flex-shrink: 0;
`;

const initials = (name) => name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '??';

export default function OrganizationManagement() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [orgUsers, setOrgUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'district_assembly', region: '', contact_email: '', contact_phone: '', address: '' });
  const [userForm, setUserForm] = useState({ name: '', email: '', phone: '', password: '', role: 'planning_officer' });
  const [showUserForm, setShowUserForm] = useState(false);

  useEffect(() => { loadOrgs(); }, []);

  const loadOrgs = async () => {
    try {
      const { data } = await api.get('/admin/organizations');
      setOrgs(data);
    } catch { showToast('Failed to load organizations', 'error'); }
    finally { setLoading(false); }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openOrg = async (org) => {
    setSelectedOrg(org);
    setShowModal(true);
    setShowUserForm(false);
    try {
      const { data } = await api.get(`/admin/organizations/${org.id}/users`);
      setOrgUsers(data);
    } catch { showToast('Failed to load assembly users', 'error'); }
  };

  const createOrg = async () => {
    if (!form.name || !form.region) { showToast('Name and region are required', 'error'); return; }
    setSaving(true);
    try {
      await api.post('/admin/organizations', form);
      showToast('Organization created');
      setShowModal(false);
      setForm({ name: '', type: 'district_assembly', region: '', contact_email: '', contact_phone: '', address: '' });
      loadOrgs();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create organization', 'error');
    } finally { setSaving(false); }
  };

  const deleteOrg = async (org) => {
    if (!confirm(`Delete "${org.name}"? All assembly users in this organization will also be deleted.`)) return;
    try {
      await api.delete(`/admin/organizations/${org.id}`);
      showToast('Organization deleted');
      loadOrgs();
    } catch { showToast('Failed to delete', 'error'); }
  };

  const createAssemblyUser = async () => {
    if (!userForm.name || !userForm.email || !userForm.password) {
      showToast('Name, email, and password are required', 'error'); return;
    }
    setSaving(true);
    try {
      await api.post(`/admin/organizations/${selectedOrg.id}/users`, userForm);
      showToast('Assembly user created');
      setUserForm({ name: '', email: '', phone: '', password: '', role: 'planning_officer' });
      setShowUserForm(false);
      const { data } = await api.get(`/admin/organizations/${selectedOrg.id}/users`);
      setOrgUsers(data);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create user', 'error');
    } finally { setSaving(false); }
  };

  const toggleUserActive = async (user) => {
    try {
      await api.patch(`/admin/organizations/${selectedOrg.id}/users/${user.id}`, { active: !user.active });
      showToast(`User ${user.active ? 'deactivated' : 'activated'}`);
      const { data } = await api.get(`/admin/organizations/${selectedOrg.id}/users`);
      setOrgUsers(data);
    } catch { showToast('Failed to update user', 'error'); }
  };

  const deleteUser = async (user) => {
    if (!confirm(`Delete user "${user.name}"?`)) return;
    try {
      await api.delete(`/admin/organizations/${selectedOrg.id}/users/${user.id}`);
      showToast('User deleted');
      const { data } = await api.get(`/admin/organizations/${selectedOrg.id}/users`);
      setOrgUsers(data);
    } catch { showToast('Failed to delete user', 'error'); }
  };

  const filtered = orgs.filter(o =>
    o.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.region?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <Page>
        <Header>
          <div>
            <PageTitle>Organizations</PageTitle>
            <PageSubtitle>Set up and manage District Assembly tenants (municipal clients).</PageSubtitle>
          </div>
          <AddBtn onClick={() => { setSelectedOrg(null); setShowModal(true); setShowUserForm(false); }}>
            <Plus size={18} /> Add Organization
          </AddBtn>
        </Header>

        <SearchBar>
          <Search size={18} color="#aab7d4" />
          <SearchInput
            placeholder="Search organizations by name or region..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </SearchBar>

        {loading ? (
          <Loading>Loading organizations...</Loading>
        ) : filtered.length === 0 ? (
          <EmptyState>
            {search ? 'No organizations match your search.' : 'No organizations yet. Click "Add Organization" to create a District Assembly tenant.'}
          </EmptyState>
        ) : (
          <Grid>
            {filtered.map((org) => (
              <OrgCard key={org.id} onClick={() => openOrg(org)}>
                <OrgHeader>
                  <OrgIcon><Building2 size={24} /></OrgIcon>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Badge $bg={org.active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'} $color={org.active ? '#4ade80' : '#f87171'}>
                      {org.active ? 'Active' : 'Inactive'}
                    </Badge>
                    <ActionBtn $danger onClick={(e) => { e.stopPropagation(); deleteOrg(org); }}>
                      <Trash2 size={14} />
                    </ActionBtn>
                  </div>
                </OrgHeader>
                <OrgName>{org.name}</OrgName>
                <OrgType>{(org.type || 'district_assembly').replace(/_/g, ' ')}</OrgType>

                <OrgMeta>
                  {org.region && <MetaRow><MapPin size={14} /> {org.region}</MetaRow>}
                  {org.contact_email && <MetaRow><Mail size={14} /> {org.contact_email}</MetaRow>}
                  {org.contact_phone && <MetaRow><Phone size={14} /> {org.contact_phone}</MetaRow>}
                  {org.address && <MetaRow><Home size={14} /> {org.address}</MetaRow>}
                </OrgMeta>

                <OrgStats>
                  <OrgStat>
                    <OrgStatValue>{org.user_count || 0}</OrgStatValue>
                    <OrgStatLabel>Users</OrgStatLabel>
                  </OrgStat>
                  <OrgStat>
                    <OrgStatValue>{org.parcel_count || 0}</OrgStatValue>
                    <OrgStatLabel>Parcels</OrgStatLabel>
                  </OrgStat>
                  <OrgStat style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                    <ChevronRight size={20} color="#aab7d4" />
                  </OrgStat>
                </OrgStats>
              </OrgCard>
            ))}
          </Grid>
        )}

        {showModal && (
          <ModalOverlay onClick={() => setShowModal(false)}>
            <Modal onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>{selectedOrg ? selectedOrg.name : 'Add Organization'}</ModalTitle>
                <ActionBtn onClick={() => setShowModal(false)}><X size={16} /></ActionBtn>
              </ModalHeader>

              {!selectedOrg ? (
                <>
                  <FormGroup>
                    <Label>Organization Name *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Amansie West District Assembly" />
                  </FormGroup>
                  <FormGroup>
                    <Label>Type</Label>
                    <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                      <option value="district_assembly">District Assembly</option>
                      <option value="municipal">Municipal Assembly</option>
                      <option value="metropolitan">Metropolitan Assembly</option>
                      <option value="land_commission">Land Commission</option>
                      <option value="survey_department">Survey Department</option>
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <Label>Region *</Label>
                    <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="e.g. Ashanti Region" />
                  </FormGroup>
                  <FormGroup>
                    <Label>Contact Email</Label>
                    <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="info@assembly.gov.gh" />
                  </FormGroup>
                  <FormGroup>
                    <Label>Contact Phone</Label>
                    <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="+233240000000" />
                  </FormGroup>
                  <FormGroup>
                    <Label>Address</Label>
                    <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Physical address" />
                  </FormGroup>
                  <ButtonRow>
                    <PrimaryBtn onClick={createOrg} disabled={saving}>
                      {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                      {saving ? 'Creating...' : 'Create Organization'}
                    </PrimaryBtn>
                    <SecondaryBtn onClick={() => setShowModal(false)}>Cancel</SecondaryBtn>
                  </ButtonRow>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{selectedOrg.region}</div>
                      <div style={{ fontSize: '0.85rem', color: '#aab7d4' }}>{(selectedOrg.type || '').replace(/_/g, ' ')}</div>
                    </div>
                    <Badge $bg={selectedOrg.active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'} $color={selectedOrg.active ? '#4ade80' : '#f87171'}>
                      {selectedOrg.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Users size={18} /> Assembly Users ({orgUsers.length})
                    </h3>
                    <AddBtn onClick={() => setShowUserForm(!showUserForm)}>
                      <Plus size={16} /> Add User
                    </AddBtn>
                  </div>

                  {showUserForm && (
                    <div style={{ background: '${({ theme }) => theme.colors.surface}', padding: '16px', borderRadius: '12px', marginTop: '12px', border: '1px solid rgba(92,225,255,0.1)' }}>
                      <FormGroup>
                        <Label>Full Name *</Label>
                        <Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} placeholder="e.g. Planning Officer" />
                      </FormGroup>
                      <FormGroup>
                        <Label>Email *</Label>
                        <Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="officer@assembly.gov.gh" />
                      </FormGroup>
                      <FormGroup>
                        <Label>Phone</Label>
                        <Input value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} placeholder="+233240000000" />
                      </FormGroup>
                      <FormGroup>
                        <Label>Password *</Label>
                        <Input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder="Set login password" />
                      </FormGroup>
                      <FormGroup>
                        <Label>Role</Label>
                        <Select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                          <option value="assembly_admin">Assembly Admin</option>
                          <option value="planning_officer">Planning Officer</option>
                          <option value="revenue_officer">Revenue Officer</option>
                          <option value="inspector">Inspector</option>
                        </Select>
                      </FormGroup>
                      <ButtonRow>
                        <PrimaryBtn onClick={createAssemblyUser} disabled={saving}>
                          {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                          {saving ? 'Creating...' : 'Create User'}
                        </PrimaryBtn>
                        <SecondaryBtn onClick={() => setShowUserForm(false)}>Cancel</SecondaryBtn>
                      </ButtonRow>
                    </div>
                  )}

                  <UserList>
                    {orgUsers.length === 0 ? (
                      <EmptyState style={{ padding: '2rem' }}>No assembly users yet. Add one to give them access to the Assembly Dashboard.</EmptyState>
                    ) : orgUsers.map((u) => (
                      <UserItem key={u.id}>
                        <UserAvatar>{initials(u.name)}</UserAvatar>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{u.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#aab7d4' }}>{u.email} - {u.assembly_role.replace(/_/g, ' ')}</div>
                        </div>
                        <Badge $bg={u.active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'} $color={u.active ? '#4ade80' : '#f87171'}>
                          {u.active ? 'Active' : 'Inactive'}
                        </Badge>
                        <ActionBtn $success title={u.active ? 'Deactivate' : 'Activate'} onClick={() => toggleUserActive(u)}>
                          {u.active ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                        </ActionBtn>
                        <ActionBtn $danger title="Delete" onClick={() => deleteUser(u)}>
                          <Trash2 size={14} />
                        </ActionBtn>
                      </UserItem>
                    ))}
                  </UserList>
                </>
              )}
            </Modal>
          </ModalOverlay>
        )}

        {toast && (
          <Toast $type={toast.type}>
            {toast.type === 'error' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
            {toast.msg}
          </Toast>
        )}
      </Page>
    </AdminLayout>
  );
}
