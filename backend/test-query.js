#!/usr/bin/env node

import getPrisma from './src/config/prisma.js';

async function testQuery() {
  console.log('🔍 Testing SQL query logging...');
  
  const prisma = getPrisma();
  
  try {
    console.log('📊 Running optimized query...');
    
    const posts = await prisma.$queryRaw`
      SELECT DISTINCT
        p.id,
        p.title,
        p.content,
        p.image,
        p."authorId",
        p.version,
        p."createdAt",
        p."updatedAt",
        p."deletedAt",
        p."idempotencyKey",
        a.id as author_id,
        a.name as author_name,
        a.email as author_email,
        a.role as author_role,
        a."profileImage" as author_profileImage
      FROM posts p
      LEFT JOIN users a ON p."authorId" = a.id
      WHERE p."deletedAt" IS NULL
      ORDER BY p."createdAt" DESC
      LIMIT 10
    `;
    
    console.log(`✅ Query completed. Found ${posts.length} posts.`);
    
  } catch (error) {
    console.error('❌ Query failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testQuery();
