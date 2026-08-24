import styled from 'styled-components';
import { Shield, Eye, Globe, Clock } from 'lucide-react';

const Bar = styled.section`
  border-top: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  padding: ${({ theme }) => theme.spacing[6]} 0;
  background: ${({ theme }) => theme.colors.backgroundSecondary};
`;

const Content = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing[6]};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[12]};
  flex-wrap: wrap;

  @media (max-width: 768px) {
    gap: ${({ theme }) => theme.spacing[6]};
  }
`;

const Item = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const TRUST_ITEMS = [
  { icon: Shield, label: 'Trusted by landowners across Ghana' },
  { icon: Clock, label: 'Monitored every 48 hours' },
  { icon: Eye, label: 'Instant alerts on any change' },
  { icon: Globe, label: 'Monitor from anywhere in the world' },
];

export default function TrustBar() {
  return (
    <Bar>
      <Content>
        {TRUST_ITEMS.map(({ icon: Icon, label }) => (
          <Item key={label}>
            <Icon size={18} aria-hidden="true" />
            {label}
          </Item>
        ))}
      </Content>
    </Bar>
  );
}
