import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import {
  UsersService,
  type ProgressUpdateInput,
  type ReminderInput,
  type SyncUserInput,
} from './users.service';
import { ApiKeyGuard } from '../auth/api-key.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(ApiKeyGuard)
  getUsers() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard)
  getUser(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Get(':id/enrollments')
  getUserEnrollments(@Param('id') id: string) {
    return this.usersService.findEnrollments(id);
  }

  @Put(':id/reminder')
  @UseGuards(ApiKeyGuard)
  updateReminder(@Param('id') id: string, @Body() body: ReminderInput) {
    return this.usersService.updateReminder(id, body);
  }

  @Post(':id/progress')
  updateProgress(@Param('id') id: string, @Body() body: ProgressUpdateInput) {
    return this.usersService.updateCourseProgress(id, body);
  }

  @Post('sync')
  syncUser(@Body() body: SyncUserInput) {
    return this.usersService.syncUser(body);
  }
}
