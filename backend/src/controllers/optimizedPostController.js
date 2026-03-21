// Optimized Post Controller - Eliminates N+1 Query Pattern
import getPrisma from '../config/prisma.js';

class OptimizedPostController {
  async getPostsOptimized(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const prisma = getPrisma();
      
      const [posts, total] = await Promise.all([
        prisma.post.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                profileImageUrl: true
              }
            },
            _count: {
              select: {
                likes: true,
                comments: true
              }
            }
          }
        }),
        prisma.post.count()
      ]);

      const transformedPosts = posts.map(post => ({
        ...post,
        commentsCount: post._count.comments,
        likesCount: post._count.likes,
        _count: undefined
      }));

      return res.json({
        success: true,
        data: {
          posts: transformedPosts,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get posts error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch posts',
        debug: { error: error.message }
      });
    }
  }

  async comparePerformance(req, res) {
    try {
      console.log('🔬 PERFORMANCE COMPARISON TEST');
      console.log('='.repeat(50));
      
      // Get Prisma instance at request time
      const prisma = getPrisma();
      
      if (!prisma) {
        throw new Error('Prisma client not available');
      }
      
      // Test original Prisma approach
      console.log('\n--- Original Prisma Query ---');
      const originalStart = performance.now();
      const originalResult = await prisma.post.findMany({
        where: { },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              profileImageUrl: true
            }
          },
          _count: {
            select: {
              comments: {
                where: { },
                select: { },
              },
              likes: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
      const originalTime = performance.now() - originalStart;
      
      // Test optimized query
      console.log('\n--- Optimized Query ---');
      const optimizedStart = performance.now();
      const optimizedResult = await prisma.$queryRaw`
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
          u.id as "author_id",
          u.name as "author_name",
          u.email as "author_email",
          u.role as "author_role",
          u."profileImageUrl" as "author_profileImageUrl",
          COALESCE(comment_counts.comment_count, 0) as "commentsCount",
          COALESCE(like_counts.like_count, 0) as "likesCount"
        FROM "public"."posts" p
        LEFT JOIN "public"."users" u ON p."authorId" = u.id
        LEFT JOIN (
          SELECT 
            c."postId", 
            COUNT(*) as comment_count
          FROM "public"."comments" c
          GROUP BY c."postId"
        ) comment_counts ON p.id = comment_counts."postId"
        LEFT JOIN (
          SELECT 
            l."postId", 
            COUNT(*) as like_count
          FROM "public"."likes" l
          GROUP BY l."postId"
        ) like_counts ON p.id = like_counts."postId"
        WHERE p."deletedAt" IS NULL
        ORDER BY p."createdAt" DESC
        LIMIT 10
      `;
      const optimizedTime = performance.now() - optimizedStart;
      
      const improvement = ((originalTime - optimizedTime) / originalTime * 100);
      
      console.log(`\n📊 PERFORMANCE RESULTS:`);
      console.log(`   Original: ${originalTime.toFixed(2)}ms`);
      console.log(`   Optimized: ${optimizedTime.toFixed(2)}ms`);
      console.log(`   Improvement: ${improvement.toFixed(1)}% faster`);
      console.log(`   Speed multiplier: ${(originalTime / optimizedTime).toFixed(1)}x`);
      
      res.json({
        success: true,
        comparison: {
          original: {
            duration: `${originalTime.toFixed(2)}ms`,
            recordCount: originalResult.length
          },
          optimized: {
            duration: `${optimizedTime.toFixed(2)}ms`,
            recordCount: optimizedResult.length
          },
          improvement: {
            percentage: improvement,
            speedMultiplier: originalTime / optimizedTime,
            timeSaved: `${(originalTime - optimizedTime).toFixed(2)}ms`
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Performance comparison failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default OptimizedPostController;
