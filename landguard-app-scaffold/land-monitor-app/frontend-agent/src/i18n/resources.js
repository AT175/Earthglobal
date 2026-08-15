// Agent app translation strings. "common" namespace (status, visitType, nav)
// comes from @earthglobal/design-system.
export default {
  en: {
    app: {
      visitList: {
        title: 'My Assigned Visits',
        empty: 'No visits assigned yet.',
        requested: 'Requested {{date}}',
      },
      visitDetail: {
        notFound: 'Visit request not found.',
        updateStatus: 'Update status',
        uploadPrompt: 'Tap to upload photos or video for this visit',
        uploading: 'Uploading...',
        markCompleted: 'Mark visit as completed',
        visitLabel: '{{type}} visit',
      },
    },
  },
  es: {
    app: {
      visitList: {
        title: 'Mis visitas asignadas',
        empty: 'Aún no tienes visitas asignadas.',
        requested: 'Solicitado el {{date}}',
      },
      visitDetail: {
        notFound: 'Solicitud de visita no encontrada.',
        updateStatus: 'Actualizar estado',
        uploadPrompt: 'Toca para subir fotos o video de esta visita',
        uploading: 'Subiendo...',
        markCompleted: 'Marcar visita como completada',
        visitLabel: 'Visita de {{type}}',
      },
    },
  },
};
