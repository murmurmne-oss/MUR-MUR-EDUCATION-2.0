-- CreateEnum
CREATE TYPE "CourseAccessCodeStatus" AS ENUM ('AVAILABLE', 'REDEEMED', 'REVOKED');

-- CreateTable
CREATE TABLE "CourseAccessCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" "CourseAccessCodeStatus" NOT NULL DEFAULT 'AVAILABLE',
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "activatedById" TEXT,
    CONSTRAINT "CourseAccessCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseAccessCode_code_key" ON "CourseAccessCode"("code");

-- CreateIndex
CREATE INDEX "CourseAccessCode_courseId_idx" ON "CourseAccessCode"("courseId");

-- AddForeignKey
ALTER TABLE "CourseAccessCode" ADD CONSTRAINT "CourseAccessCode_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseAccessCode" ADD CONSTRAINT "CourseAccessCode_activatedById_fkey" FOREIGN KEY ("activatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

