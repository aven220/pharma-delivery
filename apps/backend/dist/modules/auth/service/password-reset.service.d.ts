export declare class PasswordResetService {
    requestReset(email: string, ipAddress?: string): Promise<{
        devResetUrl?: string | undefined;
        message: string;
    }>;
    resetPassword(token: string, newPassword: string, ipAddress?: string): Promise<{
        message: string;
    }>;
}
export declare const passwordResetService: PasswordResetService;
