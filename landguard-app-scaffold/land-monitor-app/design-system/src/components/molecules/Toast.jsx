import * as ToastPrimitive from '@radix-ui/react-toast';
import styled from 'styled-components';
import { createContext, useCallback, useContext, useState } from 'react';

const toneColors = {
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#1677ff',
};

const StyledViewport = styled(ToastPrimitive.Viewport)`
  position: fixed;
  bottom: ${({ theme }) => theme.spacing[4]};
  right: ${({ theme }) => theme.spacing[4]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  width: min(90vw, 360px);
  z-index: ${({ theme }) => theme.zIndices.toast};
  list-style: none;
  margin: 0;
  padding: 0;
`;

const StyledToast = styled(ToastPrimitive.Root)`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ $tone }) => toneColors[$tone] || toneColors.info}55;
  border-left: 3px solid ${({ $tone }) => toneColors[$tone] || toneColors.info};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  box-shadow: ${({ theme }) => theme.shadows.md};
  color: ${({ theme }) => theme.colors.text};

  &[data-state='open'] {
    animation: slideIn 0.25s ease-out;
  }
  &[data-state='closed'] {
    animation: fadeOut 0.2s ease-in;
  }

  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`;

const Title = styled(ToastPrimitive.Title)`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const Description = styled(ToastPrimitive.Description)`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const ToastContext = createContext(null);

// EarthGlobal toast system — used for alert notifications, visit status changes, etc.
// Wrap the app once with <ToastProvider>, then call useToast().notify({ title, description, tone }).
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const notify = useCallback(({ title, description, tone = 'info', duration = 5000 }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title, description, tone, duration }]);
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {toasts.map((t) => (
          <StyledToast
            key={t.id}
            $tone={t.tone}
            duration={t.duration}
            onOpenChange={(open) => !open && remove(t.id)}
          >
            {t.title && <Title>{t.title}</Title>}
            {t.description && <Description>{t.description}</Description>}
          </StyledToast>
        ))}
        <StyledViewport aria-label="Notifications" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
