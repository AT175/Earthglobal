import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Quote } from 'lucide-react';

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
    grid-template-columns: 1fr;
  }
`;

const Card = styled(motion.div)`
  background: ${({ theme }) => theme.colors.gradientSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii['2xl']};
  padding: ${({ theme }) => theme.spacing[6]};
  position: relative;
`;

const QuoteIcon = styled.div`
  color: ${({ theme }) => theme.colors.primary}40;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const Text = styled.p`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.base};
  line-height: ${({ theme }) => theme.lineHeights.relaxed};
  margin-bottom: ${({ theme }) => theme.spacing[5]};
`;

const Author = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const Avatar = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.gradientPrimary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text};
  flex-shrink: 0;
`;

const AuthorInfo = styled.div``;

const AuthorName = styled.div`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const AuthorRole = styled.div`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  margin-top: 2px;
`;

const TESTIMONIALS = [
  {
    text: "I live in Accra but my farmland is in the Eastern Region. Before EarthGlobal, I had no way to know if someone was encroaching. Now I get an alert the moment something changes. Peace of mind is an understatement.",
    name: 'Kwame Asante',
    role: 'Landowner, Eastern Region',
    initials: 'KA',
  },
  {
    text: "Our assembly uses EarthGlobal to monitor disputed parcels across the district. The satellite alerts have helped us catch three illegal clearing incidents in the last month alone.",
    name: 'Ama Serwaa',
    role: 'Planning Officer, Municipal Assembly',
    initials: 'AS',
  },
  {
    text: "As a field agent, the app tells me exactly where to go and what to look for. I document everything on-site with photos and GPS. The whole process takes minutes instead of days.",
    name: 'Yaw Mensah',
    role: 'Field Agent, Central Region',
    initials: 'YM',
  },
];

export default function SocialProof() {
  return (
    <Section>
      <Container>
        <SectionHeader>
          <SectionTag>Testimonials</SectionTag>
          <SectionTitle>Trusted by landowners and assemblies</SectionTitle>
          <SectionDesc>
            Real people protecting real land with EarthGlobal across Ghana.
          </SectionDesc>
        </SectionHeader>

        <Grid>
          {TESTIMONIALS.map((t, i) => (
            <Card
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <QuoteIcon>
                <Quote size={32} aria-hidden="true" />
              </QuoteIcon>
              <Text>"{t.text}"</Text>
              <Author>
                <Avatar>{t.initials}</Avatar>
                <AuthorInfo>
                  <AuthorName>{t.name}</AuthorName>
                  <AuthorRole>{t.role}</AuthorRole>
                </AuthorInfo>
              </Author>
            </Card>
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
