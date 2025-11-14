import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import {
  UsersService,
  type ProgressUpdateInput,
  type ReminderInput,
  type SyncUserInput,
} from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getUsers() {
    return this.usersService.findAll();
  }

  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Get(':id/enrollments')
  getUserEnrollments(@Param('id') id: string) {
    return this.usersService.findEnrollments(id);
  }

  @Put(':id/reminder')
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
