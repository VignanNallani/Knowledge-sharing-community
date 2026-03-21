import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  const queries = [
    // Posts table
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN DEFAULT false`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN DEFAULT false`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN DEFAULT false`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS "viewCount" INTEGER DEFAULT 0`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS "score" FLOAT DEFAULT 0`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS "version" INTEGER DEFAULT 1`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS "upvotes" INTEGER DEFAULT 0`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS "downvotes" INTEGER DEFAULT 0`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS "hotScore" FLOAT DEFAULT 0`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS "qualityScore" FLOAT DEFAULT 0`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS "spamScore" FLOAT DEFAULT 0`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS "moderationStatus" TEXT DEFAULT 'approved'`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS "moderatedAt" TIMESTAMP`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS "moderatedBy" INTEGER`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS "readTime" INTEGER DEFAULT 0`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS "excerpt" TEXT`,
    
    // Comments table
    `ALTER TABLE comments ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP`,
    `ALTER TABLE comments ADD COLUMN IF NOT EXISTS "version" INTEGER DEFAULT 1`,
    `ALTER TABLE comments ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT`,
    `ALTER TABLE comments ADD COLUMN IF NOT EXISTS "upvotes" INTEGER DEFAULT 0`,
    `ALTER TABLE comments ADD COLUMN IF NOT EXISTS "downvotes" INTEGER DEFAULT 0`,
    `ALTER TABLE comments ADD COLUMN IF NOT EXISTS "score" FLOAT DEFAULT 0`,
    `ALTER TABLE comments ADD COLUMN IF NOT EXISTS "isEdited" BOOLEAN DEFAULT false`,
    `ALTER TABLE comments ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP`,
    `ALTER TABLE comments ADD COLUMN IF NOT EXISTS "moderationStatus" TEXT DEFAULT 'approved'`,
    
    // Users table
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "reputation" INTEGER DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "points" INTEGER DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "level" INTEGER DEFAULT 1`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "streak" INTEGER DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN DEFAULT false`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN DEFAULT false`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "bannedAt" TIMESTAMP`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "bio" TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "location" TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "website" TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "github" TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "twitter" TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "linkedin" TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "avatar" TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "coverImage" TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "company" TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "jobTitle" TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "skills" TEXT[]`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "notificationPrefs" JSONB`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "privacySettings" JSONB`,
    
    // Categories table  
    `ALTER TABLE categories ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP`,
    `ALTER TABLE categories ADD COLUMN IF NOT EXISTS "icon" TEXT`,
    `ALTER TABLE categories ADD COLUMN IF NOT EXISTS "color" TEXT`,
    `ALTER TABLE categories ADD COLUMN IF NOT EXISTS "postCount" INTEGER DEFAULT 0`,
    
    // Tags table
    `ALTER TABLE tags ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP`,
    `ALTER TABLE tags ADD COLUMN IF NOT EXISTS "postCount" INTEGER DEFAULT 0`,
    
    // Likes table
    `ALTER TABLE likes ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT NOW()`,
    
    // Notifications table
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP`,
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "metadata" JSONB`,
  ];

  console.log('Starting database fix...');
  let success = 0;
  let skipped = 0;
  
  for (const query of queries) {
    try {
      await prisma.$executeRawUnsafe(query);
      console.log('✅', query.substring(20, 70));
      success++;
    } catch (err) {
      console.log('⚠️  Skip:', err.message.substring(0, 60));
      skipped++;
    }
  }
  
  await prisma.$disconnect();
  console.log(`\n🎉 Done! ${success} added, ${skipped} skipped`);
}

fix();
