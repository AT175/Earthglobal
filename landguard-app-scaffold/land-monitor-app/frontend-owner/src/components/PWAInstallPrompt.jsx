import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Download, X } from 'lucide-react';

const PromptWrapper = styled.div`
  position: fixed;
  bottom: ${({ theme }) => theme.spacing[4]};
  left: 50%;
  transform: translateX(-50%) ${({ $visible }) => ($visible ? 'translateY(0)' : 'translateY(120%)')};
  z-index: 9999;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  box-shadow: ${({ theme }) => theme.shadows.glowSoft};
  padding: ${({ theme }) => theme.spacing[4]};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  max-width: 380px;
  transition: transform ${({ theme }) => theme.durations.slow} ease;
`;

const PromptText = styled.div`
  flex: 1;
`;

const PromptTitle = styled.div`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-bottom: 2px;
`;

const PromptDesc = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const InstallButton = styled.button`
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.surface};
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.colors.primaryBright};
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (localStorage.getItem('pwa-install-dismissed') === 'true') return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show after 3 seconds
      setTimeout(() => setVisible(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (dismissed || !deferredPrompt) return null;

  return (
    <PromptWrapper $visible={visible} role="dialog" aria-label="Install EarthGlobal app">
      <PromptText>
        <PromptTitle>Install EarthGlobal</PromptTitle>
        <PromptDesc>Add to your home screen for quick access</PromptDesc>
      </PromptText>
      <InstallButton onClick={handleInstall}>
        <Download size={16} aria-hidden="true" />
        Install
      </InstallButton>
      <CloseButton onClick={handleDismiss} aria-label="Dismiss install prompt">
        <X size={18} aria-hidden="true" />
      </CloseButton>
    </PromptWrapper>
  );
}
