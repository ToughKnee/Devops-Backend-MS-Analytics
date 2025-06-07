import { UserGrowthQueryDto } from '../dto/user-growth-query.dto';
import { InternalServerError } from '../../../utils/errors/api-error';
import { GrowthDataPoint, IUserAnalyticsRepository } from '../repositories/user-analytics.repository.interface';
import { UserAnalyticsRepository } from '../repositories/user-analytics.repository';

interface UserGrowthResponse {
  series: GrowthDataPoint[];
  totalUsers: number;
  totalActiveUsers: number;
  aggregatedByInterval: string;
}

export class UserAnalyticsService {
  private repository: IUserAnalyticsRepository;
  
  constructor(repository?: IUserAnalyticsRepository) {
    this.repository = repository || new UserAnalyticsRepository();
  }
  
  async getUserGrowthStats(query: UserGrowthQueryDto): Promise<UserGrowthResponse> {
    try {
      // Get totals
      const [totalUsers, totalActiveUsers] = await Promise.all([
        this.repository.getTotalUsers(),
        this.repository.getTotalActiveUsers()
      ]);
      
      // Get growth data
      const growthData = await this.repository.getUserGrowthData({
        startDate: query.startDate!,
        endDate: query.endDate!,
        interval: query.interval || 'daily'
      });
      
      // Generate series based on interval
      const series = this.generateCumulativeSeries(growthData, query);
      
      return {
        series,
        totalUsers,
        totalActiveUsers,
        aggregatedByInterval: query.interval || 'daily'
      };
    } catch (error) {
      console.error('Error in user growth stats service:', error);
      throw new InternalServerError('Failed to retrieve user growth statistics');
    }
  }
  
  /**
   * Generates a cumulative series of data points based on the interval
   */
  private generateCumulativeSeries(
    growthData: GrowthDataPoint[], 
    query: UserGrowthQueryDto
  ): GrowthDataPoint[] {
    return query.interval === 'daily' 
      ? this.generateDailyCumulativeSeries(growthData, query.startDate!, query.endDate!)
      : this.generateIntervalCumulativeSeries(growthData);
  }
  
  /**
   * Generates a complete daily series with cumulative counts
   * Ensures all dates in the range have data points, even if zero
   */
  private generateDailyCumulativeSeries(
    data: GrowthDataPoint[], 
    startDate: string, 
    endDate: string
  ): GrowthDataPoint[] {
    const series: GrowthDataPoint[] = [];
    const dateMap = this.createDateCountMap(data);
    
    let cumulativeCount = 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const count = dateMap.get(dateStr) || 0;
      cumulativeCount += count;
      series.push({
        date: dateStr,
        count: cumulativeCount
      });
    }
    
    return series;
  }
  
  /**
   * Generates a cumulative series for weekly or monthly intervals
   */
  private generateIntervalCumulativeSeries(data: GrowthDataPoint[]): GrowthDataPoint[] {
    const series: GrowthDataPoint[] = [];
    let cumulativeCount = 0;
    
    data.forEach(item => {
      cumulativeCount += item.count;
      series.push({
        date: item.date,
        count: cumulativeCount
      });
    });
    
    return series;
  }
  
  /**
   * Creates a Map of dates to count values for efficient lookup
   */
  private createDateCountMap(data: GrowthDataPoint[]): Map<string, number> {
    const dateMap = new Map<string, number>();
    data.forEach(item => {
      dateMap.set(item.date, item.count);
    });
    return dateMap;
  }
}