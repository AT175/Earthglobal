import { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  Users, Search, CheckCircle2, XCircle, Trash2, Plus, X, Save,
  Loader, Mail, Phone, MapPin, Shield, User, Building2, Clock,
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

const Tabs = styled.div`
  display: flex; gap: 4px; margin-bottom: ${({ theme }) => theme.spacing[5]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  overflow-x: auto;
`;

const Tab = styled.button`
  display: flex; align-items: center; gap: 8px;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  background: none; border: none;
  border-bottom: 2px solid ${({ $active, theme }) => ($active ? theme.colors.primary : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.textMuted)};
  cursor: pointer; font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ $active }) => ($active ? 600 : 400)}; white-space: nowrap;
  transition: all 0.2s;
  &:hover { color: ${({ theme }) => theme.colors.text}; }
`;

const Badge = styled.span`
  display: inline-flex; align-items: center; gap: 4px;
  padding: 1px 8px; border-radius: ${({ theme }) => theme.radii.full};
  font-size: 0.7rem; font-weight: 600;
  background: ${({ $bg }) => $bg}; color: ${({ $color }) => $color};
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

const Table = styled.div`
  background: ${({ theme }) => theme.colors.gradientSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.xl};
  overflow: hidden;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.5fr 1.5fr 1fr 1fr;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[5]}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  font-size: ${({ theme }) => theme.fontSizes.xs}; font-weight: 600;
  color: ${({ theme }) => theme.colors.textMuted};
  text-transform: uppercase; letter-spacing: 0.05em;
  @media (max-width: 768px) { display: none; }
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.5fr 1.5fr 1fr 1fr;
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[5]}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  align-items: center; transition: background 0.2s;
  &:last-child { border-bottom: none; }
  &:hover { background: ${({ theme }) => theme.colors.surfaceLight}; }
  @media (max-width: 768px) {
    grid-template-columns: 1fr; gap: ${({ theme }) => theme.spacing[2]};
    padding: ${({ theme }) => theme.spacing[4]};
  }
`;

const Cell = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  @media (max-width: 768px) {
    display: flex; align-items: center; gap: 8px;
    &::before {
      content: attr(data-label); font-weight: 600;
      color: ${({ theme }) => theme.colors.textMuted};
      font-size: 0.75rem; min-width: 80px;
    }
  }
`;

const UserName = styled.div`
  display: flex; align-items: center; gap: 10px;
`;

const Avatar = styled.div`
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 50%;
  background: ${({ $bg }) => $bg || 'rgba(22,119,255,0.15)'};
  color: ${({ $color }) => $color || '#3ba7ff'};
  font-weight: 600; font-size: 0.85rem; flex-shrink: 0;
`;

const ActionBtn = styled.button`
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  background: transparent; color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer; transition: all 0.2s;
  &:hover {
    color: ${({ $danger, $success, theme }) => $danger ? theme.colors.error : $success ? theme.colors.success : theme.colors.text};
    border-color: ${({ $danger, $success, theme }) => $danger ? theme.colors.error + '40' : $success ? theme.colors.success + '40' : theme.colors.borderLight};
  }
`;

const Loading = styled.div`
  text-align: center; padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const EmptyState = styled.div`
  text-align: center; padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.textMuted};
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
  max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;
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

const initials = (name) => name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '??';

