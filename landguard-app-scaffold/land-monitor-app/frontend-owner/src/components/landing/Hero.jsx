import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import {
  Satellite, ArrowRight, MapPin, TrendingDown, Shield, Eye, ShoppingBag, Landmark, CheckCircle2,
} from 'lucide-react';
import { Button } from '@earthglobal/design-system';

const pulse = keyframes`
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
`;

const scan = keyframes`
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-12px); }
`;

const gradientShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const HeroSection = styled.section`
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding-top: 80px;
  overflow: hidden;
`;

const HeroBg = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;

  &::before {
    content: '';
    position: absolute;
    top: -20%;
    left: 50%;
    transform: translateX(-50%);
    width: 800px;
    height: 800px;
    background: radial-gradient(circle, ${({ theme }) => theme.colors.glowPrimarySoft} 0%, transparent 70%);
    animation: ${pulse} 6s ease-in-out infinite;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -10%;
    right: -10%;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, ${({ theme }) => theme.colors.glowCyanSoft} 0%, transparent 70%);
    animation: ${pulse} 8s ease-in-out infinite;
    animation-delay: 2s;
  }
`;

const ScanLine = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, ${({ theme }) => theme.colors.cyan}40, transparent);
  animation: ${scan} 8s linear infinite;
  z-index: 1;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    display: none;
  }
`;

const HeroGrid = styled.div`
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[12]};
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing[6]};

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
    text-align: center;
    gap: ${({ theme }) => theme.spacing[8]};
  }
`;

const HeroLeft = styled.div`
  @media (max-width: 968px) {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
`;

const HeroBadge = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[3]}`};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.cyan};
  margin-bottom: ${({ theme }) => theme.spacing[5]};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const HeroTitle = styled(motion.h1)`
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: ${({ theme }) => theme.fontWeights.extrabold};
  line-height: 1.05;
  letter-spacing: ${({ theme }) => theme.letterSpacings.tight};
  margin-bottom: ${({ theme }) => theme.spacing[5]};

  @media (max-width: 968px) {
    font-size: clamp(2rem, 6vw, 3rem);
  }
`;

const GradientText = styled.span`
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primaryBright} 0%, ${({ theme }) => theme.colors.cyan} 50%, ${({ theme }) => theme.colors.primaryBright} 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${gradientShift} 4s ease infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const HeroSubtitle = styled(motion.p)`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: ${({ theme }) => theme.lineHeights.relaxed};
  margin-bottom: ${({ theme }) => theme.spacing[8]};
  max-width: 520px;

  @media (max-width: 968px) {
    max-width: none;
  }
`;

const HeroCTAs = styled(motion.div)`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;

  @media (max-width: 968px) {
    justify-content: center;
  }
`;

const HeroStats = styled(motion.div)`
  display: flex;
  gap: ${({ theme }) => theme.spacing[8]};
  margin-top: ${({ theme }) => theme.spacing[10]};

  @media (max-width: 968px) {
    justify-content: center;
    flex-wrap: wrap;
    gap: ${({ theme }) => theme.spacing[6]};
  }
`;

const Stat = styled.div`
  text-align: left;

  @media (max-width: 968px) {
    text-align: center;
  }
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text};
  line-height: 1;
`;

const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const HeroRight = styled(motion.div)`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const SatelliteCard = styled(motion.div)`
  position: relative;
  width: 100%;
  max-width: 480px;
  background: ${({ theme }) => theme.colors.gradientSurface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii['2xl']};
  padding: ${({ theme }) => theme.spacing[5]};
  box-shadow: ${({ theme }) => theme.shadows.xl}, ${({ theme }) => theme.shadows.glowCard};
  animation: ${float} 6s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const CardTitle = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const LiveDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.success};
  box-shadow: 0 0 8px ${({ theme }) => theme.colors.success};
  animation: ${pulse} 2s ease-in-out infinite;
`;

const CardBadge = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme }) => theme.colors.success}20;
  color: ${({ theme }) => theme.colors.successLight};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const SatelliteView = styled.div`
  position: relative;
  height: 220px;
  border-radius: ${({ theme }) => theme.radii.xl};
  background:
    radial-gradient(ellipse at 30% 40%, #1a3a2e 0%, transparent 50%),
    radial-gradient(ellipse at 70% 60%, #2a4a1e 0%, transparent 40%),
    linear-gradient(135deg, #0a1a14 0%, #0d2018 50%, #0a1a14 100%);
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  overflow: hidden;
  margin-bottom: ${({ theme }) => theme.spacing[4]};

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(92,225,255,0.04) 20px, rgba(92,225,255,0.04) 21px),
      repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(92,225,255,0.04) 20px, rgba(92,225,255,0.04) 21px);
  }
