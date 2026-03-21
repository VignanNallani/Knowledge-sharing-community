import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPosts() {
  try {
    console.log('Creating seed posts...');
    
    // First, let's check if we have users
    const users = await prisma.user.findMany();
    
    if (users.length === 0) {
      // Create a test user if none exists
      const testUser = await prisma.user.create({
        data: {
          name: 'John Doe',
          email: 'john.doe@example.com',
          password: '$2b$10$example.hash.here', // This would be properly hashed in real scenario
          role: 'USER',
          isActive: true
        }
      });
      users.push(testUser);
      console.log('Created test user:', testUser.email);
    }
    
    const authorId = users[0].id;
    
    // Create 10 posts with varying content
    const posts = [
      {
        title: 'Getting Started with Docker',
        content: 'Docker is a powerful containerization platform that allows developers to package applications with all their dependencies into standardized units. This article covers the basics of Docker and how to get started with containerizing your applications.',
        authorId
      },
      {
        title: 'Understanding Prisma ORM',
        content: 'Prisma is a next-generation ORM that simplifies database access. It provides type safety, auto-completion, and better developer experience. In this post, we explore the key features and benefits of using Prisma in your Node.js applications.',
        authorId
      },
      {
        title: 'Building REST APIs with Express',
        content: 'Express.js is a minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications. Learn how to build scalable REST APIs using Express and best practices.',
        authorId
      },
      {
        title: 'PostgreSQL Performance Tips',
        content: 'PostgreSQL is a powerful open-source database system. Here are some essential tips for optimizing PostgreSQL performance, including indexing strategies, query optimization, and configuration tuning.',
        authorId
      },
      {
        title: 'Redis Caching Strategies',
        content: 'Redis is an in-memory data structure store used as a database, cache, and message broker. This article explores various caching strategies and patterns using Redis to improve application performance.',
        authorId
      },
      {
        title: 'Microservices Architecture',
        content: 'Microservices architecture is a method of developing software systems where large applications are broken down into smaller, independent services. Learn about the benefits, challenges, and best practices of implementing microservices.',
        authorId
      },
      {
        title: 'TypeScript Best Practices',
        content: 'TypeScript adds static typing to JavaScript, enabling better tooling and error detection. This post covers essential TypeScript best practices for building maintainable and scalable applications.',
        authorId
      },
      {
        title: 'Database Connection Pooling',
        content: 'Connection pooling is a critical technique for managing database connections efficiently. Learn how to implement connection pooling in Node.js applications and the benefits it provides for performance and scalability.',
        authorId
      },
      {
        title: 'API Authentication Methods',
        content: 'Securing APIs is crucial for modern applications. This article compares different authentication methods including JWT, OAuth2, and session-based authentication, helping you choose the right approach for your API.',
        authorId
      },
      {
        title: 'Container Orchestration with Kubernetes',
        content: 'Kubernetes is a container orchestration platform that automates deployment, scaling, and management of containerized applications. Discover the core concepts and how to get started with Kubernetes for your applications.',
        authorId
      }
    ];
    
    // Insert posts
    const createdPosts = await prisma.post.createMany({
      data: posts,
      skipDuplicates: true
    });
    
    console.log(`✅ Created ${createdPosts.count} posts successfully!`);
    
    // Verify the posts were created
    const totalPosts = await prisma.post.count();
    console.log(`📊 Total posts in database: ${totalPosts}`);
    
    // Show sample post
    const samplePost = await prisma.post.findFirst({
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });
    
    if (samplePost) {
      console.log('\n📝 Sample post:');
      console.log(`Title: ${samplePost.title}`);
      console.log(`Author: ${samplePost.author.name} (${samplePost.author.email})`);
      console.log(`Created: ${samplePost.createdAt}`);
    }
    
  } catch (error) {
    console.error('❌ Error seeding posts:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedPosts();
