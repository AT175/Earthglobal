import styled from 'styled-components';
import Nav from '../components/landing/Nav';
import Hero from '../components/landing/Hero';
import TrustBar from '../components/landing/TrustBar';
import Features from '../components/landing/Features';
import HowItWorks from '../components/landing/HowItWorks';
import SocialProof from '../components/landing/SocialProof';
import PricingTeaser from '../components/landing/PricingTeaser';
import CTA from '../components/landing/CTA';
import Footer from '../components/landing/Footer';

const Page = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.body};
  overflow-x: hidden;
`;

export default function Landing() {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Page>
      <Nav scrollTo={scrollTo} />
      <Hero />
      <TrustBar />
      <Features />
      <HowItWorks />
      <SocialProof />
      <PricingTeaser />
      <CTA scrollTo={scrollTo} />
      <Footer scrollTo={scrollTo} />
    </Page>
  );
}
