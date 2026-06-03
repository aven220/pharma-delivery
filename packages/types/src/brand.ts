export interface BrandConfigType {
  appName: string;
  shortName: string;
  version: string;
  logo: string | null;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  adminTitle: string;
  mobileSubtitle: string;
  reportHeader: string;
  notificationPrefix: string;
}

export const BrandConfig: BrandConfigType = {
  appName: 'A-AS Delivery',
  shortName: 'A-AS',
  version: '1.0.0',
  logo: null,
  colors: {
    primary: '#2563eb',
    secondary: '#1e40af',
    accent: '#0ea5e9',
  },
  adminTitle: 'A-AS Delivery Admin',
  mobileSubtitle: 'App de entregas',
  reportHeader: 'A-AS Delivery',
  notificationPrefix: 'A-AS Delivery',
};
