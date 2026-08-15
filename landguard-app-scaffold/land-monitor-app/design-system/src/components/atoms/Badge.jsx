import styled from 'styled-components';

const toneStyles = {
  neutral: { bg: 'rgba(170, 183, 212, 0.12)', color: '#aab7d4', border: 'rgba(170, 183, 212, 0.3)' },
  primary: { bg: 'rgba(22, 119, 255, 0.12)', color: '#3ba7ff', border: 'rgba(22, 119, 255, 0.35)' },
  success: { bg: 'rgba(34, 197, 94, 0.12)', color: '#4ade80', border: 'rgba(34, 197, 94, 0.35)' },
  warning: { bg: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.35)' },
  error: { bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: 'rgba(239, 68, 68, 0.35)' },
};

const StyledBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => `${theme.spacing[0.5]} ${theme.spacing[2]}`};
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  text-transform: uppercase;
  letter-spacing: ${({ theme }) => theme.letterSpacings.wide};
  background: ${({ $tone }) => toneStyles[$tone]?.bg};
  color: ${({ $tone }) => toneStyles[$tone]?.color};
  border: 1px solid ${({ $tone }) => toneStyles[$tone]?.border};
`;

// Status badge — used for visit_status, alert_type, payment_status, etc.
export default function Badge({ tone = 'neutral', children, ...props }) {
  return (
    <StyledBadge $tone={tone} {...props}>
      {children}
    </StyledBadge>
  );
}
