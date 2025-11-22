-- AlterTable
ALTER TABLE "Lesson" DROP COLUMN IF EXISTS "status";

-- DropEnum
DROP TYPE IF EXISTS "LessonStatus";

