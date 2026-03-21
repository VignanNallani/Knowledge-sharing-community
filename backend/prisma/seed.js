

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const mentorNames = [
  'Sarah Chen', 'Alex Rivera', 'Jordan Kim', 'Morgan Patel',
  'Casey Zhang', 'Taylor Okonkwo', 'Riley Sharma', 'Quinn Nakamura',
  'Drew Fernandez', 'Sage Williams'
];

const userNames = [
  'Liam Thompson', 'Emma Garcia', 'Noah Martinez', 'Olivia Anderson',
  'William Johnson', 'Ava Davis', 'James Wilson', 'Isabella Moore',
  'Oliver Taylor', 'Sophia Jackson', 'Benjamin White', 'Mia Harris',
  'Elijah Martin', 'Charlotte Lee', 'Lucas Thompson', 'Amelia Walker',
  'Mason Hall', 'Harper Allen', 'Ethan Young', 'Evelyn King',
  'Aiden Wright', 'Abigail Scott', 'Logan Green', 'Emily Baker',
  'Jackson Adams', 'Elizabeth Nelson', 'Sebastian Carter', 'Mila Mitchell',
  'Mateo Perez', 'Camila Roberts', 'Jack Turner', 'Penelope Phillips',
  'Owen Campbell', 'Layla Parker', 'Theodore Evans', 'Riley Edwards',
  'Henry Collins', 'Zoey Stewart', 'Alexander Morris', 'Nora Sanchez'
];

