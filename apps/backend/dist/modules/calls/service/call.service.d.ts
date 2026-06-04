import type { CallResult } from '@prisma/client';
export declare class CallService {
    registerCall(input: {
        deliveryId: string;
        operatorId: string;
        phoneUsed: string;
        result: CallResult;
        durationSec?: number;
        observations?: string;
        newPhone?: string;
        newAddress?: string;
        rescheduleDate?: string;
        rescheduleTime?: string;
    }): Promise<{
        operator: {
            user: {
                firstName: string;
                lastName: string;
            };
        } & {
            code: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
        };
        delivery: {
            deliveryNumber: string;
        };
    } & {
        result: import(".prisma/client").$Enums.CallResult;
        id: string;
        createdAt: Date;
        deliveryId: string;
        observations: string | null;
        durationSec: number | null;
        phoneUsed: string;
        patientId: string;
        operatorId: string;
        newPhone: string | null;
        newAddress: string | null;
        rescheduleDate: Date | null;
        rescheduleTime: string | null;
        calledAt: Date;
    }>;
    list(filters: {
        deliveryId?: string;
        operatorId?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: ({
            operator: {
                user: {
                    firstName: string;
                    lastName: string;
                };
            } & {
                code: string;
                id: string;
                deletedAt: Date | null;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
            };
            patient: {
                firstName: string;
                lastName: string;
                phone: string | null;
            };
            delivery: {
                deliveryNumber: string;
            };
        } & {
            result: import(".prisma/client").$Enums.CallResult;
            id: string;
            createdAt: Date;
            deliveryId: string;
            observations: string | null;
            durationSec: number | null;
            phoneUsed: string;
            patientId: string;
            operatorId: string;
            newPhone: string | null;
            newAddress: string | null;
            rescheduleDate: Date | null;
            rescheduleTime: string | null;
            calledAt: Date;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getEffectivenessStats(dateFrom?: Date, dateTo?: Date): Promise<{
        total: number;
        answered: number;
        effectiveness: number;
        operators: {
            operatorId: string;
            name: string;
            totalCalls: number;
            answered: number;
            effectiveness: number;
        }[];
    }>;
}
export declare const callService: CallService;
