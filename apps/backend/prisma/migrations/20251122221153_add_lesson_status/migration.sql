-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('PUBLISHED', 'DRAFT', 'HIDDEN');

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN "status" "LessonStatus" NOT NULL DEFAULT 'DRAFT';

