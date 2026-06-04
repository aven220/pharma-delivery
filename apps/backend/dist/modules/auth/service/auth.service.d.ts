import type { AuthTokens, UserDTO } from '@pharma/types';
export declare class AuthRepository {
    findByEmail(email: string): Promise<({
        role: {
            permissions: ({
                permission: {
                    code: string;
                    name: string;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    description: string | null;
                    module: string;
                };
            } & {
                roleId: string;
                permissionId: string;
            })[];
        } & {
            name: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            isSystem: boolean;
        };
    } & {
        status: import(".prisma/client").$Enums.UserStatus;
        id: string;
        email: string;
        passwordHash: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        documentId: string | null;
        operationalType: import(".prisma/client").$Enums.OperationalType;
        roleId: string;
        pushToken: string | null;
        lastLoginAt: Date | null;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    findById(id: string): Promise<({
        role: {
            permissions: ({
                permission: {
                    code: string;
                    name: string;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    description: string | null;
                    module: string;
                };
            } & {
                roleId: string;
                permissionId: string;
            })[];
        } & {
            name: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            isSystem: boolean;
        };
    } & {
        status: import(".prisma/client").$Enums.UserStatus;
        id: string;
        email: string;
        passwordHash: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        documentId: string | null;
        operationalType: import(".prisma/client").$Enums.OperationalType;
        roleId: string;
        pushToken: string | null;
        lastLoginAt: Date | null;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<{
        id: string;
        createdAt: Date;
        token: string;
        userId: string;
        expiresAt: Date;
        revokedAt: Date | null;
    }>;
    findRefreshToken(token: string): Promise<({
        user: {
            status: import(".prisma/client").$Enums.UserStatus;
            id: string;
            email: string;
            passwordHash: string;
            firstName: string;
            lastName: string;
            phone: string | null;
            documentId: string | null;
            operationalType: import(".prisma/client").$Enums.OperationalType;
            roleId: string;
            pushToken: string | null;
            lastLoginAt: Date | null;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        createdAt: Date;
        token: string;
        userId: string;
        expiresAt: Date;
        revokedAt: Date | null;
    }) | null>;
    revokeRefreshToken(token: string): Promise<{
        id: string;
        createdAt: Date;
        token: string;
        userId: string;
        expiresAt: Date;
        revokedAt: Date | null;
    }>;
    revokeAllUserTokens(userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    updateLastLogin(userId: string): Promise<{
        status: import(".prisma/client").$Enums.UserStatus;
        id: string;
        email: string;
        passwordHash: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        documentId: string | null;
        operationalType: import(".prisma/client").$Enums.OperationalType;
        roleId: string;
        pushToken: string | null;
        lastLoginAt: Date | null;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export declare class AuthService {
    private repo;
    constructor(repo?: AuthRepository);
    private mapUser;
    private generateTokens;
    login(email: string, password: string): Promise<{
        user: UserDTO;
        tokens: AuthTokens;
    }>;
    refresh(refreshToken: string): Promise<AuthTokens>;
    logout(refreshToken: string): Promise<void>;
    me(userId: string): Promise<UserDTO>;
}
