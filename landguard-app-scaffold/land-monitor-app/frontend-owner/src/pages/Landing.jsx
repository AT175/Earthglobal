import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import {
  Satellite, Bell, Camera, Shield, Eye, MapPin, ArrowRight,
  Menu, X, CheckCircle2, Globe, Zap, TrendingDown, Users, Leaf,
} from 'lucide-react';
import { Button } from '@earthglobal/design-system';

// ═══════════════════════════════════════════════════════════
// Animations
// ═══════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════
// Layout
// ═══════════════════════════════════════════════════════════
const Page = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.body};
  overflow-x: hidden;
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing[6]};

  @media (max-width: 768px) {
    padding: 0 ${({ theme }) => theme.spacing[4]};
  }
`;

// ═══════════════════════════════════════════════════════════
// Navigation
// ═══════════════════════════════════════════════════════════
const Nav = styled(motion.nav)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: ${({ $scrolled, theme }) =>
    $scrolled ? `${theme.colors.background}f0` : 'transparent'};
  backdrop-filter: ${({ $scrolled }) => ($scrolled ? 'blur(12px)' : 'none')};
  border-bottom: ${({ $scrolled, theme }) =>
    $scrolled ? `1px solid ${theme.colors.borderDark}` : '1px solid transparent'};
  transition: all 0.3s ease;
`;

const NavContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
  display: flex;
  align-items: center;
  justify-content: space-between;

  @media (max-width: 768px) {
    padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  }
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  cursor: pointer;
  letter-spacing: ${({ theme }) => theme.letterSpacings.tight};
`;

const LogoIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.gradientPrimary};
  box-shadow: ${({ theme }) => theme.shadows.glowSoft};
`;

const LogoHighlight = styled.span`
  background: ${({ theme }) => theme.colors.gradientCyan};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[8]};

  @media (max-width: 768px) {
    display: none;
  }
`;

const NavLink = styled.a`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const NavActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const MobileMenuBtn = styled.button`
  display: none;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[2]};

  @media (max-width: 768px) {
    display: flex;
  }
`;

const MobileMenu = styled(motion.div)`
  position: fixed;
  top: 64px;
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.colors.background};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  padding: ${({ theme }) => theme.spacing[6]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
  z-index: 99;
`;

const MobileLink = styled.a`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[2]} 0;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

// ═══════════════════════════════════════════════════════════
// Hero
// ═══════════════════════════════════════════════════════════
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

const Badge = styled(motion.div)`
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

// ── Hero Visual (Satellite Card) ──
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

const NDVIBar = styled.div`
  display: flex;
  gap: 2px;
  height: 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  overflow: hidden;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const NDVISegment = styled.div`
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

// ═══════════════════════════════════════════════════════════
// Trust Bar
// ═══════════════════════════════════════════════════════════
const TrustBar = styled.section`
  border-top: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  padding: ${({ theme }) => theme.spacing[6]} 0;
  background: ${({ theme }) => theme.colors.backgroundSecondary};
`;

const TrustContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing[6]};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[12]};
  flex-wrap: wrap;

  @media (max-width: 768px) {
    gap: ${({ theme }) => theme.spacing[6]};
  }
`;

const TrustItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

// ═══════════════════════════════════════════════════════════
// Features Section
// ═══════════════════════════════════════════════════════════
const Section = styled.section`
  padding: ${({ theme }) => `${theme.spacing[20]} 0`};

  @media (max-width: 768px) {
    padding: ${({ theme }) => `${theme.spacing[12]} 0`};
  }
`;

const SectionHeader = styled.div`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing[12]};
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
`;

