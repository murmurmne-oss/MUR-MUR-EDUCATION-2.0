import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { CoursesService } from './courses.service';
import type {
  CourseInput,
  EnrollCourseInput,
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

  @Post(':idOrSlug/enroll')
  enrollCourse(
    @Param('idOrSlug') idOrSlug: string,
    @Body() body: EnrollCourseInput,
  ) {
    return this.coursesService.enrollUser(idOrSlug, body);
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
