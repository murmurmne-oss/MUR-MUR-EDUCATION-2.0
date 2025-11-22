-- CreateEnum
CREATE TYPE "FormType" AS ENUM ('CHOICE', 'RATING');

-- AlterTable
ALTER TABLE "CourseForm" ADD COLUMN "type" "FormType" NOT NULL DEFAULT 'CHOICE';
ALTER TABLE "CourseForm" ADD COLUMN "maxRating" INTEGER;

