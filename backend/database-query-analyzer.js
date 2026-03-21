#!/usr/bin/env node

// Database Query Analyzer - Direct SQL Performance Analysis
import { PrismaClient } from '@prisma/client';

class DatabaseQueryAnalyzer {
  constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });
  }

  async analyzePostsQuery() {
    console.log('🔍 ANALYZING POSTS QUERY PERFORMANCE');
    console.log('='.repeat(60));
    
    const results = {
      coldQueries: [],
      warmQueries: [],
      explainAnalyze: null,
      tableStats: null,
      indexAnalysis: null
    };
    
    try {
      // Cold query analysis
      console.log('\n--- COLD QUERY ANALYSIS ---');
      for (let i = 0; i < 3; i++) {
        const start = performance.now();
        const result = await this.executePostsQuery();
        const duration = performance.now() - start;
        
        results.coldQueries.push({
          attempt: i + 1,
          duration,
          recordCount: result.length,
          dataSize: JSON.stringify(result).length
        });
        
        console.log(`Query ${i + 1}: ${duration.toFixed(2)}ms, ${result.length} records`);
        
        // Wait between cold queries
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Warm query analysis (run same query multiple times)
      console.log('\n--- WARM QUERY ANALYSIS ---');
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        const result = await this.executePostsQuery();
        const duration = performance.now() - start;
        
        results.warmQueries.push({
          attempt: i + 1,
          duration,
          recordCount: result.length,
          dataSize: JSON.stringify(result).length
        });
        
        console.log(`Warm query ${i + 1}: ${duration.toFixed(2)}ms, ${result.length} records`);
      }
      
      // EXPLAIN ANALYZE
      console.log('\n--- EXPLAIN ANALYZE ---');
      results.explainAnalyze = await this.explainPostsQuery();
      
      // Table statistics
      console.log('\n--- TABLE STATISTICS ---');
      results.tableStats = await this.getTableStats();
      
      // Index analysis
      console.log('\n--- INDEX ANALYSIS ---');
      results.indexAnalysis = await this.getIndexAnalysis();
      
      this.analyzeResults(results);
      
    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  async executePostsQuery() {
    // Simulate the exact query that /api/v1/posts executes
    const posts = await this.prisma.post.findMany({
      where: {
        deletedAt: null
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            profileImage: true
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    return posts;
  }

  async explainPostsQuery() {
    // Get the exact SQL that Prisma generates and analyze it
    const explainQuery = `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
      SELECT 
        p.id, p.title, p.content, p.image, p.authorId, p.version, 
        p.createdAt, p.updatedAt, p.deletedAt, p.idempotencyKey,
        u.id as "author_id", u.name as "author_name", u.email as "author_email", 
        u.role as "author_role", u.profileImage as "author_profileImage",
        (SELECT COUNT(*) FROM "Comment" c WHERE c."postId" = p.id AND c."deletedAt" IS NULL) as "commentsCount",
        (SELECT COUNT(*) FROM "Like" l WHERE l."postId" = p.id) as "likesCount"
      FROM "Post" p
      LEFT JOIN "User" u ON p."authorId" = u.id
      WHERE p."deletedAt" IS NULL
      ORDER BY p."createdAt" DESC
      LIMIT 10
    `;
    
    try {
      const result = await this.prisma.$queryRawUnsafe(explainQuery);
      return result;
    } catch (error) {
      console.warn('EXPLAIN ANALYZE failed:', error.message);
      return null;
    }
  }

  async getTableStats() {
    try {
      const stats = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables 
        WHERE tablename IN ('Post', 'User', 'Comment', 'Like')
        ORDER BY tablename
      `;
      
      return stats;
    } catch (error) {
      console.warn('Table stats query failed:', error.message);
      return null;
    }
  }

  async getIndexAnalysis() {
    try {
      const indexes = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan as index_scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched
        FROM pg_stat_user_indexes 
        WHERE tablename IN ('Post', 'User', 'Comment', 'Like')
        ORDER BY tablename, indexname
      `;
      
      return indexes;
    } catch (error) {
      console.warn('Index analysis failed:', error.message);
      return null;
    }
  }

  analyzeResults(results) {
    console.log('\n📊 QUERY PERFORMANCE ANALYSIS');
    console.log('='.repeat(60));
    
    // Cold query analysis
    const coldDurations = results.coldQueries.map(q => q.duration);
    const coldAvg = coldDurations.reduce((sum, d) => sum + d, 0) / coldDurations.length;
    const coldMax = Math.max(...coldDurations);
    const coldMin = Math.min(...coldDurations);
    
    console.log(`🧊 COLD QUERIES:`);
    console.log(`   Average: ${coldAvg.toFixed(2)}ms`);
    console.log(`   Range: ${coldMin.toFixed(2)}ms - ${coldMax.toFixed(2)}ms`);
    console.log(`   Variance: ${(coldMax - coldMin).toFixed(2)}ms`);
    
    // Warm query analysis
    const warmDurations = results.warmQueries.map(q => q.duration);
    const warmAvg = warmDurations.reduce((sum, d) => sum + d, 0) / warmDurations.length;
    const warmMax = Math.max(...warmDurations);
    const warmMin = Math.min(...warmDurations);
    
    console.log(`🔥 WARM QUERIES:`);
    console.log(`   Average: ${warmAvg.toFixed(2)}ms`);
    console.log(`   Range: ${warmMin.toFixed(2)}ms - ${warmMax.toFixed(2)}ms`);
    console.log(`   Variance: ${(warmMax - warmMin).toFixed(2)}ms`);
    
    // Performance classification
    console.log(`\n🎯 PERFORMANCE INSIGHTS:`);
    
    if (coldAvg > warmAvg * 2) {
      console.log(`📈 Significant cold/warm disparity (${(coldAvg/warmAvg).toFixed(1)}x)`);
      console.log(`   → Likely connection pool or cache warmup issue`);
    } else if (coldAvg > 1000) {
      console.log(`⚠️  Cold queries are slow (${coldAvg.toFixed(2)}ms)`);
      console.log(`   → Check connection pool configuration`);
    }
    
    if (warmAvg > 500) {
      console.log(`⚠️  Warm queries are still slow (${warmAvg.toFixed(2)}ms)`);
      console.log(`   → Likely missing indexes or inefficient query`);
    }
    
    // EXPLAIN ANALYZE insights
    if (results.explainAnalyze && results.explainAnalyze[0]) {
      const plan = results.explainAnalyze[0]['Plan'];
      const executionTime = results.explainAnalyze[0]['Execution Time'];
      
      console.log(`\n🔍 EXPLAIN ANALYZE:`);
      console.log(`   Total execution time: ${executionTime?.toFixed(2)}ms`);
      console.log(`   Planning time: ${results.explainAnalyze[0]['Planning Time']?.toFixed(2)}ms`);
      
      if (plan) {
        console.log(`   Plan type: ${plan['Node Type']}`);
        console.log(`   Actual rows: ${plan['Actual Rows']}`);
        console.log(`   Actual loops: ${plan['Actual Loops']}`);
      }
    }
    
    // Table statistics
    if (results.tableStats) {
      console.log(`\n📊 TABLE STATISTICS:`);
      results.tableStats.forEach(table => {
        console.log(`   ${table.tablename}: ${table.live_tuples} live, ${table.dead_tuples} dead tuples`);
      });
    }
    
    // Recommendations
    console.log(`\n💡 OPTIMIZATION RECOMMENDATIONS:`);
    
    if (coldAvg > 1000) {
      console.log(`   • Increase connection pool size or configure connection pooling`);
      console.log(`   • Consider connection warmup strategies`);
    }
    
    if (warmAvg > 500) {
      console.log(`   • Add missing database indexes`);
      console.log(`   • Optimize the posts query (consider removing expensive joins)`);
    }
    
    if (coldMax - coldMin > 1000) {
      console.log(`   • High variance suggests resource contention`);
      console.log(`   • Check for database locks or concurrent access issues`);
    }
    
    console.log('='.repeat(60));
  }
}

// Run the analysis
const analyzer = new DatabaseQueryAnalyzer();
analyzer.analyzePostsQuery().catch(console.error);
