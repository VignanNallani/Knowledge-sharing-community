/*
  Warnings:

  - You are about to drop the column `image` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `profileImage` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "posts" DROP COLUMN "image",
ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "profileImage",
ADD COLUMN     "profileImageUrl" TEXT;
