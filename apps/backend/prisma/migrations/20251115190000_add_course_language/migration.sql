-- CreateEnum
CREATE TYPE "CourseLanguage" AS ENUM ('SR', 'RU');

-- AlterTable
ALTER TABLE "Course"
ADD COLUMN "language" "CourseLanguage" NOT NULL DEFAULT 'SR';

