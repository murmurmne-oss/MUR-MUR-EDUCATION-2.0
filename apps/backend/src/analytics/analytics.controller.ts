import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('top-courses')
  getTopCourses() {
    return this.analyticsService.getTopCourses();
  }

  @Get('activity')
  getActivity() {
    return this.analyticsService.getRecentActivity();
  }
}