const SectionTag = styled.div`
  display: inline-block;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.cyan};
  text-transform: uppercase;
  letter-spacing: ${({ theme }) => theme.letterSpacings.wider};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const SectionTitle = styled.h2`
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  line-height: 1.1;
  letter-spacing: ${({ theme }) => theme.letterSpacings.tight};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const SectionDesc = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: ${({ theme }) => theme.lineHeights.relaxed};
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.spacing[5]};

  @media (max-width: 968px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const FeatureCard = styled(motion.div)`
  background: ${({ theme }) => theme.colors.gradientSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii['2xl']};
  padding: ${({ theme }) => theme.spacing[6]};
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, ${({ theme }) => theme.colors.primary}50, transparent);
    opacity: 0;
    transition: opacity 0.3s;
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.border};
    box-shadow: ${({ theme }) => theme.shadows.glowCardHover};
    transform: translateY(-4px);

    &::before {
      opacity: 1;
    }
  }
`;

const FeatureIconBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: ${({ theme }) => theme.radii.xl};
  background: ${({ theme }) => theme.colors.primary}15;
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  color: ${({ theme }) => theme.colors.primaryBright};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const FeatureTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  letter-spacing: ${({ theme }) => theme.letterSpacings.tight};
`;

const FeatureDesc = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.base};
  line-height: ${({ theme }) => theme.lineHeights.relaxed};
`;

// ═══════════════════════════════════════════════════════════
// How It Works
// ═══════════════════════════════════════════════════════════
const StepsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.spacing[5]};
  position: relative;

  @media (max-width: 968px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const StepLine = styled.div`
  position: absolute;
  top: 28px;
  left: 12%;
  right: 12%;
  height: 2px;
  background: linear-gradient(90deg, transparent, ${({ theme }) => theme.colors.border}, ${({ theme }) => theme.colors.border}, transparent);
  z-index: 0;

  @media (max-width: 968px) {
    display: none;
  }
`;

const StepCard = styled(motion.div)`
  position: relative;
  z-index: 1;
  text-align: center;
`;

const StepNumber = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin: 0 auto ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme }) => theme.colors.gradientPrimary};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  box-shadow: ${({ theme }) => theme.shadows.glowSoft};
`;

const StepTitle = styled.h4`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const StepDesc = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: ${({ theme }) => theme.lineHeights.relaxed};
`;

// ═══════════════════════════════════════════════════════════
// CTA Section
// ═══════════════════════════════════════════════════════════
const CTASection = styled.section`
  padding: ${({ theme }) => `${theme.spacing[20]} 0`};
  position: relative;
  overflow: hidden;
`;

const CTACard = styled(motion.div)`
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
  background: ${({ theme }) => theme.colors.gradientSurface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii['2xl']};
  padding: ${({ theme }) => `${theme.spacing[12]} ${theme.spacing[8]}`};
  position: relative;
  overflow: hidden;
  box-shadow: ${({ theme }) => theme.shadows.glowCard};

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, ${({ theme }) => theme.colors.glowPrimarySoft} 0%, transparent 50%);
    animation: ${pulse} 6s ease-in-out infinite;
  }
`;

const CTATitle = styled.h2`
  position: relative;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  line-height: 1.1;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  z-index: 1;
`;

const CTADesc = styled.p`
  position: relative;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: ${({ theme }) => theme.spacing[8]};
  z-index: 1;
`;

const CTAButtons = styled.div`
  position: relative;
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  justify-content: center;
  flex-wrap: wrap;
  z-index: 1;
`;

// ═══════════════════════════════════════════════════════════
// Footer
// ═══════════════════════════════════════════════════════════
const Footer = styled.footer`
  border-top: 1px solid ${({ theme }) => theme.colors.borderDark};
  padding: ${({ theme }) => `${theme.spacing[10]} 0 ${theme.spacing[6]}`};
  background: ${({ theme }) => theme.colors.backgroundSecondary};
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing[6]};
`;

const FooterGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[8]};
  margin-bottom: ${({ theme }) => theme.spacing[8]};

  @media (max-width: 768px) {
    grid-template-columns: 1fr 1fr;
    gap: ${({ theme }) => theme.spacing[6]};
  }
`;

const FooterBrand = styled.div`
  max-width: 300px;
`;

const FooterLogo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const FooterDesc = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: ${({ theme }) => theme.lineHeights.relaxed};
`;

const FooterColTitle = styled.h5`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  text-transform: uppercase;
  letter-spacing: ${({ theme }) => theme.letterSpacings.wider};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const FooterLink = styled.a`
  display: block;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  padding: ${({ theme }) => theme.spacing[1]} 0;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: ${({ theme }) => theme.colors.cyan};
  }
`;

const FooterBottom = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: ${({ theme }) => theme.spacing[6]};
  border-top: 1px solid ${({ theme }) => theme.colors.borderDark};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  @media (max-width: 640px) {
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing[3]};
    text-align: center;
  }