const postData = [
  { title: 'React useEffect best practices in 2026', content: 'After building 50+ React apps, here are patterns I use for useEffect that prevent bugs and infinite loops. The key insight is treating effects as synchronization mechanisms, not lifecycle hooks.\n\n## Key Rules\n\n1. Always specify all dependencies\n2. Use cleanup functions for subscriptions\n3. Avoid setting state directly from effects when possible\n4. Separate concerns into multiple effects\n\nThe most common mistake I see is developers using useEffect for derived state calculations. If you can compute something from existing state, just compute it directly in the component body.' },
  { title: 'Why I switched from REST to tRPC for my side projects', content: 'tRPC gives you end-to-end type safety without code generation. After using it for 6 months on 3 projects, I can\'t imagine going back to REST for TypeScript projects.\n\nThe DX improvement is massive - you get autocomplete on your API calls, TypeScript catches mismatches at compile time, and refactoring is a breeze. The learning curve is minimal if you already know TypeScript.' },
  { title: 'Docker in 2026: What actually matters for developers', content: 'Docker has become essential, but most tutorials teach you the wrong things first. Here\'s what actually matters day-to-day as a developer.\n\nFocus on: multi-stage builds, .dockerignore files, layer caching, health checks, and docker-compose for local development. Skip the Kubernetes stuff until you actually need it.' },
  { title: 'How I built a real-time chat in 48 hours with Socket.io', content: 'Weekend project breakdown: real-time chat app with rooms, typing indicators, and message history. Tech stack: Node.js + Socket.io + Redis for pub/sub + React frontend.\n\nThe hardest part wasn\'t WebSockets - it was managing state correctly on the client side. Here\'s what I learned...' },
  { title: 'PostgreSQL query optimization: 10 tips that changed everything', content: 'Our API went from 2000ms to 80ms average response time after applying these PostgreSQL optimizations. Not all of them are obvious.\n\nTop tips: use EXPLAIN ANALYZE obsessively, partial indexes for filtered queries, avoid SELECT *, use connection pooling (PgBouncer), and understand the difference between index scans and seq scans.' },
  { title: 'The hidden cost of microservices (and when to use them)', content: 'Microservices are not a silver bullet. I\'ve seen startups fail because they over-architected too early. This post is about understanding REAL tradeoffs.\n\nOperational complexity, distributed tracing, network latency, data consistency - these are problems you introduce when splitting services. Make sure the benefits outweigh the costs for YOUR scale.' },
  { title: 'TypeScript tricks I wish I knew when starting out', content: 'After 3 years of TypeScript, these are the features that I underused early on and now use daily.\n\nConditional types, mapped types, template literal types, the infer keyword, satisfies operator (TS 4.9+), and the NoInfer utility type in TS 5.4. Each one with a real-world example.' },
  { title: 'Building a design system from scratch: lessons learned', content: 'We built a design system for a 40-person engineering team. Here\'s what worked, what failed, and what we\'d do differently.\n\nKey lesson: start with design tokens, not components. Get spacing, color, and typography right first. Components built on shaky foundations need constant rebuilding.' },
  { title: 'GraphQL vs REST in 2026: an honest comparison', content: 'Both have their place. After using both extensively, here\'s my honest take on when to choose each.\n\nREST wins for: simple CRUD, public APIs, caching requirements, team unfamiliarity with GraphQL.\nGraphQL wins for: complex data requirements, multiple clients with different needs, rapid frontend iteration.' },
  { title: 'Git workflows for teams: beyond feature branches', content: 'Feature branches are fine for small teams, but they don\'t scale. Here are the workflows that work for larger teams.\n\nTrunk-based development with feature flags, conventional commits, semantic versioning, and automated changelogs. Plus the tools that make all of this manageable.' },
  { title: 'CSS Grid mastery: building complex layouts with ease', content: 'CSS Grid changed how I think about layout. Here are the patterns I use most frequently and how to avoid common pitfalls.\n\nNamed grid areas, auto-fill vs auto-fit, minmax() for responsive grids, and subgrid for alignment across components. Real examples from production codebases.' },
  { title: 'Node.js performance: profiling and fixing real bottlenecks', content: 'Theory is useless without practical examples. Here\'s how I profiled and fixed 3 real Node.js performance issues in production.\n\nTools: clinic.js, 0x, Chrome DevTools. Issues found: event loop blocking, memory leaks from closures, and inefficient database queries in loops.' },
  { title: 'Authentication in 2026: JWT vs Sessions vs Passkeys', content: 'The auth landscape has changed significantly. Passkeys are becoming mainstream, but JWTs and sessions still dominate. Here\'s a clear breakdown.\n\nJWT: stateless, scalable, tricky to invalidate. Sessions: stateful, easy to invalidate, requires sticky sessions or Redis. Passkeys: phishing-resistant, great UX, complex to implement.' },
  { title: 'From junior to senior: skills that actually matter', content: 'After mentoring 30+ developers and being promoted twice myself, here\'s what actually separates junior from senior engineers.\n\nIt\'s not about knowing more frameworks. It\'s about judgment: knowing when to abstract, when to keep it simple, when to push back on requirements, and how to communicate tradeoffs.' },
  { title: 'Redis beyond caching: use cases you\'re probably missing', content: 'Most developers only use Redis as a cache. But it\'s so much more. Here are production use cases that might surprise you.\n\nRate limiting, distributed locks, pub/sub messaging, leaderboards with sorted sets, session storage, real-time analytics, and job queues.' },
  { title: 'Testing philosophy: what I test and why', content: 'I used to write tests for coverage metrics. Now I write tests that actually catch bugs. Here\'s the shift in thinking that changed everything.\n\nTest behavior, not implementation. Focus on integration tests over unit tests for most business logic. Use E2E tests sparingly for critical paths. The testing trophy > testing pyramid.' },
  { title: 'Building accessible React apps: a practical guide', content: 'Accessibility isn\'t just for compliance - it improves UX for everyone. Here\'s how to build accessible React apps without it feeling like extra work.\n\nSemantic HTML first, ARIA as a last resort, keyboard navigation, focus management, color contrast, and screen reader testing with NVDA/VoiceOver.' },
  { title: 'Prisma ORM: tips and tricks from 2 years of usage', content: 'I\'ve used Prisma on 8 projects now. Here are the patterns and gotchas I\'ve accumulated.\n\nN+1 query problem with include, using $transaction for atomic operations, raw queries when Prisma falls short, schema organization for large apps, and handling soft deletes.' },
  { title: 'System design interview prep: resources that actually worked', content: 'I failed 3 system design interviews before passing at 2 FAANG companies. Here\'s what actually helped.\n\nDon\'t memorize architectures - understand tradeoffs. Practice talking through problems out loud. Learn: consistent hashing, CAP theorem, database sharding, CDNs, and message queues.' },
  { title: 'Next.js App Router: 6 months in production review', content: 'We migrated a large Next.js app from Pages Router to App Router 6 months ago. Here\'s an honest review of the experience.\n\nServer Components are genuinely great for performance. But the mental model shift is real. Caching behavior is confusing. Deployment complexity increased. Overall: worth it for new projects, migrate existing ones carefully.' },
  { title: 'Vim motions in VS Code: productivity boost or distraction?', content: 'I tried Vim motions in VS Code for 90 days. Here\'s my honest verdict.\n\nMonth 1: slower than before, constant Google searches. Month 2: breaking even. Month 3: noticeably faster for certain operations. Verdict: worth it if you write a lot of code, overkill for occasional coders.' },
  { title: 'API design mistakes I see constantly (and how to fix them)', content: 'After reviewing hundreds of APIs as a backend consultant, these are the mistakes I see repeatedly.\n\nInconsistent naming conventions, missing pagination, no versioning strategy, poor error responses, ignoring HTTP semantics (using POST for everything), no rate limiting, and missing idempotency keys for mutations.' },
  { title: 'Web performance metrics explained: beyond Lighthouse scores', content: 'Lighthouse scores are a starting point, not a destination. Here\'s what metrics actually matter for user experience.\n\nCore Web Vitals: LCP, CLS, INP (replaced FID in 2024). How to measure them in production with the web-vitals library. What actually moves the needle on each metric.' },
  { title: 'Monorepos in 2026: Turborepo vs Nx vs plain npm workspaces', content: 'We evaluated all three for a 15-app monorepo. Here\'s a detailed comparison.\n\nTurborepo: fast, simple config, great for new projects. Nx: powerful, complex, better for large orgs. npm workspaces: zero config overhead, limited tooling. We chose Turborepo - here\'s why.' },
  { title: 'How to give better code reviews (without being toxic)', content: 'Code reviews should improve code AND relationships. Here\'s how to give feedback that actually helps.\n\nBe specific and constructive. Ask questions instead of making demands. Separate style from correctness. Approve when it\'s good enough, not perfect. Acknowledge what\'s done well.' },
  { title: 'Deploying to Railway: a complete guide for Node.js apps', content: 'Railway is my new favorite deployment platform. Here\'s a complete walkthrough for deploying a Node.js + PostgreSQL app.\n\nSetup, environment variables, database provisioning, custom domains, health checks, and zero-downtime deploys. Including the gotchas I hit on my first deploy.' },
  { title: 'State management in 2026: do you even need Redux?', content: 'Redux was the answer to state management in 2018. In 2026, you probably don\'t need it.\n\nFor most apps: React Query (server state) + Zustand (client state) + useState (local state) is all you need. Redux still makes sense for: complex client state, time-travel debugging needs, and large teams with strict patterns.' },
  { title: 'Building a CLI tool with Node.js: from idea to npm publish', content: 'I built and published a CLI tool with 500+ weekly downloads. Here\'s the complete process.\n\nTools: Commander.js for argument parsing, Inquirer for interactive prompts, Chalk for colors, and Ora for spinners. Plus: testing CLIs, semantic versioning, and automated npm publishing with GitHub Actions.' },
  { title: 'The art of naming things in code', content: 'Bad naming is the silent killer of codebases. After 8 years of coding, here\'s my systematic approach to naming.\n\nVariables: describe the value, not the type. Functions: verb + noun that describes the action. Booleans: is/has/can prefix. Avoid abbreviations except universal ones (id, url, i for index). Be consistent within a codebase.' },
  { title: 'WebSockets vs Server-Sent Events vs Long Polling in 2026', content: 'Three ways to push data from server to client. Here\'s when to use each.\n\nWebSockets: bidirectional, complex, great for chat/games. SSE: unidirectional, simple, great for notifications/feeds. Long polling: works everywhere, inefficient, use only when others aren\'t possible. Most apps need SSE, not WebSockets.' },
  { title: 'Why I left my FAANG job for a startup', content: 'After 3 years at Google, I took a 40% pay cut to join a 20-person startup. Here\'s why it was the best decision of my career.\n\nImpact velocity, learning breadth, ownership scope, and avoiding the "big company tax" on every decision. The tradeoffs are real, but the growth is exponential.' },
  { title: 'CSS-in-JS vs utility-first CSS in 2026', content: 'The CSS landscape has matured. Here\'s my take after using both approaches extensively.\n\nTailwind wins for: rapid prototyping, consistent design systems, smaller bundle sizes. CSS-in-JS wins for: dynamic styling, theme switching, component isolation. Most projects benefit from a hybrid approach.' },
  { title: 'Database indexing mistakes that kill performance', content: 'Indexes are crucial, but wrong indexes can be worse than no indexes. Here are the mistakes I see constantly.\n\nIndexing columns with low cardinality, not covering indexes, ignoring query patterns, too many indexes on write-heavy tables, and not analyzing query plans regularly.' },
  { title: 'Async/await antipatterns that cause subtle bugs', content: 'Async/await made asynchronous code readable, but introduced new ways to shoot yourself in the foot. Here are the patterns to avoid.\n\nAwaiting in loops, not handling promise rejections, mixing callbacks and promises, and fire-and-forget async calls. Each with real examples of the bugs they cause.' },
  { title: 'Building resilient APIs: circuit breakers and retries', content: 'Production APIs fail. Here\'s how to design systems that gracefully handle failures.\n\nExponential backoff with jitter, circuit breaker patterns, bulkhead isolation, timeout strategies, and graceful degradation. Real examples from a high-traffic production system.' },
  { title: 'The real cost of technical debt (with numbers)', content: 'Technical debt isn\'t just a metaphor. Here\'s how I measured its actual cost in my last project.\n\nSlower feature development (3x), increased bug rate (5x), developer churn (2x), and on-call incidents (4x). The numbers will shock you into taking debt seriously.' },
  { title: 'Microfrontend architecture: lessons from 2 years in production', content: 'We built a 15-team microfrontend system. Here\'s what worked, what failed, and what we\'d do differently.\n\nModule federation vs iframe approaches, shared dependency management, consistent design systems, and the operational overhead that nobody talks about.' },
  { title: 'Writing documentation that developers actually read', content: 'Most documentation is unreadable. Here\'s how to write docs that people actually use.\n\nStart with the "why", include copy-paste examples, document failure modes, keep it up-to-date with automated checks, and measure documentation effectiveness with analytics.' }
];

