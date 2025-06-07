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
      // Get total and active users counts
      const totalUsers = await this.repository.getTotalUsers();
      const totalActiveUsers = await this.repository.getTotalActiveUsers();
      
      // Get growth data from repository
      const growthData = await this.repository.getUserGrowthData({
        startDate: query.startDate!,
        endDate: query.endDate!,
        interval: query.interval || 'daily'
      });
      
      // Generate the cumulative series
      const series: GrowthDataPoint[] = [];
      
      // For daily interval, ensure all dates are included
      if (query.interval === 'daily') {
        // Create map of dates from the query results
        const dateMap = new Map<string, number>();
        growthData.forEach(item => {
          dateMap.set(item.date, item.count);
        });
        
        let cumulativeCount = 0;
        const start = new Date(query.startDate!);
        const end = new Date(query.endDate!);
        
        for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          const count = dateMap.get(dateStr) || 0;
          cumulativeCount += count;
          series.push({
            date: dateStr,
            count: cumulativeCount
          });
        }
      } 
      // For weekly or monthly, calculate cumulative counts
      else {
        let cumulativeCount = 0;
        growthData.forEach(item => {
          cumulativeCount += item.count;
          series.push({
            date: item.date,
            count: cumulativeCount
          });
        });
      }
      
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
}