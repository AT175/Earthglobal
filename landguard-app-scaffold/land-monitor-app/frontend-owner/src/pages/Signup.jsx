import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import {
  MapPin, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff,
  User, Phone, ArrowLeft, CheckCircle2, Loader,
} from 'lucide-react';
import api from '../services/api';

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

const SplitWrapper = styled.div`
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: ${({ theme }) => theme.colors.background};

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

// ── Left panel (brand) ──
const BrandPanel = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[12]};
  background: linear-gradient(135deg, #080f24 0%, #0d1733 50%, #111d3a 100%);
  background-size: 200% 200%;
  animation: ${gradientShift} 15s ease infinite;
  overflow: hidden;

  @media (max-width: 968px) { display: none; }
`;

const GlowOrb = styled.div`
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  animation: ${pulse} 6s ease-in-out infinite;

  &.one { width: 300px; height: 300px; background: rgba(22,119,255,0.15); top: 10%; left: 5%; }
  &.two { width: 250px; height: 250px; background: rgba(92,225,255,0.1); bottom: 15%; right: 10%; animation-delay: 2s; }
  &.three { width: 180px; height: 180px; background: rgba(22,119,255,0.08); top: 50%; left: 40%; animation-delay: 4s; }
`;

const BrandContent = styled.div`
  position: relative;
  z-index: 1;
  max-width: 480px;
`;

const BrandLogo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`;

const LogoIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.gradientPrimary};
  box-shadow: ${({ theme }) => theme.shadows.glowPrimarySoft};
`;

const BrandName = styled.div`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text};

  span { color: ${({ theme }) => theme.colors.cyan }; }
`;

const BrandTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['4xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  line-height: 1.15;
  margin-bottom: ${({ theme }) => theme.spacing[5]};
  color: ${({ theme }) => theme.colors.text};
`;

const BrandSubtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: 1.6;
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`;

const FeatureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const Feature = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const FeatureIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: rgba(92,225,255,0.1);
  color: ${({ theme }) => theme.colors.cyan};
  flex-shrink: 0;
`;

// ── Right panel (form) ──
const FormPanel = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[8]};
  background: ${({ theme }) => theme.colors.background};
`;

const FormCard = styled(motion.div)`
  width: 100%;
  max-width: 420px;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-decoration: none;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  transition: color 0.2s;

  &:hover { color: ${({ theme }) => theme.colors.text}; }
`;

const FormTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const FormSubtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const InputGroup = styled.div`
  position: relative;
`;

const InputIcon = styled.div`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.textMuted};
  pointer-events: none;
`;

const TextInput = styled.input`
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[3]} ${theme.spacing[3]} 44px`};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  outline: none;
  transition: all 0.2s;

  &::placeholder { color: ${({ theme }) => theme.colors.textMuted}; }
  &:focus { border-color: ${({ theme }) => theme.colors.primary}; box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.glowPrimarySoft}; }
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  padding: 4px;
`;

const SubmitBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.gradientPrimary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: ${({ theme }) => theme.shadows.glowPrimarySoft}; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const ErrorBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: ${({ theme }) => theme.spacing[3]};
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.3);
  border-radius: ${({ theme }) => theme.radii.md};
  color: #f87171;
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const SuccessBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  padding: ${({ theme }) => theme.spacing[6]};
  background: rgba(34,197,94,0.1);
  border: 1px solid rgba(34,197,94,0.3);
  border-radius: ${({ theme }) => theme.radii.lg};
  color: #4ade80;
`;

