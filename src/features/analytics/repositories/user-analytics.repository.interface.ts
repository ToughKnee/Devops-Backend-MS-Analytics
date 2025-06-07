export interface GrowthDataPoint {
  date: string;
  count: number;
}

export interface UserGrowthQueryParams {
  startDate: string;
  endDate: string;
  interval: 'daily' | 'weekly' | 'monthly';
}

export interface IUserAnalyticsRepository {
  getTotalUsers(): Promise<number>;
  getTotalActiveUsers(): Promise<number>;
  getUserGrowthData(params: UserGrowthQueryParams): Promise<GrowthDataPoint[]>;
}