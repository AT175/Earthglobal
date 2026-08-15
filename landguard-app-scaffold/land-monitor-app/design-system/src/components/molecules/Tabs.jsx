import * as TabsPrimitive from '@radix-ui/react-tabs';
import styled from 'styled-components';

export const Tabs = TabsPrimitive.Root;

export const TabsList = styled(TabsPrimitive.List)`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

export const TabsTrigger = styled(TabsPrimitive.Trigger)`
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: pointer;
  transition: color ${({ theme }) => theme.durations.fast} ease, border-color ${({ theme }) => theme.durations.fast} ease;

  &[data-state='active'] {
    color: ${({ theme }) => theme.colors.text};
    border-bottom-color: ${({ theme }) => theme.colors.primary};
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

export const TabsContent = styled(TabsPrimitive.Content)`
  &:focus-visible {
    outline: none;
  }
`;
