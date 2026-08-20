import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import {
  MapPin, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff,
  User, Phone, ArrowLeft, Satellite, CheckCircle2, Shield,
} from 'lucide-react';
import api from '../services/api';

// ═══════════════════════════════════════════════════════════
// Animations
// ═══════════════════════════════════════════════════════════
const pulse = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.08); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

const gradientShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// ═══════════════════════════════════════════════════════════
// Layout
// ═══════════════════════════════════════════════════════════
const SplitWrapper = styled.div`
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: ${({ theme }) => theme.colors.background};

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

// ── Left Panel (Brand) ──
const BrandPanel = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[12]};
  background: linear-gradient(160deg, ${({ theme }) => theme.colors.backgroundSecondary} 0%, ${({ theme }) => theme.colors.background} 100%);
  overflow: hidden;

  @media (max-width: 968px) {
    display: none;
  }

  &::before {
    content: '';
    position: absolute;
    top: 10%;
    left: 50%;
    transform: translateX(-50%);
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, ${({ theme }) => theme.colors.glowPrimarySoft} 0%, transparent 70%);
    animation: ${pulse} 8s ease-in-out infinite;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, ${({ theme }) => theme.colors.glowCyanSoft} 0%, transparent 70%);
    animation: ${pulse} 10s ease-in-out infinite;
    animation-delay: 3s;
  }
`;

const BrandContent = styled(motion.div)`
  position: relative;
  z-index: 1;
  max-width: 440px;
`;

const BrandLogo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[10]};
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  letter-spacing: ${({ theme }) => theme.letterSpacings.tight};
`;

const BrandLogoIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.radii.xl};
  background: ${({ theme }) => theme.colors.gradientPrimary};
  box-shadow: ${({ theme }) => theme.shadows.glowSoft};
`;

const BrandHighlight = styled.span`
  background: ${({ theme }) => theme.colors.gradientCyan};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const BrandHeadline = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes['4xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  line-height: 1.15;
  letter-spacing: ${({ theme }) => theme.letterSpacings.tight};
  margin-bottom: ${({ theme }) => theme.spacing[5]};
`;

const BrandGradientText = styled.span`
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primaryBright} 0%, ${({ theme }) => theme.colors.cyan} 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${gradientShift} 5s ease infinite;
`;

const BrandDesc = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: ${({ theme }) => theme.lineHeights.relaxed};
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`;

const BrandFeatures = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const BrandFeature = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.textLight};
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const BrandFeatureIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.primary}15;
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  color: ${({ theme }) => theme.colors.primaryBright};
`;

const BrandFooter = styled.div`
  position: absolute;
  bottom: ${({ theme }) => theme.spacing[6]};
  left: ${({ theme }) => theme.spacing[12]};
  right: ${({ theme }) => theme.spacing[12]};
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 1;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

// ── Right Panel (Form) ──
const FormPanel = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[6]};
  position: relative;
`;

const FormContainer = styled(motion.div)`
  width: 100%;
  max-width: 400px;
`;

const MobileLogo = styled.div`
  display: none;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  margin-bottom: ${({ theme }) => theme.spacing[8]};
  letter-spacing: ${({ theme }) => theme.letterSpacings.tight};

  @media (max-width: 968px) {
    display: flex;
  }
`;

const MobileLogoIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.gradientPrimary};
  box-shadow: ${({ theme }) => theme.shadows.glowSoft};
`;

const FormHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const FormTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  letter-spacing: ${({ theme }) => theme.letterSpacings.tight};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const FormSubtitle = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.base};
`;

// ── Form Fields ──
const FieldGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const FieldLabel = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const InputBox = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const InputIcon = styled.div`
  position: absolute;
  left: ${({ theme }) => theme.spacing[3]};
  display: flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.textMuted};
  pointer-events: none;
  transition: color 0.2s;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[3]} ${theme.spacing[3]} 44px`};
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border: 1px solid ${({ theme, $error }) => ($error ? theme.colors.error : theme.colors.borderDark)};
  border-radius: ${({ theme }) => theme.radii.lg};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.base};
  transition: all 0.2s ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
    opacity: 0.5;
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.glowPrimarySoft};

    ~ ${InputIcon} {
      color: ${({ theme }) => theme.colors.primaryBright};
    }
  }
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: ${({ theme }) => theme.spacing[3]};
  display: flex;
  align-items: center;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  padding: 4px;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

// ── Error ──
const ErrorBanner = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  background: ${({ theme }) => theme.colors.error}15;
  border: 1px solid ${({ theme }) => theme.colors.error}40;
  border-radius: ${({ theme }) => theme.radii.lg};
  color: ${({ theme }) => theme.colors.errorLight};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

