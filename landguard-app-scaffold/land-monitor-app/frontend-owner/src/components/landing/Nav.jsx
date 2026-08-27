import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { Menu, X, MapPin } from 'lucide-react';
import { Button } from '@earthglobal/design-system';

const StyledNav = styled(motion.nav)`
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

export default function Nav({ scrollTo }) {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNav = (id) => {
    setMobileOpen(false);
    scrollTo(id);
  };

  return (
    <StyledNav $scrolled={scrolled}
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
          <NavLink onClick={() => handleNav('features')}>Features</NavLink>
          <NavLink onClick={() => handleNav('how')}>How It Works</NavLink>
          <NavLink onClick={() => navigate('/buy-land')}>Browse Land</NavLink>
          <NavLink onClick={() => navigate('/signup')}>Sell Land</NavLink>
          <NavLink onClick={() => handleNav('pricing')}>Pricing</NavLink>
          <Button size="sm" onClick={() => navigate('/login')}>Sign In</Button>
        </NavLinks>
        <MobileMenuBtn onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </MobileMenuBtn>
      </NavContent>
      <AnimatePresence>
        {mobileOpen && (
          <MobileMenu
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <MobileLink onClick={() => handleNav('features')}>Features</MobileLink>
            <MobileLink onClick={() => handleNav('how')}>How It Works</MobileLink>
            <MobileLink onClick={() => navigate('/buy-land')}>Browse Land</MobileLink>
            <MobileLink onClick={() => navigate('/signup')}>Sell Land</MobileLink>
            <MobileLink onClick={() => handleNav('pricing')}>Pricing</MobileLink>
            <Button fullWidth onClick={() => navigate('/login')}>Sign In</Button>
          </MobileMenu>
        )}
      </AnimatePresence>
    </StyledNav>
  );
}
