"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PharmaApiClient = void 0;
exports.createApiClient = createApiClient;
const axios_1 = __importDefault(require("axios"));
class PharmaApiClient {
    config;
    client;
    refreshing = false;
    refreshQueue = [];
    constructor(config) {
        this.config = config;
        this.client = axios_1.default.create({
            baseURL: config.baseURL,
            timeout: 30000,
            headers: { 'Content-Type': 'application/json' },
        });
        this.client.interceptors.request.use((req) => {
            const token = config.getAccessToken();
            if (token && req.headers) {
                req.headers.Authorization = `Bearer ${token}`;
            }
            return req;
        });
        this.client.interceptors.response.use((res) => res, async (error) => {
            const original = error.config;
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
                }
                catch {
                    config.onUnauthorized?.();
                    return Promise.reject(error);
                }
            }
            return Promise.reject(error);
        });
    }
    async refreshAccessToken(refreshToken) {
        if (this.refreshing) {
            return new Promise((resolve) => this.refreshQueue.push(resolve));
        }
        this.refreshing = true;
        try {
            const { data } = await axios_1.default.post(`${this.config.baseURL}/api/auth/refresh`, { refreshToken });
            const tokens = data.data;
            this.config.setTokens(tokens);
            this.refreshQueue.forEach((cb) => cb(tokens.accessToken));
            this.refreshQueue = [];
            return tokens.accessToken;
        }
        finally {
            this.refreshing = false;
        }
    }
    get axios() {
        return this.client;
    }
    async login(email, password) {
        const { data } = await this.client.post('/api/auth/login', { email, password });
        return data.data;
    }
    async logout(refreshToken) {
        await this.client.post('/api/auth/logout', { refreshToken });
    }
    async getMe() {
        const { data } = await this.client.get('/api/auth/me');
        return data.data;
    }
}
exports.PharmaApiClient = PharmaApiClient;
function createApiClient(config) {
    return new PharmaApiClient(config);
}
