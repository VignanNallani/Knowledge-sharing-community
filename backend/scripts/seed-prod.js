#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import logger from '../src/config/logger.js';
import configLoader from '../src/config/config-loader.js';

class ProductionSeeder {
  constructor() {
    this.prisma = new PrismaClient();
    this.config = configLoader.getAll();
  }

  async seedUsers() {
    try {
      logger.info('Seeding production users...');

      // Create admin user
      const adminPassword = await bcrypt.hash('admin123!', this.config.security.bcryptRounds);
      const admin = await this.prisma.user.upsert({
        where: { email: 'admin@knowledge-sharing.com' },
        update: {},
        create: {
          email: 'admin@knowledge-sharing.com',
          username: 'admin',
          password: adminPassword,
          firstName: 'System',
          lastName: 'Administrator',
          role: 'ADMIN',
          isActive: true,
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      logger.info(`Admin user created: ${admin.email}`);

      // Create moderator users
      const moderatorPassword = await bcrypt.hash('moderator123!', this.config.security.bcryptRounds);
      const moderator = await this.prisma.user.upsert({
        where: { email: 'moderator@knowledge-sharing.com' },
        update: {},
        create: {
          email: 'moderator@knowledge-sharing.com',
          username: 'moderator',
          password: moderatorPassword,
          firstName: 'Content',
          lastName: 'Moderator',
          role: 'MODERATOR',
          isActive: true,
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      logger.info(`Moderator user created: ${moderator.email}`);

      // Create test regular user
      const userPassword = await bcrypt.hash('user123!', this.config.security.bcryptRounds);
      const testUser = await this.prisma.user.upsert({
        where: { email: 'user@knowledge-sharing.com' },
        update: {},
        create: {
          email: 'user@knowledge-sharing.com',
          username: 'testuser',
          password: userPassword,
          firstName: 'Test',
          lastName: 'User',
          role: 'USER',
          isActive: true,
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      logger.info(`Test user created: ${testUser.email}`);

      return { admin, moderator, testUser };
    } catch (error) {
      logger.error('Failed to seed users:', error);
      throw error;
    }
  }

  async seedCategories() {
    try {
      logger.info('Seeding categories...');

      const categories = [
        {
          name: 'Technology',
          description: 'Discussions about technology, programming, and software development',
          slug: 'technology',
          color: '#3B82F6',
          icon: '💻',
          isActive: true,
        },
        {
          name: 'Science',
          description: 'Scientific discussions, research, and discoveries',
          slug: 'science',
          color: '#10B981',
          icon: '🔬',
          isActive: true,
        },
        {
          name: 'Business',
          description: 'Business strategies, entrepreneurship, and management',
          slug: 'business',
          color: '#F59E0B',
          icon: '💼',
          isActive: true,
        },
        {
          name: 'Arts & Culture',
          description: 'Art, literature, music, and cultural discussions',
          slug: 'arts-culture',
          color: '#8B5CF6',
          icon: '🎨',
          isActive: true,
        },
        {
          name: 'Health & Wellness',
          description: 'Health tips, wellness, and medical discussions',
          slug: 'health-wellness',
          color: '#EF4444',
          icon: '🏥',
          isActive: true,
        },
        {
          name: 'Education',
          description: 'Learning, teaching, and educational resources',
          slug: 'education',
          color: '#06B6D4',
          icon: '📚',
          isActive: true,
        },
      ];

      const createdCategories = [];
      for (const categoryData of categories) {
        const category = await this.prisma.category.upsert({
          where: { slug: categoryData.slug },
          update: categoryData,
          create: categoryData,
        });
        createdCategories.push(category);
        logger.info(`Category created: ${category.name}`);
      }

      return createdCategories;
    } catch (error) {
      logger.error('Failed to seed categories:', error);
      throw error;
    }
  }

  async seedSettings() {
    try {
      logger.info('Seeding system settings...');

      const settings = [
        {
          key: 'site_name',
          value: 'Knowledge Sharing Community',
          description: 'Name of the community platform',
          type: 'string',
          isPublic: true,
        },
        {
          key: 'site_description',
          value: 'A community platform for sharing knowledge and ideas',
          description: 'Description of the community platform',
          type: 'text',
          isPublic: true,
        },
        {
          key: 'max_post_length',
          value: '5000',
          description: 'Maximum length of a post in characters',
          type: 'number',
          isPublic: false,
        },
        {
          key: 'max_comment_length',
          value: '1000',
          description: 'Maximum length of a comment in characters',
          type: 'number',
          isPublic: false,
        },
        {
          key: 'registration_enabled',
          value: 'true',
          description: 'Whether new user registration is enabled',
          type: 'boolean',
          isPublic: true,
        },
        {
          key: 'email_verification_required',
          value: 'true',
          description: 'Whether email verification is required for new users',
          type: 'boolean',
          isPublic: false,
        },
        {
          key: 'default_user_role',
          value: 'USER',
          description: 'Default role for new users',
          type: 'string',
          isPublic: false,
        },
      ];

      const createdSettings = [];
      for (const settingData of settings) {
        const setting = await this.prisma.setting.upsert({
          where: { key: settingData.key },
          update: settingData,
          create: settingData,
        });
        createdSettings.push(setting);
        logger.info(`Setting created: ${setting.key}`);
      }

      return createdSettings;
    } catch (error) {
      logger.error('Failed to seed settings:', error);
      throw error;
    }
  }

  async seedModerationRules() {
    try {
      logger.info('Seeding moderation rules...');

      const rules = [
        {
          title: 'No Spam or Self-Promotion',
          description: 'Do not post spam, excessive self-promotion, or unrelated commercial content.',
          type: 'WARNING',
          isActive: true,
          points: 10,
        },
        {
          title: 'Be Respectful',
          description: 'Treat all community members with respect. No personal attacks, harassment, or hate speech.',
          type: 'WARNING',
          isActive: true,
          points: 15,
        },
        {
          title: 'No Explicit Content',
          description: 'Do not post explicit, violent, or inappropriate content.',
          type: 'BAN',
          isActive: true,
          points: 50,
        },
        {
          title: 'Stay on Topic',
          description: 'Keep discussions relevant to the category and thread topic.',
          type: 'WARNING',
          isActive: true,
          points: 5,
        },
        {
          title: 'No Plagiarism',
          description: 'Give credit where credit is due. Do not plagiarize content.',
          type: 'WARNING',
          isActive: true,
          points: 20,
        },
      ];

      const createdRules = [];
      for (const ruleData of rules) {
        const rule = await this.prisma.moderationRule.upsert({
          where: { title: ruleData.title },
          update: ruleData,
          create: ruleData,
        });
        createdRules.push(rule);
        logger.info(`Moderation rule created: ${rule.title}`);
      }

      return createdRules;
    } catch (error) {
      logger.error('Failed to seed moderation rules:', error);
      throw error;
    }
  }

  async seedSampleContent() {
    try {
      logger.info('Seeding sample content...');

      // Get categories and users
      const techCategory = await this.prisma.category.findUnique({ where: { slug: 'technology' } });
      const adminUser = await this.prisma.user.findUnique({ where: { email: 'admin@knowledge-sharing.com' } });
      const testUser = await this.prisma.user.findUnique({ where: { email: 'user@knowledge-sharing.com' } });

      if (!techCategory || !adminUser || !testUser) {
        throw new Error('Required users or categories not found');
      }

      // Create sample posts
      const posts = [
        {
          title: 'Welcome to Knowledge Sharing Community',
          content: 'Welcome to our new knowledge sharing platform! This is a space where you can share your expertise, learn from others, and engage in meaningful discussions. Feel free to explore different categories, ask questions, and contribute to the community.',
          authorId: adminUser.id,
          categoryId: techCategory.id,
          isPinned: true,
          isLocked: false,
        },
        {
          title: 'Best Practices for Code Reviews',
          content: 'Code reviews are essential for maintaining code quality. Here are some best practices: 1) Be constructive and specific in your feedback. 2) Focus on the code, not the person. 3) Ask questions instead of making demands. 4) Recognize good work and improvements. 5) Keep the review focused and manageable.',
          authorId: testUser.id,
          categoryId: techCategory.id,
          isPinned: false,
          isLocked: false,
        },
      ];

      const createdPosts = [];
      for (const postData of posts) {
        const post = await this.prisma.post.create({
          data: postData,
        });
        createdPosts.push(post);
        logger.info(`Sample post created: ${post.title}`);
      }

      // Create sample comments
      const comments = [
        {
          content: 'Great initiative! Looking forward to contributing to this community.',
          authorId: testUser.id,
          postId: createdPosts[0].id,
        },
        {
          content: 'These are excellent tips! I would also add that setting clear expectations for the review process helps everyone involved.',
          authorId: adminUser.id,
          postId: createdPosts[1].id,
        },
      ];

      for (const commentData of comments) {
        const comment = await this.prisma.comment.create({
          data: commentData,
        });
        logger.info(`Sample comment created for post: ${comment.postId}`);
      }

      return createdPosts;
    } catch (error) {
      logger.error('Failed to seed sample content:', error);
      throw error;
    }
  }

  async seedAll() {
    try {
      logger.info('Starting production database seeding...');

      // Check if this is production environment
      if (this.config.isProduction) {
        logger.warn('Running in production mode. This will create/overwrite production data.');
      }

      await this.seedUsers();
      await this.seedCategories();
      await this.seedSettings();
      await this.seedModerationRules();
      await this.seedSampleContent();

      logger.info('Production database seeding completed successfully!');
    } catch (error) {
      logger.error('Production seeding failed:', error);
      throw error;
    }
  }

  async cleanup() {
    try {
      await this.prisma.$disconnect();
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  
  const seeder = new ProductionSeeder();
  
  try {
    switch (command) {
      case 'all':
        await seeder.seedAll();
        break;
        
      case 'users':
        await seeder.seedUsers();
        break;
        
      case 'categories':
        await seeder.seedCategories();
        break;
        
      case 'settings':
        await seeder.seedSettings();
        break;
        
      case 'rules':
        await seeder.seedModerationRules();
        break;
        
      case 'content':
        await seeder.seedSampleContent();
        break;
        
      default:
        console.log(`
Usage: npm run seed:prod <command>

Commands:
  all        - Seed all production data
  users      - Seed production users
  categories - Seed categories
  settings   - Seed system settings
  rules      - Seed moderation rules
  content    - Seed sample content

Examples:
  npm run seed:prod all
  npm run seed:prod users
        `);
        process.exit(1);
    }
  } catch (error) {
    logger.error('Production seeding command failed:', error);
    process.exit(1);
  } finally {
    await seeder.cleanup();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default ProductionSeeder;
