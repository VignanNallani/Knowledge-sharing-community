/*
  Warnings:

  - The values [MENTORSHIP_APPROVED] on the enum `ActivityType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
BEGIN;
CREATE TYPE "ActivityType_new" AS ENUM ('POST_CREATED', 'POST_LIKED', 'COMMENT_CREATED', 'EVENT_CREATED', 'EVENT_JOINED', 'USER_FOLLOWED', 'USER_UNFOLLOWED', 'POST_SAVED', 'POST_APPROVED', 'POST_REJECTED');
ALTER TABLE "Activity" ALTER COLUMN "type" TYPE "ActivityType_new" USING ("type"::text::"ActivityType_new");
ALTER TYPE "ActivityType" RENAME TO "ActivityType_old";
ALTER TYPE "ActivityType_new" RENAME TO "ActivityType";
DROP TYPE "public"."ActivityType_old";
COMMIT;

-- DropIndex
DROP INDEX "public"."Activity_type_idx";

-- AlterTable
ALTER TABLE "Like" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "status" "PostStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Activity_entity_entityId_idx" ON "Activity"("entity", "entityId");
