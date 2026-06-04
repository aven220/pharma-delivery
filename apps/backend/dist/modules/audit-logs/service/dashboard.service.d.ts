import type { DashboardStats } from '@pharma/types';
export declare class DashboardService {
    getStats(): Promise<DashboardStats>;
    private groupByDay;
    private groupByWeek;
    private getMonthlyStats;
}
export declare const dashboardService: DashboardService;
