import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import { ArrowRight } from 'lucide-react';
import { Button } from '@earthglobal/design-system';

const pulse = keyframes`
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
`;

const Section = styled.section`
  padding: ${({ theme }) => `${theme.spacing[20]} 0`};
  position: relative;
  overflow: hidden;
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing[6]};

  @media (max-width: 768px) {
    padding: 0 ${({ theme }) => theme.spacing[4]};
  }
`;

const Card = styled(motion.div)`
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

  @media (prefers-reduced-motion: reduce) {
    &::before {
      animation: none;
    }
  }
`;

const Title = styled.h2`
  position: relative;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  line-height: 1.1;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  z-index: 1;
`;

const Desc = styled.p`
  position: relative;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: ${({ theme }) => theme.spacing[8]};
  z-index: 1;
`;

const Buttons = styled.div`
  position: relative;
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  justify-content: center;
  flex-wrap: wrap;
  z-index: 1;
`;

export default function CTA({ scrollTo }) {
  const navigate = useNavigate();

  return (
    <Section id="cta">
      <Container>
        <Card
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Title>Ready to protect your land?</Title>
          <Desc>
            Join EarthGlobal today and monitor your property from space,
            get instant alerts, and dispatch verified field agents —
            from anywhere in the world.
          </Desc>
          <Buttons>
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
          </Buttons>
        </Card>
      </Container>
    </Section>
  );
}
