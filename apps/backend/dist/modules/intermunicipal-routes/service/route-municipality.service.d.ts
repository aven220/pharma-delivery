export declare class RouteMunicipalityService {
    list(page?: number, limit?: number, search?: string, activeOnly?: boolean): Promise<{
        data: {
            code: string | null;
            name: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    create(input: {
        name: string;
        code?: string;
    }): Promise<{
        code: string | null;
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
    }>;
    update(id: string, input: {
        name?: string;
        code?: string;
    }): Promise<{
        code: string | null;
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
    }>;
    setActive(id: string, isActive: boolean): Promise<{
        code: string | null;
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
    }>;
}
export declare const routeMunicipalityService: RouteMunicipalityService;
