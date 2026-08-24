import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Check, ArrowRight } from 'lucide-react';
import { Button } from '@earthglobal/design-system';

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

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.spacing[5]};
  max-width: 950px;
  margin: 0 auto;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const PlanCard = styled(motion.div)`
  background: ${({ theme }) => theme.colors.gradientSurface};
  border: 1px solid ${({ $highlight, theme }) =>
    $highlight ? theme.colors.primary : theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii['2xl']};
  padding: ${({ theme }) => theme.spacing[6]};
  position: relative;
  ${({ $highlight, theme }) =>
    $highlight ? `box-shadow: ${theme.shadows.glowCard};` : ''}

  @media (max-width: 768px) {
    ${({ $highlight }) => ($highlight ? 'order: -1;' : '')}
  }
`;

const PopularBadge = styled.div`
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: ${({ theme }) => theme.colors.gradientPrimary};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  padding: 4px 14px;
  border-radius: ${({ theme }) => theme.radii.full};
  white-space: nowrap;
`;

const PlanName = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const PlanPrice = styled.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const PriceAmount = styled.span`
  font-size: ${({ theme }) => theme.fontSizes['4xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text};
`;

const PricePeriod = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const PlanDesc = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-bottom: ${({ theme }) => theme.spacing[5]};
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 ${({ theme }) => theme.spacing[6]} 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const FeatureItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const CheckIcon = styled.span`
  color: ${({ theme }) => theme.colors.success};
  flex-shrink: 0;
  margin-top: 2px;
`;

const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    desc: 'For monitoring a single parcel.',
    features: ['1 parcel monitored', 'Change alerts via app', 'Parcel snapshots', 'Field visit requests'],
    highlight: false,
  },
  {
    name: 'Landowner',
    price: '₵120',
    period: '/month',
    desc: 'For families with multiple parcels.',
    features: ['Up to 10 parcels', 'Alerts via app, email & SMS', 'Unlimited satellite snapshots', 'Priority field agent dispatch', 'Evidence report export'],
    highlight: true,
  },
  {
    name: 'Assembly',
    price: 'Custom',
    period: '',
    desc: 'For districts & municipalities.',
    features: ['Unlimited parcels', 'Organization dashboard', 'Agent management', 'Bulk alerts & reporting', 'Dedicated support'],
    highlight: false,
  },
];

export default function PricingTeaser() {
  const navigate = useNavigate();

  return (
    <Section id="pricing">
      <Container>
        <SectionHeader>
          <SectionTag>Pricing</SectionTag>
          <SectionTitle>Start free. Upgrade when you need more.</SectionTitle>
          <SectionDesc>
            Transparent pricing for every kind of landowner. No hidden fees.
          </SectionDesc>
        </SectionHeader>

        <Grid>
          {PLANS.map((plan, i) => (
            <PlanCard
              key={plan.name}
              $highlight={plan.highlight}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              {plan.highlight && <PopularBadge>Most Popular</PopularBadge>}
              <PlanName>{plan.name}</PlanName>
              <PlanPrice>
                <PriceAmount>{plan.price}</PriceAmount>
                {plan.period && <PricePeriod>{plan.period}</PricePeriod>}
              </PlanPrice>
              <PlanDesc>{plan.desc}</PlanDesc>
              <FeatureList>
                {plan.features.map((f) => (
                  <FeatureItem key={f}>
                    <CheckIcon>
                      <Check size={16} aria-hidden="true" />
                    </CheckIcon>
                    {f}
                  </FeatureItem>
                ))}
              </FeatureList>
              <Button
                fullWidth
                variant={plan.highlight ? 'primary' : 'secondary'}
                onClick={() => navigate('/login')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {plan.price === 'Free' ? 'Get Started' : 'Choose Plan'} <ArrowRight size={16} aria-hidden="true" />
              </Button>
            </PlanCard>
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
