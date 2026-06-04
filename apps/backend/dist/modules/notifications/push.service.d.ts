export declare function sendExpoPush(input: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
}): Promise<{
    sent: boolean;
    reason: string;
    ticket?: undefined;
} | {
    sent: boolean;
    ticket: import("expo-server-sdk").ExpoPushTicket;
    reason?: undefined;
}>;
