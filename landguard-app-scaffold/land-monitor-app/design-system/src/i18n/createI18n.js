import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

/**
 * Shared i18next factory used by all three EarthGlobal apps.
 * Each app passes its own `resources` (namespaced translation strings) and
 * `common` design-system strings (nav labels, status badges, etc.) get merged in
 * automatically so terms like "Verified"/"Unverified" stay consistent everywhere.
 *
 * Usage (in an app's entry point, before rendering <App />):
 *   import { createI18n } from '@earthglobal/design-system';
 *   import ownerResources from './i18n/resources';
 *   createI18n(ownerResources);
 */
export function createI18n(appResources = {}, options = {}) {
  const mergedResources = mergeResources(commonResources, appResources);

  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: mergedResources,
      fallbackLng: 'en',
      ns: ['common', 'app'],
      defaultNS: 'app',
      interpolation: { escapeValue: false }, // React already escapes
      detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
      ...options,
    });

  return i18n;
}

function mergeResources(common, app) {
  const languages = new Set([...Object.keys(common), ...Object.keys(app)]);
  const merged = {};
  for (const lng of languages) {
    merged[lng] = {
      common: common[lng]?.common || {},
      app: app[lng]?.app || {},
    };
  }
  return merged;
}

// Strings shared across Owner/Agent/Admin — status labels, visit types, nav.
// Keep this small and only for terms that must read identically everywhere.
export const commonResources = {
  en: {
    common: {
      status: {
        pending: 'Pending',
        assigned: 'Assigned',
        in_progress: 'In progress',
        completed: 'Completed',
        cancelled: 'Cancelled',
        verified: 'Verified',
        unverified: 'Unverified',
      },
      visitType: {
        photo: 'Photos',
        video: 'Video',
        live: 'Live call',
      },
      nav: {
        dashboard: 'Dashboard',
        notifications: 'Notifications',
        settings: 'Settings',
        myVisits: 'My Visits',
        profile: 'Profile',
        parcelOnboarding: 'Parcel Onboarding',
        agents: 'Agents',
        parcels: 'Parcels',
        validation: 'Validation',
        sell: 'Sell Land',
      },
      tagline: 'See it. Check it. Secure it.',
      realtime: {
        live: 'Live',
        reconnecting: 'Reconnecting…',
        dismissAlert: 'Dismiss alert',
      },
    },
  },
  es: {
    common: {
      status: {
        pending: 'Pendiente',
        assigned: 'Asignado',
        in_progress: 'En progreso',
        completed: 'Completado',
        cancelled: 'Cancelado',
        verified: 'Verificado',
        unverified: 'Sin verificar',
      },
      visitType: {
        photo: 'Fotos',
        video: 'Video',
        live: 'Llamada en vivo',
      },
      nav: {
        dashboard: 'Panel',
        notifications: 'Notificaciones',
        settings: 'Ajustes',
        myVisits: 'Mis visitas',
        profile: 'Perfil',
        parcelOnboarding: 'Registrar parcela',
        agents: 'Agentes',
        parcels: 'Parcelas',
        validation: 'Validación',
        sell: 'Vender terreno',
      },
      tagline: 'Obsérvalo. Compruébalo. Protégelo.',
      realtime: {
        live: 'En vivo',
        reconnecting: 'Reconectando…',
        dismissAlert: 'Descartar alerta',
      },
    },
  },
};

export default createI18n;
