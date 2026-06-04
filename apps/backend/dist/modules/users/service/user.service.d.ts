import { UserStatus } from '@prisma/client';
export declare class UserService {
    list(filters: {
        page: number;
        limit: number;
        search?: string;
        status?: UserStatus;
        roleId?: string;
    }): Promise<{
        data: {
            status: import(".prisma/client").$Enums.UserStatus;
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            phone: string | null;
            documentId: string | null;
            operationalType: import(".prisma/client").$Enums.OperationalType;
            roleId: string;
            lastLoginAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            role: {
                name: string;
                id: string;
                description: string | null;
            };
            operatorProfile: {
                code: string;
                id: string;
            } | null;
            courierProfile: {
                code: string;
                id: string;
            } | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getById(id: string): Promise<{
        status: import(".prisma/client").$Enums.UserStatus;
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        documentId: string | null;
        operationalType: import(".prisma/client").$Enums.OperationalType;
        roleId: string;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        role: {
            name: string;
            id: string;
            description: string | null;
        };
        operatorProfile: {
            code: string;
            id: string;
        } | null;
        courierProfile: {
            code: string;
            id: string;
        } | null;
    }>;
    create(input: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        phone?: string;
        documentId?: string;
        roleId: string;
        operationalType?: 'DOMICILIARIO' | 'CONDUCTOR_RUTA';
    }): Promise<{
        status: import(".prisma/client").$Enums.UserStatus;
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        documentId: string | null;
        operationalType: import(".prisma/client").$Enums.OperationalType;
        roleId: string;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        role: {
            name: string;
            id: string;
            description: string | null;
        };
        operatorProfile: {
            code: string;
            id: string;
        } | null;
        courierProfile: {
            code: string;
            id: string;
        } | null;
    }>;
    update(id: string, input: {
        email?: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
        documentId?: string;
        roleId?: string;
        status?: UserStatus;
        operationalType?: 'DOMICILIARIO' | 'CONDUCTOR_RUTA';
    }): Promise<{
        status: import(".prisma/client").$Enums.UserStatus;
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        documentId: string | null;
        operationalType: import(".prisma/client").$Enums.OperationalType;
        roleId: string;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        role: {
            name: string;
            id: string;
            description: string | null;
        };
        operatorProfile: {
            code: string;
            id: string;
        } | null;
        courierProfile: {
            code: string;
            id: string;
        } | null;
    }>;
    changeStatus(id: string, status: UserStatus): Promise<{
        status: import(".prisma/client").$Enums.UserStatus;
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        documentId: string | null;
        operationalType: import(".prisma/client").$Enums.OperationalType;
        roleId: string;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        role: {
            name: string;
            id: string;
            description: string | null;
        };
        operatorProfile: {
            code: string;
            id: string;
        } | null;
        courierProfile: {
            code: string;
            id: string;
        } | null;
    }>;
    resetPassword(id: string, password: string): Promise<{
        message: string;
    }>;
    softDelete(id: string): Promise<{
        status: import(".prisma/client").$Enums.UserStatus;
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        documentId: string | null;
        operationalType: import(".prisma/client").$Enums.OperationalType;
        roleId: string;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        role: {
            name: string;
            id: string;
            description: string | null;
        };
        operatorProfile: {
            code: string;
            id: string;
        } | null;
        courierProfile: {
            code: string;
            id: string;
        } | null;
    }>;
    private syncRoleProfiles;
}
export declare const userService: UserService;