const comments = [
  'Great post! This helped me solve a problem I\'ve been stuck on.',
  'Thanks for sharing. The example with cleanup function was exactly what I needed.',
  'I\'ve been doing it wrong this whole time. Going to refactor today.',
  'Could you expand on point 3? I\'m not sure I fully understand the tradeoff.',
  'Bookmarked. This is going in my reference doc.',
  'Disagree on one point - in large apps, complexity is often worth it.',
  'The performance numbers are impressive. What was your baseline setup?',
  'Been using this pattern for 6 months and can confirm it works great.',
  'Just shared this with my whole team. Very well explained.',
  'Minor correction: in React 19 behavior changed slightly for concurrent mode.',
  'This is the clearest explanation of this topic I\'ve found.',
  'Which version were you using when you tested this?',
  'I ran into the exact same issue last week. Wish I had this post then!',
  'Great writeup. The diagrams really help visualize the concepts.',
  'How does this scale beyond 10k users?',
  'Love the practical approach. Theory without examples is useless.',
  'Following for more content like this.',
  'This saved me hours of debugging. Thank you!',
  'Any plans for a follow-up post on advanced cases?',
  'The section on error handling is gold. Most people skip that part.',
  'I implemented this and saw immediate improvements.',
  'The code examples are exactly what I needed.',
  'This should be required reading for all developers.',
  'Finally someone explains this clearly!',
  'Can you write about the testing strategy for this?',
  'The performance gains are real - confirmed in my project.',
  'This changed how I think about API design.',
  'Excellent breakdown of complex topics.',
  'I wish I learned this years ago.',
  'The real-world examples make all the difference.',
  'This is exactly what I was looking for.',
  'Going to implement this in my current project.',
  'Thanks for taking the time to write this.',
  'The section on debugging techniques is invaluable.'
];

