import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ApiKeyGuard } from '../auth/api-key.guard';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @UseGuards(ApiKeyGuard)
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('top-courses')
  @UseGuards(ApiKeyGuard)
  getTopCourses() {
    return this.analyticsService.getTopCourses();
  }

  @Get('activity')
  @UseGuards(ApiKeyGuard)
  getActivity() {
    return this.analyticsService.getRecentActivity();
  }
}


