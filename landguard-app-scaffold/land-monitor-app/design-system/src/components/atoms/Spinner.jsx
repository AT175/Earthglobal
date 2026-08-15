import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const StyledSpinner = styled.div`
  width: ${({ $size }) => $size};
  height: ${({ $size }) => $size};
  border-radius: 50%;
  border: 3px solid ${({ theme }) => theme.colors.surfaceLight};
  border-top-color: ${({ theme }) => theme.colors.primaryBright};
  animation: ${spin} 0.8s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 1.6s;
  }
`;

export default function Spinner({ size = '24px', ...props }) {
  return <StyledSpinner $size={size} role="status" aria-label="Loading" {...props} />;
}
