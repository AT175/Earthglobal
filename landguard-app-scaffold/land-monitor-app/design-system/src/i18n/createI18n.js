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
  const supportedLngs = Object.keys(mergedResources);

  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: mergedResources,
      supportedLngs,
      fallbackLng: 'en',
      load: 'languageOnly',
      cleanCode: true,
      ns: ['common', 'app'],
      defaultNS: 'app',
      interpolation: { escapeValue: false }, // React already escapes
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
        convertDetectedLanguage: (lng) => lng.split('-')[0],
      },
      // Return the last segment of the key (after final dot) instead of the
      // full dotted key path when a translation is missing.  e.g. "dashboard.title"
      // → "title" rather than showing the raw dotted path in the UI.
      parseMissingKeyHandler: (key) => {
        const parts = key.split('.');
        return parts[parts.length - 1];
      },
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
        available: 'Available',
        profile: 'Profile',
        parcelOnboarding: 'Parcel Onboarding',
        agents: 'Agents',
        parcels: 'Parcels',
        validation: 'Validation',
        sell: 'Sell Land',
        pricing: 'Subscribe',
        sitePlans: 'Site Plans',
        logout: 'Logout',
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
        available: 'Disponible',
        profile: 'Perfil',
        parcelOnboarding: 'Registrar parcela',
        agents: 'Agentes',
        parcels: 'Parcelas',
        validation: 'Validación',
        sell: 'Vender terreno',
        pricing: 'Suscribirse',
        sitePlans: 'Planos de sitio',
        logout: 'Cerrar sesión',
      },
      tagline: 'Obsérvalo. Compruébalo. Protégelo.',
      realtime: {
        live: 'En vivo',
        reconnecting: 'Reconectando…',
        dismissAlert: 'Descartar alerta',
      },
    },
  },
  fr: {
    common: {
      status: {
        pending: 'En attente',
        assigned: 'Assigné',
        in_progress: 'En cours',
        completed: 'Terminé',
        cancelled: 'Annulé',
        verified: 'Vérifié',
        unverified: 'Non vérifié',
      },
      visitType: {
        photo: 'Photos',
        video: 'Vidéo',
        live: 'Appel en direct',
      },
      nav: {
        dashboard: 'Tableau de bord',
        notifications: 'Notifications',
        settings: 'Paramètres',
        myVisits: 'Mes visites',
        available: 'Disponible',
        profile: 'Profil',
        parcelOnboarding: 'Enregistrement de parcelle',
        agents: 'Agents',
        parcels: 'Parcelles',
        validation: 'Validation',
        sell: 'Vendre des terres',
        pricing: "S'abonner",
        sitePlans: "Plans d'aménagement",
        logout: 'Déconnexion',
      },
      tagline: 'Voyez-le. Vérifiez-le. Protégez-le.',
      realtime: {
        live: 'En direct',
        reconnecting: 'Reconnexion…',
        dismissAlert: 'Ignorer l\'alerte',
      },
    },
  },
  pt: {
    common: {
      status: {
        pending: 'Pendente',
        assigned: 'Atribuído',
        in_progress: 'Em andamento',
        completed: 'Concluído',
        cancelled: 'Cancelado',
        verified: 'Verificado',
        unverified: 'Não verificado',
      },
      visitType: {
        photo: 'Fotos',
        video: 'Vídeo',
        live: 'Chamada ao vivo',
      },
      nav: {
        dashboard: 'Painel',
        notifications: 'Notificações',
        settings: 'Configurações',
        myVisits: 'Minhas visitas',
        available: 'Disponível',
        profile: 'Perfil',
        parcelOnboarding: 'Registro de parcela',
        agents: 'Agentes',
        parcels: 'Parcelas',
        validation: 'Validação',
        sell: 'Vender terreno',
        pricing: 'Assinar',
        sitePlans: 'Planos do local',
        logout: 'Sair',
      },
      tagline: 'Veja. Verifique. Proteja.',
      realtime: {
        live: 'Ao vivo',
        reconnecting: 'Reconectando…',
        dismissAlert: 'Descartar alerta',
      },
    },
  },
  sw: {
    common: {
      status: {
        pending: 'Inasubiri',
        assigned: 'Imekabidhiwa',
        in_progress: 'Inaendelea',
        completed: 'Imekamilika',
        cancelled: 'Imefutwa',
        verified: 'Imethibitishwa',
        unverified: 'Haijathibitishwa',
      },
      visitType: {
        photo: 'Picha',
        video: 'Video',
        live: 'Simu ya moja kwa moja',
      },
      nav: {
        dashboard: 'Dashibodi',
        notifications: 'Arifa',
        settings: 'Mipangilio',
        myVisits: 'Matembezi yangu',
        available: 'Inapatikana',
        profile: 'Wasifu',
        parcelOnboarding: 'Usajili wa kipande cha ardhi',
        agents: 'Mawakala',
        parcels: 'Vipande vya ardhi',
        validation: 'Uthibitishaji',
        sell: 'Uza ardhi',
        pricing: 'Jiunge',
        sitePlans: 'Mpango wa eneo',
        logout: 'Toka',
      },
      tagline: 'Liona. Kagua. Linda.',
      realtime: {
        live: 'Moja kwa moja',
        reconnecting: 'Inaunganisha tena…',
        dismissAlert: 'Futa arifa',
      },
    },
  },
  ar: {
    common: {
      status: {
        pending: 'قيد الانتظار',
        assigned: 'مُسند',
        in_progress: 'قيد التنفيذ',
        completed: 'مكتمل',
        cancelled: 'ملغى',
        verified: 'مُوثَّق',
        unverified: 'غير مُوثَّق',
      },
      visitType: {
        photo: 'صور',
        video: 'فيديو',
        live: 'مكالمة مباشرة',
      },
      nav: {
        dashboard: 'لوحة التحكم',
        notifications: 'الإشعارات',
        settings: 'الإعدادات',
        myVisits: 'زياراتي',
        available: 'متاح',
        profile: 'الملف الشخصي',
        parcelOnboarding: 'تسجيل قطعة أرض',
        agents: 'الوكلاء',
        parcels: 'قطع الأراضي',
        validation: 'التحقق',
        sell: 'بيع الأراضي',
        pricing: 'اشترك',
        sitePlans: 'مخططات الموقع',
        logout: 'تسجيل الخروج',
      },
      tagline: 'شاهدها. تحقق منها. احمِها.',
      realtime: {
        live: 'مباشر',
        reconnecting: 'إعادة الاتصال…',
        dismissAlert: 'تجاهل التنبيه',
      },
    },
  },
};

export default createI18n;
