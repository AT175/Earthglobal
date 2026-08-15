// Admin app translation strings. "common" namespace (status, nav) comes from
// @earthglobal/design-system.
export default {
  en: {
    app: {
      onboarding: {
        title: 'Onboard a Parcel',
        liveTab: 'Live GPS Survey',
        importTab: 'File Import',
        liveDescription:
          'Walk the parcel boundary while capturing GPS points. Points are synced to POST /survey-sessions/:id/sync, then finalized into a polygon.',
        startSurvey: 'Start live survey',
        stopSurvey: 'Stop capturing',
        dropPrompt: 'Drop a GeoJSON, KML/KMZ, Shapefile, or GPX file here',
        dropNote: 'GeoJSON import is fully wired; KML/Shapefile/GPX parsing is stubbed server-side.',
      },
      agents: {
        title: 'Agents',
        name: 'Name',
        region: 'Region',
        phone: 'Phone',
        status: 'Status',
        active: 'Active',
        inactive: 'Inactive',
        performance: 'Completed visits by agent',
      },
      parcels: {
        title: 'All Parcels',
        name: 'Name',
        region: 'Region',
        area: 'Area (ha)',
        surveyed: 'Surveyed',
      },
    },
  },
  es: {
    app: {
      onboarding: {
        title: 'Registrar una parcela',
        liveTab: 'Inspección GPS en vivo',
        importTab: 'Importar archivo',
        liveDescription:
          'Camina el perímetro de la parcela mientras capturas puntos GPS. Los puntos se sincronizan con POST /survey-sessions/:id/sync y luego se finalizan como un polígono.',
        startSurvey: 'Iniciar inspección en vivo',
        stopSurvey: 'Detener captura',
        dropPrompt: 'Suelta un archivo GeoJSON, KML/KMZ, Shapefile o GPX aquí',
        dropNote: 'La importación de GeoJSON está lista; KML/Shapefile/GPX están simulados en el servidor.',
      },
      agents: {
        title: 'Agentes',
        name: 'Nombre',
        region: 'Región',
        phone: 'Teléfono',
        status: 'Estado',
        active: 'Activo',
        inactive: 'Inactivo',
        performance: 'Visitas completadas por agente',
      },
      parcels: {
        title: 'Todas las parcelas',
        name: 'Nombre',
        region: 'Región',
        area: 'Área (ha)',
        surveyed: 'Inspeccionado',
      },
    },
  },
};
