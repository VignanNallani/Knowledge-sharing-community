import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding database...');

  // Create demo users
  const password = await bcrypt.hash(
    'Password123!', 10);
  
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'alex@devmentor.com' },
      update: {},
      create: {
        name: 'Alex Kumar',
        email: 'alex@devmentor.com',
        password,
        role: 'MENTOR',
        bio: 'Senior Full Stack Developer with 8 years experience in React, Node.js, and cloud architecture. Passionate about mentoring and helping developers grow their careers.',
        skills: 'React,Node.js,TypeScript,Python,AWS,Docker,GraphQL,MongoDB,PostgreSQL'
      }
    }),
    prisma.user.upsert({
      where: { email: 'sarah@devmentor.com' },
      update: {},
      create: {
        name: 'Sarah Chen',
        email: 'sarah@devmentor.com',
        password,
        role: 'MENTOR',
        bio: 'Frontend Specialist and UI/UX enthusiast with 6 years experience building scalable React applications. Love teaching component architecture and performance optimization.',
        skills: 'React,TypeScript,Next.js,Vue.js,JavaScript,CSS,Tailwind,Webpack,Storybook'
      }
    }),
    prisma.user.upsert({
      where: { email: 'demo@devmentor.com' },
      update: {},
      create: {
        name: 'Demo User',
        email: 'demo@devmentor.com',
        password,
        role: 'USER',
        bio: 'Aspiring developer eager to learn and contribute to the tech community. Currently exploring web development and looking for mentorship opportunities.',
        skills: 'HTML,CSS,JavaScript,React,Node.js,Express,MongoDB'
      }
    }),
  ]);

  // Create sample posts
  const postData = [
    {
      title: 'How I went from Junior to Senior in 2 years',
      content: 'The biggest mistake most junior developers make is focusing on learning more frameworks instead of deepening their fundamentals. Here is my exact roadmap that helped me grow fast...',
      authorId: users[0].id,
    },
    {
      title: 'React useEffect best practices in 2026',
      content: 'After building 50+ React apps, here are patterns I use for useEffect that prevent bugs and infinite loops. The key insight is treating effects as synchronization, not lifecycle...',
      authorId: users[1].id,
    },
    {
      title: 'Why every developer should learn Docker',
      content: 'I resisted Docker for 2 years. Now I cannot imagine working without it. Here is a practical guide that will get you up and running in one afternoon...',
      authorId: users[2].id,
    },
  ];

  for (const post of postData) {
    await prisma.post.create({ data: post });
  }

  console.log('✅ Database seeded!');
  console.log('Demo login: demo@devmentor.com');
  console.log('Password: Password123!');
  await prisma.$disconnect();
}

seed().catch(console.error);
