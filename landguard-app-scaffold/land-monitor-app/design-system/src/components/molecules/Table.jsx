import styled from 'styled-components';

export const TableWrapper = styled.div`
  overflow-x: auto;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

export const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

export const Thead = styled.thead`
  background: ${({ theme }) => theme.colors.backgroundSecondary};
`;

export const Th = styled.th`
  text-align: left;
  padding: ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  text-transform: uppercase;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  letter-spacing: ${({ theme }) => theme.letterSpacings.wide};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

export const Tr = styled.tr`
  transition: background ${({ theme }) => theme.durations.fast} ease;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceLight}66;
  }

  &:not(:last-child) td {
    border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  }
`;

export const Td = styled.td`
  padding: ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text};
`;

// Simple accessible data table primitive; consumers compose <Thead>/<Tr>/<Td>
// with real <caption>/scope attributes for screen reader support where needed.
export default function Table({ children, ...props }) {
  return (
    <TableWrapper>
      <StyledTable {...props}>{children}</StyledTable>
    </TableWrapper>
  );
}