const roleConfig = {
  owner: { label: 'Land Owners', icon: User, color: '#3ba7ff', bg: 'rgba(22,119,255,0.15)' },
  agent: { label: 'Field Agents', icon: MapPin, color: '#c084fc', bg: 'rgba(168,85,247,0.15)' },
  admin: { label: 'Admins', icon: Shield, color: '#f87171', bg: 'rgba(239,68,68,0.15)' },
  assembly: { label: 'Assembly Users', icon: Building2, color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
};

export default function UserManagement() {
  const [data, setData] = useState({ owners: [], agents: [], admins: [], assembly: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('owner');
  const [search, setSearch] = useState('');
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' });

  // Only super_admin can create/delete admin accounts
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setCurrentUser(JSON.parse(u));
  }, []);
  const isSuperAdmin = currentUser?.adminRole === 'super_admin';

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const { data } = await api.get('/admin/users');
      setData(data);
    } catch {
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const approveOwner = async (id) => {
    try {
      await api.patch(`/admin/users/owner/${id}`, { approved: true });
      showToast('Owner approved');
      loadUsers();
    } catch { showToast('Failed to approve', 'error'); }
  };

  const rejectOwner = async (id) => {
    if (!confirm('Reject and delete this owner account?')) return;
    try {
      await api.delete(`/admin/users/owner/${id}`);
      showToast('Owner rejected and deleted');
      loadUsers();
    } catch { showToast('Failed to reject', 'error'); }
  };

  const deleteAdmin = async (id) => {
    if (!confirm('Delete this admin account?')) return;
    try {
      await api.delete(`/admin/users/admin/${id}`);
      showToast('Admin deleted');
      loadUsers();
    } catch { showToast('Failed to delete', 'error'); }
  };

  const createAdmin = async () => {
    if (!adminForm.name || !adminForm.email || !adminForm.password) {
      showToast('All fields required', 'error'); return;
    }
    setSaving(true);
    try {
      await api.post('/admin/users/admin', adminForm);
      showToast('Admin created');
      setShowAddAdmin(false);
      setAdminForm({ name: '', email: '', password: '' });
      loadUsers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create admin', 'error');
    } finally { setSaving(false); }
  };

  const currentList = data[activeTab === 'owner' ? 'owners' : activeTab === 'agent' ? 'agents' : activeTab === 'admin' ? 'admins' : 'assembly'] || [];
  const filtered = currentList.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search)
  );

  const pendingCount = data.owners?.filter(o => !o.approved).length || 0;

  return (
    <AdminLayout>
      <Page>
        <Header>
          <PageTitle>User Management</PageTitle>
          {activeTab === 'admin' && isSuperAdmin && (
            <AddBtn onClick={() => setShowAddAdmin(true)}><Plus size={18} /> Add Admin</AddBtn>
          )}
        </Header>

        <Tabs>
          {Object.entries(roleConfig).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const count = key === 'owner' ? data.owners?.length : key === 'agent' ? data.agents?.length : key === 'admin' ? data.admins?.length : data.assembly?.length;
            return (
              <Tab key={key} $active={activeTab === key} onClick={() => { setActiveTab(key); setSearch(''); }}>
                <Icon size={16} /> {cfg.label}
                <Badge $bg="rgba(92,225,255,0.15)" $color="#5ce1ff">{count || 0}</Badge>
                {key === 'owner' && pendingCount > 0 && (
                  <Badge $bg="rgba(251,191,36,0.15)" $color="#fbbf24"><Clock size={10} /> {pendingCount} pending</Badge>
                )}
              </Tab>
            );
          })}
        </Tabs>

        <SearchBar>
          <Search size={18} color="#aab7d4" />
          <SearchInput
            placeholder={`Search ${roleConfig[activeTab].label.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </SearchBar>

        {loading ? (
          <Loading>Loading users...</Loading>
        ) : filtered.length === 0 ? (
          <Table><EmptyState>No {roleConfig[activeTab].label.toLowerCase()} found.</EmptyState></Table>
        ) : (
          <Table>
            <TableHeader>
              <div>Name</div>
              <div>Contact</div>
              <div>Details</div>
              <div>Status</div>
              <div>Actions</div>
            </TableHeader>
            {filtered.map((u) => {
              const cfg = roleConfig[activeTab];
              const isPendingOwner = activeTab === 'owner' && !u.approved;
              const isActive = activeTab === 'agent' ? u.active : activeTab === 'assembly' ? u.active : u.approved;

              return (
                <TableRow key={u.id}>
                  <Cell data-label="Name">
                    <UserName>
                      <Avatar $bg={cfg.bg} $color={cfg.color}>{initials(u.name)}</Avatar>
                      <div>
                        <div style={{ fontWeight: 500 }}>{u.name}</div>
                        {u.assembly_role && <div style={{ fontSize: '0.75rem', color: '#aab7d4' }}>{u.assembly_role.replace(/_/g, ' ')}</div>}
                        {u.org_name && <div style={{ fontSize: '0.75rem', color: '#aab7d4' }}>{u.org_name}</div>}
                      </div>
                    </UserName>
                  </Cell>
                  <Cell data-label="Contact">
                    {u.email && <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}><Mail size={12} color="#aab7d4" /> {u.email}</div>}
                    {u.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', marginTop: 2 }}><Phone size={12} color="#aab7d4" /> {u.phone}</div>}
                  </Cell>
                  <Cell data-label="Details">
                    {u.region && <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}><MapPin size={12} color="#aab7d4" /> {u.region}</div>}
                    {u.address && <div style={{ fontSize: '0.85rem', color: '#aab7d4' }}>{u.address}</div>}
                    {!u.region && !u.address && <span style={{ color: '#aab7d4' }}>—</span>}
                  </Cell>
                  <Cell data-label="Status">
                    {activeTab === 'owner' ? (
                      u.approved ? (
                        <Badge $bg="rgba(34,197,94,0.15)" $color="#4ade80"><CheckCircle2 size={11} /> Approved</Badge>
                      ) : (
                        <Badge $bg="rgba(251,191,36,0.15)" $color="#fbbf24"><Clock size={11} /> Pending</Badge>
                      )
                    ) : (
                      <Badge $bg={isActive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'} $color={isActive ? '#4ade80' : '#f87171'}>
                        {isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    )}
                  </Cell>
                  <Cell data-label="Actions" style={{ display: 'flex', gap: 6 }}>
                    {isPendingOwner ? (
                      <>
                        <ActionBtn $success title="Approve" onClick={() => approveOwner(u.id)}>
                          <CheckCircle2 size={15} />
                        </ActionBtn>
                        <ActionBtn $danger title="Reject & Delete" onClick={() => rejectOwner(u.id)}>
                          <XCircle size={15} />
                        </ActionBtn>
                      </>
                    ) : activeTab === 'admin' ? (
                      isSuperAdmin ? (
                        <ActionBtn $danger title="Delete" onClick={() => deleteAdmin(u.id)}>
                          <Trash2 size={15} />
                        </ActionBtn>
                      ) : (
                        <span style={{ color: '#aab7d4', fontSize: '0.75rem' }}>Super admin only</span>
                      )
                    ) : activeTab === 'owner' ? (
                      <ActionBtn $danger title="Delete" onClick={() => rejectOwner(u.id)}>
                        <Trash2 size={15} />
                      </ActionBtn>
                    ) : (
                      <span style={{ color: '#aab7d4', fontSize: '0.8rem' }}>Managed via Agents page</span>
                    )}
                  </Cell>
                </TableRow>
              );
            })}
          </Table>
        )}

        {showAddAdmin && (
          <ModalOverlay onClick={() => setShowAddAdmin(false)}>
            <Modal onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Add Admin Account</ModalTitle>
                <ActionBtn onClick={() => setShowAddAdmin(false)}><X size={16} /></ActionBtn>
              </ModalHeader>
              <FormGroup>
                <Label>Full Name *</Label>
                <Input value={adminForm.name} onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })} placeholder="e.g. John Admin" />
              </FormGroup>
              <FormGroup>
                <Label>Email *</Label>
                <Input type="email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} placeholder="admin@earthglobal.com" />
              </FormGroup>
              <FormGroup>
                <Label>Password *</Label>
                <Input type="password" value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} placeholder="Set a secure password" />
              </FormGroup>
              <ButtonRow>
                <PrimaryBtn onClick={createAdmin} disabled={saving}>
                  {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Creating...' : 'Create Admin'}
                </PrimaryBtn>
                <SecondaryBtn onClick={() => setShowAddAdmin(false)}>Cancel</SecondaryBtn>
              </ButtonRow>
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
