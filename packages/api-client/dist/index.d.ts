import { AxiosInstance } from 'axios';
import type { AuthTokens, UserDTO } from '@pharma/types';
export interface ApiClientConfig {
    baseURL: string;
    getAccessToken: () => string | null;
    getRefreshToken: () => string | null;
    setTokens: (tokens: AuthTokens) => void;
    onUnauthorized?: () => void;
}
export declare class PharmaApiClient {
    private config;
    private client;
    private refreshing;
    private refreshQueue;
    constructor(config: ApiClientConfig);
    private refreshAccessToken;
    get axios(): AxiosInstance;
    login(email: string, password: string): Promise<{
        user: UserDTO;
        tokens: AuthTokens;
    }>;
    logout(refreshToken: string): Promise<void>;
    getMe(): Promise<UserDTO>;
}
export declare function createApiClient(config: ApiClientConfig): PharmaApiClient;
