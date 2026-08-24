import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { MapPin } from 'lucide-react';

const FooterWrap = styled.footer`
  border-top: 1px solid ${({ theme }) => theme.colors.borderDark};
  padding: ${({ theme }) => `${theme.spacing[10]} 0 ${theme.spacing[6]}`};
  background: ${({ theme }) => theme.colors.backgroundSecondary};
`;

const Content = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing[6]};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[8]};
  margin-bottom: ${({ theme }) => theme.spacing[8]};

  @media (max-width: 768px) {
    grid-template-columns: 1fr 1fr;
    gap: ${({ theme }) => theme.spacing[6]};
  }
`;

const Brand = styled.div`
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

const LogoIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
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

const Desc = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: ${({ theme }) => theme.lineHeights.relaxed};
`;

const ColTitle = styled.h5`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  text-transform: uppercase;
  letter-spacing: ${({ theme }) => theme.letterSpacings.wider};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const Link = styled.a`
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

const Bottom = styled.div`
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

export default function Footer({ scrollTo }) {
  const navigate = useNavigate();

  return (
    <FooterWrap>
      <Content>
        <Grid>
          <Brand>
            <FooterLogo>
              <LogoIcon>
                <MapPin size={18} aria-hidden="true" />
              </LogoIcon>
              Earth<LogoHighlight>Global</LogoHighlight>
            </FooterLogo>
            <Desc>
              Remote land monitoring and protection platform. Watch your land
              from space, get alerted to changes, and send verified field
              agents to inspect — all from your phone.
            </Desc>
          </Brand>

          <div>
            <ColTitle>Product</ColTitle>
            <Link onClick={() => scrollTo('features')}>Features</Link>
            <Link onClick={() => scrollTo('how')}>How It Works</Link>
            <Link onClick={() => scrollTo('pricing')}>Pricing</Link>
            <Link onClick={() => navigate('/login')}>Sign In</Link>
            <Link onClick={() => navigate('/login')}>Get Started</Link>
          </div>

          <div>
            <ColTitle>Land</ColTitle>
            <Link onClick={() => navigate('/buy-land')}>Browse Land</Link>
            <Link onClick={() => navigate('/login')}>List Your Land</Link>
            <Link onClick={() => navigate('/login')}>Request a Visit</Link>
          </div>

          <div>
            <ColTitle>Company</ColTitle>
            <Link onClick={() => navigate('/login')}>Contact Us</Link>
            <Link onClick={() => navigate('/login')}>Privacy Policy</Link>
            <Link onClick={() => navigate('/login')}>Terms of Service</Link>
          </div>
        </Grid>

        <Bottom>
          <span>&copy; {new Date().getFullYear()} EarthGlobal. All rights reserved.</span>
          <span>See it. Check it. Secure it.</span>
        </Bottom>
      </Content>
    </FooterWrap>
  );
}
