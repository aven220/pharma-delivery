export declare function generateHash(...parts: (string | number | null | undefined)[]): string;
export declare function generateDeliveryNumber(prefix?: string): string;
export declare function paginate(page: number, limit: number): {
    skip: number;
    take: number;
    page: number;
    limit: number;
};
export declare function buildPaginationMeta(total: number, page: number, limit: number): {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};
export declare function sanitizePhone(phone: string): string;
export declare function isValidCoordinates(lat: number, lng: number): boolean;
export declare function sleep(ms: number): Promise<void>;
export declare function chunkArray<T>(array: T[], size: number): T[][];
