import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Satellite, Shield, Eye, ArrowRight, CheckCircle2, Bell, Camera } from 'lucide-react';
import { Button } from '@earthglobal/design-system';
import styled from 'styled-components';

const LandingWrapper = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  overflow-x: hidden;
`;

// ── Hero Section ──
const Hero = styled.section`
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${({ theme }) => theme.spacing[6]};
  background: radial-gradient(ellipse at 50% 0%, ${({ theme }) => theme.colors.primary}15 0%, transparent 60%),
              ${({ theme }) => theme.colors.background};
`;

const HeroContent = styled.div`
  max-width: 800px;
  z-index: 1;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const LogoHighlight = styled.span`
  color: ${({ theme }) => theme.colors.primaryBright};
`;

const Tagline = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['5xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  line-height: 1.1;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.text} 0%, ${({ theme }) => theme.colors.primaryBright} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: ${({ theme }) => theme.spacing[8]};
  line-height: 1.5;
`;

const CTAWrapper = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  justify-content: center;
  flex-wrap: wrap;
`;

// ── Features Section ──
const Features = styled.section`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => `${theme.spacing[10]} ${theme.spacing[6]}`};
`;

const FeaturesTitle = styled.h2`
  text-align: center;
  font-size: ${({ theme }) => theme.fontSizes['4xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const FeaturesSubtitle = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  margin-bottom: ${({ theme }) => theme.spacing[10]};
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.spacing[6]};
`;

const FeatureCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[6]};
  transition: all ${({ theme }) => theme.durations.normal} ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.shadows.glowSoft};
    transform: translateY(-2px);
  }
`;

const FeatureIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.primary}15;
  color: ${({ theme }) => theme.colors.primaryBright};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const FeatureTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const FeatureDesc = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: 1.5;
`;

// ── How It Works ──
const HowItWorks = styled.section`
  max-width: 800px;
  margin: 0 auto;
  padding: ${({ theme }) => `${theme.spacing[10]} ${theme.spacing[6]}`};
  text-align: center;
`;

const Steps = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[6]};
  margin-top: ${({ theme }) => theme.spacing[8]};
`;

const Step = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[4]};
  text-align: left;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[5]};
`;

const StepNumber = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.surface};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: ${({ theme }) => theme.fontSizes.lg};
`;

const StepContent = styled.div``;

const StepTitle = styled.h4`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const StepDesc = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: 1.5;
`;

// ── Footer CTA ──
const FooterCTA = styled.section`
  text-align: center;
  padding: ${({ theme }) => `${theme.spacing[10]} ${theme.spacing[6]}`};
  background: radial-gradient(ellipse at 50% 100%, ${({ theme }) => theme.colors.primary}15 0%, transparent 60%);
`;

const FooterText = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const FEATURES = [
  {
    icon: Satellite,
    title: 'Satellite Monitoring',
    desc: 'Real-time Sentinel-2 satellite imagery detects land changes — clearing, encroachment, or unauthorized structures.',
  },
  {
    icon: Bell,
    title: 'Instant Alerts',
    desc: 'Get notified the moment a change is detected on your land. NDVI analysis flags vegetation loss automatically.',
  },
  {
    icon: Camera,
    title: 'Field Visits',
    desc: 'Request on-the-ground visits by verified agents. Receive photos, videos, and live video from your parcel.',
  },
  {
    icon: Shield,
    title: 'Land Protection',
    desc: 'Document your boundaries with GPS-accurate surveys. Build an evidence trail for disputes or legal action.',
  },
  {
    icon: Eye,
    title: 'Live Dashboard',
    desc: 'See all your parcels, alerts, and visit history in one place. Real-time updates via WebSocket.',
  },
  {
    icon: MapPin,
    title: 'Accurate Mapping',
    desc: 'PostGIS-powered boundary mapping with satellite, terrain, and NDVI vegetation index layers.',
  },
];

const STEPS = [
  { title: 'Create your account', desc: 'Sign up as a landowner, agent, or admin in seconds.' },
  { title: 'Add your parcels', desc: 'Survey boundaries with GPS or import GeoJSON files. PostGIS handles the geometry.' },
  { title: 'Monitor in real-time', desc: 'Satellite imagery and NDVI analysis watch your land 24/7. Get alerts instantly.' },
  { title: 'Request visits', desc: 'Send agents to verify changes on the ground. Receive photos and video evidence.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  return (
    <LandingWrapper>
      {/* Hero */}
      <Hero>
        <HeroContent>
          <Logo>
            <MapPin size={36} aria-hidden="true" />
            Earth<LogoHighlight>Global</LogoHighlight>
          </Logo>
          <Tagline>See it. Check it. Secure it.</Tagline>
          <Subtitle>
            Remote land monitoring powered by satellite imagery and field agents.
            Protect your land from anywhere in the world.
          </Subtitle>
          <CTAWrapper>
            <Button
              size="large"
              onClick={() => navigate('/login')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              Get Started <ArrowRight size={18} aria-hidden="true" />
            </Button>
            <Button
              size="large"
              variant="ghost"
              onClick={() => {
                const features = document.getElementById('features');
                if (features) features.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Learn More
            </Button>
          </CTAWrapper>
        </HeroContent>
      </Hero>

      {/* Features */}
      <Features id="features">
        <FeaturesTitle>Everything you need to protect your land</FeaturesTitle>
        <FeaturesSubtitle>
          From satellite surveillance to on-the-ground verification — all in one platform
        </FeaturesSubtitle>
        <FeaturesGrid>
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <FeatureCard key={title}>
              <FeatureIcon>
                <Icon size={28} aria-hidden="true" />
              </FeatureIcon>
              <FeatureTitle>{title}</FeatureTitle>
              <FeatureDesc>{desc}</FeatureDesc>
            </FeatureCard>
          ))}
        </FeaturesGrid>
      </Features>

      {/* How It Works */}
      <HowItWorks>
        <FeaturesTitle>How it works</FeaturesTitle>
        <FeaturesSubtitle>Four simple steps to land security</FeaturesSubtitle>
        <Steps>
          {STEPS.map((step, i) => (
            <Step key={i}>
              <StepNumber>{i + 1}</StepNumber>
              <StepContent>
                <StepTitle>{step.title}</StepTitle>
                <StepDesc>{step.desc}</StepDesc>
              </StepContent>
            </Step>
          ))}
        </Steps>
      </HowItWorks>

      {/* Footer CTA */}
      <FooterCTA>
        <Tagline style={{ fontSize: '2.5rem' }}>Ready to protect your land?</Tagline>
        <CTAWrapper style={{ marginTop: '24px' }}>
          <Button
            size="large"
            onClick={() => navigate('/login')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            Sign in <ArrowRight size={18} aria-hidden="true" />
          </Button>
        </CTAWrapper>
        <FooterText>EarthGlobal — Remote Land Monitoring &amp; Protection</FooterText>
      </FooterCTA>
    </LandingWrapper>
  );
}