async function main() {
  console.log('🌱 Starting seed...');
  
  // Clear existing data (in order of foreign key dependencies)
  await prisma.comment.deleteMany();
  await prisma.like.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  
  const hashedPassword = await bcrypt.hash('Test1234', 10);
  
  // Create admins
  const admin1 = await prisma.user.create({
    data: { 
      name: 'Vignan Admin', 
      email: 'vignan123@gmail.com', 
      password: hashedPassword, 
      role: 'ADMIN',
      bio: 'System administrator and platform maintainer. Ensuring smooth operation of the knowledge sharing community.',
      skills: 'System Administration,Node.js,PostgreSQL,Docker,Monitoring,Security,DevOps'
    }
  });
  
  const admin2 = await prisma.user.create({
    data: { 
      name: 'Dev Admin', 
      email: 'admin@devmentor.com', 
      password: hashedPassword, 
      role: 'ADMIN',
      bio: 'Platform developer and community manager. Building the best learning environment for developers.',
      skills: 'Full Stack Development,React,Node.js,MongoDB,GraphQL,API Design,Community Management'
    }
  });

  // Create mentors
  const mentors = [];
  const mentorSkills = [
    'React,TypeScript,Next.js,Node.js,GraphQL,AWS,Docker,Testing',
    'Python,Django,Machine Learning,Data Science,Pandas,NumPy,TensorFlow',
    'Java,Spring Boot,Microservices,Kubernetes,Docker,PostgreSQL,Redis',
    'JavaScript,Vue.js,Node.js,Express,MongoDB,GraphQL,Apollo',
    'Go,Microservices,Docker,Kubernetes,PostgreSQL,Redis,gRPC',
    'Ruby,Rails,JavaScript,React,PostgreSQL,Redis,Sidekiq',
    'PHP,Laravel,Vue.js,MySQL,Docker,Redis,PHPUnit',
    'C#,.NET Core,Entity Framework,Azure,SQL Server,Docker,React',
    'Swift,iOS,SwiftUI,Core Data,Xcode,Mobile Development,UIKit',
    'Kotlin,Android,Jetpack Compose,Mobile Development,Retrofit,Room'
  ];
  
  for (let i = 0; i < mentorNames.length; i++) {
    const name = mentorNames[i];
    const email = name.toLowerCase().replace(' ', '.') + '@devmentor.com';
    const bio = `Senior ${['Full Stack', 'Frontend', 'Backend', 'Mobile', 'DevOps', 'Data Science'][i % 6]} Engineer with ${8 + (i % 5)} years of experience. Passionate about mentoring and helping developers grow their careers through practical guidance and real-world insights.`;
    const mentor = await prisma.user.create({
      data: { 
        name, 
        email, 
        password: hashedPassword, 
        role: 'MENTOR',
        bio,
        skills: mentorSkills[i]
      }
    });
    mentors.push(mentor);
  }

  // Create regular users
  const users = [];
  const userSkills = [
    'JavaScript,React,HTML,CSS,Node.js,Express,MongoDB',
    'Python,Django,JavaScript,React,PostgreSQL,Docker,Git',
    'Java,Spring,JavaScript,React,MySQL,Docker,Jenkins',
    'TypeScript,React,Node.js,GraphQL,MongoDB,AWS,Docker',
    'Vue.js,JavaScript,Node.js,Express,MySQL,Redis,Webpack',
    'Angular,TypeScript,Java,Spring,PostgreSQL,Docker,Kubernetes',
    'React Native,JavaScript,Mobile Development,iOS,Android,React',
    'Python,Flask,JavaScript,Vue.js,PostgreSQL,Redis,NGINX',
    'Go,Docker,Kubernetes,PostgreSQL,Redis,gRPC,Microservices',
    'Ruby,Rails,JavaScript,React,MySQL,Redis,Sidekiq'
  ];
  
  for (let i = 0; i < userNames.length; i++) {
    const name = userNames[i];
    const email = name.toLowerCase().replace(' ', '.') + i + '@gmail.com';
    const bio = `Aspiring ${['Frontend', 'Backend', 'Full Stack', 'Mobile', 'Data Science'][i % 5]} developer eager to learn and contribute to the tech community. Currently exploring modern technologies and looking for mentorship opportunities.`;
    const user = await prisma.user.create({
      data: { 
        name, 
        email, 
        password: hashedPassword, 
        role: 'USER',
        bio,
        skills: userSkills[i % userSkills.length]
      }
    });
    users.push(user);
  }

  const allUsers = [admin1, admin2, ...mentors, ...users];
  console.log(`✅ Created ${allUsers.length} users`);

  // Create posts
  const createdPosts = [];
  for (let i = 0; i < postData.length; i++) {
    const authorPool = [...mentors, admin1, ...users.slice(0, 10)];
    const author = authorPool[i % authorPool.length];
    const post = await prisma.post.create({
      data: {
        title: postData[i].title,
        content: postData[i].content,
        authorId: author.id
      }
    });
    createdPosts.push(post);
  }
  console.log(`✅ Created ${createdPosts.length} posts`);

  // Create slots for each mentor for next 7 days
  const times = ['09:00', '11:00', '14:00', '16:00'];
  let totalSlots = 0;
  
  for (const mentor of mentors) {
    for (let day = 1; day <= 7; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);
      // Pick 2 random times per day
      const dayTimes = times.sort(() => Math.random() - 0.5).slice(0, 2);
      for (const time of dayTimes) {
        const [h, m] = time.split(':');
        const endHour = parseInt(h) + 1;
        try {
          await prisma.slot.create({
            data: {
              mentorId: mentor.id,
              startAt: new Date(date.toISOString().split('T')[0] + 'T' + time + ':00Z'),
              endAt: new Date(date.toISOString().split('T')[0] + 'T' + `${endHour}:00:00Z`),
              status: 'OPEN'
            }
          });
          totalSlots++;
        } catch (error) {
          console.error(`❌ Failed to create slot for mentor ${mentor.name} at ${time}:`, error.message);
        }
      }
    }
  }
  
  console.log(`✅ Created ${totalSlots} total mentor slots`);

  // Add likes
  let likeCount = 0;
  for (const post of createdPosts) {
    const numLikes = Math.floor(Math.random() * 20) + 5;
    const shuffled = [...allUsers].sort(() => Math.random() - 0.5);
    const likers = shuffled.slice(0, numLikes);
    for (const liker of likers) {
      try {
        await prisma.like.create({ data: { postId: post.id, userId: liker.id } });
        likeCount++;
      } catch {}
    }
  }
  console.log(`✅ Created ${likeCount} likes`);

  // Add comments
  let commentCount = 0;
  for (const post of createdPosts) {
    const numComments = Math.floor(Math.random() * 6) + 3;
    const shuffled = [...allUsers].sort(() => Math.random() - 0.5);
    const commenters = shuffled.slice(0, numComments);
    for (const commenter of commenters) {
      const content = comments[Math.floor(Math.random() * comments.length)];
      await prisma.comment.create({
        data: { content, postId: post.id, authorId: commenter.id }
      });
      commentCount++;
    }
  }
  console.log(`✅ Created ${commentCount} comments`);

  console.log('🎉 Seed complete!');
  console.log('Login with: vignan123@gmail.com / Test1234');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
