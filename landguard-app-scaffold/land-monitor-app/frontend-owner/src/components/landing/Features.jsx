import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Bell, Camera, Shield, Eye, MapPin, Leaf, ShoppingBag, Landmark, CheckCircle2 } from 'lucide-react';

const Section = styled.section`
  padding: ${({ theme }) => `${theme.spacing[20]} 0`};

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

  @media (max-width: 968px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled(motion.div)`
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

const IconBox = styled.div`
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

const Title = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  letter-spacing: ${({ theme }) => theme.letterSpacings.tight};
`;

const Desc = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.base};
  line-height: ${({ theme }) => theme.lineHeights.relaxed};
`;

const FEATURES = [
  {
    icon: Eye,
    title: 'Watch From Space',
    desc: 'Your land is checked from satellite imagery every two days. See clearing, encroachment, or vegetation loss the moment it happens — no one needs to be on-site.',
  },
  {
    icon: Bell,
    title: 'Instant Alerts',
    desc: 'Get notified the moment a change is detected on your property. Alerts reach you via the app, email, and SMS — wherever you are, whatever time it is.',
  },
  {
    icon: CheckCircle2,
    title: 'Parcel Genuineness',
    desc: 'Before you buy, we verify the parcel is genuine — boundaries matched against satellite imagery, ownership documents checked, and field agents confirm on the ground. No more land disputes.',
  },
  {
    icon: ShoppingBag,
    title: 'Buy Verified Land',
    desc: 'Browse land listings with confidence. Every parcel on our marketplace is monitored, boundary-verified, and backed by satellite evidence. You know exactly what you are buying.',
  },
  {
    icon: Landmark,
    title: 'Sell With Confidence',
    desc: 'List your land for sale with verified boundaries and a monitoring history. Buyers trust parcels that come with satellite proof and documented genuineness — sell faster and at fair value.',
  },
  {
    icon: Shield,
    title: 'Evidence You Can Use',
    desc: 'Timestamped satellite imagery, GPS boundary surveys, and field visit reports create a documented chain of evidence for legal proceedings or mediation.',
  },
  {
    icon: MapPin,
    title: 'Precise Boundaries',
    desc: 'Map your parcel boundaries with GPS or import existing survey files. Your land is measured and stored with survey-grade accuracy.',
  },
  {
    icon: Leaf,
    title: 'Verified Field Visits',
    desc: 'When something looks wrong from space, send a trusted field agent to inspect. They document conditions on the ground with photos and a full report.',
  },
  {
    icon: Camera,
    title: 'Parcel Snapshots',
    desc: 'Capture satellite images of your land on demand. Build a visual history over weeks, months, and years — invaluable evidence if a dispute arises.',
  },
];

export default function Features() {
  return (
    <Section id="features">
      <Container>
        <SectionHeader>
          <SectionTag>Features</SectionTag>
          <SectionTitle>Monitor, verify, buy and sell land with confidence</SectionTitle>
          <SectionDesc>
            From satellite surveillance to parcel genuineness verification and land trading —
            a complete platform for secure land ownership and transactions.
          </SectionDesc>
        </SectionHeader>

        <Grid>
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <Card
              key={title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <IconBox>
                <Icon size={24} aria-hidden="true" />
              </IconBox>
              <Title>{title}</Title>
              <Desc>{desc}</Desc>
            </Card>
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
