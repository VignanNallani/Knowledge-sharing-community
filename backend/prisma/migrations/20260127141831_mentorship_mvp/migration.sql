/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Activity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Booking` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Comment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CommentLike` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Conversation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ConversationMember` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Event` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EventAttendee` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Follower` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Like` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Meeting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Message` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Post` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PostTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Report` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Slot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Tag` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `topic` on table `Mentorship` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."Activity" DROP CONSTRAINT "Activity_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Booking" DROP CONSTRAINT "Booking_menteeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Booking" DROP CONSTRAINT "Booking_slotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Comment" DROP CONSTRAINT "Comment_authorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Comment" DROP CONSTRAINT "Comment_parentCommentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Comment" DROP CONSTRAINT "Comment_postId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CommentLike" DROP CONSTRAINT "CommentLike_commentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CommentLike" DROP CONSTRAINT "CommentLike_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ConversationMember" DROP CONSTRAINT "ConversationMember_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ConversationMember" DROP CONSTRAINT "ConversationMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Event" DROP CONSTRAINT "Event_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."EventAttendee" DROP CONSTRAINT "EventAttendee_eventId_fkey";

-- DropForeignKey
ALTER TABLE "public"."EventAttendee" DROP CONSTRAINT "EventAttendee_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Follower" DROP CONSTRAINT "Follower_followerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Follower" DROP CONSTRAINT "Follower_followingId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Like" DROP CONSTRAINT "Like_postId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Like" DROP CONSTRAINT "Like_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Meeting" DROP CONSTRAINT "Meeting_slotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Message" DROP CONSTRAINT "Message_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Message" DROP CONSTRAINT "Message_senderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Post" DROP CONSTRAINT "Post_authorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PostTag" DROP CONSTRAINT "PostTag_postId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PostTag" DROP CONSTRAINT "PostTag_tagId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Report" DROP CONSTRAINT "Report_postId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Report" DROP CONSTRAINT "Report_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Slot" DROP CONSTRAINT "Slot_mentorId_fkey";

-- AlterTable
ALTER TABLE "Mentorship" ALTER COLUMN "topic" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "deletedAt",
DROP COLUMN "isActive";

-- DropTable
DROP TABLE "public"."Activity";

-- DropTable
DROP TABLE "public"."Booking";

-- DropTable
DROP TABLE "public"."Comment";

-- DropTable
DROP TABLE "public"."CommentLike";

-- DropTable
DROP TABLE "public"."Conversation";

-- DropTable
DROP TABLE "public"."ConversationMember";

-- DropTable
DROP TABLE "public"."Event";

-- DropTable
DROP TABLE "public"."EventAttendee";

-- DropTable
DROP TABLE "public"."Follower";

-- DropTable
DROP TABLE "public"."Like";

-- DropTable
DROP TABLE "public"."Meeting";

-- DropTable
DROP TABLE "public"."Message";

-- DropTable
DROP TABLE "public"."Post";

-- DropTable
DROP TABLE "public"."PostTag";

-- DropTable
DROP TABLE "public"."Report";

-- DropTable
DROP TABLE "public"."Slot";

-- DropTable
DROP TABLE "public"."Tag";

-- DropEnum
DROP TYPE "public"."ActivityType";

-- DropEnum
DROP TYPE "public"."MeetingStatus";

-- DropEnum
DROP TYPE "public"."PostStatus";

-- DropEnum
DROP TYPE "public"."SlotStatus";