`;

const ParcelOverlay = styled.div`
  position: absolute;
  top: 30%;
  left: 25%;
  width: 50%;
  height: 40%;
  border: 2px solid ${({ theme }) => theme.colors.cyan};
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.cyan}10;
  box-shadow: 0 0 20px ${({ theme }) => theme.colors.glowCyanSoft};
`;

const ParcelLabel = styled.div`
  position: absolute;
  top: -28px;
  left: 0;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.cyan};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  white-space: nowrap;
`;

const HealthBar = styled.div`
  display: flex;
  gap: 2px;
  height: 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  overflow: hidden;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const HealthSegment = styled.div`
  flex: 1;
  background: ${({ $color }) => $color};
`;

const CardMetrics = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const Metric = styled.div`
  text-align: center;
`;

const MetricValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme, $color }) => $color || theme.colors.text};
`;

const MetricLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 2px;
`;

const AlertToast = styled(motion.div)`
  position: absolute;
  top: -16px;
  right: -16px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.warning}40;
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: ${({ theme }) => theme.shadows.lg};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.warningLight};
  z-index: 5;
`;

export default function Hero() {
  const navigate = useNavigate();

  return (
    <HeroSection>
      <HeroBg />
      <ScanLine />
      <HeroGrid>
        <HeroLeft>
          <HeroBadge
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Satellite size={14} aria-hidden="true" />
            Monitor · Buy · Sell · Verify Land
          </HeroBadge>

          <HeroTitle
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Know your land is<br />
            <GradientText>genuine, safe & tradeable.</GradientText>
          </HeroTitle>

          <HeroSubtitle
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Monitor your property from space, verify parcel genuineness before you buy,
            and sell land with confidence. We check every parcel every two days from
            satellite, send field agents to inspect on the ground, and back every
            transaction with verified boundaries and documented evidence.
          </HeroSubtitle>

          <HeroCTAs
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              size="lg"
              onClick={() => navigate('/login')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              Get Started Free <ArrowRight size={18} aria-hidden="true" />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate('/buy-land')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <ShoppingBag size={18} aria-hidden="true" /> Browse Land
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate('/signup')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Landmark size={18} aria-hidden="true" /> Sell Your Land
            </Button>
          </HeroCTAs>

          <HeroStats
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Stat>
              <StatValue>1,240+</StatValue>
              <StatLabel>Parcels monitored</StatLabel>
            </Stat>
            <Stat>
              <StatValue>48h</StatValue>
              <StatLabel>Change detection</StatLabel>
            </Stat>
            <Stat>
              <StatValue>100%</StatValue>
              <StatLabel>Genuineness verified</StatLabel>
            </Stat>
          </HeroStats>
        </HeroLeft>

        <HeroRight
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <SatelliteCard>
            <AlertToast
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.5 }}
            >
              <TrendingDown size={14} aria-hidden="true" />
              Vegetation change detected
            </AlertToast>

            <CardHeader>
              <CardTitle>
                <Satellite size={16} aria-hidden="true" />
                Parcel EG-001 — Eastern Region
              </CardTitle>
              <CardBadge>
                <LiveDot style={{ display: 'inline-block', marginRight: '4px' }} />
                LIVE
              </CardBadge>
            </CardHeader>

            <SatelliteView>
              <ParcelOverlay>
                <ParcelLabel>Parcel EG-001 · 12.4 acres</ParcelLabel>
              </ParcelOverlay>
            </SatelliteView>

            <HealthBar>
              <HealthSegment $color="#ff6048" />
              <HealthSegment $color="#ff8a6e" />
              <HealthSegment $color="#fbbf24" />
              <HealthSegment $color="#fbbf24" />
              <HealthSegment $color="#22c55e" />
              <HealthSegment $color="#22c55e" />
              <HealthSegment $color="#4ade80" />
              <HealthSegment $color="#4ade80" />
              <HealthSegment $color="#22c55e" />
              <HealthSegment $color="#fbbf24" />
            </HealthBar>

            <CardMetrics>
              <Metric>
                <MetricValue $color="#22c55e">Healthy</MetricValue>
                <MetricLabel>Land status</MetricLabel>
              </Metric>
              <Metric>
                <MetricValue $color="#5ce1ff">12.4</MetricValue>
                <MetricLabel>Acres</MetricLabel>
              </Metric>
              <Metric>
                <MetricValue $color="#fbbf24">3</MetricValue>
                <MetricLabel>Recent alerts</MetricLabel>
              </Metric>
            </CardMetrics>
          </SatelliteCard>
        </HeroRight>
      </HeroGrid>
    </HeroSection>
  );
}
