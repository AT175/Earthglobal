import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Camera, Video, Radio } from 'lucide-react';
import { Card, Button } from '@earthglobal/design-system';
import api from '../services/api';
import { useRoleLayout } from '../hooks/useRoleLayout';

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const FormCard = styled(Card)`
  max-width: 480px;
`;

const Fieldset = styled.fieldset`
  border: none;
  padding: 0;
  margin: 0 0 ${({ theme }) => theme.spacing[6]} 0;
`;

const Legend = styled.legend`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  padding: 0;
`;

const OptionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.spacing[2]};
`;

const OptionLabel = styled.label`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme, $checked }) => ($checked ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $checked }) => ($checked ? theme.colors.surfaceLight : 'transparent')};
  box-shadow: ${({ theme, $checked }) => ($checked ? theme.shadows.glowSoft : 'none')};
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-align: center;
  transition: all ${({ theme }) => theme.durations.fast} ease;

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  /* The native radio is visually hidden, so give the label itself a visible
     focus ring when it's keyboard-focused — otherwise keyboard users tabbing
     through these cards get no visual feedback at all. */
  &:has(input:focus-visible) {
    outline: 2px solid ${({ theme }) => theme.colors.cyan};
    outline-offset: 2px;
  }
`;

const VISIT_TYPES = [
  { value: 'photo', labelKey: 'photo', icon: Camera },
  { value: 'video', labelKey: 'video', icon: Video },
  { value: 'live', labelKey: 'live', icon: Radio },
];

export default function RequestVisit() {
  const { t } = useTranslation();
  const { t: tCommon } = useTranslation('common');
  const { id } = useParams();
  const navigate = useNavigate();
  const { Layout, routePrefix } = useRoleLayout();
  const [type, setType] = useState('photo');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/visit-requests', { parcel_id: id, type });
      navigate(`${routePrefix}/parcels/${id}`);
    } catch (err) {
      console.error('Failed to create visit request', err);
      setError(t('requestVisit.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <Title>{t('requestVisit.title')}</Title>
      <FormCard as="form" onSubmit={handleSubmit}>
        <Fieldset>
          <Legend>{t('requestVisit.question')}</Legend>
          <OptionGrid role="radiogroup" aria-label={t('requestVisit.question')}>
            {VISIT_TYPES.map(({ value, labelKey, icon: Icon }) => (
              <OptionLabel key={value} $checked={type === value}>
                <input
                  type="radio"
                  name="visit-type"
                  value={value}
                  checked={type === value}
                  onChange={() => setType(value)}
                />
                <Icon size={20} aria-hidden="true" />
                {tCommon(`visitType.${labelKey}`)}
              </OptionLabel>
            ))}
          </OptionGrid>
        </Fieldset>

        {error && (
          <p role="alert" style={{ color: '#f87171', marginBottom: 16 }}>
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting} fullWidth>
          {submitting ? t('requestVisit.submitting') : t('requestVisit.submit')}
        </Button>
      </FormCard>
    </Layout>
  );
}
