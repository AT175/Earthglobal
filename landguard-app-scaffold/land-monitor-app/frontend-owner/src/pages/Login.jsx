import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Shield, Users, User } from 'lucide-react';
import { Button, Input, Card } from '@earthglobal/design-system';
import styled from 'styled-components';
import api from '../services/api';

const LoginWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.background};
  padding: ${({ theme }) => theme.spacing[4]};
`;

const LoginCard = styled(Card)`
  width: 100%;
  max-width: 440px;
  padding: ${({ theme }) => theme.spacing[8]};
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const RoleSelector = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[5]};
`;

const RoleButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme, $active }) => ($active ? theme.colors.primary + '20' : theme.colors.surface)};
  cursor: pointer;
  transition: all ${({ theme }) => theme.durations.fast} ease;
  color: ${({ theme, $active }) => ($active ? theme.colors.primaryBright : theme.colors.textMuted)};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const RoleLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const ErrorMessage = styled.p`
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const SwitchText = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-top: ${({ theme }) => theme.spacing[4]};

  button {
    background: none;
    border: none;
    color: ${({ theme }) => theme.colors.primaryBright};
    cursor: pointer;
    font-size: inherit;
    text-decoration: underline;
  }
`;

const ROLES = [
  { value: 'owner', icon: User, labelKey: 'app.auth.roleOwner' },
  { value: 'agent', icon: Users, labelKey: 'app.auth.roleAgent' },
  { value: 'admin', icon: Shield, labelKey: 'app.auth.roleAdmin' },
];

export default function Login() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('owner');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        await api.post('/auth/signup', { name, email, phone, password });
      }

      const { data } = await api.post('/auth/login', { email, password });
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({ ...data.owner, role }));
        // Auto-route to "/" which redirects to the correct role page
        navigate('/');
      }
    } catch (err) {
      setError(t('app.auth.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginWrapper>
      <LoginCard>
        <Logo>
          <MapPin size={28} aria-hidden="true" />
          Earth<span style={{ color: '#3ba7ff' }}>Global</span>
        </Logo>
        <Subtitle>{t('app.auth.subtitle')}</Subtitle>

        <RoleSelector>
          {ROLES.map(({ value, icon: Icon, labelKey }) => (
            <RoleButton
              key={value}
              type="button"
              $active={role === value}
              onClick={() => setRole(value)}
              aria-pressed={role === value}
            >
              <Icon size={20} aria-hidden="true" />
              <RoleLabel>{t(labelKey)}</RoleLabel>
            </RoleButton>
          ))}
        </RoleSelector>

        {error && <ErrorMessage role="alert">{error}</ErrorMessage>}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <>
              <Input
                label={t('app.auth.name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ marginBottom: '12px' }}
              />
              <Input
                label={t('app.auth.phone')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ marginBottom: '12px' }}
              />
            </>
          )}
          <Input
            label={t('app.auth.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ marginBottom: '12px' }}
          />
          <Input
            label={t('app.auth.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ marginBottom: '20px' }}
          />
          <Button type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading
              ? '...'
              : mode === 'login'
                ? t('app.auth.loginButton')
                : t('app.auth.signupButton')}
          </Button>
        </form>

        <SwitchText>
          {mode === 'login' ? (
            <button type="button" onClick={() => { setMode('signup'); setError(''); }}>
              {t('app.auth.switchToSignup')}
            </button>
          ) : (
            <button type="button" onClick={() => { setMode('login'); setError(''); }}>
              {t('app.auth.switchToLogin')}
            </button>
          )}
        </SwitchText>
      </LoginCard>
    </LoginWrapper>
  );
}
