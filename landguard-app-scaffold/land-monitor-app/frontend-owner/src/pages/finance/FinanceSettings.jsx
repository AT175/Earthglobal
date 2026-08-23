import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Settings, Save, DollarSign, Percent } from 'lucide-react';
import FinanceLayout from '../../components/FinanceLayout';
import api from '../../services/api';

const Page = styled.div`
  color: ${({ theme }) => theme.colors.text};
  max-width: 640px;
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

const Card = styled.div`
  background: ${({ theme }) => theme.colors.gradientSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[6]};
`;

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[5]};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Hint = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Input = styled.input`
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  background: ${({ theme }) => theme.colors.surfaceLight};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.md};

  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; }
`;

const Select = styled.select`
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  background: ${({ theme }) => theme.colors.surfaceLight};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.md};
  cursor: pointer;
`;

const SaveBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${({ theme }) => theme.colors.gradientPrimary};
  color: white;
  border: none;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[5]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  align-self: flex-start;

  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
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
  padding: ${({ theme }) => theme.spacing[3]};
  color: #4ade80;
  background: rgba(34,197,94,0.1);
  border-radius: ${({ theme }) => theme.radii.lg};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const MetaInfo = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
  padding-top: ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.borderDark};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export default function FinanceSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    land_sale_commission_percent: 10,
    default_currency: 'GHS',
    late_payment_penalty_percent: 0,
  });

  useEffect(() => {
    api.get('/finance/settings')
      .then((res) => {
        setSettings(res.data);
        setForm({
          land_sale_commission_percent: res.data.land_sale_commission_percent,
          default_currency: res.data.default_currency,
          late_payment_penalty_percent: res.data.late_payment_penalty_percent,
        });
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setSuccess(false);
    setError('');
    try {
      const res = await api.patch('/finance/settings', {
        land_sale_commission_percent: parseFloat(form.land_sale_commission_percent),
        default_currency: form.default_currency,
        late_payment_penalty_percent: parseFloat(form.late_payment_penalty_percent),
      });
      setSettings(res.data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <FinanceLayout><Loading>Loading settings...</Loading></FinanceLayout>;

  return (
    <FinanceLayout>
      <Page>
        <Header>
          <PageTitle>Platform Fee Settings</PageTitle>
          <PageSubtitle>Configure platform-wide commission rates and billing defaults.</PageSubtitle>
        </Header>

        {error && <ErrorBox>{error}</ErrorBox>}
        {success && <SuccessBox>Settings saved successfully.</SuccessBox>}

        <Card>
          <Form>
            <FormGroup>
              <Label><Percent size={16} /> Land-Sale Commission Percentage</Label>
              <Hint>The commission the platform collects on each land sale. Applied to all new listings unless overridden per-tenant.</Hint>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.land_sale_commission_percent}
                onChange={(e) => setForm({ ...form, land_sale_commission_percent: e.target.value })}
              />
            </FormGroup>

            <FormGroup>
              <Label><DollarSign size={16} /> Default Currency</Label>
              <Hint>Used for new listings, invoices, and payments when no currency is specified.</Hint>
              <Select value={form.default_currency} onChange={(e) => setForm({ ...form, default_currency: e.target.value })}>
                <option value="GHS">GHS — Ghanaian Cedi</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="KES">KES — Kenyan Shilling</option>
                <option value="NGN">NGN — Nigerian Naira</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <Label><Percent size={16} /> Late Payment Penalty Percentage</Label>
              <Hint>Applied to overdue tenant invoices. Set to 0 to disable penalties.</Hint>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.late_payment_penalty_percent}
                onChange={(e) => setForm({ ...form, late_payment_penalty_percent: e.target.value })}
              />
            </FormGroup>

            <SaveBtn onClick={save} disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
            </SaveBtn>
          </Form>

          {settings && (
            <MetaInfo>
              <span>Last updated: {settings.updated_at ? new Date(settings.updated_at).toLocaleString() : '—'}</span>
              <span>Updated by: {settings.updated_by || 'System default'}</span>
            </MetaInfo>
          )}
        </Card>
      </Page>
    </FinanceLayout>
  );
}
