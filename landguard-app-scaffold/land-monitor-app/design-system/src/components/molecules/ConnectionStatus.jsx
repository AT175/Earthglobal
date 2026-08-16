import styled from 'styled-components';
import { Wifi, WifiOff } from 'lucide-react';

const Wrapper = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  background: ${({ $connected, theme }) =>
    $connected ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)'};
  border: 1px solid
    ${({ $connected, theme }) =>
      $connected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'};
  color: ${({ $connected, theme }) =>
    $connected ? theme.colors.successLight : theme.colors.warningLight};
  transition: all 0.2s ease;
`;

const Dot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $connected, theme }) =>
    $connected ? theme.colors.success : theme.colors.warning};
  box-shadow: 0 0 8px
    ${({ $connected, theme }) =>
      $connected ? theme.colors.success : theme.colors.warning};
  animation: ${({ $connected }) => ($connected ? 'none' : 'pulse 1.5s ease-in-out infinite')};

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
`;

/**
 * ConnectionStatus — a small pill indicator showing whether the real-time
 * WebSocket connection is live. Uses the theme's success/warning colors with
 * a subtle glow on the status dot.
 *
 * @param {boolean} connected — whether the socket is connected
 * @param {string}  connectedLabel  — text to show when connected
 * @param {string}  disconnectedLabel — text to show when disconnected
 */
export default function ConnectionStatus({ connected, connectedLabel = 'Live', disconnectedLabel = 'Reconnecting…' }) {
  return (
    <Wrapper $connected={connected} role="status" aria-live="polite">
      <Dot $connected={connected} aria-hidden="true" />
      {connected ? (
        <>
          <Wifi size={12} aria-hidden="true" />
          {connectedLabel}
        </>
      ) : (
        <>
          <WifiOff size={12} aria-hidden="true" />
          {disconnectedLabel}
        </>
      )}
    </Wrapper>
  );
}
