/** Configuración de marca — web admin (sincronizar con packages/types/src/brand.ts) */
export const BrandConfig = {
  appName: 'A-AS Delivery',
  shortName: 'A-AS',
  version: '1.0.0',
  logo: null as string | null,
  colors: {
    primary: '#2563eb',
    secondary: '#1e40af',
    accent: '#0ea5e9',
  },
  adminTitle: 'A-AS Delivery Admin',
  mobileSubtitle: 'App de entregas',
  reportHeader: 'A-AS Delivery',
  notificationPrefix: 'A-AS Delivery',
} as const;