`;

// ═══════════════════════════════════════════════════════════
// Data
// ═══════════════════════════════════════════════════════════
const FEATURES = [
  {
    icon: Satellite,
    title: 'Satellite Monitoring',
    desc: 'Sentinel-2 satellite imagery checked every 2 days. NDVI vegetation analysis detects clearing, encroachment, and vegetation loss automatically.',
  },
  {
    icon: Bell,
    title: 'Real-time Alerts',
    desc: 'Get notified via WebSocket, email, and SMS the moment NDVI analysis detects a change on your land. Push alerts stream live to your dashboard.',
  },
  {
    icon: Camera,
    title: 'Parcel Imagery',
    desc: 'Capture satellite snapshots of your parcels on demand. Historical imagery gallery shows how your land changes over time.',
  },
  {
    icon: Shield,
    title: 'Evidence Documentation',
    desc: 'GPS boundary surveys, timestamped satellite imagery, and field visit reports build a documented evidence trail for land disputes.',
  },
  {
    icon: Eye,
    title: 'Live Dashboard',
    desc: 'Monitor all your parcels in one place. WebSocket-powered updates stream alerts, visit statuses, and satellite data as it arrives.',
  },
  {
    icon: MapPin,
    title: 'PostGIS Mapping',
    desc: 'Boundary mapping with satellite, terrain, and NDVI layers. Import GeoJSON files or survey with GPS — stored accurately with PostGIS.',
  },
];

const STEPS = [
  { title: 'Create Account', desc: 'Sign up as a landowner, agent, or admin in under 60 seconds.' },
  { title: 'Register Parcels', desc: 'Survey boundaries with GPS or import GeoJSON files with PostGIS.' },
  { title: 'Monitor Land', desc: 'Satellite NDVI analysis runs every 2 days. Get real-time alerts when changes are detected.' },
  { title: 'Verify & Protect', desc: 'Send agents to inspect. Build evidence. Secure your land for good.' },
];

const TRUST_ITEMS = [
  { icon: Satellite, label: 'Sentinel-2 Satellite Imagery' },
  { icon: Shield, label: 'PostGIS Boundary Mapping' },
  { icon: Zap, label: 'Real-time WebSocket Alerts' },
  { icon: Globe, label: 'Monitor from Anywhere' },
];

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════
export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Page>
      {/* ── Navigation ── */}
      <Nav $scrolled={scrolled}
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <NavContent>
          <Logo onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <LogoIcon>
              <MapPin size={20} aria-hidden="true" />
            </LogoIcon>
            Earth<LogoHighlight>Global</LogoHighlight>
          </Logo>
          <NavLinks>
            <NavLink onClick={() => scrollTo('features')}>Features</NavLink>
            <NavLink onClick={() => scrollTo('how')}>How It Works</NavLink>
            <NavLink onClick={() => scrollTo('cta')}>Get Started</NavLink>
            <Button size="sm" onClick={() => navigate('/login')}>Sign In</Button>
          </NavLinks>
          <NavActions>
            <Button size="sm" onClick={() => navigate('/login')} style={{ display: mobileOpen ? 'none' : 'inline-flex' }}>
              Sign In
            </Button>
            <MobileMenuBtn onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </MobileMenuBtn>
          </NavActions>
        </NavContent>
        <AnimatePresence>
          {mobileOpen && (
            <MobileMenu
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <MobileLink onClick={() => scrollTo('features')}>Features</MobileLink>
              <MobileLink onClick={() => scrollTo('how')}>How It Works</MobileLink>
              <MobileLink onClick={() => scrollTo('cta')}>Get Started</MobileLink>
              <Button fullWidth onClick={() => navigate('/login')}>Sign In</Button>
            </MobileMenu>
          )}
        </AnimatePresence>
      </Nav>

      {/* ── Hero ── */}
      <HeroSection>
        <HeroBg />
        <ScanLine />
        <HeroGrid>
          <HeroLeft>
            <Badge
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Satellite size={14} aria-hidden="true" />
              Sentinel-2 Satellite Imagery + NDVI Analysis
            </Badge>

            <HeroTitle
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              See it. Check it.<br />
              <GradientText>Secure it.</GradientText>
            </HeroTitle>

            <HeroSubtitle
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Remote land monitoring powered by satellite imagery and field agents.
              NDVI analysis runs every 2 days, real-time alerts notify you of changes,
              and satellite imagery captures your parcel over time.
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
                onClick={() => scrollTo('features')}
              >
                Explore Features
              </Button>
            </HeroCTAs>

            <HeroStats
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Stat>
                <StatValue>2-day</StatValue>
                <StatLabel>Satellite monitoring</StatLabel>
              </Stat>
              <Stat>
                <StatValue>Real-time</StatValue>
                <StatLabel>WebSocket alerts</StatLabel>
              </Stat>
              <Stat>
                <StatValue>Satellite</StatValue>
                <StatLabel>Parcel imagery</StatLabel>
              </Stat>
            </HeroStats>
          </HeroLeft>

          {/* Hero Visual — Satellite Monitor Card */}
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
                NDVI change detected
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

              <NDVIBar>
                <NDVISegment $color="#ff6048" />
                <NDVISegment $color="#ff8a6e" />
                <NDVISegment $color="#fbbf24" />
                <NDVISegment $color="#fbbf24" />
                <NDVISegment $color="#22c55e" />
                <NDVISegment $color="#22c55e" />
                <NDVISegment $color="#4ade80" />
                <NDVISegment $color="#4ade80" />
                <NDVISegment $color="#22c55e" />
                <NDVISegment $color="#fbbf24" />
              </NDVIBar>

              <CardMetrics>
                <Metric>
                  <MetricValue $color="#22c55e">0.72</MetricValue>
                  <MetricLabel>NDVI Index</MetricLabel>
                </Metric>
                <Metric>
                  <MetricValue $color="#5ce1ff">12.4</MetricValue>
                  <MetricLabel>Acres</MetricLabel>
                </Metric>
                <Metric>
                  <MetricValue $color="#fbbf24">3</MetricValue>
                  <MetricLabel>Alerts</MetricLabel>
                </Metric>
              </CardMetrics>
            </SatelliteCard>
          </HeroRight>
        </HeroGrid>
      </HeroSection>

      {/* ── Trust Bar ── */}
      <TrustBar>
        <TrustContent>
          {TRUST_ITEMS.map(({ icon: Icon, label }) => (
            <TrustItem key={label}>
              <Icon size={18} aria-hidden="true" />
              {label}
            </TrustItem>
          ))}
        </TrustContent>
      </TrustBar>

      {/* ── Features ── */}
      <Section id="features">
        <Container>
          <SectionHeader>
            <SectionTag>Features</SectionTag>
            <SectionTitle>Everything you need to protect your land</SectionTitle>
            <SectionDesc>
              From satellite surveillance to on-the-ground verification —
              a complete platform for remote land monitoring and protection.
            </SectionDesc>
          </SectionHeader>

          <FeaturesGrid>
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <FeatureCard
                key={title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <FeatureIconBox>
                  <Icon size={24} aria-hidden="true" />
                </FeatureIconBox>
                <FeatureTitle>{title}</FeatureTitle>
                <FeatureDesc>{desc}</FeatureDesc>
              </FeatureCard>
            ))}
          </FeaturesGrid>
        </Container>
      </Section>

      {/* ── How It Works ── */}
      <Section id="how" style={{ background: ({ theme }) => theme.colors.backgroundSecondary }}>
        <Container>
          <SectionHeader>
            <SectionTag>How It Works</SectionTag>
            <SectionTitle>Four steps to land security</SectionTitle>
            <SectionDesc>
              From signup to full protection in minutes. No technical expertise required.
            </SectionDesc>
          </SectionHeader>

          <StepsContainer>
            <StepLine />
            {STEPS.map((step, i) => (
              <StepCard
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <StepNumber>{i + 1}</StepNumber>
                <StepTitle>{step.title}</StepTitle>
                <StepDesc>{step.desc}</StepDesc>
              </StepCard>
            ))}
          </StepsContainer>
        </Container>
      </Section>

      {/* ── CTA ── */}
      <CTASection id="cta">
        <Container>
          <CTACard
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <CTATitle>Ready to protect your land?</CTATitle>
            <CTADesc>
              Join EarthGlobal today and monitor your property with satellite imagery,
              NDVI change detection, and verified field agents — from anywhere in the world.
            </CTADesc>
            <CTAButtons>
              <Button
                size="lg"
                onClick={() => navigate('/login')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                Get Started Free <ArrowRight size={18} aria-hidden="true" />
              </Button>
              <Button size="lg" variant="secondary" onClick={() => scrollTo('features')}>
                Learn More
              </Button>
            </CTAButtons>
          </CTACard>
        </Container>
      </CTASection>

      {/* ── Footer ── */}
      <Footer>
        <FooterContent>
          <FooterGrid>
            <FooterBrand>
              <FooterLogo>
                <LogoIcon>
                  <MapPin size={18} aria-hidden="true" />
                </LogoIcon>
                Earth<LogoHighlight>Global</LogoHighlight>
              </FooterLogo>
              <FooterDesc>
                Remote land monitoring and protection platform powered by
                satellite imagery, AI change detection, and verified field agents.
              </FooterDesc>
            </FooterBrand>

            <div>
              <FooterColTitle>Product</FooterColTitle>
              <FooterLink onClick={() => scrollTo('features')}>Features</FooterLink>
              <FooterLink onClick={() => scrollTo('how')}>How It Works</FooterLink>
              <FooterLink onClick={() => navigate('/login')}>Sign In</FooterLink>
              <FooterLink onClick={() => navigate('/login')}>Get Started</FooterLink>
            </div>

            <div>
              <FooterColTitle>Technology</FooterColTitle>
              <FooterLink>Sentinel-2 Imagery</FooterLink>
              <FooterLink>PostGIS Mapping</FooterLink>
              <FooterLink>NDVI Analysis</FooterLink>
              <FooterLink>WebSocket Real-time</FooterLink>
            </div>

            <div>
              <FooterColTitle>Company</FooterColTitle>
              <FooterLink>About</FooterLink>
              <FooterLink>Contact</FooterLink>
              <FooterLink>Privacy Policy</FooterLink>
              <FooterLink>Terms of Service</FooterLink>
            </div>
          </FooterGrid>

          <FooterBottom>
            <span>&copy; {new Date().getFullYear()} EarthGlobal. All rights reserved.</span>
            <span>See it. Check it. Secure it.</span>
          </FooterBottom>
        </FooterContent>
      </Footer>
    </Page>
  );
}
