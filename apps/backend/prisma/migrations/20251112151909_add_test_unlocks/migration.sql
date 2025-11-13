-- AlterTable
ALTER TABLE "CourseTest" ADD COLUMN     "unlockLessonId" TEXT,
ADD COLUMN     "unlockModuleId" TEXT;

-- AddForeignKey
ALTER TABLE "CourseTest" ADD CONSTRAINT "CourseTest_unlockModuleId_fkey" FOREIGN KEY ("unlockModuleId") REFERENCES "CourseModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseTest" ADD CONSTRAINT "CourseTest_unlockLessonId_fkey" FOREIGN KEY ("unlockLessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
