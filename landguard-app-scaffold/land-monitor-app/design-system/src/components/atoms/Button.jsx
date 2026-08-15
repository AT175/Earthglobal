import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';

const variantStyles = {
  primary: css`
    background: ${({ theme }) => theme.colors.gradientPrimary};
    color: ${({ theme }) => theme.colors.text};
    border: 1px solid transparent;

    &:hover:not(:disabled) {
      box-shadow: 0 0 12px rgba(22, 119, 255, 0.9), 0 0 35px rgba(22, 119, 255, 0.5);
    }
  `,
  secondary: css`
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    border: 1px solid ${({ theme }) => theme.colors.border};

    &:hover:not(:disabled) {
      border-color: ${({ theme }) => theme.colors.borderLight};
      box-shadow: ${({ theme }) => theme.shadows.glowSoft};
    }
  `,
  ghost: css`
    background: transparent;
    color: ${({ theme }) => theme.colors.textMuted};
    border: 1px solid transparent;

    &:hover:not(:disabled) {
      color: ${({ theme }) => theme.colors.text};
      background: ${({ theme }) => theme.colors.surfaceLight};
    }
  `,
  danger: css`
    background: ${({ theme }) => theme.colors.error};
    color: ${({ theme }) => theme.colors.text};
    border: 1px solid transparent;

    &:hover:not(:disabled) {
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.7), 0 0 30px rgba(239, 68, 68, 0.4);
    }
  `,
};

const sizeStyles = {
  sm: css`
    padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[3]}`};
    font-size: ${({ theme }) => theme.fontSizes.sm};
  `,
  md: css`
    padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[5]}`};
    font-size: ${({ theme }) => theme.fontSizes.base};
  `,
  lg: css`
    padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[6]}`};
    font-size: ${({ theme }) => theme.fontSizes.lg};
  `,
};

const StyledButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  border-radius: ${({ theme }) => theme.radii.lg};
  cursor: pointer;
  transition: box-shadow ${({ theme }) => theme.durations.fast} ${({ theme }) => theme.easings.easeOut},
    border-color ${({ theme }) => theme.durations.fast} ${({ theme }) => theme.easings.easeOut},
    background ${({ theme }) => theme.durations.fast} ${({ theme }) => theme.easings.easeOut};
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};

  ${({ $variant }) => variantStyles[$variant] || variantStyles.primary}
  ${({ $size }) => sizeStyles[$size] || sizeStyles.md}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// EarthGlobal Button — primary | secondary | ghost | danger, with signature hover glow.
export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  ...props
}) {
  return (
    <StyledButton
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      whileTap={{ scale: 0.97 }}
      {...props}
    >
      {children}
    </StyledButton>
  );
}
