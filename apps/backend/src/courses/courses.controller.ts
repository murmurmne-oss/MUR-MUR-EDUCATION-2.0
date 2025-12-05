import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { ApiKeyGuard } from '../auth/api-key.guard';
import type {
  CourseInput,
  EnrollCourseInput,
  GenerateAccessCodeInput,
  RedeemAccessCodeInput,
  StartTestInput,
  SubmitTestInput,
  StartFormInput,
  SubmitFormInput,
} from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  getCourses() {
    return this.coursesService.findAll();
  }

  @Get(':idOrSlug')
  getCourse(
    @Param('idOrSlug') idOrSlug: string,
    @Query('userId') userId?: string,
  ) {
    return this.coursesService.findOne(idOrSlug, userId);
  }

  @Post()
  @UseGuards(ApiKeyGuard)
  createCourse(@Body() body: CourseInput) {
    return this.coursesService.create(body);
  }

  @Put(':idOrSlug')
  @UseGuards(ApiKeyGuard)
  updateCourse(@Param('idOrSlug') idOrSlug: string, @Body() body: CourseInput) {
    return this.coursesService.update(idOrSlug, body);
  }

  @Delete(':idOrSlug')
  @UseGuards(ApiKeyGuard)
  deleteCourse(@Param('idOrSlug') idOrSlug: string) {
    return this.coursesService.remove(idOrSlug);
  }

  @Post(':idOrSlug/enroll')
  enrollCourse(
    @Param('idOrSlug') idOrSlug: string,
    @Body() body: EnrollCourseInput,
  ) {
    return this.coursesService.enrollUser(idOrSlug, body);
  }

  @Get(':idOrSlug/access-codes')
  @UseGuards(ApiKeyGuard)
  listAccessCodes(@Param('idOrSlug') idOrSlug: string) {
    return this.coursesService.listAccessCodes(idOrSlug);
  }

  @Post(':idOrSlug/access-codes')
  @UseGuards(ApiKeyGuard)
  generateAccessCode(
    @Param('idOrSlug') idOrSlug: string,
    @Body() body: GenerateAccessCodeInput,
  ) {
    return this.coursesService.generateAccessCode(idOrSlug, body);
  }

  @Post('redeem-code')
  redeemAccessCodeByCode(@Body() body: RedeemAccessCodeInput) {
    return this.coursesService.redeemAccessCodeByCode(body);
  }

  @Post(':idOrSlug/redeem-code')
  redeemAccessCode(
    @Param('idOrSlug') idOrSlug: string,
    @Body() body: RedeemAccessCodeInput,
  ) {
    return this.coursesService.redeemAccessCode(idOrSlug, body);
  }

  @Post(':idOrSlug/tests/:testId/start')
  startTest(
    @Param('idOrSlug') idOrSlug: string,
    @Param('testId') testId: string,
    @Body() body: StartTestInput,
  ) {
    return this.coursesService.startTest(idOrSlug, testId, body);
  }

  @Post(':idOrSlug/tests/:testId/submit')
  submitTest(
    @Param('idOrSlug') idOrSlug: string,
    @Param('testId') testId: string,
    @Body() body: SubmitTestInput,
  ) {
    return this.coursesService.submitTest(idOrSlug, testId, body);
  }

  @Post(':idOrSlug/forms/:formId/start')
  startForm(
    @Param('idOrSlug') idOrSlug: string,
    @Param('formId') formId: string,
    @Body() body: StartFormInput,
  ) {
    return this.coursesService.startForm(idOrSlug, formId, body);
  }

  @Post(':idOrSlug/forms/:formId/submit')
  submitForm(
    @Param('idOrSlug') idOrSlug: string,
    @Param('formId') formId: string,
    @Body() body: SubmitFormInput,
  ) {
    return this.coursesService.submitForm(idOrSlug, formId, body);
  }

  @Get(':idOrSlug/forms/:formId/statistics')
  getFormStatistics(
    @Param('idOrSlug') idOrSlug: string,
    @Param('formId') formId: string,
    @Query('resultId') resultId: string,
  ) {
    if (!resultId) {
      throw new BadRequestException('resultId is required');
    }
    return this.coursesService.getFormResultStatistics(idOrSlug, formId, resultId);
  }

  @Get(':idOrSlug/tests/:testId/statistics')
  getTestStatistics(
    @Param('idOrSlug') idOrSlug: string,
    @Param('testId') testId: string,
    @Query('percent') percent: string,
  ) {
    const percentNum = parseFloat(percent);
    if (isNaN(percentNum) || percentNum < 0 || percentNum > 100) {
      throw new BadRequestException('percent must be a number between 0 and 100');
    }
    return this.coursesService.getTestResultStatistics(idOrSlug, testId, percentNum);
  }

  @Get('user/:userId/results')
  getUserResults(@Param('userId') userId: string) {
    return this.coursesService.getUserResults(userId);
  }
}