// ── Submit ──
const SubmitButton = styled.button`
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[5]}`};
  background: ${({ theme }) => theme.colors.gradientPrimary};
  color: ${({ theme }) => theme.colors.text};
  border: none;
  border-radius: ${({ theme }) => theme.radii.lg};
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    box-shadow: 0 0 12px ${({ theme }) => theme.colors.glowPrimary}, 0 0 35px ${({ theme }) => theme.colors.glowPrimarySoft};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Spinner = styled.div`
  width: 18px;
  height: 18px;
  border: 2px solid ${({ theme }) => theme.colors.text}40;
  border-top-color: ${({ theme }) => theme.colors.text};
  border-radius: 50%;
  animation: spin 0.6s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// ── Switch ──
const SwitchRow = styled.div`
  text-align: center;
  margin-top: ${({ theme }) => theme.spacing[5]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const SwitchButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.primaryBright};
  cursor: pointer;
  font-size: inherit;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  margin-left: 4px;

  &:hover {
    text-decoration: underline;
  }
`;

// ── Back to Home ──
const BackLink = styled.button`
  position: absolute;
  top: ${({ theme }) => theme.spacing[6]};
  left: ${({ theme }) => theme.spacing[6]};
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

// ═══════════════════════════════════════════════════════════
// Data
// ═══════════════════════════════════════════════════════════
const BRAND_FEATURES = [
  { icon: Satellite, text: 'Satellite imagery every 5 days' },
  { icon: CheckCircle2, text: 'Instant alerts on land changes' },
  { icon: Shield, text: 'Court-ready evidence documentation' },
];

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════
export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        // Backend returns the user's role — store it and auto-route
        const userRole = data.role || 'owner';
        localStorage.setItem('user', JSON.stringify({ ...data.owner, role: userRole }));
        navigate('/');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message;
      setError(msg || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SplitWrapper>
      {/* ── Left: Brand Panel ── */}
      <BrandPanel>
        <BrandContent
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <BrandLogo>
            <BrandLogoIcon>
              <MapPin size={26} aria-hidden="true" />
            </BrandLogoIcon>
            Earth<BrandHighlight>Global</BrandHighlight>
          </BrandLogo>

          <BrandHeadline>
            Protect your land<br />
            from <BrandGradientText>anywhere on Earth.</BrandGradientText>
          </BrandHeadline>

          <BrandDesc>
            Satellite-powered land monitoring with real-time alerts,
            field agent verification, and legal evidence documentation.
          </BrandDesc>

          <BrandFeatures>
            {BRAND_FEATURES.map(({ icon: Icon, text }, i) => (
              <BrandFeature
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <BrandFeatureIcon>
                  <Icon size={16} aria-hidden="true" />
                </BrandFeatureIcon>
                {text}
              </BrandFeature>
            ))}
          </BrandFeatures>
        </BrandContent>

        <BrandFooter>
          <span>See it. Check it. Secure it.</span>
          <span>&copy; {new Date().getFullYear()}</span>
        </BrandFooter>
      </BrandPanel>

      {/* ── Right: Form Panel ── */}
      <FormPanel>
        <BackLink onClick={() => navigate('/')}>
          <ArrowLeft size={16} aria-hidden="true" />
          Back to home
        </BackLink>

        <FormContainer
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <MobileLogo>
            <MobileLogoIcon>
              <MapPin size={22} aria-hidden="true" />
            </MobileLogoIcon>
            Earth<BrandHighlight>Global</BrandHighlight>
          </MobileLogo>

          <FormHeader>
            <FormTitle>
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </FormTitle>
            <FormSubtitle>
              {mode === 'login'
                ? 'Sign in to monitor your land'
                : 'Start protecting your land today'}
            </FormSubtitle>
          </FormHeader>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <ErrorBanner
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                role="alert"
              >
                <AlertCircle size={16} aria-hidden="true" />
                {error}
              </ErrorBanner>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <FieldGroup>
                    <FieldLabel>Full Name</FieldLabel>
                    <InputBox>
                      <InputIcon><User size={16} /></InputIcon>
                      <StyledInput
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </InputBox>
                  </FieldGroup>

                  <FieldGroup>
                    <FieldLabel>Phone Number</FieldLabel>
                    <InputBox>
                      <InputIcon><Phone size={16} /></InputIcon>
                      <StyledInput
                        type="tel"
                        placeholder="+233 24 000 0000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </InputBox>
                  </FieldGroup>
                </motion.div>
              )}
            </AnimatePresence>

            <FieldGroup>
              <FieldLabel>Email Address</FieldLabel>
              <InputBox>
                <InputIcon><Mail size={16} /></InputIcon>
                <StyledInput
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </InputBox>
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>Password</FieldLabel>
              <InputBox>
                <InputIcon><Lock size={16} /></InputIcon>
                <StyledInput
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: '44px' }}
                />
                <PasswordToggle
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </PasswordToggle>
              </InputBox>
            </FieldGroup>

            <SubmitButton type="submit" disabled={loading}>
              {loading ? (
                <Spinner />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={18} aria-hidden="true" />
                </>
              )}
            </SubmitButton>
          </form>

          <SwitchRow>
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            <SwitchButton
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </SwitchButton>
          </SwitchRow>
        </FormContainer>
      </FormPanel>
    </SplitWrapper>
  );
}
