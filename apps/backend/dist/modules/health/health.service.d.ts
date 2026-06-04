export declare function checkLive(): Promise<{
    status: string;
    service: string;
    instance: string;
    timestamp: string;
    uptimeSec: number;
}>;
export declare function checkReady(): Promise<{
    status: string;
    checks: Record<string, "ok" | "fail">;
    instance: string;
    timestamp: string;
}>;
export declare function checkHealth(): Promise<{
    status: string;
    checks: Record<string, "ok" | "fail">;
    instance: string;
    timestamp: string;
}>;
