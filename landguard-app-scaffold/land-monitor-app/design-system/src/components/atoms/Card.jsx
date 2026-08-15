import styled from 'styled-components';
import { motion } from 'framer-motion';

// Glassy surface card with the EarthGlobal blue-glow border treatment.
const StyledCard = styled(motion.div)`
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface}CC;
  backdrop-filter: blur(20px);
  padding: ${({ theme }) => theme.spacing[6]};
  box-shadow: ${({ theme }) => theme.shadows.glowCard};
  transition: border-color ${({ theme }) => theme.durations.normal} ${({ theme }) => theme.easings.easeOut},
    box-shadow ${({ theme }) => theme.durations.normal} ${({ theme }) => theme.easings.easeOut};

  ${({ $interactive }) =>
    $interactive &&
    `
    cursor: pointer;
    &:hover {
      border-color: rgba(92, 225, 255, 0.4);
    }
  `}
`;

export default function Card({ interactive = false, children, ...props }) {
  return (
    <StyledCard
      $interactive={interactive}
      whileHover={interactive ? { y: -2 } : undefined}
      {...props}
    >
      {children}
    </StyledCard>
  );
}
