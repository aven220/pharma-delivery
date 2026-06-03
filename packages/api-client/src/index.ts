import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse, AuthTokens, UserDTO } from '@pharma/types';

export interface ApiClientConfig {
  baseURL: string;
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: (tokens: AuthTokens) => void;
  onUnauthorized?: () => void;
}

export class PharmaApiClient {
  private client: AxiosInstance;
  private refreshing = false;
  private refreshQueue: Array<(token: string) => void> = [];

  constructor(private config: ApiClientConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.client.interceptors.request.use((req: InternalAxiosRequestConfig) => {
      const token = config.getAccessToken();
      if (token && req.headers) {
        req.headers.Authorization = `Bearer ${token}`;
      }
      return req;
    });

    this.client.interceptors.response.use(
      (res) => res,
      async (error: AxiosError) => {
        const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        if (error.response?.status === 401 && !original._retry) {
          original._retry = true;
          const refreshToken = config.getRefreshToken();
          if (!refreshToken) {
            config.onUnauthorized?.();
            return Promise.reject(error);
          }
          try {
            const newToken = await this.refreshAccessToken(refreshToken);
            if (original.headers) {
              original.headers.Authorization = `Bearer ${newToken}`;
            }
            return this.client(original);
          } catch {
            config.onUnauthorized?.();
            return Promise.reject(error);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(refreshToken: string): Promise<string> {
    if (this.refreshing) {
      return new Promise((resolve) => this.refreshQueue.push(resolve));
    }
    this.refreshing = true;
    try {
      const { data } = await axios.post<ApiResponse<AuthTokens>>(
        `${this.config.baseURL}/api/auth/refresh`,
        { refreshToken }
      );
      const tokens = data.data!;
      this.config.setTokens(tokens);
      this.refreshQueue.forEach((cb) => cb(tokens.accessToken));
      this.refreshQueue = [];
      return tokens.accessToken;
    } finally {
      this.refreshing = false;
    }
  }

  get axios() {
    return this.client;
  }

  async login(email: string, password: string) {
    const { data } = await this.client.post<ApiResponse<{ user: UserDTO; tokens: AuthTokens }>>(
      '/api/auth/login',
      { email, password }
    );
    return data.data!;
  }

  async logout(refreshToken: string) {
    await this.client.post('/api/auth/logout', { refreshToken });
  }

  async getMe() {
    const { data } = await this.client.get<ApiResponse<UserDTO>>('/api/auth/me');
    return data.data!;
  }
}

export function createApiClient(config: ApiClientConfig): PharmaApiClient {
  return new PharmaApiClient(config);
}