const LoginLink = styled.div`
  text-align: center;
  margin-top: ${({ theme }) => theme.spacing[5]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};

  a {
    color: ${({ theme }) => theme.colors.primaryBright};
    text-decoration: none;
    font-weight: 500;

    &:hover { text-decoration: underline; }
  }
`;

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError('Name, email, and password are required');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/signup', form);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SplitWrapper>
        <BrandPanel>
          <GlowOrb className="one" />
          <GlowOrb className="two" />
          <GlowOrb className="three" />
          <BrandContent>
            <BrandLogo>
              <LogoIcon><MapPin size={24} /></LogoIcon>
              <BrandName>Earth<span>Global</span></BrandName>
            </BrandLogo>
            <BrandTitle>Protect your land with satellite monitoring.</BrandTitle>
            <BrandSubtitle>Join EarthGlobal to monitor your parcels, receive alerts, and dispatch field agents.</BrandSubtitle>
          </BrandContent>
        </BrandPanel>
        <FormPanel>
          <FormCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <BackLink to="/login"><ArrowLeft size={16} /> Back to login</BackLink>
            <SuccessBox>
              <CheckCircle2 size={48} />
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8 }}>Account Created!</div>
                <div style={{ color: '#aab7d4', fontSize: '0.9rem' }}>
                  Your account has been submitted for approval. An administrator will review and approve your account before you can log in.
                </div>
              </div>
              <SubmitBtn onClick={() => navigate('/login')} style={{ marginTop: 8 }}>
                Go to Login <ArrowRight size={16} />
              </SubmitBtn>
            </SuccessBox>
          </FormCard>
        </FormPanel>
      </SplitWrapper>
    );
  }

  return (
    <SplitWrapper>
      <BrandPanel>
        <GlowOrb className="one" />
        <GlowOrb className="two" />
        <GlowOrb className="three" />
        <BrandContent>
          <BrandLogo>
            <LogoIcon><MapPin size={24} /></LogoIcon>
            <BrandName>Earth<span>Global</span></BrandName>
          </BrandLogo>
          <BrandTitle>Protect your land with satellite monitoring.</BrandTitle>
          <BrandSubtitle>Join EarthGlobal to monitor your parcels, receive alerts, and dispatch field agents.</BrandSubtitle>
          <FeatureList>
            <Feature>
              <FeatureIcon><MapPin size={18} /></FeatureIcon>
              Register and monitor your land parcels
            </Feature>
            <Feature>
              <FeatureIcon><CheckCircle2 size={18} /></FeatureIcon>
              Get alerts when changes are detected
            </Feature>
            <Feature>
              <FeatureIcon><ArrowRight size={18} /></FeatureIcon>
              Dispatch field agents for verification
            </Feature>
          </FeatureList>
        </BrandContent>
      </BrandPanel>

      <FormPanel>
        <FormCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <BackLink to="/login"><ArrowLeft size={16} /> Back to login</BackLink>
          <FormTitle>Create Account</FormTitle>
          <FormSubtitle>Sign up as a land owner — your account will be reviewed by an administrator.</FormSubtitle>

          {error && <ErrorBox style={{ marginBottom: 16 }}><AlertCircle size={16} /> {error}</ErrorBox>}

          <Form onSubmit={handleSubmit}>
            <InputGroup>
              <InputIcon><User size={18} /></InputIcon>
              <TextInput
                name="name"
                placeholder="Full name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </InputGroup>
            <InputGroup>
              <InputIcon><Mail size={18} /></InputIcon>
              <TextInput
                type="email"
                name="email"
                placeholder="Email address"
                value={form.email}
                onChange={handleChange}
                required
              />
            </InputGroup>
            <InputGroup>
              <InputIcon><Phone size={18} /></InputIcon>
              <TextInput
                name="phone"
                placeholder="Phone number (optional)"
                value={form.phone}
                onChange={handleChange}
              />
            </InputGroup>
            <InputGroup>
              <InputIcon><Lock size={18} /></InputIcon>
              <TextInput
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Password (min 6 characters)"
                value={form.password}
                onChange={handleChange}
                required
              />
              <PasswordToggle type="button" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </PasswordToggle>
            </InputGroup>

            <SubmitBtn type="submit" disabled={loading}>
              {loading ? <Loader size={18} className="animate-spin" /> : <>Create Account <ArrowRight size={18} /></>}
            </SubmitBtn>
          </Form>

          <LoginLink>
            Already have an account? <Link to="/login">Log in</Link>
          </LoginLink>
        </FormCard>
      </FormPanel>
    </SplitWrapper>
  );
}
