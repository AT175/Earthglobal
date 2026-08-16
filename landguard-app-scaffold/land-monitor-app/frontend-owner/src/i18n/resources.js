// Owner app translation strings. "common" namespace terms (status, visitType, nav,
// tagline) come from @earthglobal/design-system and are merged in automatically —
// only owner-app-specific copy lives here.
export default {
  en: {
    app: {
      dashboard: {
        title: 'Your Land',
        loading: 'Loading your land...',
        error: 'Unable to load your parcels right now.',
        empty: 'No parcels linked to your account yet.',
        viewParcel: 'View parcel',
        surveyed: 'Surveyed {{date}}',
        surveyedUnknown: 'Surveyed N/A',
        areaByParcel: 'Area by parcel',
        alertTrend: 'Alert history (last 12 months)',
        newAlert: 'New {{type}} alert detected on {{parcel}}',
        unknownParcel: 'Unknown parcel',
      },
      parcelDetail: {
        notFound: 'Parcel not found.',
        requestVisit: 'Request a visit',
        alerts: 'Alerts',
        noAlerts: 'No change alerts detected.',
        detected: 'Detected {{date}}',
        perimeter: '{{value}}m perimeter',
      },
      requestVisit: {
        title: 'Request a Visit',
        question: 'What kind of visit do you need?',
        submit: 'Submit request',
        submitting: 'Submitting...',
        error: 'Something went wrong submitting your request. Please try again.',
      },
    },
  },
  es: {
    app: {
      dashboard: {
        title: 'Tu terreno',
        loading: 'Cargando tu terreno...',
        error: 'No se pueden cargar tus parcelas en este momento.',
        empty: 'Aún no hay parcelas vinculadas a tu cuenta.',
        viewParcel: 'Ver parcela',
        surveyed: 'Inspeccionado el {{date}}',
        surveyedUnknown: 'Inspección: N/D',
        areaByParcel: 'Área por parcela',
        alertTrend: 'Historial de alertas (últimos 12 meses)',
        newAlert: 'Nueva alerta de {{type}} detectada en {{parcel}}',
        unknownParcel: 'Parcela desconocida',
      },
      parcelDetail: {
        notFound: 'Parcela no encontrada.',
        requestVisit: 'Solicitar una visita',
        alerts: 'Alertas',
        noAlerts: 'No se detectaron cambios.',
        detected: 'Detectado el {{date}}',
        perimeter: 'Perímetro de {{value}}m',
      },
      requestVisit: {
        title: 'Solicitar una visita',
        question: '¿Qué tipo de visita necesitas?',
        submit: 'Enviar solicitud',
        submitting: 'Enviando...',
        error: 'Algo salió mal al enviar tu solicitud. Inténtalo de nuevo.',
      },
    },
  },
};
