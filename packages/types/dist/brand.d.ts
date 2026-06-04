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
export declare const BrandConfig: BrandConfigType;
