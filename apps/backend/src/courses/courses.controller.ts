import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import type {
  CourseInput,
  EnrollCourseInput,
  GenerateAccessCodeInput,
  RedeemAccessCodeInput,
  StartTestInput,
  SubmitTestInput,
} from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  getCourses() {
    return this.coursesService.findAll();
  }

  @Get(':idOrSlug')
  getCourse(@Param('idOrSlug') idOrSlug: string) {
    return this.coursesService.findOne(idOrSlug);
  }

  @Post()
  createCourse(@Body() body: CourseInput) {
    return this.coursesService.create(body);
  }

  @Put(':idOrSlug')
  updateCourse(@Param('idOrSlug') idOrSlug: string, @Body() body: CourseInput) {
    return this.coursesService.update(idOrSlug, body);
  }

  @Delete(':idOrSlug')
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
  listAccessCodes(@Param('idOrSlug') idOrSlug: string) {
    return this.coursesService.listAccessCodes(idOrSlug);
  }

  @Post(':idOrSlug/access-codes')
  generateAccessCode(
    @Param('idOrSlug') idOrSlug: string,
    @Body() body: GenerateAccessCodeInput,
  ) {
    return this.coursesService.generateAccessCode(idOrSlug, body);
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
}
