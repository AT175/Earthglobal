import { motion } from 'framer-motion';
import styled from 'styled-components';

const Section = styled.section`
  padding: ${({ theme }) => `${theme.spacing[20]} 0`};
  background: ${({ theme }) => theme.colors.backgroundSecondary};

  @media (max-width: 768px) {
    padding: ${({ theme }) => `${theme.spacing[12]} 0`};
  }
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing[6]};

  @media (max-width: 768px) {
    padding: 0 ${({ theme }) => theme.spacing[4]};
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

const STEPS = [
  { title: 'Create Account', desc: 'Sign up as a landowner in under 60 seconds. Free to start.' },
  { title: 'Register Your Land', desc: 'Map your boundaries with GPS or import an existing survey file.' },
  { title: 'We Watch Your Land', desc: 'Your property is checked from space every two days. You get alerted the moment anything changes.' },
  { title: 'Act & Protect', desc: 'Send a field agent to inspect, build your evidence file, and secure your land for good.' },
];

export default function HowItWorks() {
  return (
    <Section id="how">
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
  );
}
